/**
 * Accounting Provider Factory
 *
 * Factory for creating the appropriate accounting provider instance
 * based on the platform type (QuickBooks, Xero, etc.)
 */

import type { AccountingPlatform, AccountingProvider } from './types'
import { QuickBooksProvider } from './providers/quickbooks'
import { XeroProvider } from './providers/xero'

/**
 * Get the accounting provider for a specific platform
 *
 * @param platform Platform type ('quickbooks' | 'xero')
 * @returns Accounting provider instance
 * @throws Error if platform is not supported
 *
 * @example
 * const provider = getAccountingProvider('quickbooks')
 * const accounts = await provider.getAccounts(tokens)
 */
export function getAccountingProvider(platform: AccountingPlatform): AccountingProvider {
  switch (platform) {
    case 'quickbooks':
      return new QuickBooksProvider()

    case 'xero':
      return new XeroProvider()

    default:
      // TypeScript should prevent this, but check at runtime anyway
      throw new Error(`Unsupported accounting platform: ${platform}`)
  }
}

/**
 * Get the display name for a platform
 */
export function getPlatformDisplayName(platform: AccountingPlatform): string {
  switch (platform) {
    case 'quickbooks':
      return 'QuickBooks'
    case 'xero':
      return 'Xero'
    default:
      return platform
  }
}

/**
 * Get the primary color for a platform (for UI branding)
 */
export function getPlatformColor(platform: AccountingPlatform): string {
  switch (platform) {
    case 'quickbooks':
      return 'green' // QuickBooks brand color
    case 'xero':
      return 'blue' // Xero brand color
    default:
      return 'gray'
  }
}
