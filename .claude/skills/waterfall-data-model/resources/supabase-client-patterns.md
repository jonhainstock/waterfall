# Supabase Client Patterns

Guide to using Supabase clients correctly in Next.js App Router with Server and Client Components.

## Two Types of Clients

### Server Client (`lib/supabase/server.ts`)

**Use in:**
- Server Components
- API Routes
- Server Actions
- Middleware

**Characteristics:**
- Reads user session from cookies
- Can use service role key (bypasses RLS)
- Does NOT work in browser
- Created fresh for each request

### Browser Client (`lib/supabase/client.ts`)

**Use in:**
- Client Components ("use client")
- Browser-side code
- Real-time subscriptions

**Characteristics:**
- Reads user session from browser storage
- Always subject to RLS
- NEVER has service role key
- Singleton instance

## Client Implementation

### Server Client

```typescript
// lib/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
```

### Browser Client

```typescript
// lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Service Role Client (Admin)

```typescript
// lib/supabase/admin.ts
import { createClient } from '@supabase/supabase-js'

export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // ⚠️ Bypasses RLS!
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)
```

**⚠️ Use service role client ONLY:**
- In trusted server-side code
- When you need to bypass RLS
- For admin operations (signup, system tasks)
- NEVER expose to browser

## Usage Patterns

### Server Component

```typescript
// app/[organizationId]/dashboard/page.tsx
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage({
  params
}: {
  params: { organizationId: string }
}) {
  const supabase = createClient()

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Query data (RLS automatically enforced)
  const { data: contracts } = await supabase
    .from('contracts')
    .select('*')
    .eq('organization_id', params.organizationId)

  return (
    <div>
      <h1>Dashboard</h1>
      {contracts?.map(contract => (
        <div key={contract.id}>{contract.invoice_id}</div>
      ))}
    </div>
  )
}
```

### Client Component

```typescript
// components/contracts/contract-form.tsx
'use client'

import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'

export function ContractForm({ organizationId }: { organizationId: string }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)

    const { error } = await supabase
      .from('contracts')
      .insert({
        organization_id: organizationId,
        invoice_id: formData.get('invoiceId'),
        contract_amount: formData.get('amount'),
        // ... other fields
      })

    if (error) {
      console.error(error)
      // Show error toast
    }

    setLoading(false)
  }

  return (
    <form action={handleSubmit}>
      {/* Form fields */}
    </form>
  )
}
```

### API Route

```typescript
// app/api/organizations/[id]/contracts/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createClient()

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Query contracts (RLS enforced)
  const { data: contracts, error } = await supabase
    .from('contracts')
    .select('*, recognition_schedules(*)')
    .eq('organization_id', params.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ contracts })
}
```

### Server Action

```typescript
// app/actions/contracts.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function deleteContract(contractId: string) {
  const supabase = createClient()

  // Check auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  // Delete contract (RLS ensures user has access)
  const { error } = await supabase
    .from('contracts')
    .delete()
    .eq('id', contractId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/[organizationId]/contracts')
  return { success: true }
}
```

### Middleware (Session Refresh)

```typescript
// middleware.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // Refresh session if expired
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

## Authentication Patterns

### Get Current User

```typescript
// Server Component or API Route
const supabase = createClient()
const { data: { user }, error } = await supabase.auth.getUser()

if (!user) {
  redirect('/login')
}
```

### Sign Up

```typescript
// app/api/auth/signup/route.ts
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  const { email, password, name, companyName, accountType } = await request.json()

  // Create auth user (use regular client for user context)
  const supabase = createClient()
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  })

  if (authError || !authData.user) {
    return NextResponse.json({ error: authError?.message }, { status: 400 })
  }

  // Create account + user + organization (use admin client to bypass RLS)
  const { data: account, error: accountError } = await supabaseAdmin
    .from('accounts')
    .insert({
      name: companyName,
      account_type: accountType,
    })
    .select()
    .single()

  if (accountError) {
    return NextResponse.json({ error: accountError.message }, { status: 500 })
  }

  // Create user record
  await supabaseAdmin
    .from('users')
    .insert({
      id: authData.user.id,
      email: authData.user.email,
      name,
    })

  // Create account user (owner)
  await supabaseAdmin
    .from('account_users')
    .insert({
      account_id: account.id,
      user_id: authData.user.id,
      role: 'owner',
    })

  // Create first organization
  await supabaseAdmin
    .from('organizations')
    .insert({
      account_id: account.id,
      name: companyName,
    })

  return NextResponse.json({ success: true })
}
```

### Sign In

```typescript
// app/api/auth/login/route.ts
import { createClient } from '@/lib/supabase/server'

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

  return NextResponse.json({ user: data.user })
}
```

### Sign Out

```typescript
// app/api/auth/logout/route.ts
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

## Real-Time Subscriptions

```typescript
// components/contracts/contract-list.tsx
'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export function ContractList({ organizationId }: { organizationId: string }) {
  const supabase = createClient()
  const [contracts, setContracts] = useState([])

  useEffect(() => {
    // Subscribe to changes
    const channel = supabase
      .channel('contracts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'contracts',
          filter: `organization_id=eq.${organizationId}`,
        },
        (payload) => {
          console.log('Change received!', payload)
          // Update local state
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [organizationId])

  return <div>{/* Render contracts */}</div>
}
```

## Error Handling

```typescript
const { data, error } = await supabase
  .from('contracts')
  .select('*')

if (error) {
  // RLS denial returns error
  if (error.code === 'PGRST116') {
    // No rows found (could be RLS or empty result)
    return []
  }

  // Other errors
  console.error('Database error:', error)
  throw new Error(error.message)
}

return data
```

## Best Practices

**Always:**
- Use server client in Server Components
- Use browser client in Client Components
- Check authentication before querying
- Handle RLS errors gracefully
- Use middleware to refresh sessions

**Never:**
- Use browser client on server
- Use server client in browser
- Expose service role key to browser
- Skip authentication checks
- Ignore error responses

## Common Pitfalls

### 1. Wrong Client in Wrong Context

```typescript
// ❌ BAD - Server client in Client Component
'use client'
import { createClient } from '@/lib/supabase/server' // Wrong!

// ✅ GOOD
'use client'
import { createClient } from '@/lib/supabase/client'
```

### 2. Not Checking Auth

```typescript
// ❌ BAD - No auth check
const { data } = await supabase.from('contracts').select('*')

// ✅ GOOD
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
  return { error: 'Unauthorized' }
}
const { data } = await supabase.from('contracts').select('*')
```

### 3. Ignoring RLS Errors

```typescript
// ❌ BAD - Silent failure
const { data } = await supabase.from('contracts').select('*')
return data || []

// ✅ GOOD - Handle errors
const { data, error } = await supabase.from('contracts').select('*')
if (error) {
  console.error(error)
  throw new Error('Failed to fetch contracts')
}
return data
```

## TypeScript Types

```typescript
import { Database } from '@/types/supabase'

const supabase = createClient<Database>()

// Type-safe queries
const { data } = await supabase
  .from('contracts')
  .select('*')
  .eq('organization_id', orgId)

// data is typed as Contract[]
```

Generate types from Supabase:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > types/supabase.ts
```
