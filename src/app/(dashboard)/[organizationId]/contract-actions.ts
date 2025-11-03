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

export { type Contract, type RecognitionSchedule }
