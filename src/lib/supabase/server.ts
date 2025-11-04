/**
 * Supabase Client (Server)
 *
 * Use this client in Server Components, Server Actions, and Route Handlers.
 * This client reads the user session from cookies and respects Row Level Security (RLS).
 *
 * IMPORTANT: This is an async function that creates a new client instance.
 * Call it each time you need a server-side Supabase client.
 *
 * @example Server Component
 * ```typescript
 * import { createClient } from '@/lib/supabase/server'
 *
 * export default async function Page() {
 *   const supabase = await createClient()
 *
 *   const { data, error } = await supabase
 *     .from('contracts')
 *     .select('*')
 *
 *   if (error) throw error
 *
 *   return <div>{data.length} contracts</div>
 * }
 * ```
 *
 * @example Server Action
 * ```typescript
 * 'use server'
 *
 * import { createClient } from '@/lib/supabase/server'
 *
 * export async function createContract(formData: FormData) {
 *   const supabase = await createClient()
 *
 *   const { data, error } = await supabase
 *     .from('contracts')
 *     .insert({
 *       organization_id: formData.get('organization_id'),
 *       // ...
 *     })
 *     .select()
 *     .single()
 *
 *   if (error) throw error
 *   return data
 * }
 * ```
 *
 * @example Route Handler
 * ```typescript
 * import { createClient } from '@/lib/supabase/server'
 * import { NextResponse } from 'next/server'
 *
 * export async function GET() {
 *   const supabase = await createClient()
 *
 *   const { data, error } = await supabase
 *     .from('contracts')
 *     .select('*')
 *
 *   if (error) {
 *     return NextResponse.json({ error: error.message }, { status: 500 })
 *   }
 *
 *   return NextResponse.json(data)
 * }
 * ```
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Database } from '@/types/supabase'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
