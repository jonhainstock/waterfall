/**
 * Helper functions for logging journal entry posting attempts
 * Tracks all JE posts to QuickBooks/Xero (both mocked and real)
 */

import { createClient } from '@/lib/supabase/server'

export type JournalEntryType = 'recognition' | 'adjustment' | 'reversal'
export type JournalEntryStatus = 'pending' | 'mocked' | 'posted' | 'failed'

export interface LogJournalEntryParams {
  organizationId: string
  accountingIntegrationId?: string | null
  entryType: JournalEntryType
  scheduleIds: string[]
  postingMonth: string // YYYY-MM-DD format
  totalAmount: number
  externalEntryId?: string | null // QuickBooks JE ID or Xero Manual Journal ID
  isMocked: boolean
  status: JournalEntryStatus
  errorMessage?: string | null
  requestPayload?: Record<string, unknown> | null
  responsePayload?: Record<string, unknown> | null
  postedBy?: string | null
}

/**
 * Log a journal entry posting attempt to the database
 * Call this for every JE post (success or failure, mocked or real)
 */
export async function logJournalEntry(
  params: LogJournalEntryParams
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    const { error } = await supabase.from('journal_entry_log').insert({
      organization_id: params.organizationId,
      accounting_integration_id: params.accountingIntegrationId,
      entry_type: params.entryType,
      recognition_schedule_ids: params.scheduleIds,
      posting_month: params.postingMonth,
      total_amount: params.totalAmount,
      external_entry_id: params.externalEntryId,
      is_mocked: params.isMocked,
      posted_at: params.status === 'posted' || params.status === 'mocked' ? new Date().toISOString() : null,
      posted_by: params.postedBy,
      status: params.status,
      error_message: params.errorMessage,
      request_payload: params.requestPayload,
      response_payload: params.responsePayload,
    })

    if (error) {
      console.error('Failed to log journal entry:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Failed to log journal entry:', message)
    return { success: false, error: message }
  }
}

/**
 * Get journal entry logs for an organization
 * Useful for displaying posting history and reconciliation
 */
export async function getJournalEntryLogs(
  organizationId: string,
  filters?: {
    entryType?: JournalEntryType
    status?: JournalEntryStatus
    isMocked?: boolean
    startMonth?: string
    endMonth?: string
  }
) {
  const supabase = await createClient()

  let query = supabase
    .from('journal_entry_log')
    .select('*')
    .eq('organization_id', organizationId)
    .order('posting_month', { ascending: false })
    .order('created_at', { ascending: false })

  if (filters?.entryType) {
    query = query.eq('entry_type', filters.entryType)
  }

  if (filters?.status) {
    query = query.eq('status', filters.status)
  }

  if (filters?.isMocked !== undefined) {
    query = query.eq('is_mocked', filters.isMocked)
  }

  if (filters?.startMonth) {
    query = query.gte('posting_month', filters.startMonth)
  }

  if (filters?.endMonth) {
    query = query.lte('posting_month', filters.endMonth)
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch journal entry logs:', error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

/**
 * Get failed journal entry posts (for error reporting/retry)
 */
export async function getFailedJournalEntries(organizationId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('journal_entry_log')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('status', 'failed')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch failed journal entries:', error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}
