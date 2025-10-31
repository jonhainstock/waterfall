/**
 * Next.js Proxy (Next.js 16+)
 *
 * Handles:
 * - Session refresh (keeps users logged in)
 * - Protected route authentication
 * - Redirect logic (auth users away from login, unauth users to login)
 *
 * Note: This replaces the deprecated middleware.ts file in Next.js 16.
 */

import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico, sitemap.xml, robots.txt (metadata files)
     * - images (public image files)
     */
    '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
