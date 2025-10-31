/**
 * QuickBooks Button Component
 *
 * Button that opens QuickBooks connection dialog.
 * Shows connection status with visual indicators.
 */

'use client'

import { useState, useEffect } from 'react'
import { QuickBooksConnectionDialog } from './quickbooks-connection-dialog'

interface QuickBooksButtonProps {
  organizationId: string
}

export function QuickBooksButton({ organizationId }: QuickBooksButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isConnected, setIsConnected] = useState(false)

  // Check connection status from localStorage (mock)
  useEffect(() => {
    const stored = localStorage.getItem(`qb_connected_${organizationId}`)
    setIsConnected(stored === 'true')
  }, [organizationId])

  // Update connection status when dialog closes
  const handleConnectionChange = (connected: boolean) => {
    setIsConnected(connected)
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 ${
          isConnected
            ? 'bg-green-50 text-green-700 hover:bg-green-100 focus:ring-green-500 border border-green-200'
            : 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
        }`}
      >
        {isConnected ? (
          <>
            <svg
              className="h-5 w-5"
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
            QuickBooks
          </>
        ) : (
          <>
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Connect to QuickBooks
          </>
        )}
      </button>

      <QuickBooksConnectionDialog
        organizationId={organizationId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConnectionChange={handleConnectionChange}
      />
    </>
  )
}
