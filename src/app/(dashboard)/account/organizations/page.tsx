/**
 * Organizations List Page
 *
 * Displays all organizations the user has access to.
 * Allows creating new organizations (if user has permission).
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function OrganizationsPage() {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Get user's organizations with accounting integrations (RLS automatically filters)
  const { data: organizations, error } = await supabase
    .from('organizations')
    .select(`
      id,
      name,
      is_active,
      created_at,
      account:accounts(
        id,
        name,
        account_type,
        subscription_tier
      ),
      accounting_integrations(
        platform,
        is_active
      )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to load organizations:', error)
  }

  // Get user's account memberships to check role
  const { data: memberships } = await supabase
    .from('account_users')
    .select('account_id, role')
    .eq('user_id', user.id)

  const canCreateOrg = memberships?.some(
    (m: { role: string }) => m.role === 'owner' || m.role === 'admin'
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <h1 className="text-gray-900">Organizations</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage your client organizations
            </p>
          </div>
          <div className="mt-4 sm:mt-0">
            {canCreateOrg && (
              <Link
                href="/account/organizations/new"
                className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Add Organization
              </Link>
            )}
          </div>
        </div>

        {/* Organizations List */}
        <div className="mt-8">
          {!organizations || organizations.length === 0 ? (
            <div className="rounded-lg border-2 border-dashed border-gray-300 p-12 text-center">
              <h3 className="text-gray-900">
                No organizations yet
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {canCreateOrg
                  ? 'Get started by creating your first organization.'
                  : 'Ask your account administrator to add an organization.'}
              </p>
              {canCreateOrg && (
                <div className="mt-6">
                  <Link
                    href="/account/organizations/new"
                    className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Add Organization
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {organizations.map((org: any) => (
                <Link
                  key={org.id}
                  href={`/${org.id}`}
                  className="group relative rounded-lg border border-gray-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="text-gray-900 group-hover:text-blue-600">
                        {org.name}
                      </h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {org.account.name}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                    {org.accounting_integrations?.[0]?.platform ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-green-700">
                        <svg
                          className="h-3 w-3"
                          fill="currentColor"
                          viewBox="0 0 8 8"
                        >
                          <circle cx="4" cy="4" r="3" />
                        </svg>
                        {org.accounting_integrations[0].platform === 'quickbooks' ? 'QuickBooks' : 'Xero'} Connected
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-gray-600">
                        <svg
                          className="h-3 w-3"
                          fill="currentColor"
                          viewBox="0 0 8 8"
                        >
                          <circle cx="4" cy="4" r="3" />
                        </svg>
                        Not Connected
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
