/**
 * Accounting Integration Types
 *
 * Type definitions for multi-platform accounting integrations (QuickBooks, Xero).
 */

/**
 * Supported accounting platforms
 */
export type AccountingPlatform = 'quickbooks' | 'xero'

/**
 * Account from accounting platform
 */
export interface AccountingAccount {
  id: string
  name: string
  accountType: 'Asset' | 'Liability' | 'Equity' | 'Income' | 'Expense'
  accountSubType: string
  fullyQualifiedName?: string
}

/**
 * Account mapping for revenue recognition
 * Maps Waterfall to accounting platform accounts
 */
export interface AccountMapping {
  deferredRevenueAccountId: string
  deferredRevenueAccountName: string
  revenueAccountId: string
  revenueAccountName: string
}

/**
 * OAuth tokens for accounting platform
 */
export interface AccountingTokens {
  accessToken: string
  refreshToken: string
  expiresAt: string // ISO timestamp
  realmId: string // QuickBooks: realm_id, Xero: tenant_id
}

/**
 * Journal entry line item
 */
export interface JournalEntryLine {
  accountId: string
  description?: string
  debit?: number
  credit?: number
}

/**
 * Parameters for creating a journal entry
 */
export interface JournalEntryParams {
  date: string // YYYY-MM-DD
  memo: string
  lines: JournalEntryLine[]
}

/**
 * Result from posting a journal entry
 */
export interface JournalEntryResult {
  success: boolean
  entryId?: string
  error?: string
}

/**
 * Integration connection info
 */
export interface AccountingIntegration {
  id: string
  organizationId: string
  platform: AccountingPlatform
  realmId: string
  accountMapping: AccountMapping | null
  isActive: boolean
  connectedAt: string
  createdAt: string
  updatedAt: string
}

/**
 * Accounting Provider Interface
 *
 * All accounting platforms must implement this interface.
 * This ensures consistent behavior across QuickBooks, Xero, etc.
 */
export interface AccountingProvider {
  /**
   * Platform identifier
   */
  readonly platform: AccountingPlatform

  /**
   * Get OAuth authorization URL
   *
   * @param organizationId Organization ID to associate with this connection
   * @param redirectUri Redirect URI after OAuth completes
   * @returns Authorization URL to redirect user to
   */
  getAuthorizationUrl(organizationId: string, redirectUri: string): Promise<string>

  /**
   * Handle OAuth callback and exchange code for tokens
   *
   * @param code OAuth authorization code
   * @param organizationId Organization ID
   * @param realmId Platform-specific realm/tenant ID
   * @returns OAuth tokens
   */
  handleCallback(
    code: string,
    organizationId: string,
    realmId: string
  ): Promise<AccountingTokens>

  /**
   * Refresh access token
   *
   * @param refreshToken Current refresh token
   * @returns New OAuth tokens
   */
  refreshAccessToken(refreshToken: string): Promise<AccountingTokens>

  /**
   * Get list of accounts from accounting platform
   *
   * @param tokens OAuth tokens
   * @returns List of accounts
   */
  getAccounts(tokens: AccountingTokens): Promise<AccountingAccount[]>

  /**
   * Post journal entry to accounting platform
   *
   * @param tokens OAuth tokens
   * @param params Journal entry parameters
   * @returns Result with entry ID or error
   */
  postJournalEntry(
    tokens: AccountingTokens,
    params: JournalEntryParams
  ): Promise<JournalEntryResult>

  /**
   * Post adjustment journal entry (for contract corrections)
   *
   * Simplified method for posting adjustment entries.
   * Amount can be positive (increase revenue) or negative (decrease revenue).
   *
   * @param tokens OAuth tokens
   * @param params Adjustment entry parameters
   * @returns Result with entry ID or error
   */
  postAdjustmentEntry(
    tokens: AccountingTokens,
    params: {
      date: string // YYYY-MM-DD
      deferredAccountId: string
      revenueAccountId: string
      amount: number // Can be positive or negative
      memo: string
    }
  ): Promise<JournalEntryResult>

  /**
   * Disconnect from accounting platform
   * (optional - some platforms don't support programmatic revocation)
   *
   * @param tokens OAuth tokens
   */
  disconnect?(tokens: AccountingTokens): Promise<void>
}
