/**
 * Mock QuickBooks Data
 *
 * Fake data for QuickBooks UI mockup (no real integration yet)
 */

export interface MockQBAccount {
  id: string
  name: string
  accountType: 'Liability' | 'Income'
  accountSubType: string
}

/**
 * Mock QuickBooks company info
 */
export const MOCK_QB_COMPANY = {
  name: 'Acme Corporation',
  environment: 'Sandbox',
  realmId: 'mock-realm-123456789',
  connectedAt: new Date().toISOString(),
}

/**
 * Mock liability accounts (for Deferred Revenue)
 */
export const MOCK_LIABILITY_ACCOUNTS: MockQBAccount[] = [
  {
    id: 'qb-account-1',
    name: 'Deferred Revenue - Current',
    accountType: 'Liability',
    accountSubType: 'Other Current Liabilities',
  },
  {
    id: 'qb-account-2',
    name: 'Unearned Revenue',
    accountType: 'Liability',
    accountSubType: 'Other Current Liabilities',
  },
  {
    id: 'qb-account-3',
    name: 'Customer Deposits',
    accountType: 'Liability',
    accountSubType: 'Other Current Liabilities',
  },
  {
    id: 'qb-account-4',
    name: 'Deferred Revenue - Long Term',
    accountType: 'Liability',
    accountSubType: 'Long Term Liabilities',
  },
]

/**
 * Mock income accounts (for Revenue)
 */
export const MOCK_INCOME_ACCOUNTS: MockQBAccount[] = [
  {
    id: 'qb-account-10',
    name: 'Revenue - Services',
    accountType: 'Income',
    accountSubType: 'Service/Fee Income',
  },
  {
    id: 'qb-account-11',
    name: 'Revenue - Product Sales',
    accountType: 'Income',
    accountSubType: 'Sales of Product Income',
  },
  {
    id: 'qb-account-12',
    name: 'Professional Fees',
    accountType: 'Income',
    accountSubType: 'Service/Fee Income',
  },
  {
    id: 'qb-account-13',
    name: 'Subscription Revenue',
    accountType: 'Income',
    accountSubType: 'Service/Fee Income',
  },
  {
    id: 'qb-account-14',
    name: 'Consulting Revenue',
    accountType: 'Income',
    accountSubType: 'Service/Fee Income',
  },
]

/**
 * Default account mapping for mockup
 */
export const DEFAULT_ACCOUNT_MAPPING = {
  deferredRevenueAccountId: MOCK_LIABILITY_ACCOUNTS[0].id,
  deferredRevenueAccountName: MOCK_LIABILITY_ACCOUNTS[0].name,
  revenueAccountId: MOCK_INCOME_ACCOUNTS[0].id,
  revenueAccountName: MOCK_INCOME_ACCOUNTS[0].name,
}
