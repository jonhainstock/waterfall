/**
 * Supabase Client (Browser)
 *
 * Use this client in Client Components ("use client") for browser-side operations.
 * This client uses the anon key and respects Row Level Security (RLS).
 *
 * @example
 * ```typescript
 * 'use client'
 *
 * import { createClient } from '@/lib/supabase/client'
 *
 * export default function MyComponent() {
 *   const supabase = createClient()
 *
 *   async function loadData() {
 *     const { data, error } = await supabase
 *       .from('contracts')
 *       .select('*')
 *
 *     if (error) console.error(error)
 *     return data
 *   }
 *
 *   // ...
 * }
 * ```
 */

import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/supabase'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
