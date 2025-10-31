/**
 * Header Component
 *
 * Main navigation header with organization switcher and user menu.
 */

import { createClient } from '@/lib/supabase/server'
import { OrganizationSwitcher } from './organization-switcher'
import { UserMenu } from './user-menu'

export async function Header() {
  const supabase = await createClient()

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  // Get user's organizations
  const { data: organizations } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('is_active', true)
    .order('name', { ascending: true })

  // Get user details
  const userProfileResult: any = await supabase
    .from('users')
    .select('name, email')
    .eq('id', user.id)
    .single()

  const userProfile = userProfileResult.data

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="flex h-16 items-center justify-between px-4">
        {/* Left: Organization Switcher */}
        <div className="flex items-center gap-4">
          <div className="text-xl font-bold text-gray-900">Waterfall</div>
          {organizations && organizations.length > 0 && (
            <OrganizationSwitcher organizations={organizations} />
          )}
        </div>

        {/* Right: User Menu */}
        <UserMenu
          user={{
            name: userProfile?.name || user.email || 'User',
            email: userProfile?.email || user.email || '',
          }}
        />
      </div>
    </header>
  )
}
