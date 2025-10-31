/**
 * Accounting Connection Dialog Component
 *
 * Platform-agnostic multi-step modal for accounting platform connection.
 * Supports QuickBooks and Xero with the same interface.
 */

'use client'

import { useState, useEffect } from 'react'
import { Check, Info, Loader2 } from 'lucide-react'
import {
  MOCK_LIABILITY_ACCOUNTS,
  MOCK_INCOME_ACCOUNTS,
  DEFAULT_ACCOUNT_MAPPING,
} from '../quickbooks/mock-quickbooks-data'
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
import type { AccountingPlatform } from '@/lib/accounting/types'
import { getPlatformDisplayName, getPlatformColor } from '@/lib/accounting/provider-factory'

interface AccountingConnectionDialogProps {
  organizationId: string
  platform: AccountingPlatform
  isOpen: boolean
  onClose: () => void
  onConnectionChange: (connected: boolean, platform?: AccountingPlatform) => void
}

type DialogScreen = 'connect' | 'mapping' | 'connected'

interface AccountMapping {
  deferredRevenueAccountId: string
  deferredRevenueAccountName: string
  revenueAccountId: string
  revenueAccountName: string
}

export function AccountingConnectionDialog({
  organizationId,
  platform,
  isOpen,
  onClose,
  onConnectionChange,
}: AccountingConnectionDialogProps) {
  const [currentScreen, setCurrentScreen] = useState<DialogScreen>('connect')
  const [isConnecting, setIsConnecting] = useState(false)
  const [accountMapping, setAccountMapping] = useState<AccountMapping>(
    DEFAULT_ACCOUNT_MAPPING
  )

  const platformName = getPlatformDisplayName(platform)
  const platformColor = getPlatformColor(platform)
  const storageKeyConnected = `accounting_connected_${organizationId}`
  const storageKeyMapping = `accounting_mapping_${organizationId}`
  const storageKeyPlatform = `accounting_platform_${organizationId}`

  // Load state from localStorage
  useEffect(() => {
    if (isOpen) {
      const connected = localStorage.getItem(storageKeyConnected)
      const mapping = localStorage.getItem(storageKeyMapping)
      const storedPlatform = localStorage.getItem(storageKeyPlatform)

      if (connected === 'true' && storedPlatform === platform) {
        setCurrentScreen('connected')
        if (mapping) {
          setAccountMapping(JSON.parse(mapping))
        }
      } else {
        setCurrentScreen('connect')
      }
    }
  }, [isOpen, organizationId, platform, storageKeyConnected, storageKeyMapping, storageKeyPlatform])

  const handleConnect = async () => {
    setIsConnecting(true)
    // Simulate OAuth redirect/callback
    await new Promise((resolve) => setTimeout(resolve, 1500))
    setIsConnecting(false)
    setCurrentScreen('mapping')
  }

  const handleSaveMapping = () => {
    // Save to localStorage
    localStorage.setItem(storageKeyConnected, 'true')
    localStorage.setItem(storageKeyPlatform, platform)
    localStorage.setItem(storageKeyMapping, JSON.stringify(accountMapping))
    onConnectionChange(true, platform)
    onClose()
  }

  const handleDisconnect = () => {
    localStorage.removeItem(storageKeyConnected)
    localStorage.removeItem(storageKeyPlatform)
    localStorage.removeItem(storageKeyMapping)
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
      localStorage.setItem(storageKeyMapping, JSON.stringify(updatedMapping))
    }
  }

  const colorClass = platformColor === 'green' ? 'bg-green-50 text-green-800' : 'bg-blue-50 text-blue-800'
  const colorIconClass = platformColor === 'green' ? 'text-green-600' : 'text-blue-600'

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {currentScreen === 'connect' && `Connect to ${platformName}`}
            {currentScreen === 'mapping' && 'Configure Accounts'}
            {currentScreen === 'connected' && `${platformName} Settings`}
          </DialogTitle>
          <DialogDescription>
            {currentScreen === 'connect' &&
              `Enable ${platformName} integration for automated revenue recognition`}
            {currentScreen === 'mapping' && `Map your ${platformName} accounts`}
            {currentScreen === 'connected' && `Manage your ${platformName} connection`}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Screen 1: Not Connected */}
          {currentScreen === 'connect' && (
            <>
              <div className={`flex gap-3 rounded-md p-4 ${colorClass}`}>
                <Info className={`h-5 w-5 flex-shrink-0 ${colorIconClass}`} />
                <div className="text-sm">
                  <p className="font-medium">What does this enable?</p>
                  <ul className="mt-2 space-y-1 list-disc list-inside">
                    <li>Post journal entries to {platformName}</li>
                    <li>Sync revenue recognition automatically</li>
                    <li>Keep your books up to date</li>
                  </ul>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                <p>
                  Clicking "Connect" will redirect you to {platformName} to authorize
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
              <div className={`flex items-center gap-2 rounded-md p-4 text-sm ${colorClass}`}>
                <Check className={`h-5 w-5 ${colorIconClass}`} />
                <span className="font-medium">
                  Connected to {platformName} (Mock Company)
                </span>
              </div>

              <p className="text-sm text-muted-foreground">
                Select which {platformName} accounts to use for revenue recognition:
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
              <div className={`rounded-md p-4 ${colorClass}`}>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Check className={`h-5 w-5 ${colorIconClass}`} />
                    <span>Connected to {platformName}</span>
                  </div>
                  <p className="text-sm">
                    Mock Company (Sandbox)
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-base font-semibold leading-none tracking-tight">
                    Account Mapping
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1.5">
                    Select the accounts to use for revenue recognition
                  </p>
                </div>

                {/* Deferred Revenue Account */}
                <div className="grid gap-2">
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
                {isConnecting ? 'Connecting...' : `Connect to ${platformName}`}
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
            <>
              <Button
                variant="destructive"
                onClick={handleDisconnect}
                className="mr-auto"
              >
                Disconnect {platformName}
              </Button>
              <Button onClick={onClose}>Save</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
