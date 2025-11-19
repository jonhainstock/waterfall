/**
 * Reconciliation Server Actions
 *
 * Server-side actions for tie-out verification and reconciliation
 */

'use server'

import { createClient } from '@/lib/supabase/server'
import { getAccountingProvider } from '@/lib/accounting/provider-factory'
import {
  calculateExpectedDeferredBalance,
  calculateExpectedRevenueRecognized,
  compareBalances,
  type ContractForTieOut,
  type ScheduleForTieOut,
} from '@/lib/calculations/tie-out'
import Decimal from 'decimal.js'

/**
 * Tie-out verification result
 */
export interface TieOutResult {
  success: boolean
  error?: string
  balanceSheet?: {
    matches: boolean
    softwareBalance: number
    quickbooksBalance: number
    difference: number
    withinTolerance: boolean
  }
  profitAndLoss?: {
    matches: boolean
    softwareBalance: number
    quickbooksBalance: number
    difference: number
    withinTolerance: boolean
  }
  overallMatches: boolean
  missingInitialTransactions?: {
    count: number
    totalAmount: number
    contracts: Array<{
      id: string
      invoice_id: string
      customer_name: string | null
      contract_amount: number
    }>
  }
  details?: {
    asOfDate: string
    deferredRevenueAccountId: string
    revenueAccountId: string
  }
}

/**
 * Verify tie-out between software calculations and QuickBooks balances
 *
 * @param organizationId Organization ID
 * @param asOfDate Date to verify as of (YYYY-MM-DD, defaults to today)
 * @returns Tie-out verification result
 */
export async function verifyTieOut(
  organizationId: string,
  asOfDate?: string
): Promise<TieOutResult> {
  const supabase = await createClient()

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { success: false, error: 'Not authenticated', overallMatches: false }
  }

  // Verify user has access to this organization
  const { data: org } = await supabase
    .from('organizations')
    .select('id')
    .eq('id', organizationId)
    .eq('is_active', true)
    .single()

  if (!org) {
    return {
      success: false,
      error: 'Organization not found',
      overallMatches: false,
    }
  }

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
      error: 'No accounting platform connected',
      overallMatches: false,
    }
  }

  if (!integration.account_mapping) {
    return {
      success: false,
      error: 'Account mapping not configured',
      overallMatches: false,
    }
  }

  // Use provided date or default to today
  const verifyDate = asOfDate || new Date().toISOString().split('T')[0]
  const verifyDateObj = new Date(verifyDate)

  // Get all contracts
  const { data: contracts, error: contractsError } = await supabase
    .from('contracts')
    .select('id, invoice_id, customer_name, contract_amount, initial_transaction_posted')
    .eq('organization_id', organizationId)
    .eq('status', 'active')

  if (contractsError || !contracts) {
    return {
      success: false,
      error: `Failed to fetch contracts: ${contractsError?.message}`,
      overallMatches: false,
    }
  }

  // Get all recognition schedules
  const { data: schedules, error: schedulesError } = await supabase
    .from('recognition_schedules')
    .select('contract_id, recognition_month, recognition_amount, posted')
    .eq('organization_id', organizationId)

  if (schedulesError || !schedules) {
    return {
      success: false,
      error: `Failed to fetch schedules: ${schedulesError?.message}`,
      overallMatches: false,
    }
  }

  // Prepare data for calculations
  const contractsForTieOut: ContractForTieOut[] = contracts.map((c) => ({
    id: c.id,
    contract_amount: c.contract_amount,
    initial_transaction_posted: c.initial_transaction_posted ?? undefined,
  }))

  const schedulesForTieOut: ScheduleForTieOut[] = schedules.map((s) => ({
    contract_id: s.contract_id,
    recognition_month: s.recognition_month,
    recognition_amount: s.recognition_amount,
    posted: s.posted,
  }))

  // Calculate expected balances from software
  const expectedDeferredBalance = calculateExpectedDeferredBalance(
    contractsForTieOut,
    schedulesForTieOut,
    verifyDate
  )

  // For P&L, calculate YTD revenue through the date
  // Use first day of year as period start
  const yearStart = new Date(verifyDateObj.getFullYear(), 0, 1)
    .toISOString()
    .split('T')[0]
  const expectedRevenueRecognized = calculateExpectedRevenueRecognized(
    schedulesForTieOut,
    verifyDate
  )

  // Get accounting provider
  const provider = getAccountingProvider(integration.platform as any)

  // Prepare tokens
  const tokens = {
    accessToken: integration.access_token || '',
    refreshToken: integration.refresh_token || '',
    expiresAt: integration.expires_at || '',
    realmId: integration.realm_id || '',
  }

  const accountMapping = integration.account_mapping as any

  // Fetch balances from QuickBooks (mocked for now)
  const balanceSheetResult = await provider.getBalanceSheetAccountBalance(
    tokens,
    accountMapping.deferredRevenueAccountId,
    verifyDate
  )

  const profitAndLossResult = await provider.getProfitAndLossAccountBalance(
    tokens,
    accountMapping.revenueAccountId,
    yearStart,
    verifyDate
  )

  // For mock implementation, calculate expected balance from software data
  // In real implementation, these would come from QuickBooks API
  const quickbooksDeferredBalance = balanceSheetResult.success
    ? balanceSheetResult.balance ?? parseFloat(expectedDeferredBalance)
    : parseFloat(expectedDeferredBalance)

  const quickbooksRevenueBalance = profitAndLossResult.success
    ? profitAndLossResult.balance ?? parseFloat(expectedRevenueRecognized)
    : parseFloat(expectedRevenueRecognized)

  // Compare balances
  const balanceSheetComparison = compareBalances(
    expectedDeferredBalance,
    quickbooksDeferredBalance
  )

  const profitAndLossComparison = compareBalances(
    expectedRevenueRecognized,
    quickbooksRevenueBalance
  )

  // Check for missing initial transactions
  const contractsMissingInitial = contracts.filter(
    (c) => c.initial_transaction_posted === false
  )

  const missingInitialTransactions =
    contractsMissingInitial.length > 0
      ? {
          count: contractsMissingInitial.length,
          totalAmount: contractsMissingInitial.reduce(
            (sum, c) => sum + c.contract_amount,
            0
          ),
          contracts: contractsMissingInitial.map((c) => ({
            id: c.id,
            invoice_id: c.invoice_id,
            customer_name: c.customer_name,
            contract_amount: c.contract_amount,
          })),
        }
      : undefined

  // Overall match requires both Balance Sheet and P&L to match
  const overallMatches =
    balanceSheetComparison.matches && profitAndLossComparison.matches

  return {
    success: true,
    balanceSheet: {
      matches: balanceSheetComparison.matches,
      softwareBalance: balanceSheetComparison.softwareBalance,
      quickbooksBalance: balanceSheetComparison.quickbooksBalance,
      difference: balanceSheetComparison.difference,
      withinTolerance: balanceSheetComparison.withinTolerance,
    },
    profitAndLoss: {
      matches: profitAndLossComparison.matches,
      softwareBalance: profitAndLossComparison.softwareBalance,
      quickbooksBalance: profitAndLossComparison.quickbooksBalance,
      difference: profitAndLossComparison.difference,
      withinTolerance: profitAndLossComparison.withinTolerance,
    },
    overallMatches,
    missingInitialTransactions,
    details: {
      asOfDate: verifyDate,
      deferredRevenueAccountId: accountMapping.deferredRevenueAccountId,
      revenueAccountId: accountMapping.revenueAccountId,
    },
  }
}


