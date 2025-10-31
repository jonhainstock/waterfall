/**
 * QuickBooks Connection Dialog Component
 *
 * Multi-step modal for QuickBooks connection and account mapping.
 * Uses localStorage for mock state persistence.
 */

'use client'

import { useState, useEffect } from 'react'
import { Check, Info, AlertTriangle, Loader2 } from 'lucide-react'
import {
  MOCK_QB_COMPANY,
  MOCK_LIABILITY_ACCOUNTS,
  MOCK_INCOME_ACCOUNTS,
  DEFAULT_ACCOUNT_MAPPING,
  type MockQBAccount,
} from './mock-quickbooks-data'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'

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
    accountId: string
  ) => {
    const account =
      field === 'deferredRevenueAccountId'
        ? MOCK_LIABILITY_ACCOUNTS.find((a) => a.id === accountId)
        : MOCK_INCOME_ACCOUNTS.find((a) => a.id === accountId)

    if (!account) return

    if (field === 'deferredRevenueAccountId') {
      setAccountMapping({
        ...accountMapping,
        deferredRevenueAccountId: account.id,
        deferredRevenueAccountName: account.name,
      })
    } else if (field === 'revenueAccountId') {
      setAccountMapping({
        ...accountMapping,
        revenueAccountId: account.id,
        revenueAccountName: account.name,
      })
    }
  }

  const handleAccountChangeInSettings = (
    field: keyof AccountMapping,
    accountId: string
  ) => {
    handleAccountSelect(field, accountId)

    const account =
      field === 'deferredRevenueAccountId'
        ? MOCK_LIABILITY_ACCOUNTS.find((a) => a.id === accountId)
        : MOCK_INCOME_ACCOUNTS.find((a) => a.id === accountId)

    if (account) {
      const updatedMapping = {
        ...accountMapping,
        ...(field === 'deferredRevenueAccountId'
          ? {
              deferredRevenueAccountId: account.id,
              deferredRevenueAccountName: account.name,
            }
          : {
              revenueAccountId: account.id,
              revenueAccountName: account.name,
            }),
      }
      localStorage.setItem(
        `qb_mapping_${organizationId}`,
        JSON.stringify(updatedMapping)
      )
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {currentScreen === 'connect' && 'Connect to QuickBooks'}
            {currentScreen === 'mapping' && 'Configure Accounts'}
            {currentScreen === 'connected' && 'QuickBooks Settings'}
          </DialogTitle>
          <DialogDescription>
            {currentScreen === 'connect' &&
              'Enable QuickBooks integration for automated revenue recognition'}
            {currentScreen === 'mapping' && 'Map your QuickBooks accounts'}
            {currentScreen === 'connected' && 'Manage your QuickBooks connection'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Screen 1: Not Connected */}
          {currentScreen === 'connect' && (
            <>
              <div className="flex gap-3 rounded-md bg-blue-50 p-4">
                <Info className="h-5 w-5 flex-shrink-0 text-blue-600" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium">What does this enable?</p>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>Post journal entries to QuickBooks</li>
                    <li>Sync revenue recognition automatically</li>
                    <li>Keep your books up to date</li>
                  </ul>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>
                  Clicking "Connect" will redirect you to QuickBooks to authorize
                  Waterfall. You'll return here to configure your accounts.
                </p>
                <p className="mt-2 font-medium text-foreground">
                  (Mockup: This will simulate a connection without real OAuth)
                </p>
              </div>
            </>
          )}

          {/* Screen 2: Account Mapping */}
          {currentScreen === 'mapping' && (
            <>
              <div className="flex items-center gap-2 rounded-md bg-green-50 p-4 text-sm text-green-800">
                <Check className="h-5 w-5 text-green-600" />
                <span className="font-medium">
                  Connected to {MOCK_QB_COMPANY.name}
                </span>
              </div>

              <p className="text-sm text-muted-foreground">
                Select which QuickBooks accounts to use for revenue recognition:
              </p>

              {/* Deferred Revenue Account */}
              <div className="grid gap-2">
                <Label htmlFor="deferred-account">Deferred Revenue Account</Label>
                <Select
                  value={accountMapping.deferredRevenueAccountId}
                  onValueChange={(value) =>
                    handleAccountSelect('deferredRevenueAccountId', value)
                  }
                >
                  <SelectTrigger id="deferred-account">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_LIABILITY_ACCOUNTS.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The liability account you'll debit each month
                </p>
              </div>

              {/* Revenue Account */}
              <div className="grid gap-2">
                <Label htmlFor="revenue-account">Revenue Account</Label>
                <Select
                  value={accountMapping.revenueAccountId}
                  onValueChange={(value) =>
                    handleAccountSelect('revenueAccountId', value)
                  }
                >
                  <SelectTrigger id="revenue-account">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_INCOME_ACCOUNTS.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The income account you'll credit each month
                </p>
              </div>

              <div className="rounded-md bg-yellow-50 p-3">
                <p className="text-xs text-yellow-800">
                  These accounts will be used for all journal entries. You can
                  change them later in this dialog.
                </p>
              </div>
            </>
          )}

          {/* Screen 3: Connected/Settings */}
          {currentScreen === 'connected' && (
            <>
              <div className="rounded-md bg-green-50 p-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-green-800">
                    <Check className="h-5 w-5 text-green-600" />
                    <span>Connected to QuickBooks</span>
                  </div>
                  <p className="text-sm text-green-700">
                    {MOCK_QB_COMPANY.name} ({MOCK_QB_COMPANY.environment})
                  </p>
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-medium">Account Mapping</h3>

                {/* Deferred Revenue Account */}
                <div className="mb-3 grid gap-2">
                  <Label htmlFor="deferred-account-settings">
                    Deferred Revenue Account
                  </Label>
                  <Select
                    value={accountMapping.deferredRevenueAccountId}
                    onValueChange={(value) =>
                      handleAccountChangeInSettings('deferredRevenueAccountId', value)
                    }
                  >
                    <SelectTrigger id="deferred-account-settings">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_LIABILITY_ACCOUNTS.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Revenue Account */}
                <div className="grid gap-2">
                  <Label htmlFor="revenue-account-settings">Revenue Account</Label>
                  <Select
                    value={accountMapping.revenueAccountId}
                    onValueChange={(value) =>
                      handleAccountChangeInSettings('revenueAccountId', value)
                    }
                  >
                    <SelectTrigger id="revenue-account-settings">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MOCK_INCOME_ACCOUNTS.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="border-t pt-4">
                <Button
                  variant="destructive"
                  onClick={handleDisconnect}
                  size="sm"
                >
                  Disconnect QuickBooks
                </Button>
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          {currentScreen === 'connect' && (
            <>
              <Button variant="outline" onClick={onClose} disabled={isConnecting}>
                Cancel
              </Button>
              <Button onClick={handleConnect} disabled={isConnecting}>
                {isConnecting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isConnecting ? 'Connecting...' : 'Connect to QuickBooks'}
              </Button>
            </>
          )}

          {currentScreen === 'mapping' && (
            <>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleSaveMapping}>Save Mapping</Button>
            </>
          )}

          {currentScreen === 'connected' && (
            <Button onClick={onClose}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
