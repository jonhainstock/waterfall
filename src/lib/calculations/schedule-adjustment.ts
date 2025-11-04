/**
 * Schedule Adjustment Calculations
 *
 * Logic for handling the three adjustment modes when editing contracts:
 * - Retroactive: Post adjustment entries to fix all past months
 * - Catch-up: Absorb difference in one selected month
 * - Prospective: Spread difference over remaining unposted months
 */

import Decimal from 'decimal.js'
import { addMonths, startOfMonth, format, endOfMonth, parseISO } from 'date-fns'
import { generateRecognitionSchedule } from './revenue-recognition'

export type AdjustmentMode = 'retroactive' | 'catch_up' | 'prospective' | 'none'

interface Schedule {
  id: string
  recognition_month: string
  recognition_amount: number
  posted: boolean
  is_adjustment: boolean
}

interface AdjustmentEntry {
  month: string // YYYY-MM-DD format
  amount: number // Can be positive or negative
  reason: string
  adjustsScheduleId: string // ID of original schedule being adjusted
}

interface NewSchedule {
  recognition_month: string
  recognition_amount: number
  is_adjustment: boolean
  adjusts_schedule_id: string | null
  adjustment_type: AdjustmentMode | null
  adjustment_reason: string | null
}

/**
 * Calculate retroactive adjustments
 * Creates adjustment entries for all posted months that changed
 */
export function calculateRetroactiveAdjustments(
  existingSchedules: Schedule[],
  newContractAmount: number,
  newTermMonths: number,
  startDate: string,
  invoiceId: string
): {
  adjustmentEntries: AdjustmentEntry[]
  newSchedules: NewSchedule[]
  unpostedSchedules: NewSchedule[]
} {
  // Generate what the new schedule should be
  const newMonthlyAmounts = generateRecognitionSchedule(newContractAmount, newTermMonths)

  const adjustmentEntries: AdjustmentEntry[] = []
  const newSchedules: NewSchedule[] = []
  const unpostedSchedules: NewSchedule[] = []

  // Get only original posted schedules (not adjustments)
  const postedSchedules = existingSchedules
    .filter((s) => s.posted && !s.is_adjustment)
    .sort((a, b) => a.recognition_month.localeCompare(b.recognition_month))

  // BUILD MAP: Create a map of new schedule amounts by calendar month (YYYY-MM-DD)
  // This allows us to match by calendar month instead of array index
  const newScheduleMap = new Map<string, number>()
  const start = parseISO(startDate) // Use parseISO to avoid timezone issues
  newMonthlyAmounts.forEach((amount, index) => {
    const monthDate = startOfMonth(addMonths(start, index))
    const monthStr = format(monthDate, 'yyyy-MM-dd')
    newScheduleMap.set(monthStr, parseFloat(amount))
  })

  // MATCH BY CALENDAR MONTH: Process each posted schedule
  postedSchedules.forEach((schedule) => {
    const newAmount = newScheduleMap.get(schedule.recognition_month)

    if (newAmount === undefined) {
      // ORPHANED MONTH: This posted month no longer exists in the new schedule
      // (e.g., start date moved forward or end date moved backward)
      // Create a reversal entry with negative amount
      adjustmentEntries.push({
        month: schedule.recognition_month,
        amount: -schedule.recognition_amount, // NEGATIVE to reverse
        reason: `Date change - month removed from schedule (${invoiceId})`,
        adjustsScheduleId: schedule.id,
      })
    } else {
      // Month exists in both old and new schedules - check if amount changed
      const difference = new Decimal(newAmount).minus(schedule.recognition_amount)

      // Only create adjustment if there's a meaningful difference (> 1 cent)
      if (difference.abs().greaterThan(0.01)) {
        adjustmentEntries.push({
          month: schedule.recognition_month,
          amount: difference.toNumber(),
          reason: `Contract amount correction (${invoiceId})`,
          adjustsScheduleId: schedule.id,
        })
      }
    }
  })

  // Generate new unposted schedules for remaining months
  const today = startOfMonth(new Date())

  newMonthlyAmounts.forEach((amount, index) => {
    const monthDate = addMonths(start, index) // start is already from parseISO
    const monthStr = format(monthDate, 'yyyy-MM-dd')

    // Check if this month is already posted
    const existingPosted = postedSchedules.find((s) => s.recognition_month === monthStr)

    if (!existingPosted) {
      // This is an unposted month
      const isPastMonth = monthDate < today

      unpostedSchedules.push({
        recognition_month: monthStr,
        recognition_amount: parseFloat(amount),
        is_adjustment: false,
        adjusts_schedule_id: null,
        adjustment_type: null,
        adjustment_reason: isPastMonth
          ? `New past month - requires manual review (${invoiceId})`
          : null,
      })
    }
  })

  return { adjustmentEntries, newSchedules, unpostedSchedules }
}

/**
 * Calculate catch-up adjustment
 * Keeps posted schedules unchanged, absorbs difference in one month
 */
export function calculateCatchUpAdjustment(
  existingSchedules: Schedule[],
  newContractAmount: number,
  newTermMonths: number,
  startDate: string,
  catchUpMonth: string,
  invoiceId: string
): {
  adjustmentEntry: AdjustmentEntry | null
  unpostedSchedules: NewSchedule[]
  error?: string
} {
  // Get posted schedules total
  const postedSchedules = existingSchedules.filter((s) => s.posted && !s.is_adjustment)
  const postedTotal = postedSchedules.reduce(
    (sum, s) => sum.plus(s.recognition_amount),
    new Decimal(0)
  )

  // Calculate difference
  const difference = new Decimal(newContractAmount).minus(postedTotal)

  // Generate new schedule amounts
  const newMonthlyAmounts = generateRecognitionSchedule(newContractAmount, newTermMonths)
  const baseMonthlyAmount = parseFloat(newMonthlyAmounts[0] || '0')

  // Build unposted schedules
  const unpostedSchedules: NewSchedule[] = []
  const start = parseISO(startDate) // Use parseISO to avoid timezone issues

  newMonthlyAmounts.forEach((amount, index) => {
    const monthDate = startOfMonth(addMonths(start, index))
    const monthStr = format(monthDate, 'yyyy-MM-dd')

    // Check if this month is already posted
    const existingPosted = postedSchedules.find((s) => s.recognition_month === monthStr)

    if (!existingPosted) {
      // Check if this is the catch-up month
      const isCatchUpMonth = monthStr === catchUpMonth

      unpostedSchedules.push({
        recognition_month: monthStr,
        recognition_amount: isCatchUpMonth
          ? new Decimal(baseMonthlyAmount).plus(difference).toNumber()
          : baseMonthlyAmount,
        is_adjustment: isCatchUpMonth,
        adjusts_schedule_id: null,
        adjustment_type: isCatchUpMonth ? 'catch_up' : null,
        adjustment_reason: isCatchUpMonth
          ? `Catch-up adjustment for contract ${invoiceId}`
          : null,
      })
    }
  })

  // Validate catch-up month exists in unposted schedules
  const catchUpExists = unpostedSchedules.some((s) => s.recognition_month === catchUpMonth)
  if (!catchUpExists) {
    return {
      adjustmentEntry: null,
      unpostedSchedules: [],
      error: 'Catch-up month must be an unposted month',
    }
  }

  return {
    adjustmentEntry: difference.abs().greaterThan(0.01)
      ? {
          month: catchUpMonth,
          amount: difference.toNumber(),
          reason: `Catch-up adjustment for contract ${invoiceId}`,
          adjustsScheduleId: '', // No specific schedule being adjusted
        }
      : null,
    unpostedSchedules,
  }
}

/**
 * Calculate prospective adjustment
 * Keeps posted schedules unchanged, spreads difference over remaining months
 */
export function calculateProspectiveAdjustment(
  existingSchedules: Schedule[],
  newContractAmount: number,
  newTermMonths: number,
  startDate: string,
  invoiceId: string
): {
  unpostedSchedules: NewSchedule[]
  error?: string
} {
  // Get posted schedules total
  const postedSchedules = existingSchedules.filter((s) => s.posted && !s.is_adjustment)
  const postedTotal = postedSchedules.reduce(
    (sum, s) => sum.plus(s.recognition_amount),
    new Decimal(0)
  )

  // Calculate remaining amount
  const remainingAmount = new Decimal(newContractAmount).minus(postedTotal)

  // Count unposted months
  const start = parseISO(startDate) // Use parseISO to avoid timezone issues
  const allMonths: string[] = []
  for (let i = 0; i < newTermMonths; i++) {
    const monthDate = startOfMonth(addMonths(start, i))
    allMonths.push(format(monthDate, 'yyyy-MM-dd'))
  }

  const unpostedMonths = allMonths.filter(
    (month) => !postedSchedules.some((s) => s.recognition_month === month)
  )

  if (unpostedMonths.length === 0) {
    return {
      unpostedSchedules: [],
      error: 'No unposted months remaining for prospective adjustment',
    }
  }

  // Calculate amount per unposted month
  const amountPerMonth = remainingAmount.dividedBy(unpostedMonths.length)

  // Build unposted schedules with even distribution
  const unpostedSchedules: NewSchedule[] = []
  let runningTotal = new Decimal(0)

  unpostedMonths.forEach((month, index) => {
    const isLastMonth = index === unpostedMonths.length - 1

    // For last month, use remaining amount to handle rounding
    const amount = isLastMonth
      ? remainingAmount.minus(runningTotal)
      : amountPerMonth

    runningTotal = runningTotal.plus(amount)

    unpostedSchedules.push({
      recognition_month: month,
      recognition_amount: amount.toNumber(),
      is_adjustment: false,
      adjusts_schedule_id: null,
      adjustment_type: 'prospective',
      adjustment_reason: `Prospective adjustment for contract ${invoiceId}`,
    })
  })

  return { unpostedSchedules }
}

/**
 * Helper to validate adjustment mode requirements
 */
export function validateAdjustmentMode(
  mode: AdjustmentMode,
  postedCount: number,
  unpostedCount: number,
  catchUpMonth?: string
): { valid: boolean; error?: string } {
  if (mode === 'none' && postedCount > 0) {
    return {
      valid: false,
      error: 'Cannot use "none" mode when posted schedules exist',
    }
  }

  if ((mode === 'catch_up' || mode === 'prospective') && unpostedCount === 0) {
    return {
      valid: false,
      error: `${mode} mode requires at least one unposted month`,
    }
  }

  if (mode === 'catch_up' && !catchUpMonth) {
    return {
      valid: false,
      error: 'Catch-up mode requires specifying a catch-up month',
    }
  }

  return { valid: true }
}

export type { AdjustmentEntry, NewSchedule }
