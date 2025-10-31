# Supabase Auth Flows

Complete authentication flows for Waterfall using Supabase Auth.

## Signup Flow

### Frontend Form

```typescript
// app/signup/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
      name: formData.get('name') as string,
      companyName: formData.get('companyName') as string,
      accountType: formData.get('accountType') as string, // "company" or "firm"
    }

    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const result = await res.json()

    if (!res.ok) {
      setError(result.error)
      setLoading(false)
      return
    }

    // Redirect based on account type
    if (data.accountType === 'company') {
      router.push('/organizations/first/quickbooks/connect')
    } else {
      router.push('/account/organizations')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="name" placeholder="Full Name" required />
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Password" required />
      <input name="companyName" placeholder="Company Name" required />

      <select name="accountType" required>
        <option value="company">My Company</option>
        <option value="firm">Accounting Firm</option>
      </select>

      {error && <div className="error">{error}</div>}

      <button type="submit" disabled={loading}>
        {loading ? 'Creating account...' : 'Sign Up'}
      </button>
    </form>
  )
}
```

### Backend API

```typescript
// app/api/auth/signup/route.ts
import { createClient } from '@/lib/supabase/server'
import { supabaseAdmin } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { email, password, name, companyName, accountType } = await request.json()

    // Validate input
    if (!email || !password || !name || !companyName || !accountType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create Supabase auth user
    const supabase = createClient()
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    // Use transaction to create account, user, account_user, organization
    await prisma.$transaction(async (tx) => {
      // Create account
      const account = await tx.account.create({
        data: {
          name: companyName,
          accountType,
          subscriptionTier: 'free',
          subscriptionStatus: 'trial',
          trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
        },
      })

      // Create user
      await tx.user.create({
        data: {
          id: authData.user.id,
          email: authData.user.email!,
          name,
        },
      })

      // Create account user (owner)
      await tx.accountUser.create({
        data: {
          accountId: account.id,
          userId: authData.user.id,
          role: 'owner',
        },
      })

      // Create first organization
      const orgName = accountType === 'company' ? companyName : 'Example Client'
      await tx.organization.create({
        data: {
          accountId: account.id,
          name: orgName,
        },
      })
    })

    return NextResponse.json({
      success: true,
      user: authData.user,
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

## Login Flow

### Frontend Form

```typescript
// app/login/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData(e.currentTarget)
    const data = {
      email: formData.get('email') as string,
      password: formData.get('password') as string,
    }

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const result = await res.json()

    if (!res.ok) {
      setError(result.error)
      setLoading(false)
      return
    }

    // Redirect to last organization or org list
    router.push(result.redirectTo || '/account/organizations')
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Password" required />

      {error && <div className="error">{error}</div>}

      <button type="submit" disabled={loading}>
        {loading ? 'Signing in...' : 'Sign In'}
      </button>
    </form>
  )
}
```

### Backend API

```typescript
// app/api/auth/login/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json()

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 })
    }

    // Fetch user's first organization for redirect
    const org = await prisma.organization.findFirst({
      where: {
        account: {
          accountUsers: {
            some: {
              userId: data.user.id,
            },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc', // Last used
      },
      select: {
        id: true,
      },
    })

    const redirectTo = org ? `/${org.id}/dashboard` : '/account/organizations'

    return NextResponse.json({
      success: true,
      user: data.user,
      redirectTo,
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

## Logout Flow

```typescript
// app/api/auth/logout/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  const supabase = createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

```typescript
// Component usage
'use client'

import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  return (
    <button onClick={handleLogout}>
      Sign Out
    </button>
  )
}
```

## Password Reset Flow

### Request Reset

```typescript
// app/api/auth/reset-password/route.ts
export async function POST(request: Request) {
  const { email } = await request.json()

  const supabase = createClient()
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password/confirm`,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

### Confirm Reset

```typescript
// app/auth/reset-password/confirm/page.tsx
'use client'

export default function ResetPasswordConfirmPage() {
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const formData = new FormData(e.currentTarget)
    const password = formData.get('password') as string

    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({
      password,
    })

    if (error) {
      console.error(error)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <input name="password" type="password" placeholder="New Password" />
      <button type="submit">Reset Password</button>
    </form>
  )
}
```

## Email Verification

```typescript
// Supabase automatically sends verification email on signup
// Configure email template in Supabase Dashboard

// Handle email confirmation
// app/auth/confirm/route.ts
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')

  if (token_hash && type) {
    const supabase = createClient()

    const { error } = await supabase.auth.verifyOtp({
      token_hash,
      type: type as any,
    })

    if (!error) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return NextResponse.redirect(new URL('/error', request.url))
}
```

## Session Helpers

### Get Current User (Server)

```typescript
import { createClient } from '@/lib/supabase/server'

export async function getCurrentUser() {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}
```

### Get Current User (Client)

```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'

export function useUser() {
  const [user, setUser] = useState(null)
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return user
}
```

## Error Handling

```typescript
function getAuthErrorMessage(error: any): string {
  switch (error.message) {
    case 'Invalid login credentials':
      return 'Invalid email or password'
    case 'Email not confirmed':
      return 'Please verify your email address'
    case 'User already registered':
      return 'An account with this email already exists'
    default:
      return error.message || 'An error occurred'
  }
}
```
