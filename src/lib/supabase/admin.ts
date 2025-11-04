/**
 * Supabase Admin Client (Service Role)
 *
 * ⚠️ WARNING: This client uses the service role key and BYPASSES Row Level Security!
 *
 * Use ONLY in trusted server-side code for:
 * - User signup flow (creating user/account/org records)
 * - System operations (background jobs, migrations)
 * - Bulk data operations (imports, exports)
 * - Admin dashboard features
 *
 * NEVER use in client components or expose the service role key to the browser!
 *
 * Security Guidelines:
 * - Only use in Server Components, Server Actions, or API Routes
 * - Always validate permissions in application code before using
 * - Log all admin operations for audit trail
 * - Never return service role client to client-side code
 *
 * @example Signup Flow
 * ```typescript
 * 'use server'
 *
 * import { createAdminClient } from '@/lib/supabase/admin'
 *
 * export async function signupUser(email: string, password: string, name: string) {
 *   const supabase = createAdminClient()
 *
 *   // 1. Create auth user
 *   const { data: authUser, error: authError } = await supabase.auth.signUp({
 *     email,
 *     password,
 *   })
 *   if (authError) throw authError
 *
 *   // 2. Create user record (bypassing RLS)
 *   const { data: user, error: userError } = await supabase
 *     .from('users')
 *     .insert({
 *       id: authUser.user!.id,
 *       email,
 *       name,
 *     })
 *     .select()
 *     .single()
 *
 *   if (userError) throw userError
 *
 *   // 3. Create account + organization + account_user
 *   // ... (bypassing RLS for initial setup)
 *
 *   return user
 * }
 * ```
 *
 * @example Bulk Import
 * ```typescript
 * 'use server'
 *
 * import { createAdminClient } from '@/lib/supabase/admin'
 * import { getCurrentUser } from '@/lib/auth/helpers'
 *
 * export async function bulkImportContracts(
 *   organizationId: string,
 *   contracts: Contract[]
 * ) {
 *   // 1. Check user has permission
 *   const user = await getCurrentUser()
 *   const hasPermission = await checkPermission(user.id, organizationId, 'manage_contracts')
 *   if (!hasPermission) throw new Error('Unauthorized')
 *
 *   // 2. Use admin client for bulk insert (faster than RLS queries)
 *   const supabase = createAdminClient()
 *
 *   const { data, error } = await supabase
 *     .from('contracts')
 *     .insert(contracts)
 *     .select()
 *
 *   if (error) throw error
 *   return data
 * }
 * ```
 */

import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
