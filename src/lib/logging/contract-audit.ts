/**
 * Helper functions for logging contract changes
 * Tracks all contract edits, cancellations, and deletions
 */

import { createClient } from '@/lib/supabase/server'

export type ContractAction = 'created' | 'updated' | 'cancelled' | 'deleted'
export type AdjustmentMode = 'retroactive' | 'catch_up' | 'prospective' | 'none'
export type PostingStatus = 'not_applicable' | 'pending' | 'mocked' | 'posted' | 'failed'

export interface LogContractAuditParams {
  contractId: string
  organizationId: string
  action: ContractAction
  changedBy: string
  changedFields: string[]
  oldValues: Record<string, unknown>
  newValues?: Record<string, unknown> | null
  adjustmentMode?: AdjustmentMode | null
  catchUpMonth?: string | null // YYYY-MM-DD format
  adjustmentEntryIds?: string[] | null
  postingStatus?: PostingStatus | null
  postingError?: string | null
  notes?: string | null
}

/**
 * Log a contract change to the audit table
 * Call this for every contract update, cancellation, or deletion
 */
export async function logContractAudit(
  params: LogContractAuditParams
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  try {
    const { error } = await supabase.from('contract_audit_log').insert({
      contract_id: params.contractId,
      organization_id: params.organizationId,
      action: params.action,
      changed_by: params.changedBy,
      changed_fields: params.changedFields,
      old_values: params.oldValues,
      new_values: params.newValues,
      adjustment_mode: params.adjustmentMode,
      catch_up_month: params.catchUpMonth,
      adjustment_entry_ids: params.adjustmentEntryIds,
      posting_status: params.postingStatus,
      posting_error: params.postingError,
      notes: params.notes,
    })

    if (error) {
      console.error('Failed to log contract audit:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Failed to log contract audit:', message)
    return { success: false, error: message }
  }
}

/**
 * Get audit history for a specific contract
 */
export async function getContractAuditHistory(contractId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('contract_audit_log')
    .select(
      `
      *,
      changed_by_user:users!contract_audit_log_changed_by_fkey(
        id,
        email
      )
    `
    )
    .eq('contract_id', contractId)
    .order('changed_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch contract audit history:', error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

/**
 * Get all audit logs for an organization
 * Useful for displaying activity feed or compliance reports
 */
export async function getOrganizationAuditLogs(
  organizationId: string,
  filters?: {
    action?: ContractAction
    startDate?: string
    endDate?: string
    changedBy?: string
  }
) {
  const supabase = await createClient()

  let query = supabase
    .from('contract_audit_log')
    .select(
      `
      *,
      contract:contracts(invoice_id, customer_name),
      changed_by_user:users!contract_audit_log_changed_by_fkey(
        id,
        email
      )
    `
    )
    .eq('organization_id', organizationId)
    .order('changed_at', { ascending: false })

  if (filters?.action) {
    query = query.eq('action', filters.action)
  }

  if (filters?.startDate) {
    query = query.gte('changed_at', filters.startDate)
  }

  if (filters?.endDate) {
    query = query.lte('changed_at', filters.endDate)
  }

  if (filters?.changedBy) {
    query = query.eq('changed_by', filters.changedBy)
  }

  const { data, error } = await query

  if (error) {
    console.error('Failed to fetch organization audit logs:', error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

/**
 * Get failed posting attempts (for error reporting)
 */
export async function getFailedPostings(organizationId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('contract_audit_log')
    .select(
      `
      *,
      contract:contracts(invoice_id, customer_name)
    `
    )
    .eq('organization_id', organizationId)
    .eq('posting_status', 'failed')
    .order('changed_at', { ascending: false })

  if (error) {
    console.error('Failed to fetch failed postings:', error)
    return { data: null, error: error.message }
  }

  return { data, error: null }
}

/**
 * Helper to detect what fields changed between old and new contract values
 */
export function detectChangedFields(
  oldContract: Record<string, unknown>,
  newContract: Record<string, unknown>
): string[] {
  const changedFields: string[] = []

  // Check each field in newContract
  for (const key in newContract) {
    if (oldContract[key] !== newContract[key]) {
      changedFields.push(key)
    }
  }

  return changedFields
}
