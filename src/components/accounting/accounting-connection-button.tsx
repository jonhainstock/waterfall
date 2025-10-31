/**
 * Accounting Connection Button Component
 *
 * Platform-agnostic button for connecting to accounting platforms (QuickBooks or Xero).
 * Allows user to select platform before connecting, defaults to QuickBooks.
 */

'use client'

import { useState, useEffect } from 'react'
import { Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AccountingConnectionDialog } from './accounting-connection-dialog'
import type { AccountingPlatform } from '@/lib/accounting/types'

interface AccountingConnectionButtonProps {
  organizationId: string
  connectedPlatform?: AccountingPlatform | null
}

export function AccountingConnectionButton({
  organizationId,
  connectedPlatform: initialPlatform,
}: AccountingConnectionButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<AccountingPlatform>('quickbooks')
  const [connectedPlatform, setConnectedPlatform] = useState<AccountingPlatform | null>(initialPlatform || null)

  // Check localStorage for connection status on mount
  useEffect(() => {
    const connected = localStorage.getItem(`accounting_connected_${organizationId}`)
    const platform = localStorage.getItem(`accounting_platform_${organizationId}`)

    if (connected === 'true' && platform) {
      setConnectedPlatform(platform as AccountingPlatform)
    }
  }, [organizationId])

  // Update connection status when dialog completes
  const handleConnectionChange = (connected: boolean, platform?: AccountingPlatform) => {
    if (connected && platform) {
      setConnectedPlatform(platform)
    } else {
      setConnectedPlatform(null)
    }
  }

  // Handle platform button click
  const handleConnectClick = (platform: AccountingPlatform) => {
    setSelectedPlatform(platform)
    setIsDialogOpen(true)
  }

  // If already connected, show manage button
  if (connectedPlatform) {
    return (
      <>
        <Button
          onClick={() => setIsDialogOpen(true)}
          variant="outline"
          className="gap-2"
        >
          Manage Connection
        </Button>

        <AccountingConnectionDialog
          organizationId={organizationId}
          platform={connectedPlatform}
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onConnectionChange={handleConnectionChange}
        />
      </>
    )
  }

  // Not connected - show separate buttons for each platform
  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          onClick={() => handleConnectClick('quickbooks')}
          variant="outline"
          className="gap-2"
        >
          <Zap className="h-4 w-4" />
          Connect QuickBooks
        </Button>
        <Button
          onClick={() => handleConnectClick('xero')}
          variant="outline"
          className="gap-2"
        >
          <Zap className="h-4 w-4" />
          Connect Xero
        </Button>
      </div>

      <AccountingConnectionDialog
        organizationId={organizationId}
        platform={selectedPlatform}
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConnectionChange={handleConnectionChange}
      />
    </>
  )
}
