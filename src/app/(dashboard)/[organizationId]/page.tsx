/**
 * Organization Page
 *
 * Main page for an organization showing:
 * - Contract import section
 * - Waterfall schedule table
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ImportButton } from '@/components/contracts/import-button'
import { QuickBooksButton } from '@/components/quickbooks/quickbooks-button'
import { OrganizationTabs } from '@/components/organizations/organization-tabs'

export default async function OrganizationPage({
  params,
  searchParams,
}: {
  params: Promise<{ organizationId: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { organizationId } = await params
  const { tab } = await searchParams
  const activeTab = tab || 'waterfall'
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch organization details (RLS will enforce access)
  const orgResult: any = await supabase
    .from('organizations')
    .select(
      `
      id,
      name,
      quickbooks_realm_id,
      account:accounts(
        id,
        name
      )
    `
    )
    .eq('id', organizationId)
    .eq('is_active', true)
    .single()

  if (orgResult.error || !orgResult.data) {
    redirect('/account/organizations')
  }

  const organization = orgResult.data

  // Fetch contracts for this organization
  const { data: contracts } = await supabase
    .from('contracts')
    .select(
      `
      id,
      invoice_id,
      customer_name,
      contract_amount,
      start_date,
      end_date,
      term_months,
      status
    `
    )
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .order('start_date', { ascending: false })

  // Fetch recognition schedules
  const { data: schedules } = await supabase
    .from('recognition_schedules')
    .select(
      `
      id,
      contract_id,
      recognition_month,
      recognition_amount,
      posted,
      posted_at,
      posted_by,
      journal_entry_id
    `
    )
    .eq('organization_id', organizationId)
    .order('recognition_month', { ascending: true })

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {organization.name}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Revenue recognition and waterfall schedule
          </p>
        </div>
        <div className="mt-4 flex gap-3 sm:mt-0">
          <QuickBooksButton organizationId={organizationId} />
          <ImportButton organizationId={organizationId} />
        </div>
      </div>

      {/* Tabs */}
      <OrganizationTabs
        organizationId={organizationId}
        activeTab={activeTab}
        contracts={contracts || []}
        schedules={schedules || []}
      />
    </div>
  )
}
