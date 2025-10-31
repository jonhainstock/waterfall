/**
 * QuickBooks Connection Dialog Component
 *
 * Multi-step modal for QuickBooks connection and account mapping.
 * Uses localStorage for mock state persistence.
 */

'use client'

import { useState, useEffect } from 'react'
import {
  MOCK_QB_COMPANY,
  MOCK_LIABILITY_ACCOUNTS,
  MOCK_INCOME_ACCOUNTS,
  DEFAULT_ACCOUNT_MAPPING,
  type MockQBAccount,
} from './mock-quickbooks-data'

interface QuickBooksConnectionDialogProps {
  organizationId: string
  isOpen: boolean
  onClose: () => void
  onConnectionChange: (connected: boolean) => void
}

type DialogScreen = 'connect' | 'mapping' | 'connected'

interface AccountMapping {
  deferredRevenueAccountId: string
  deferredRevenueAccountName: string
  revenueAccountId: string
  revenueAccountName: string
}

export function QuickBooksConnectionDialog({
  organizationId,
  isOpen,
  onClose,
  onConnectionChange,
}: QuickBooksConnectionDialogProps) {
  const [currentScreen, setCurrentScreen] = useState<DialogScreen>('connect')
  const [isConnecting, setIsConnecting] = useState(false)
  const [accountMapping, setAccountMapping] = useState<AccountMapping>(
    DEFAULT_ACCOUNT_MAPPING
  )

  // Load state from localStorage
  useEffect(() => {
    if (isOpen) {
      const connected = localStorage.getItem(`qb_connected_${organizationId}`)
      const mapping = localStorage.getItem(`qb_mapping_${organizationId}`)

      if (connected === 'true') {
        setCurrentScreen('connected')
        if (mapping) {
          setAccountMapping(JSON.parse(mapping))
        }
      } else {
        setCurrentScreen('connect')
      }
    }
  }, [isOpen, organizationId])

  if (!isOpen) return null

  const handleConnect = async () => {
    setIsConnecting(true)
    // Simulate OAuth redirect/callback
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsConnecting(false)
    setCurrentScreen('mapping')
  }

  const handleSaveMapping = () => {
    // Save to localStorage
    localStorage.setItem(`qb_connected_${organizationId}`, 'true')
    localStorage.setItem(
      `qb_mapping_${organizationId}`,
      JSON.stringify(accountMapping)
    )
    onConnectionChange(true)
    onClose()
  }

  const handleDisconnect = () => {
    localStorage.removeItem(`qb_connected_${organizationId}`)
    localStorage.removeItem(`qb_mapping_${organizationId}`)
    onConnectionChange(false)
    setCurrentScreen('connect')
    onClose()
  }

  const handleAccountSelect = (
    field: keyof AccountMapping,
    accountId: string,
    accountName: string
  ) => {
    if (field === 'deferredRevenueAccountId') {
      setAccountMapping({
        ...accountMapping,
        deferredRevenueAccountId: accountId,
        deferredRevenueAccountName: accountName,
      })
    } else if (field === 'revenueAccountId') {
      setAccountMapping({
        ...accountMapping,
        revenueAccountId: accountId,
        revenueAccountName: accountName,
      })
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-lg rounded-lg bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {currentScreen === 'connect' && 'Connect to QuickBooks'}
              {currentScreen === 'mapping' && 'Configure Accounts'}
              {currentScreen === 'connected' && 'QuickBooks Settings'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
              disabled={isConnecting}
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {/* Screen 1: Not Connected */}
            {currentScreen === 'connect' && (
              <div className="space-y-4">
                <div className="rounded-md bg-blue-50 p-4">
                  <div className="flex gap-3">
                    <svg
                      className="h-6 w-6 flex-shrink-0 text-blue-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">What does this enable?</p>
                      <ul className="mt-2 space-y-1 list-disc list-inside">
                        <li>Post journal entries to QuickBooks</li>
                        <li>Sync revenue recognition automatically</li>
                        <li>Keep your books up to date</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  <p>
                    Clicking "Connect" will redirect you to QuickBooks to authorize
                    Waterfall. You'll return here to configure your accounts.
                  </p>
                  <p className="mt-2 font-medium text-gray-700">
                    (Mockup: This will simulate a connection without real OAuth)
                  </p>
                </div>
              </div>
            )}

            {/* Screen 2: Account Mapping */}
            {currentScreen === 'mapping' && (
              <div className="space-y-4">
                <div className="rounded-md bg-green-50 p-4">
                  <div className="flex items-center gap-2 text-sm text-green-800">
                    <svg
                      className="h-5 w-5 text-green-600"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <span className="font-medium">
                      Connected to {MOCK_QB_COMPANY.name}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-gray-600">
                  Select which QuickBooks accounts to use for revenue recognition:
                </p>

                {/* Deferred Revenue Account */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Deferred Revenue Account
                  </label>
                  <select
                    value={accountMapping.deferredRevenueAccountId}
                    onChange={(e) => {
                      const account = MOCK_LIABILITY_ACCOUNTS.find(
                        (a) => a.id === e.target.value
                      )
                      if (account) {
                        handleAccountSelect(
                          'deferredRevenueAccountId',
                          account.id,
                          account.name
                        )
                      }
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    {MOCK_LIABILITY_ACCOUNTS.map((account) => (
                      <key={account.id}>
                        <option value={account.id}>{account.name}</option>
                      </key>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    The liability account you'll debit each month
                  </p>
                </div>

                {/* Revenue Account */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Revenue Account
                  </label>
                  <select
                    value={accountMapping.revenueAccountId}
                    onChange={(e) => {
                      const account = MOCK_INCOME_ACCOUNTS.find(
                        (a) => a.id === e.target.value
                      )
                      if (account) {
                        handleAccountSelect(
                          'revenueAccountId',
                          account.id,
                          account.name
                        )
                      }
                    }}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    {MOCK_INCOME_ACCOUNTS.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    The income account you'll credit each month
                  </p>
                </div>

                <div className="rounded-md bg-yellow-50 p-3">
                  <p className="text-xs text-yellow-800">
                    These accounts will be used for all journal entries. You can
                    change them later in this dialog.
                  </p>
                </div>
              </div>
            )}

            {/* Screen 3: Connected/Settings */}
            {currentScreen === 'connected' && (
              <div className="space-y-4">
                <div className="rounded-md bg-green-50 p-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-green-800">
                      <svg
                        className="h-5 w-5 text-green-600"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span>Connected to QuickBooks</span>
                    </div>
                    <p className="text-sm text-green-700">
                      {MOCK_QB_COMPANY.name} ({MOCK_QB_COMPANY.environment})
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-900 mb-3">
                    Account Mapping
                  </h3>

                  {/* Deferred Revenue Account */}
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700">
                      Deferred Revenue Account
                    </label>
                    <select
                      value={accountMapping.deferredRevenueAccountId}
                      onChange={(e) => {
                        const account = MOCK_LIABILITY_ACCOUNTS.find(
                          (a) => a.id === e.target.value
                        )
                        if (account) {
                          handleAccountSelect(
                            'deferredRevenueAccountId',
                            account.id,
                            account.name
                          )
                          localStorage.setItem(
                            `qb_mapping_${organizationId}`,
                            JSON.stringify({
                              ...accountMapping,
                              deferredRevenueAccountId: account.id,
                              deferredRevenueAccountName: account.name,
                            })
                          )
                        }
                      }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      {MOCK_LIABILITY_ACCOUNTS.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Revenue Account */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Revenue Account
                    </label>
                    <select
                      value={accountMapping.revenueAccountId}
                      onChange={(e) => {
                        const account = MOCK_INCOME_ACCOUNTS.find(
                          (a) => a.id === e.target.value
                        )
                        if (account) {
                          handleAccountSelect(
                            'revenueAccountId',
                            account.id,
                            account.name
                          )
                          localStorage.setItem(
                            `qb_mapping_${organizationId}`,
                            JSON.stringify({
                              ...accountMapping,
                              revenueAccountId: account.id,
                              revenueAccountName: account.name,
                            })
                          )
                        }
                      }}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      {MOCK_INCOME_ACCOUNTS.map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200">
                  <button
                    onClick={handleDisconnect}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Disconnect QuickBooks
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
            {currentScreen === 'connect' && (
              <>
                <button
                  onClick={onClose}
                  disabled={isConnecting}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConnect}
                  disabled={isConnecting}
                  className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {isConnecting ? (
                    <>
                      <svg
                        className="h-4 w-4 animate-spin"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      Connecting...
                    </>
                  ) : (
                    'Connect to QuickBooks'
                  )}
                </button>
              </>
            )}

            {currentScreen === 'mapping' && (
              <>
                <button
                  onClick={onClose}
                  className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveMapping}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Save Mapping
                </button>
              </>
            )}

            {currentScreen === 'connected' && (
              <button
                onClick={onClose}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
