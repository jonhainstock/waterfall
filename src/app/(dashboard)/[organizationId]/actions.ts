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
  error?: string
}

export async function importContracts(
  organizationId: string,
  contracts: ContractImport[]
): Promise<ImportResult> {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { succeeded: 0, failed: 0, error: 'Not authenticated' }
  }

  // Verify user has access to this organization
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', organizationId)
    .eq('is_active', true)
    .single()

  if (!org) {
    return { succeeded: 0, failed: 0, error: 'Organization not found' }
  }

  let succeeded = 0
  let failed = 0
  const errors: string[] = []

  for (const contractData of contracts) {
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
      const result: any = await supabase
        .from('contracts')
        .insert(contractPayload as any)
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
        .insert(scheduleEntries as any)

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
  } as any)

  // Revalidate the organization page
  revalidatePath(`/${organizationId}`)

  if (failed > 0 && succeeded === 0) {
    return {
      succeeded,
      failed,
      error: `All imports failed. First error: ${errors[0]}`,
    }
  }

  return { succeeded, failed }
}
