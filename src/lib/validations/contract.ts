/**
 * Contract Validation Schemas
 * Zod schemas for validating contract creation, updates, and deletion
 */

import { z } from 'zod'

/**
 * Adjustment modes for handling posted schedules
 */
export const adjustmentModeSchema = z.enum([
  'retroactive', // Post adjustment entries to fix past months
  'catch_up', // Absorb difference in selected month going forward
  'prospective', // Spread difference over remaining term
  'none', // No posted schedules exist
])

export type AdjustmentMode = z.infer<typeof adjustmentModeSchema>

/**
 * Contract status values
 */
export const contractStatusSchema = z.enum(['active', 'completed', 'cancelled'])

export type ContractStatus = z.infer<typeof contractStatusSchema>

/**
 * Base contract fields schema (common to create and update)
 */
export const contractFieldsSchema = z.object({
  invoiceId: z
    .string()
    .min(1, 'Invoice ID is required')
    .max(100, 'Invoice ID must be less than 100 characters'),
  customerName: z
    .string()
    .max(255, 'Customer name must be less than 255 characters')
    .optional()
    .nullable(),
  description: z
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional()
    .nullable(),
  contractAmount: z
    .number()
    .positive('Contract amount must be greater than 0')
    .finite('Contract amount must be a valid number'),
  startDate: z.string().refine(
    (date) => {
      // Validate YYYY-MM-DD format
      const regex = /^\d{4}-\d{2}-\d{2}$/
      if (!regex.test(date)) return false
      // Validate actual date
      const parsed = new Date(date)
      return !isNaN(parsed.getTime())
    },
    { message: 'Start date must be in YYYY-MM-DD format' }
  ),
  endDate: z.string().refine(
    (date) => {
      const regex = /^\d{4}-\d{2}-\d{2}$/
      if (!regex.test(date)) return false
      const parsed = new Date(date)
      return !isNaN(parsed.getTime())
    },
    { message: 'End date must be in YYYY-MM-DD format' }
  ),
  termMonths: z
    .number()
    .int('Term must be a whole number of months')
    .positive('Term must be at least 1 month'),
})

/**
 * Contract edit schema with cross-field validation
 */
export const contractEditSchema = contractFieldsSchema.refine(
  (data) => {
    const start = new Date(data.startDate)
    const end = new Date(data.endDate)
    return end > start
  },
  {
    message: 'End date must be after start date',
    path: ['endDate'],
  }
)

export type ContractEditInput = z.infer<typeof contractEditSchema>

/**
 * Update contract request schema (includes adjustment mode)
 */
export const updateContractRequestSchema = z.object({
  contractId: z.string().uuid('Invalid contract ID'),
  organizationId: z.string().uuid('Invalid organization ID'),
  updates: contractEditSchema,
  adjustmentMode: adjustmentModeSchema,
  catchUpMonth: z
    .string()
    .refine(
      (date) => {
        const regex = /^\d{4}-\d{2}-\d{2}$/
        if (!regex.test(date)) return false
        const parsed = new Date(date)
        return !isNaN(parsed.getTime())
      },
      { message: 'Catch-up month must be in YYYY-MM-DD format' }
    )
    .optional()
    .nullable(),
})

export type UpdateContractRequest = z.infer<typeof updateContractRequestSchema>

/**
 * Delete contract request schema
 */
export const deleteContractRequestSchema = z.object({
  contractId: z.string().uuid('Invalid contract ID'),
  organizationId: z.string().uuid('Invalid organization ID'),
  deleteMode: z.enum(['cancel', 'delete_with_reversal', 'force_delete']),
  confirmation: z.string().optional(), // Required for force_delete (must be "DELETE")
})

export type DeleteContractRequest = z.infer<typeof deleteContractRequestSchema>

/**
 * Validation for force delete confirmation
 */
export const forceDeleteConfirmationSchema = deleteContractRequestSchema
  .refine(
    (data) => {
      if (data.deleteMode === 'force_delete') {
        return data.confirmation === 'DELETE'
      }
      return true
    },
    {
      message: 'You must type "DELETE" to confirm force deletion',
      path: ['confirmation'],
    }
  )

/**
 * Contract preview request schema
 */
export const previewContractEditSchema = z.object({
  contractId: z.string().uuid('Invalid contract ID'),
  organizationId: z.string().uuid('Invalid organization ID'),
  updates: contractEditSchema,
  adjustmentMode: adjustmentModeSchema,
  catchUpMonth: z.string().optional().nullable(),
})

export type PreviewContractEditRequest = z.infer<typeof previewContractEditSchema>

/**
 * Helper to validate dates make sense
 */
export function validateContractDates(startDate: string, endDate: string, termMonths: number): {
  valid: boolean
  error?: string
} {
  const start = new Date(startDate)
  const end = new Date(endDate)

  if (end <= start) {
    return { valid: false, error: 'End date must be after start date' }
  }

  // Calculate expected end date based on start date + term months
  const expectedEnd = new Date(start)
  expectedEnd.setMonth(expectedEnd.getMonth() + termMonths)

  // Allow 1 day tolerance for month-end variations
  const daysDiff = Math.abs((end.getTime() - expectedEnd.getTime()) / (1000 * 60 * 60 * 24))

  if (daysDiff > 31) {
    return {
      valid: false,
      error: `End date doesn't match term months. Expected approximately ${expectedEnd.toISOString().split('T')[0]}`,
    }
  }

  return { valid: true }
}

/**
 * Helper to calculate term months from dates
 */
export function calculateTermMonths(startDate: string, endDate: string): number {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const yearsDiff = end.getFullYear() - start.getFullYear()
  const monthsDiff = end.getMonth() - start.getMonth()

  return yearsDiff * 12 + monthsDiff
}

/**
 * Helper to calculate end date from start date + term
 */
export function calculateEndDate(startDate: string, termMonths: number): string {
  const start = new Date(startDate)
  const end = new Date(start)
  end.setMonth(end.getMonth() + termMonths)

  // Return last day of the month
  const lastDay = new Date(end.getFullYear(), end.getMonth() + 1, 0)
  return lastDay.toISOString().split('T')[0]
}
