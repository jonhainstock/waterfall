# Middleware Patterns

Route protection and session management patterns for Next.js middleware.

## Basic Auth Middleware

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
          request.cookies.set({ name, value, ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options })
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Root route handling
  if (request.nextUrl.pathname === '/') {
    // Note: Actual redirect logic is in app/page.tsx (Server Component)
    // Middleware just ensures session is refreshed
    return response
  }

  // Public routes (allow without auth)
  const publicRoutes = ['/login', '/signup', '/forgot-password', '/reset-password']
  const isPublicRoute = publicRoutes.some(route =>
    request.nextUrl.pathname.startsWith(route)
  ) || request.nextUrl.pathname.startsWith('/accept-invitation/')

  if (isPublicRoute) {
    // If already authenticated, redirect away from auth pages
    if (user && (request.nextUrl.pathname === '/login' ||
                 request.nextUrl.pathname === '/signup')) {
      return NextResponse.redirect(new URL('/account/organizations', request.url))
    }
    return response
  }

  // Protected routes (require authentication)
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

## Organization Access Middleware

```typescript
// middleware.ts
export async function middleware(request: NextRequest) {
  // ... supabase setup ...

  const { data: { user } } = await supabase.auth.getUser()

  // Check organization access for org-scoped routes
  const orgMatch = request.nextUrl.pathname.match(/^\/([^\/]+)/)
  if (orgMatch && user) {
    const organizationId = orgMatch[1]

    // Skip non-org routes
    if (['login', 'signup', 'account', 'api'].includes(organizationId)) {
      return response
    }

    // Check if user can access this organization
    const hasAccess = await canAccessOrganization(user.id, organizationId)

    if (!hasAccess) {
      return NextResponse.redirect(new URL('/account/organizations', request.url))
    }
  }

  return response
}
```

## Rate Limiting Middleware

```typescript
// lib/rate-limit.ts
import { LRUCache } from 'lru-cache'

const rateLimitCache = new LRUCache({
  max: 500,
  ttl: 60000, // 1 minute
})

export function rateLimit(identifier: string, limit: number = 10): boolean {
  const count = (rateLimitCache.get(identifier) as number) || 0

  if (count >= limit) {
    return false // Rate limited
  }

  rateLimitCache.set(identifier, count + 1)
  return true // Allowed
}

// middleware.ts
export async function middleware(request: NextRequest) {
  // Rate limit by IP
  const ip = request.ip ?? 'unknown'

  if (request.nextUrl.pathname.startsWith('/api')) {
    const allowed = rateLimit(ip, 100) // 100 requests per minute

    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429 }
      )
    }
  }

  return response
}
```
