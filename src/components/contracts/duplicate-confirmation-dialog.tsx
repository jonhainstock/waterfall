/**
 * Duplicate Confirmation Dialog Component
 *
 * Shows duplicates found during import and allows user to skip them.
 */

'use client'

import { format, parseISO } from 'date-fns'
import { AlertTriangle, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'

interface DuplicateContract {
  invoice_id: string
  created_at: string
  contract_amount: number
}

interface DuplicateConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (skipInvoiceIds: string[]) => void
  duplicates: DuplicateContract[]
  newContractsCount: number
  totalContractsCount: number
}

export function DuplicateConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  duplicates,
  newContractsCount,
  totalContractsCount,
}: DuplicateConfirmationDialogProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return format(parseISO(dateString), 'MMM d, yyyy')
  }

  const handleSkipDuplicates = () => {
    onConfirm(duplicates.map((d) => d.invoice_id))
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Duplicates Detected</DialogTitle>
          <DialogDescription>
            Some contracts in your file already exist in the system
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Warning Banner */}
          <div className="flex gap-3 rounded-md bg-yellow-50 p-4">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-yellow-600" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">
                {duplicates.length} contract{duplicates.length !== 1 ? 's' : ''}{' '}
                already exist with the same invoice ID
              </p>
              <p className="mt-1">
                These contracts were previously imported and will be skipped to
                avoid duplicates.
              </p>
            </div>
          </div>

          {/* List of duplicates */}
          <div>
            <h3 className="mb-2 text-sm font-medium">
              Existing Contracts (will be skipped):
            </h3>
            <ScrollArea className="h-64 rounded-md border">
              <div className="space-y-2 p-4">
                {duplicates.map((duplicate) => (
                  <div
                    key={duplicate.invoice_id}
                    className="flex items-center justify-between rounded-md border bg-gray-50 p-3"
                  >
                    <div>
                      <p className="font-medium">{duplicate.invoice_id}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatCurrency(duplicate.contract_amount)} • Imported{' '}
                        {formatDate(duplicate.created_at)}
                      </p>
                    </div>
                    <X className="h-5 w-5 text-yellow-600" />
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {/* Summary */}
          <div className="rounded-md bg-blue-50 p-4">
            <h3 className="mb-2 text-sm font-medium text-blue-900">
              Import Summary:
            </h3>
            <ul className="space-y-1 text-sm text-blue-800">
              <li>
                • {newContractsCount} new contract{newContractsCount !== 1 ? 's' : ''}{' '}
                will be imported
              </li>
              <li>
                • {duplicates.length} duplicate{duplicates.length !== 1 ? 's' : ''}{' '}
                will be skipped
              </li>
              <li>• {totalContractsCount} total contracts in CSV</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSkipDuplicates}>
            Import {newContractsCount} New Contract
            {newContractsCount !== 1 ? 's' : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
