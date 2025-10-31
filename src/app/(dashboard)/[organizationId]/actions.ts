/**
 * Organization Server Actions
 *
 * Server-side actions for organization operations (contract import, etc.)
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import {
  calculateMonthlyRecognition,
  generateRecognitionSchedule,
} from '@/lib/calculations/revenue-recognition'
import { addMonths, differenceInMonths, parse, startOfMonth } from 'date-fns'
import type { Database } from '@/types/supabase'

type ContractInsert = Database['public']['Tables']['contracts']['Insert']
type ScheduleInsert = Database['public']['Tables']['recognition_schedules']['Insert']

interface ContractImport {
  invoice_id: string
  customer_name: string | null
  description: string | null
  amount: string
  start_date: string
  end_date: string | null
  term_months: string | null
}

interface ImportResult {
  succeeded: number
  failed: number
  skipped: number
  error?: string
  duplicates?: string[]
}

interface DuplicateContract {
  invoice_id: string
  created_at: string
  contract_amount: number
}

interface CheckDuplicatesResult {
  duplicates: DuplicateContract[]
  error?: string
}

/**
 * Check for duplicate contracts before importing
 *
 * @param organizationId Organization ID
 * @param invoiceIds Array of invoice IDs to check
 * @returns List of existing contracts with matching invoice_ids
 */
export async function checkDuplicateContracts(
  organizationId: string,
  invoiceIds: string[]
): Promise<CheckDuplicatesResult> {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { duplicates: [], error: 'Not authenticated' }
  }

  // Verify user has access to this organization
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', organizationId)
    .eq('is_active', true)
    .single()

  if (!org) {
    return { duplicates: [], error: 'Organization not found' }
  }

  // Check for existing contracts with these invoice IDs
  const result = await supabase
    .from('contracts')
    .select('invoice_id, created_at, contract_amount')
    .eq('organization_id', organizationId)
    .in('invoice_id', invoiceIds)

  const existingContracts = result.data as DuplicateContract[] | null
  const error = result.error

  if (error) {
    return { duplicates: [], error: `Failed to check duplicates: ${error.message}` }
  }

  return {
    duplicates: (existingContracts || []).map((c) => ({
      invoice_id: c.invoice_id,
      created_at: c.created_at,
      contract_amount: c.contract_amount,
    })),
  }
}

export async function importContracts(
  organizationId: string,
  contracts: ContractImport[],
  skipInvoiceIds: string[] = []
): Promise<ImportResult> {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { succeeded: 0, failed: 0, skipped: 0, error: 'Not authenticated' }
  }

  // Verify user has access to this organization
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', organizationId)
    .eq('is_active', true)
    .single()

  if (!org) {
    return { succeeded: 0, failed: 0, skipped: 0, error: 'Organization not found' }
  }

  let succeeded = 0
  let failed = 0
  let skipped = 0
  const errors: string[] = []
  const duplicates: string[] = []

  for (const contractData of contracts) {
    // Skip if this invoice_id is in the skipInvoiceIds list
    if (skipInvoiceIds.includes(contractData.invoice_id)) {
      skipped++
      duplicates.push(contractData.invoice_id)
      continue
    }

    try {
      // Validate and parse data
      const amount = parseFloat(contractData.amount)
      if (isNaN(amount) || amount <= 0) {
        throw new Error(`Invalid amount: ${contractData.amount}`)
      }

      // Parse dates
      const startDate = parse(contractData.start_date, 'yyyy-MM-dd', new Date())
      if (isNaN(startDate.getTime())) {
        throw new Error(`Invalid start_date: ${contractData.start_date}`)
      }

      let endDate: Date
      let termMonths: number

      if (contractData.end_date) {
        // Calculate term_months from end_date
        endDate = parse(contractData.end_date, 'yyyy-MM-dd', new Date())
        if (isNaN(endDate.getTime())) {
          throw new Error(`Invalid end_date: ${contractData.end_date}`)
        }
        if (endDate <= startDate) {
          throw new Error('end_date must be after start_date')
        }
        termMonths = differenceInMonths(endDate, startDate) + 1
      } else if (contractData.term_months) {
        // Calculate end_date from term_months
        termMonths = parseInt(contractData.term_months)
        if (isNaN(termMonths) || termMonths <= 0) {
          throw new Error(`Invalid term_months: ${contractData.term_months}`)
        }
        endDate = addMonths(startDate, termMonths - 1)
      } else {
        throw new Error('Must provide either end_date or term_months')
      }

      // Calculate monthly recognition amount
      const monthlyRecognition = calculateMonthlyRecognition(amount, termMonths)

      // Prepare contract insert payload
      const contractPayload: ContractInsert = {
        organization_id: organizationId,
        invoice_id: contractData.invoice_id,
        customer_name: contractData.customer_name,
        description: contractData.description,
        contract_amount: amount,
        start_date: contractData.start_date,
        end_date: endDate.toISOString().split('T')[0],
        term_months: termMonths,
        monthly_recognition: parseFloat(monthlyRecognition),
        status: 'active',
      }

      // Insert contract
      const result = await supabase
        .from('contracts')
        .insert(contractPayload)
        .select('id')
        .single()

      if (result.error || !result.data) {
        throw new Error(`Database error: ${result.error?.message || 'No contract returned'}`)
      }

      const contractId = result.data.id as string

      // Generate recognition schedule
      const schedule = generateRecognitionSchedule(amount, termMonths)

      // Create schedule entries
      const scheduleEntries: ScheduleInsert[] = schedule.map(
        (recognitionAmount, index) => {
          const recognitionMonth = startOfMonth(addMonths(startDate, index))

          return {
            contract_id: contractId,
            organization_id: organizationId,
            recognition_month: recognitionMonth.toISOString().split('T')[0],
            recognition_amount: parseFloat(recognitionAmount),
            posted: false,
          }
        }
      )

      const { error: scheduleError } = await supabase
        .from('recognition_schedules')
        .insert(scheduleEntries)

      if (scheduleError) {
        // If schedule insert fails, delete the contract
        await supabase.from('contracts').delete().eq('id', contractId)
        throw new Error(`Failed to create schedule: ${scheduleError.message}`)
      }

      succeeded++
    } catch (error) {
      failed++
      errors.push(
        `${contractData.invoice_id}: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  // Log import
  await supabase.from('import_logs').insert({
    organization_id: organizationId,
    imported_by: user.id,
    filename: 'import.csv',
    rows_processed: contracts.length,
    rows_succeeded: succeeded,
    rows_failed: failed,
    error_details: failed > 0 ? { errors } : null,
  })

  // Revalidate the organization page
  revalidatePath(`/${organizationId}`)

  if (failed > 0 && succeeded === 0 && skipped === 0) {
    return {
      succeeded,
      failed,
      skipped,
      error: `All imports failed. First error: ${errors[0]}`,
    }
  }

  return {
    succeeded,
    failed,
    skipped,
    duplicates: duplicates.length > 0 ? duplicates : undefined,
  }
}

interface ActivityFeedItem {
  id: string
  type: 'import' | 'post'
  created_at: string
  user_name: string | null
  metadata: {
    // For imports
    succeeded?: number
    failed?: number
    skipped?: number
    filename?: string
    // For posts
    month?: string
    amount?: number
    journal_entry_id?: string
  }
}

interface ActivityFeedResult {
  activities: ActivityFeedItem[]
  error?: string
}

interface PostToAccountingResult {
  success: boolean
  journalEntryId?: string
  error?: string
  platform?: string
}

// For backward compatibility
type PostToQuickBooksResult = PostToAccountingResult

/**
 * Post a month's revenue recognition to accounting platform
 *
 * Platform-agnostic implementation that works with QuickBooks, Xero, or any
 * configured accounting platform. Uses the adapter pattern to handle
 * platform-specific API calls.
 */
export async function postMonthToAccounting(
  organizationId: string,
  month: string
): Promise<PostToAccountingResult> {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Verify user has access to this organization
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', organizationId)
    .eq('is_active', true)
    .single()

  if (!org) {
    return { success: false, error: 'Organization not found' }
  }

  // Get accounting integration for this organization
  const { data: integration } = await supabase
    .from('accounting_integrations')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .single()

  if (!integration) {
    return { success: false, error: 'No accounting platform connected' }
  }

  // Check if account mapping exists
  if (!integration.account_mapping) {
    return { success: false, error: 'Account mapping not configured' }
  }

  // TODO: Check if user has post_to_accounting permission
  // const canPost = await hasPermission(user.id, organizationId, 'post_to_quickbooks')
  // if (!canPost) return { success: false, error: 'Permission denied' }

  // Get schedules for this month
  const schedulesResult = await supabase
    .from('recognition_schedules')
    .select('id, recognition_amount, posted')
    .eq('organization_id', organizationId)
    .eq('recognition_month', month)

  const schedules = schedulesResult.data as Array<{
    id: string
    recognition_amount: number
    posted: boolean
  }> | null
  const fetchError = schedulesResult.error

  if (fetchError || !schedules) {
    return { success: false, error: 'Failed to fetch schedules' }
  }

  if (schedules.length === 0) {
    return { success: false, error: 'No schedules found for this month' }
  }

  // Check if already posted
  const alreadyPosted = schedules.some((s) => s.posted)
  if (alreadyPosted) {
    return {
      success: false,
      error: `Month already posted to ${integration.platform}`,
    }
  }

  // Calculate total amount
  const totalAmount = schedules.reduce((sum, s) => sum + s.recognition_amount, 0)

  // Get the accounting provider for this platform
  const { getAccountingProvider } = await import('@/lib/accounting/provider-factory')
  const provider = getAccountingProvider(integration.platform as any)

  // Prepare tokens
  const tokens = {
    accessToken: integration.access_token || '',
    refreshToken: integration.refresh_token || '',
    expiresAt: integration.expires_at || '',
    realmId: integration.realm_id || '',
  }

  // Prepare journal entry parameters
  const accountMapping = integration.account_mapping as any
  const lastDayOfMonth = new Date(month)
  lastDayOfMonth.setMonth(lastDayOfMonth.getMonth() + 1)
  lastDayOfMonth.setDate(0) // Last day of the month

  const journalEntryParams = {
    date: lastDayOfMonth.toISOString().split('T')[0],
    memo: `Waterfall - Revenue Recognition for ${month}`,
    lines: [
      {
        accountId: accountMapping.deferredRevenueAccountId,
        description: 'Deferred Revenue Recognition',
        debit: totalAmount,
      },
      {
        accountId: accountMapping.revenueAccountId,
        description: 'Revenue Recognition',
        credit: totalAmount,
      },
    ],
  }

  // Post journal entry using the provider
  const result = await provider.postJournalEntry(tokens, journalEntryParams)

  if (!result.success) {
    return {
      success: false,
      error: result.error || 'Failed to post journal entry',
    }
  }

  // Update schedules to mark as posted
  const scheduleIds = schedules.map((s) => s.id)
  const { error: updateError } = await supabase
    .from('recognition_schedules')
    .update({
      posted: true,
      posted_at: new Date().toISOString(),
      posted_by: user.id,
      journal_entry_id: result.entryId || null,
    })
    .in('id', scheduleIds)

  if (updateError) {
    return { success: false, error: `Failed to update schedules: ${updateError.message}` }
  }

  // Revalidate the organization page
  revalidatePath(`/${organizationId}`)

  return {
    success: true,
    journalEntryId: result.entryId,
    platform: integration.platform,
  }
}

/**
 * Post a month's revenue recognition to QuickBooks (DEPRECATED)
 *
 * @deprecated Use postMonthToAccounting() instead
 *
 * This is kept for backward compatibility with existing UI components.
 * It's a simple wrapper around postMonthToAccounting().
 */
export async function postMonthToQuickBooks(
  organizationId: string,
  month: string
): Promise<PostToQuickBooksResult> {
  // Wrapper for backward compatibility - delegates to platform-agnostic function
  return await postMonthToAccounting(organizationId, month)
}

/**
 * Get activity feed for an organization
 *
 * Fetches recent imports and posts in chronological order
 */
export async function getActivityFeed(
  organizationId: string
): Promise<ActivityFeedResult> {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { activities: [], error: 'Not authenticated' }
  }

  // Verify user has access to this organization
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', organizationId)
    .eq('is_active', true)
    .single()

  if (!org) {
    return { activities: [], error: 'Organization not found' }
  }

  // Fetch import logs
  const { data: imports } = await supabase
    .from('import_logs')
    .select(
      `
      id,
      created_at,
      filename,
      rows_succeeded,
      rows_failed,
      imported_by,
      users:imported_by(name)
    `
    )
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .limit(50)

  // Fetch posted schedules (grouped by month)
  const { data: posts } = await supabase
    .from('recognition_schedules')
    .select(
      `
      id,
      recognition_month,
      recognition_amount,
      journal_entry_id,
      posted_at,
      posted_by,
      users:posted_by(name)
    `
    )
    .eq('organization_id', organizationId)
    .eq('posted', true)
    .not('posted_at', 'is', null)
    .order('posted_at', { ascending: false })
    .limit(50)

  // Combine and format activities
  const activities: ActivityFeedItem[] = []

  // Add imports
  if (imports) {
    imports.forEach((imp: any) => {
      activities.push({
        id: imp.id,
        type: 'import',
        created_at: imp.created_at,
        user_name: imp.users?.name || null,
        metadata: {
          succeeded: imp.rows_succeeded,
          failed: imp.rows_failed,
          filename: imp.filename,
        },
      })
    })
  }

  // Add posts (group by month to avoid duplicates)
  const postedMonths = new Map<string, any>()
  if (posts) {
    posts.forEach((post: any) => {
      const month = post.recognition_month
      if (!postedMonths.has(month)) {
        postedMonths.set(month, {
          id: post.id,
          posted_at: post.posted_at,
          user_name: post.users?.name || null,
          amount: post.recognition_amount,
          journal_entry_id: post.journal_entry_id,
        })
      } else {
        // Sum up amounts for the same month
        const existing = postedMonths.get(month)
        existing.amount += post.recognition_amount
      }
    })

    postedMonths.forEach((postData, month) => {
      activities.push({
        id: postData.id,
        type: 'post',
        created_at: postData.posted_at,
        user_name: postData.user_name,
        metadata: {
          month,
          amount: postData.amount,
          journal_entry_id: postData.journal_entry_id,
        },
      })
    })
  }

  // Sort by created_at descending
  activities.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return { activities }
}

/**
 * Update Organization Name
 */
export async function updateOrganizationName(
  organizationId: string,
  newName: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Validate input
  if (!newName || newName.trim().length === 0) {
    return { success: false, error: 'Organization name is required' }
  }

  if (newName.trim().length > 100) {
    return { success: false, error: 'Organization name must be less than 100 characters' }
  }

  // Verify user has access to this organization (RLS will also enforce this)
  const { data: org } = await supabase
    .from('organizations')
    .select('id, account_id')
    .eq('id', organizationId)
    .single()

  if (!org) {
    return { success: false, error: 'Organization not found' }
  }

  // Update the organization name
  const { error } = await supabase
    .from('organizations')
    .update({ name: newName.trim(), updated_at: new Date().toISOString() })
    .eq('id', organizationId)

  if (error) {
    console.error('Failed to update organization name:', error)
    return { success: false, error: 'Failed to update organization name' }
  }

  // Revalidate the organization page
  revalidatePath(`/${organizationId}`)
  revalidatePath('/account/organizations')

  return { success: true }
}
