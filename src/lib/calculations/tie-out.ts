/**
 * Tie-Out Calculation Functions
 *
 * Functions for calculating expected balances and comparing them
 * against QuickBooks balances for reconciliation.
 *
 * Critical: Always use Decimal.js for financial calculations to avoid
 * floating-point precision errors.
 */

import Decimal from 'decimal.js'

/**
 * Contract interface for tie-out calculations
 */
export interface ContractForTieOut {
  id: string
  contract_amount: number
  initial_transaction_posted?: boolean
}

/**
 * Schedule interface for tie-out calculations
 */
export interface ScheduleForTieOut {
  contract_id: string
  recognition_month: string
  recognition_amount: number
  posted: boolean
}

/**
 * Balance comparison result
 */
export interface BalanceComparison {
  matches: boolean
  difference: number
  withinTolerance: boolean
  softwareBalance: number
  quickbooksBalance: number
}

/**
 * Calculate expected deferred revenue balance
 *
 * This is the sum of all contract amounts minus all recognized revenue
 * through the specified date. This should match the QuickBooks Balance Sheet
 * Deferred Revenue account balance.
 *
 * @param contracts Array of contracts
 * @param schedules Array of recognition schedules
 * @param asOfDate Date to calculate balance as of (YYYY-MM-DD)
 * @returns Expected deferred revenue balance
 */
export function calculateExpectedDeferredBalance(
  contracts: ContractForTieOut[],
  schedules: ScheduleForTieOut[],
  asOfDate: string
): string {
  const asOf = new Date(asOfDate)

  // Sum of all contract amounts (only those with initial transactions posted)
  const totalContractAmount = contracts
    .filter((contract) => contract.initial_transaction_posted !== false)
    .reduce(
      (sum, contract) => sum.plus(contract.contract_amount),
      new Decimal(0)
    )

  // Sum of all recognized revenue through asOfDate
  const totalRecognized = schedules
    .filter((schedule) => {
      const scheduleDate = new Date(schedule.recognition_month)
      return scheduleDate <= asOf && schedule.posted
    })
    .reduce(
      (sum, schedule) => sum.plus(schedule.recognition_amount),
      new Decimal(0)
    )

  // Deferred revenue = contract amounts - recognized revenue
  const deferredBalance = totalContractAmount.minus(totalRecognized)

  return deferredBalance.toDecimalPlaces(2).toFixed(2)
}

/**
 * Calculate expected revenue recognized
 *
 * This is the sum of all posted recognition schedules through the specified date.
 * This should match the QuickBooks P&L Revenue account balance (YTD through periodEnd).
 *
 * @param schedules Array of recognition schedules
 * @param throughDate Date to calculate through (YYYY-MM-DD)
 * @returns Expected revenue recognized amount
 */
export function calculateExpectedRevenueRecognized(
  schedules: ScheduleForTieOut[],
  throughDate: string
): string {
  const through = new Date(throughDate)

  const totalRecognized = schedules
    .filter((schedule) => {
      const scheduleDate = new Date(schedule.recognition_month)
      return scheduleDate <= through && schedule.posted
    })
    .reduce(
      (sum, schedule) => sum.plus(schedule.recognition_amount),
      new Decimal(0)
    )

  return totalRecognized.toDecimalPlaces(2).toFixed(2)
}

/**
 * Compare software balance with QuickBooks balance
 *
 * @param softwareBalance Balance calculated from software data
 * @param quickbooksBalance Balance fetched from QuickBooks
 * @param tolerance Tolerance for comparison (default: $0.01)
 * @returns Comparison result
 */
export function compareBalances(
  softwareBalance: number | string,
  quickbooksBalance: number | string,
  tolerance: number = 0.01
): BalanceComparison {
  const software = new Decimal(softwareBalance)
  const quickbooks = new Decimal(quickbooksBalance)
  const toleranceDecimal = new Decimal(tolerance)

  const difference = software.minus(quickbooks).abs()
  const withinTolerance = difference.lessThanOrEqualTo(toleranceDecimal)
  const matches = withinTolerance

  return {
    matches,
    difference: difference.toNumber(),
    withinTolerance,
    softwareBalance: software.toNumber(),
    quickbooksBalance: quickbooks.toNumber(),
  }
}


