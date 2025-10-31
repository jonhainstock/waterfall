/**
 * QuickBooks Button Component
 *
 * Button that opens QuickBooks connection dialog.
 * Shows connection status with visual indicators.
 */

'use client'

import { useState, useEffect } from 'react'
import { Check, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
      <Button
        onClick={() => setIsOpen(true)}
        variant={isConnected ? 'outline' : 'default'}
        className={isConnected ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100' : ''}
      >
        {isConnected ? (
          <>
            <Check className="h-4 w-4" />
            QuickBooks
          </>
        ) : (
          <>
            <Zap className="h-4 w-4" />
            Connect to QuickBooks
          </>
        )}
      </Button>

      <QuickBooksConnectionDialog
        organizationId={organizationId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConnectionChange={handleConnectionChange}
      />
    </>
  )
}
