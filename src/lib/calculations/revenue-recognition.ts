/**
 * Revenue Recognition Calculations
 *
 * Core business logic for calculating revenue recognition schedules
 * using the straight-line method.
 *
 * Critical: Always use Decimal.js for financial calculations to avoid
 * floating-point precision errors.
 */

import Decimal from 'decimal.js'

/**
 * Calculate monthly revenue recognition amount using straight-line method
 *
 * @param contractAmount Total contract amount
 * @param termMonths Number of months in the contract term
 * @returns Monthly recognition amount (rounded to 2 decimal places)
 */
export function calculateMonthlyRecognition(
  contractAmount: number | string,
  termMonths: number
): string {
  if (termMonths <= 0) {
    throw new Error('Term months must be greater than 0')
  }

  const amount = new Decimal(contractAmount)
  const months = new Decimal(termMonths)

  // Straight-line formula: contract_amount ÷ term_months
  const monthlyAmount = amount.dividedBy(months)

  // Round to 2 decimal places and format with trailing zeros
  return monthlyAmount.toDecimalPlaces(2).toFixed(2)
}

/**
 * Generate a complete revenue recognition schedule
 *
 * @param contractAmount Total contract amount
 * @param termMonths Number of months in the contract term
 * @returns Array of monthly amounts (adjusted for rounding in last month)
 */
export function generateRecognitionSchedule(
  contractAmount: number | string,
  termMonths: number
): string[] {
  if (termMonths <= 0) {
    throw new Error('Term months must be greater than 0')
  }

  const amount = new Decimal(contractAmount)
  const months = new Decimal(termMonths)

  // Calculate monthly amount
  const monthlyAmount = amount.dividedBy(months).toDecimalPlaces(2)

  // Create schedule with same amount for each month
  const schedule: Decimal[] = Array(termMonths).fill(monthlyAmount)

  // Calculate total of all months
  const scheduleTotal = monthlyAmount.times(termMonths)

  // Adjust last month if there's a rounding difference
  const difference = amount.minus(scheduleTotal)

  if (!difference.isZero()) {
    schedule[termMonths - 1] = monthlyAmount.plus(difference)
  }

  return schedule.map((d) => d.toDecimalPlaces(2).toFixed(2))
}

/**
 * Calculate total recognized revenue for a given number of months
 *
 * @param monthlyAmount Monthly recognition amount
 * @param monthsElapsed Number of months that have elapsed
 * @returns Total recognized amount
 */
export function calculateTotalRecognized(
  monthlyAmount: number | string,
  monthsElapsed: number
): string {
  if (monthsElapsed < 0) {
    throw new Error('Months elapsed cannot be negative')
  }

  const monthly = new Decimal(monthlyAmount)
  const months = new Decimal(monthsElapsed)

  return monthly.times(months).toDecimalPlaces(2).toFixed(2)
}

/**
 * Calculate remaining deferred revenue
 *
 * @param contractAmount Total contract amount
 * @param recognizedAmount Amount already recognized
 * @returns Remaining deferred amount
 */
export function calculateDeferredRevenue(
  contractAmount: number | string,
  recognizedAmount: number | string
): string {
  const contract = new Decimal(contractAmount)
  const recognized = new Decimal(recognizedAmount)

  return contract.minus(recognized).toDecimalPlaces(2).toFixed(2)
}
