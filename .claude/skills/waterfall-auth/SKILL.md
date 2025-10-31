# Waterfall Authentication & Authorization

**Domain Skill** - Authentication flows, authorization patterns, permissions, team management

## Overview

This skill covers Waterfall's authentication system using Supabase Auth, role-based access control (RBAC), permission patterns, and team management.

**When to use this skill:**
- Implementing auth flows (signup, login, logout)
- Adding route protection
- Checking user permissions
- Managing team invitations
- Writing proxy/middleware (Next.js 16+ uses proxy.ts, 15 uses middleware.ts)
- Role-based access control

## Authentication vs Authorization

**Authentication:** Who are you?
- Supabase Auth handles login/signup
- Session management via cookies
- JWT tokens for API access

**Authorization:** What can you do?
- Role-based permissions (owner, admin, member)
- Organization-level access control
- Application-level permission checks

**Hybrid Security Model:**
- **RLS (Database Level):** Can user access this organization's data?
- **Application Logic:** Can user perform this specific action?

## User Roles

### Role Hierarchy

```
Owner (highest privileges)
  └── Can do everything
      └── Manage billing
      └── Delete account
      └── Assign/remove owner role

Admin
  └── Manage team (invite, remove members)
  └── Manage organizations (add, remove clients)
  └── All member permissions

Member (lowest privileges)
  └── Manage contracts
  └── Post to QuickBooks
  └── View dashboards
```

### Permission Matrix

| Permission | Owner | Admin | Member |
|-----------|-------|-------|--------|
| **Account Management** ||||
| Update account settings | ✅ | ❌ | ❌ |
| Manage billing | ✅ | ❌ | ❌ |
| Delete account | ✅ | ❌ | ❌ |
| **Team Management** ||||
| Invite team members | ✅ | ✅ | ❌ |
| Remove team members | ✅ | ✅ | ❌ |
| Change roles | ✅ | ✅* | ❌ |
| **Organization Management** ||||
| Add organizations | ✅ | ✅ | ❌ |
| Remove organizations | ✅ | ✅ | ❌ |
| Edit organization settings | ✅ | ✅ | ❌ |
| **QuickBooks** ||||
| Connect QuickBooks | ✅ | ✅ | ❌ |
| Disconnect QuickBooks | ✅ | ✅ | ❌ |
| Map accounts | ✅ | ✅ | ❌ |
| Post journal entries | ✅ | ✅ | ✅ |
| **Contracts** ||||
| View contracts | ✅ | ✅ | ✅ |
| Add contracts | ✅ | ✅ | ✅ |
| Edit contracts | ✅ | ✅ | ✅ |
| Delete contracts | ✅ | ✅ | ✅ |
| Import contracts | ✅ | ✅ | ✅ |

*Admins can change roles except owner role

## Authentication Flow

### Signup Flow

**User Journey:**
1. User fills signup form (email, password, name, company, account type)
2. Create Supabase auth user
3. Create User record in database
4. Create Account with first Organization
5. Create AccountUser membership (role: owner)
6. Redirect based on account type

**Implementation:**
```typescript
// app/api/auth/signup/route.ts
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const { email, password, name, companyName, accountType } = await request.json()

  // 1. Create auth user
  const supabase = createClient()
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message }, { status: 400 })
  }

  // 2. Create account (use admin client to bypass RLS)
  const { data: account, error: accountError } = await supabaseAdmin
    .from('accounts')
    .insert({
      name: companyName,
      account_type: accountType,
      subscription_tier: 'free',
      subscription_status: 'trial',
      trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
    })
    .select()
    .single()

  if (accountError) throw accountError

  // 3. Create user record
  await supabaseAdmin.from('users').insert({
    id: authData.user.id,
    email: authData.user.email,
    name,
  })

  // 4. Create account user (owner)
  await supabaseAdmin.from('account_users').insert({
    account_id: account.id,
    user_id: authData.user.id,
    role: 'owner',
  })

  // 5. Create first organization
  const orgName = accountType === 'company' ? companyName : `${companyName} - Example Client`
  await supabaseAdmin.from('organizations').insert({
    account_id: account.id,
    name: orgName,
  })

  return NextResponse.json({ success: true, user: authData.user })
}
```

**Resource File:** See `resources/supabase-auth-flows.md` for complete signup/login/logout flows.

### Login Flow

**User Journey:**
1. User enters email and password
2. Supabase validates credentials
3. Create session (JWT in HTTP-only cookie)
4. Redirect to last-used organization or first organization

**Implementation:**
```typescript
// app/api/auth/login/route.ts
export async function POST(request: Request) {
  const { email, password } = await request.json()

  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  // Fetch user's organizations
  const { data: orgs } = await supabase
    .from('organizations')
    .select('id, name')
    .limit(1)

  return NextResponse.json({
    user: data.user,
    redirectTo: orgs?.[0] ? `/${orgs[0].id}/dashboard` : '/account/organizations'
  })
}
```

### Session Management

Sessions are managed via HTTP-only cookies:

```typescript
// middleware.ts - Auto-refresh sessions
import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Refresh session if expired
  await supabase.auth.getUser()

  return response
}
```

**Resource File:** See `resources/proxy-patterns.md` for detailed proxy/middleware patterns.

## Root Route Authentication

The root route (`/`) serves as the **application entry point** and handles authentication-based routing.

### Behavior Pattern

```typescript
// app/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AuthLanding } from '@/components/auth/auth-landing'

export default async function RootPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If user is authenticated, redirect to app
  if (user) {
    // Get user's first organization
    const { data: orgs } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)

    if (orgs && orgs.length > 0) {
      redirect(`/${orgs[0].id}/dashboard`)
    } else {
      redirect('/account/organizations')
    }
  }

  // Show login/signup landing for unauthenticated users
  return <AuthLanding />
}
```

### Why This Pattern?

1. **Single Entry Point:** Users always start at `/` regardless of authentication state
2. **Smart Redirects:** Authenticated users go directly to their workspace
3. **No Marketing:** This repo is app-only, so `/` shows app login, not marketing content
4. **Seamless UX:** Users don't see a redirect, it happens server-side

### Auth Landing Component

The `<AuthLanding />` component should provide:
- Branding (logo, app name)
- Login/Signup options (tabs or separate buttons)
- Link to forgot password
- NO marketing content (features, pricing, testimonials)

**Example:**
```typescript
// components/auth/auth-landing.tsx
'use client'

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { LoginForm } from './login-form'
import { SignupForm } from './signup-form'

export function AuthLanding() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold">Waterfall</h1>
          <p className="text-gray-600 mt-2">Revenue Recognition</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <LoginForm />
          </TabsContent>

          <TabsContent value="signup">
            <SignupForm />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
```

## Unauthenticated Routes

These routes are accessible **without authentication**:

### Public Routes List

- `/` - Application landing (login/signup)
- `/login` - Login form
- `/signup` - Signup form
- `/forgot-password` - Password reset request
- `/reset-password` - Password reset confirmation (with token)
- `/accept-invitation/[token]` - Team invitation acceptance

### Route Structure Philosophy

**We use FLAT routes (not route groups):**

✅ **Correct:**
```
app/
├── login/page.tsx
├── signup/page.tsx
└── forgot-password/page.tsx
```

❌ **Incorrect:**
```
app/
└── (auth)/
    ├── login/page.tsx
    ├── signup/page.tsx
    └── forgot-password/page.tsx
```

**Why flat structure?**
1. **Simpler mental model** - Routes match URLs exactly
2. **Middleware expectations** - Middleware checks `/login`, not `/(auth)/login`
3. **Fewer nested directories** - Easier to navigate codebase
4. **Clearer URL structure** - What you see is what you get

### Middleware Configuration

Update middleware to allow these routes without authentication:

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow unauthenticated access to these routes
  const publicRoutes = [
    '/',
    '/login',
    '/signup',
    '/forgot-password',
    '/reset-password',
  ]

  const isPublicRoute = publicRoutes.includes(pathname) ||
                        pathname.startsWith('/accept-invitation/')

  if (isPublicRoute) {
    // For root route, check if user is authenticated and redirect
    if (pathname === '/') {
      const supabase = createServerClient(...)
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Redirect to dashboard (handled in page.tsx server component)
        return NextResponse.next()
      }
    }

    return NextResponse.next()
  }

  // Protected routes - require authentication
  const supabase = createServerClient(...)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

## Authorization Patterns

### Get Current User

```typescript
// Server Component or API Route
import { createClient } from '@/lib/supabase/server'

const supabase = createClient()
const { data: { user }, error } = await supabase.auth.getUser()

if (!user) {
  redirect('/login')
}
```

### Check Organization Access

```typescript
// lib/auth/permissions.ts
export async function canAccessOrganization(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const { data: org } = await prisma.organization.findFirst({
    where: {
      id: organizationId,
      account: {
        accountUsers: {
          some: {
            userId: userId
          }
        }
      }
    }
  })

  return !!org
}
```

### Get User Role

```typescript
export async function getUserRole(
  userId: string,
  accountId: string
): Promise<'owner' | 'admin' | 'member' | null> {
  const { data: accountUser } = await prisma.accountUser.findUnique({
    where: {
      accountId_userId: {
        accountId,
        userId
      }
    },
    select: {
      role: true
    }
  })

  return accountUser?.role as any || null
}
```

### Permission Helpers

```typescript
// lib/auth/permissions.ts
export async function hasPermission(
  userId: string,
  organizationId: string,
  permission: Permission
): Promise<boolean> {
  // Get user's role in the organization's account
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      accountId: true,
      account: {
        select: {
          accountUsers: {
            where: { userId },
            select: { role: true }
          }
        }
      }
    }
  })

  if (!org || org.account.accountUsers.length === 0) {
    return false
  }

  const role = org.account.accountUsers[0].role

  // Check permission based on role
  return checkRolePermission(role, permission)
}

function checkRolePermission(role: string, permission: Permission): boolean {
  const permissions = {
    owner: ['all'],
    admin: [
      'manage_contracts',
      'post_to_quickbooks',
      'connect_quickbooks',
      'manage_team',
      'manage_organizations',
    ],
    member: [
      'manage_contracts',
      'post_to_quickbooks',
    ],
  }

  if (role === 'owner') return true // Owners can do everything

  return permissions[role]?.includes(permission) || false
}
```

**Resource File:** See `resources/permission-helpers.md` for complete helper functions.

## Route Protection

### Server Component Protection

```typescript
// app/[organizationId]/contracts/page.tsx
import { createClient } from '@/lib/supabase/server'
import { canAccessOrganization } from '@/lib/auth/permissions'
import { redirect } from 'next/navigation'

export default async function ContractsPage({
  params
}: {
  params: { organizationId: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Check organization access
  const hasAccess = await canAccessOrganization(user.id, params.organizationId)
  if (!hasAccess) {
    redirect('/account/organizations')
  }

  // User has access, render page
  return <div>Contracts</div>
}
```

### API Route Protection

```typescript
// app/api/organizations/[id]/contracts/route.ts
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check access
  const hasAccess = await canAccessOrganization(user.id, params.id)
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Check permission
  const canManage = await hasPermission(user.id, params.id, 'manage_contracts')
  if (!canManage) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // User authorized, process request
  const body = await request.json()
  // ... create contract
}
```

### Middleware Protection

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  const supabase = createServerClient(...)

  const { data: { user } } = await supabase.auth.getUser()

  // Protected routes require authentication
  const isProtectedRoute = request.nextUrl.pathname.startsWith('/dashboard') ||
                          request.nextUrl.pathname.startsWith('/account')

  if (isProtectedRoute && !user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Auth routes redirect to dashboard if logged in
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') ||
                     request.nextUrl.pathname.startsWith('/signup')

  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/account/organizations', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
```

## Team Management

### Invite Team Member

```typescript
// app/api/account/team/invite/route.ts
export async function POST(request: Request) {
  const { email, role, accountId } = await request.json()

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check if user is owner or admin
  const userRole = await getUserRole(user.id, accountId)
  if (userRole !== 'owner' && userRole !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Generate invitation token
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

  // Save invitation
  await prisma.invitation.create({
    data: {
      accountId,
      email,
      role,
      token,
      expiresAt,
      invitedBy: user.id,
    },
  })

  // Send invitation email
  await sendInvitationEmail(email, token)

  return NextResponse.json({ success: true })
}
```

### Accept Invitation

```typescript
// app/accept-invitation/[token]/page.tsx
export default async function AcceptInvitationPage({
  params
}: {
  params: { token: string }
}) {
  const invitation = await prisma.invitation.findUnique({
    where: { token: params.token },
    include: { account: true }
  })

  if (!invitation || invitation.expiresAt < new Date()) {
    return <div>Invalid or expired invitation</div>
  }

  // User signs up or logs in, then:
  // Create AccountUser with specified role
  await prisma.accountUser.create({
    data: {
      accountId: invitation.accountId,
      userId: user.id,
      role: invitation.role,
    },
  })

  // Delete invitation
  await prisma.invitation.delete({
    where: { id: invitation.id }
  })

  redirect('/account/organizations')
}
```

## Best Practices

**Always:**
- Check authentication before accessing protected routes
- Verify organization access before queries
- Check role-based permissions for sensitive actions
- Use middleware for session refresh
- Store sessions in HTTP-only cookies
- Hash invitation tokens
- Set expiration on invitations

**Never:**
- Store passwords in plain text
- Skip permission checks
- Trust client-side auth state
- Expose service role key to browser
- Allow owner role changes by admins

## Resource Files

For detailed implementations, see:

- **`resources/supabase-auth-flows.md`** - Complete signup, login, logout flows
- **`resources/proxy-patterns.md`** - Route protection, session refresh (Next.js 16+ proxy)
- **`resources/permission-helpers.md`** - Complete permission helper functions

## Common Patterns

### Get User's Organizations

```typescript
const orgs = await prisma.organization.findMany({
  where: {
    account: {
      accountUsers: {
        some: { userId: user.id }
      }
    }
  },
  orderBy: { name: 'asc' }
})
```

### Check if User is Owner

```typescript
const isOwner = await prisma.accountUser.findFirst({
  where: {
    accountId,
    userId: user.id,
    role: 'owner'
  }
})

if (!isOwner) {
  throw new Error('Owner role required')
}
```

### Require Specific Permission

```typescript
async function requirePermission(
  userId: string,
  organizationId: string,
  permission: Permission
) {
  const allowed = await hasPermission(userId, organizationId, permission)

  if (!allowed) {
    throw new Error(`Permission denied: ${permission}`)
  }
}

// Usage
await requirePermission(user.id, orgId, 'connect_quickbooks')
```
