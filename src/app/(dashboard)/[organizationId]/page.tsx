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
import { WaterfallTable } from '@/components/schedule/waterfall-table'

export default async function OrganizationPage({
  params,
}: {
  params: Promise<{ organizationId: string }>
}) {
  const { organizationId } = await params
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
      posted
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
        <div className="mt-4 sm:mt-0">
          <ImportButton organizationId={organizationId} />
        </div>
      </div>

      {/* Waterfall Table */}
      <div className="mt-8">
        {!contracts || contracts.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No contracts yet
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Get started by importing your contract data via CSV.
            </p>
            <div className="mt-6">
              <ImportButton organizationId={organizationId} />
            </div>
          </div>
        ) : (
          <WaterfallTable
            contracts={contracts || []}
            schedules={schedules || []}
          />
        )}
      </div>
    </div>
  )
}
