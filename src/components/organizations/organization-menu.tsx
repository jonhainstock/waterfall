/**
 * Organization Menu Component
 *
 * Dropdown menu for organization management actions:
 * - Edit organization name
 * - Manage accounting connection (or connect options)
 */

'use client'

import { useState } from 'react'
import { MoreVertical, Pencil, Zap, Settings } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { EditOrganizationNameDialog } from './edit-organization-name-dialog'
import { AccountingConnectionDialog } from '@/components/accounting/accounting-connection-dialog'
import type { AccountingPlatform } from '@/lib/accounting/types'

interface OrganizationMenuProps {
  organizationId: string
  organizationName: string
  connectedPlatform?: AccountingPlatform | null
}

export function OrganizationMenu({
  organizationId,
  organizationName,
  connectedPlatform,
}: OrganizationMenuProps) {
  const [isEditNameOpen, setIsEditNameOpen] = useState(false)
  const [isAccountingDialogOpen, setIsAccountingDialogOpen] = useState(false)
  const [selectedPlatform, setSelectedPlatform] = useState<AccountingPlatform>(
    connectedPlatform || 'quickbooks'
  )

  const handleConnectClick = (platform: AccountingPlatform) => {
    setSelectedPlatform(platform)
    setIsAccountingDialogOpen(true)
  }

  const handleManageConnection = () => {
    if (connectedPlatform) {
      setSelectedPlatform(connectedPlatform)
    }
    setIsAccountingDialogOpen(true)
  }

  const handleConnectionChange = () => {
    // Connection state changes will be handled by page refresh
    setIsAccountingDialogOpen(false)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Organization menu</span>
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-56">
          {/* Edit Organization Name */}
          <DropdownMenuItem onClick={() => setIsEditNameOpen(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            <span>Edit Organization Name</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Accounting Integration Options */}
          {connectedPlatform ? (
            // Already connected - show manage option
            <DropdownMenuItem onClick={handleManageConnection}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Manage Connection</span>
            </DropdownMenuItem>
          ) : (
            // Not connected - show connect options
            <>
              <DropdownMenuItem onClick={() => handleConnectClick('quickbooks')}>
                <Zap className="mr-2 h-4 w-4" />
                <span>Connect QuickBooks</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleConnectClick('xero')}>
                <Zap className="mr-2 h-4 w-4" />
                <span>Connect Xero</span>
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Edit Name Dialog */}
      <EditOrganizationNameDialog
        organizationId={organizationId}
        currentName={organizationName}
        isOpen={isEditNameOpen}
        onClose={() => setIsEditNameOpen(false)}
      />

      {/* Accounting Connection Dialog */}
      <AccountingConnectionDialog
        organizationId={organizationId}
        platform={selectedPlatform}
        isOpen={isAccountingDialogOpen}
        onClose={() => setIsAccountingDialogOpen(false)}
        onConnectionChange={handleConnectionChange}
      />
    </>
  )
}
