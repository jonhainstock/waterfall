/**
 * Create New Organization Page
 *
 * Allows users to create a new organization.
 * Only accessible to account owners and admins.
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NewOrganizationForm } from '@/components/organizations/new-organization-form'

export default async function NewOrganizationPage() {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user's account memberships
  const { data: memberships, error } = await supabase
    .from('account_users')
    .select(`
      account_id,
      role,
      account:accounts(
        id,
        name,
        subscription_tier
      )
    `)
    .eq('user_id', user.id)

  if (error || !memberships || memberships.length === 0) {
    redirect('/account/organizations')
  }

  // Filter to accounts where user is owner or admin
  const adminAccounts = memberships.filter(
    (m: any) => m.role === 'owner' || m.role === 'admin'
  )

  if (adminAccounts.length === 0) {
    redirect('/account/organizations')
  }

  // Prepare account options for the form
  const accounts = adminAccounts.map((m: any) => ({
    id: m.account.id,
    name: m.account.name,
    subscriptionTier: m.account.subscription_tier,
  }))

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Create New Organization
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Add a new client organization to your account
          </p>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <NewOrganizationForm accounts={accounts} />
        </div>
      </div>
    </div>
  )
}
