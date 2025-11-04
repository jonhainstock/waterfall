/**
 * Contract Edit/Delete Server Actions
 *
 * Server-side actions for contract editing, deletion, and adjustment posting
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { hasPermission } from '@/lib/auth/permissions'
import { logContractAudit, detectChangedFields } from '@/lib/logging/contract-audit'
import { logJournalEntry } from '@/lib/logging/journal-entry'
import { getAccountingProvider } from '@/lib/accounting/provider-factory'
import {
  contractEditSchema,
  type AdjustmentMode,
  type ContractEditInput,
} from '@/lib/validations/contract'
import {
  calculateMonthlyRecognition,
  generateRecognitionSchedule,
} from '@/lib/calculations/revenue-recognition'
import { addMonths, startOfMonth, format, endOfMonth } from 'date-fns'
import Decimal from 'decimal.js'

interface Contract {
  id: string
  organization_id: string
  invoice_id: string
  customer_name: string | null
  description: string | null
  contract_amount: number
  start_date: string
  end_date: string
  term_months: number
  monthly_recognition: number
  status: string
  created_at: string
  updated_at: string
}

interface RecognitionSchedule {
  id: string
  contract_id: string
  organization_id: string
  recognition_month: string
  recognition_amount: number
  journal_entry_id: string | null
  posted: boolean
  posted_at: string | null
  posted_by: string | null
  is_adjustment: boolean
  adjusts_schedule_id: string | null
  adjustment_type: string | null
  adjustment_reason: string | null
  created_at: string
}

/**
 * Get contract with all schedules
 */
export async function getContractWithSchedules(
  organizationId: string,
  contractId: string
): Promise<{
  contract: Contract | null
  schedules: RecognitionSchedule[]
  postedCount: number
  unpostedCount: number
  error?: string
}> {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { contract: null, schedules: [], postedCount: 0, unpostedCount: 0, error: 'Not authenticated' }
  }

  // Check permission
  const canView = await hasPermission(user.id, organizationId, 'view_contracts')
  if (!canView) {
    return { contract: null, schedules: [], postedCount: 0, unpostedCount: 0, error: 'Permission denied' }
  }

  // Fetch contract
  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', contractId)
    .eq('organization_id', organizationId)
    .single()

  if (contractError || !contract) {
    return { contract: null, schedules: [], postedCount: 0, unpostedCount: 0, error: 'Contract not found' }
  }

  // Fetch all schedules
  const { data: schedules, error: schedulesError } = await supabase
    .from('recognition_schedules')
    .select('*')
    .eq('contract_id', contractId)
    .order('recognition_month', { ascending: true })

  if (schedulesError) {
    return { contract: contract as Contract, schedules: [], postedCount: 0, unpostedCount: 0, error: 'Failed to fetch schedules' }
  }

  const allSchedules = schedules as RecognitionSchedule[]
  const postedCount = allSchedules.filter((s) => s.posted && !s.is_adjustment).length
  const unpostedCount = allSchedules.filter((s) => !s.posted && !s.is_adjustment).length

  return {
    contract: contract as Contract,
    schedules: allSchedules,
    postedCount,
    unpostedCount,
  }
}

/**
 * Preview contract edit (calculate changes without saving)
 */
export async function previewContractEdit(
  organizationId: string,
  contractId: string,
  updates: ContractEditInput,
  adjustmentMode: AdjustmentMode,
  catchUpMonth?: string
): Promise<{
  success: boolean
  preview?: {
    oldContract: Partial<Contract>
    newContract: Partial<Contract>
    affectedPostedMonths: Array<{
      month: string
      oldAmount: number
      newAmount: number
      difference: number
    }>
    catchUpDetails?: {
      month: string
      normalAmount: number
      catchUpAmount: number
      totalAmount: number
    }
  }
  error?: string
}> {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Validate input
  const validation = contractEditSchema.safeParse(updates)
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message }
  }

  // Get current contract and schedules
  const result = await getContractWithSchedules(organizationId, contractId)
  if (result.error || !result.contract) {
    return { success: false, error: result.error || 'Contract not found' }
  }

  const { contract, schedules } = result

  // Calculate new monthly recognition
  const newMonthlyRecognition = calculateMonthlyRecognition(
    updates.contractAmount,
    updates.termMonths
  )

  // If no posted schedules, preview is simple
  if (result.postedCount === 0) {
    return {
      success: true,
      preview: {
        oldContract: {
          contract_amount: contract.contract_amount,
          start_date: contract.start_date,
          end_date: contract.end_date,
          term_months: contract.term_months,
          monthly_recognition: contract.monthly_recognition,
        },
        newContract: {
          contract_amount: updates.contractAmount,
          start_date: updates.startDate,
          end_date: updates.endDate,
          term_months: updates.termMonths,
          monthly_recognition: parseFloat(newMonthlyRecognition),
        },
        affectedPostedMonths: [],
      },
    }
  }

  // Calculate affected posted months based on mode
  const postedSchedules = schedules.filter((s) => s.posted && !s.is_adjustment)
  const affectedPostedMonths: Array<{
    month: string
    oldAmount: number
    newAmount: number
    difference: number
  }> = []

  if (adjustmentMode === 'retroactive') {
    // All posted months are affected
    postedSchedules.forEach((schedule) => {
      const difference = parseFloat(newMonthlyRecognition) - schedule.recognition_amount
      if (Math.abs(difference) > 0.01) {
        // Threshold to avoid floating point issues
        affectedPostedMonths.push({
          month: schedule.recognition_month,
          oldAmount: schedule.recognition_amount,
          newAmount: parseFloat(newMonthlyRecognition),
          difference,
        })
      }
    })
  }

  // Calculate catch-up details if applicable
  let catchUpDetails
  if (adjustmentMode === 'catch_up' && catchUpMonth) {
    const postedTotal = postedSchedules.reduce(
      (sum, s) => sum.plus(s.recognition_amount),
      new Decimal(0)
    )
    const difference = new Decimal(updates.contractAmount).minus(postedTotal)

    catchUpDetails = {
      month: catchUpMonth,
      normalAmount: parseFloat(newMonthlyRecognition),
      catchUpAmount: difference.toNumber(),
      totalAmount: new Decimal(newMonthlyRecognition).plus(difference).toNumber(),
    }
  }

  return {
    success: true,
    preview: {
      oldContract: {
        contract_amount: contract.contract_amount,
        start_date: contract.start_date,
        end_date: contract.end_date,
        term_months: contract.term_months,
        monthly_recognition: contract.monthly_recognition,
      },
      newContract: {
        contract_amount: updates.contractAmount,
        start_date: updates.startDate,
        end_date: updates.endDate,
        term_months: updates.termMonths,
        monthly_recognition: parseFloat(newMonthlyRecognition),
      },
      affectedPostedMonths,
      catchUpDetails,
    },
  }
}

/**
 * Update contract with automatic adjustment posting
 * Handles all three adjustment modes: retroactive, catch-up, prospective
 */
export async function updateContractWithPosting(
  organizationId: string,
  contractId: string,
  updates: ContractEditInput,
  adjustmentMode: AdjustmentMode,
  catchUpMonth?: string
): Promise<{
  success: boolean
  adjustmentEntryIds?: string[]
  affectedMonths?: string[]
  error?: string
}> {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Check permission
  const canEdit = await hasPermission(user.id, organizationId, 'edit_contracts')
  if (!canEdit) {
    return { success: false, error: 'Permission denied: You do not have permission to edit contracts' }
  }

  // Validate input
  const validation = contractEditSchema.safeParse(updates)
  if (!validation.success) {
    return { success: false, error: validation.error.errors[0].message }
  }

  // Get current contract and schedules
  const result = await getContractWithSchedules(organizationId, contractId)
  if (result.error || !result.contract) {
    return { success: false, error: result.error || 'Contract not found' }
  }

  const { contract, schedules, postedCount, unpostedCount } = result

  // Validate adjustment mode
  const { calculateRetroactiveAdjustments, calculateCatchUpAdjustment, calculateProspectiveAdjustment, validateAdjustmentMode } = await import('@/lib/calculations/schedule-adjustment')

  const modeValidation = validateAdjustmentMode(adjustmentMode, postedCount, unpostedCount, catchUpMonth)
  if (!modeValidation.valid) {
    return { success: false, error: modeValidation.error }
  }

  // Check for duplicate invoice_id (if changed)
  if (updates.invoiceId !== contract.invoice_id) {
    const { data: existing } = await supabase
      .from('contracts')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('invoice_id', updates.invoiceId)
      .single()

    if (existing) {
      return { success: false, error: `Invoice ID "${updates.invoiceId}" already exists for this organization` }
    }
  }

  // Calculate new monthly recognition
  const newMonthlyRecognition = calculateMonthlyRecognition(updates.contractAmount, updates.termMonths)

  // Get accounting integration (if we need to post adjustments)
  let accountingIntegration: any = null
  let provider: any = null
  let tokens: any = null

  if (adjustmentMode === 'retroactive' || adjustmentMode === 'catch_up') {
    const { data: integration } = await supabase
      .from('accounting_integrations')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('is_active', true)
      .single()

    if (!integration) {
      return {
        success: false,
        error: 'No active accounting integration found. Please connect to QuickBooks or Xero first.',
      }
    }

    if (!integration.account_mapping) {
      return {
        success: false,
        error: 'Account mapping not configured. Please configure account mapping first.',
      }
    }

    accountingIntegration = integration
    provider = getAccountingProvider(integration.platform)

    // Decrypt tokens (in real implementation)
    // For now, using mock tokens
    tokens = {
      accessToken: 'mock_token',
      refreshToken: 'mock_refresh',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      realmId: integration.realm_id,
    }
  }

  // Execute adjustment based on mode
  let adjustmentEntryIds: string[] = []
  let newUnpostedSchedules: any[] = []
  let affectedMonths: string[] = []

  try {
    if (adjustmentMode === 'retroactive') {
      // Calculate retroactive adjustments
      const adjustmentCalc = calculateRetroactiveAdjustments(
        schedules,
        updates.contractAmount,
        updates.termMonths,
        updates.startDate,
        updates.invoiceId
      )

      // Post adjustment entries to accounting system
      for (const adjustment of adjustmentCalc.adjustmentEntries) {
        const postResult = await provider.postAdjustmentEntry(tokens, {
          date: format(endOfMonth(new Date(adjustment.month)), 'yyyy-MM-dd'),
          deferredAccountId: accountingIntegration.account_mapping.deferredRevenueAccountId,
          revenueAccountId: accountingIntegration.account_mapping.revenueAccountId,
          amount: adjustment.amount,
          memo: adjustment.reason,
        })

        if (!postResult.success) {
          return {
            success: false,
            error: `Failed to post adjustment entry for ${adjustment.month}: ${postResult.error}`,
          }
        }

        adjustmentEntryIds.push(postResult.entryId!)
        affectedMonths.push(adjustment.month)

        // Log the JE posting
        await logJournalEntry({
          organizationId,
          accountingIntegrationId: accountingIntegration.id,
          entryType: 'adjustment',
          scheduleIds: [adjustment.adjustsScheduleId],
          postingMonth: adjustment.month,
          totalAmount: adjustment.amount,
          externalEntryId: postResult.entryId,
          isMocked: true, // Change to false when real integration is ready
          status: 'mocked',
          postedBy: user.id,
        })

        // Create adjustment schedule record
        await supabase.from('recognition_schedules').insert({
          contract_id: contractId,
          organization_id: organizationId,
          recognition_month: adjustment.month,
          recognition_amount: adjustment.amount,
          journal_entry_id: postResult.entryId,
          posted: true,
          posted_at: new Date().toISOString(),
          posted_by: user.id,
          is_adjustment: true,
          adjusts_schedule_id: adjustment.adjustsScheduleId,
          adjustment_type: 'retroactive',
          adjustment_reason: adjustment.reason,
        })
      }

      newUnpostedSchedules = adjustmentCalc.unpostedSchedules
    } else if (adjustmentMode === 'catch_up') {
      // Calculate catch-up adjustment
      const catchUpCalc = calculateCatchUpAdjustment(
        schedules,
        updates.contractAmount,
        updates.termMonths,
        updates.startDate,
        catchUpMonth!,
        updates.invoiceId
      )

      if (catchUpCalc.error) {
        return { success: false, error: catchUpCalc.error }
      }

      newUnpostedSchedules = catchUpCalc.unpostedSchedules
      // Note: Catch-up doesn't post entries to QB/Xero (just adjusts future schedule)
    } else if (adjustmentMode === 'prospective') {
      // Calculate prospective adjustment
      const prospectiveCalc = calculateProspectiveAdjustment(
        schedules,
        updates.contractAmount,
        updates.termMonths,
        updates.startDate,
        updates.invoiceId
      )

      if (prospectiveCalc.error) {
        return { success: false, error: prospectiveCalc.error }
      }

      newUnpostedSchedules = prospectiveCalc.unpostedSchedules
    } else {
      // Mode is 'none' - no posted schedules, just regenerate all
      const newMonthlyAmounts = generateRecognitionSchedule(updates.contractAmount, updates.termMonths)
      const start = new Date(updates.startDate)

      newUnpostedSchedules = newMonthlyAmounts.map((amount, index) => {
        const monthDate = startOfMonth(addMonths(start, index))
        return {
          recognition_month: format(monthDate, 'yyyy-MM-dd'),
          recognition_amount: parseFloat(amount),
          is_adjustment: false,
          adjusts_schedule_id: null,
          adjustment_type: null,
          adjustment_reason: null,
        }
      })
    }

    // Update the contract
    const { error: updateError } = await supabase
      .from('contracts')
      .update({
        invoice_id: updates.invoiceId,
        customer_name: updates.customerName,
        description: updates.description,
        contract_amount: updates.contractAmount,
        start_date: updates.startDate,
        end_date: updates.endDate,
        term_months: updates.termMonths,
        monthly_recognition: parseFloat(newMonthlyRecognition),
        updated_at: new Date().toISOString(),
      })
      .eq('id', contractId)

    if (updateError) {
      return { success: false, error: `Failed to update contract: ${updateError.message}` }
    }

    // Delete old unposted schedules (keep posted ones)
    const { error: deleteError } = await supabase
      .from('recognition_schedules')
      .delete()
      .eq('contract_id', contractId)
      .eq('posted', false)

    if (deleteError) {
      return { success: false, error: `Failed to delete old schedules: ${deleteError.message}` }
    }

    // Insert new unposted schedules
    if (newUnpostedSchedules.length > 0) {
      const { error: insertError } = await supabase
        .from('recognition_schedules')
        .insert(
          newUnpostedSchedules.map((s) => ({
            contract_id: contractId,
            organization_id: organizationId,
            ...s,
          }))
        )

      if (insertError) {
        return { success: false, error: `Failed to create new schedules: ${insertError.message}` }
      }
    }

    // Log the contract change to audit table
    const changedFields = detectChangedFields(
      {
        invoice_id: contract.invoice_id,
        customer_name: contract.customer_name,
        description: contract.description,
        contract_amount: contract.contract_amount,
        start_date: contract.start_date,
        end_date: contract.end_date,
        term_months: contract.term_months,
      },
      {
        invoice_id: updates.invoiceId,
        customer_name: updates.customerName,
        description: updates.description,
        contract_amount: updates.contractAmount,
        start_date: updates.startDate,
        end_date: updates.endDate,
        term_months: updates.termMonths,
      }
    )

    await logContractAudit({
      contractId,
      organizationId,
      action: 'updated',
      changedBy: user.id,
      changedFields,
      oldValues: {
        invoice_id: contract.invoice_id,
        customer_name: contract.customer_name,
        description: contract.description,
        contract_amount: contract.contract_amount,
        start_date: contract.start_date,
        end_date: contract.end_date,
        term_months: contract.term_months,
      },
      newValues: {
        invoice_id: updates.invoiceId,
        customer_name: updates.customerName,
        description: updates.description,
        contract_amount: updates.contractAmount,
        start_date: updates.startDate,
        end_date: updates.endDate,
        term_months: updates.termMonths,
      },
      adjustmentMode,
      catchUpMonth,
      adjustmentEntryIds,
      postingStatus: adjustmentEntryIds.length > 0 ? 'mocked' : 'not_applicable',
    })

    // Revalidate the page
    revalidatePath(`/${organizationId}`)

    return {
      success: true,
      adjustmentEntryIds,
      affectedMonths,
    }
  } catch (error) {
    console.error('Error updating contract:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

/**
 * Cancel contract (soft delete)
 * Sets status to 'cancelled', deletes unposted schedules
 */
export async function cancelContract(
  organizationId: string,
  contractId: string
): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Check permission
  const canDelete = await hasPermission(user.id, organizationId, 'delete_contracts')
  if (!canDelete) {
    return { success: false, error: 'Permission denied: You do not have permission to delete contracts' }
  }

  // Get contract details
  const result = await getContractWithSchedules(organizationId, contractId)
  if (result.error || !result.contract) {
    return { success: false, error: result.error || 'Contract not found' }
  }

  const { contract } = result

  try {
    // Update contract status to cancelled
    const { error: updateError } = await supabase
      .from('contracts')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString(),
      })
      .eq('id', contractId)

    if (updateError) {
      return { success: false, error: `Failed to cancel contract: ${updateError.message}` }
    }

    // Delete all unposted schedules
    const { error: deleteError } = await supabase
      .from('recognition_schedules')
      .delete()
      .eq('contract_id', contractId)
      .eq('posted', false)

    if (deleteError) {
      return { success: false, error: `Failed to delete unposted schedules: ${deleteError.message}` }
    }

    // Log to audit table
    await logContractAudit({
      contractId,
      organizationId,
      action: 'cancelled',
      changedBy: user.id,
      changedFields: ['status'],
      oldValues: { status: contract.status },
      newValues: { status: 'cancelled' },
      adjustmentMode: 'none',
      postingStatus: 'not_applicable',
      notes: 'Contract cancelled - posted schedules preserved',
    })

    // Revalidate
    revalidatePath(`/${organizationId}`)

    return { success: true }
  } catch (error) {
    console.error('Error cancelling contract:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Delete contract with reversal entry
 * Posts reversing entry for remaining deferred balance, then deletes contract
 */
export async function deleteContractWithReversal(
  organizationId: string,
  contractId: string
): Promise<{
  success: boolean
  reversalEntryId?: string
  error?: string
}> {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Check permission
  const canDelete = await hasPermission(user.id, organizationId, 'delete_contracts')
  if (!canDelete) {
    return { success: false, error: 'Permission denied: You do not have permission to delete contracts' }
  }

  // Get contract details
  const result = await getContractWithSchedules(organizationId, contractId)
  if (result.error || !result.contract) {
    return { success: false, error: result.error || 'Contract not found' }
  }

  const { contract, schedules } = result

  // Get accounting integration
  const { data: integration } = await supabase
    .from('accounting_integrations')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .single()

  if (!integration) {
    return {
      success: false,
      error: 'No active accounting integration found. Please connect to QuickBooks or Xero first.',
    }
  }

  if (!integration.account_mapping) {
    return {
      success: false,
      error: 'Account mapping not configured. Please configure account mapping first.',
    }
  }

  try {
    // Calculate remaining deferred balance
    const postedSchedules = schedules.filter((s) => s.posted && !s.is_adjustment)
    const postedTotal = postedSchedules.reduce(
      (sum, s) => sum.plus(s.recognition_amount),
      new Decimal(0)
    )
    const remainingBalance = new Decimal(contract.contract_amount).minus(postedTotal)

    let reversalEntryId: string | undefined

    // If there's a remaining balance, post reversal entry
    if (remainingBalance.greaterThan(0.01)) {
      const provider = getAccountingProvider(integration.platform)

      // Mock tokens (real implementation would decrypt)
      const tokens = {
        accessToken: 'mock_token',
        refreshToken: 'mock_refresh',
        expiresAt: new Date(Date.now() + 3600000).toISOString(),
        realmId: integration.realm_id,
      }

      // Post reversal entry (negative amount = reverse)
      const postResult = await provider.postAdjustmentEntry(tokens, {
        date: format(new Date(), 'yyyy-MM-dd'),
        deferredAccountId: integration.account_mapping.deferredRevenueAccountId,
        revenueAccountId: integration.account_mapping.revenueAccountId,
        amount: -remainingBalance.toNumber(), // Negative to reverse
        memo: `Waterfall Reversal - Contract ${contract.invoice_id} deleted`,
      })

      if (!postResult.success) {
        return {
          success: false,
          error: `Failed to post reversal entry: ${postResult.error}`,
        }
      }

      reversalEntryId = postResult.entryId

      // Log the reversal JE
      await logJournalEntry({
        organizationId,
        accountingIntegrationId: integration.id,
        entryType: 'reversal',
        scheduleIds: schedules.map((s) => s.id),
        postingMonth: format(new Date(), 'yyyy-MM-dd'),
        totalAmount: -remainingBalance.toNumber(),
        externalEntryId: reversalEntryId,
        isMocked: true,
        status: 'mocked',
        postedBy: user.id,
      })
    }

    // Delete the contract (CASCADE will delete schedules)
    const { error: deleteError } = await supabase
      .from('contracts')
      .delete()
      .eq('id', contractId)

    if (deleteError) {
      return { success: false, error: `Failed to delete contract: ${deleteError.message}` }
    }

    // Log to audit table
    await logContractAudit({
      contractId,
      organizationId,
      action: 'deleted',
      changedBy: user.id,
      changedFields: ['deleted'],
      oldValues: {
        invoice_id: contract.invoice_id,
        contract_amount: contract.contract_amount,
        status: contract.status,
      },
      adjustmentMode: 'none',
      adjustmentEntryIds: reversalEntryId ? [reversalEntryId] : undefined,
      postingStatus: reversalEntryId ? 'mocked' : 'not_applicable',
      notes: `Contract deleted with reversal entry for $${remainingBalance.toFixed(2)}`,
    })

    // Revalidate
    revalidatePath(`/${organizationId}`)

    return { success: true, reversalEntryId }
  } catch (error) {
    console.error('Error deleting contract with reversal:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

/**
 * Force delete contract
 * Hard delete without posting reversal (requires "DELETE" confirmation)
 */
export async function forceDeleteContract(
  organizationId: string,
  contractId: string,
  confirmation: string
): Promise<{
  success: boolean
  error?: string
}> {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Check permission
  const canDelete = await hasPermission(user.id, organizationId, 'delete_contracts')
  if (!canDelete) {
    return { success: false, error: 'Permission denied: You do not have permission to delete contracts' }
  }

  // Validate confirmation
  if (confirmation !== 'DELETE') {
    return { success: false, error: 'You must type "DELETE" to confirm force deletion' }
  }

  // Get contract details
  const result = await getContractWithSchedules(organizationId, contractId)
  if (result.error || !result.contract) {
    return { success: false, error: result.error || 'Contract not found' }
  }

  const { contract, postedCount } = result

  try {
    // Delete the contract (CASCADE will delete all schedules)
    const { error: deleteError } = await supabase
      .from('contracts')
      .delete()
      .eq('id', contractId)

    if (deleteError) {
      return { success: false, error: `Failed to delete contract: ${deleteError.message}` }
    }

    // Log to audit table
    await logContractAudit({
      contractId,
      organizationId,
      action: 'deleted',
      changedBy: user.id,
      changedFields: ['deleted'],
      oldValues: {
        invoice_id: contract.invoice_id,
        contract_amount: contract.contract_amount,
        status: contract.status,
      },
      adjustmentMode: 'none',
      postingStatus: 'not_applicable',
      notes: `Contract force deleted. ${postedCount} posted schedules were removed without reversal.`,
    })

    // Revalidate
    revalidatePath(`/${organizationId}`)

    return { success: true }
  } catch (error) {
    console.error('Error force deleting contract:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
  }
}

export { type Contract, type RecognitionSchedule }
