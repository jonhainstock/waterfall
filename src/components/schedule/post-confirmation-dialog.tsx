/**
 * Post Confirmation Dialog Component
 *
 * Dialog for confirming QuickBooks journal entry posting.
 * Shows month details, amount breakdown, and warning about immutability.
 */

'use client'

import { format, parseISO } from 'date-fns'
import { AlertTriangle, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface PostConfirmationDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  month: string
  totalAmount: number
  contractCount: number
  isProcessing: boolean
}

export function PostConfirmationDialog({
  isOpen,
  onClose,
  onConfirm,
  month,
  totalAmount,
  contractCount,
  isProcessing,
}: PostConfirmationDialogProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatMonth = (dateString: string) => {
    return format(parseISO(dateString), 'MMMM yyyy')
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isProcessing && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Post to QuickBooks</DialogTitle>
          <DialogDescription>
            Review the journal entry details before posting
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <p className="text-sm text-muted-foreground">
            You're about to create a journal entry for:
          </p>

          <div className="rounded-md bg-muted p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="font-medium">Month:</span>
                <span>{formatMonth(month)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Total Amount:</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Contracts:</span>
                <span>{contractCount}</span>
              </div>
            </div>
          </div>

          <div className="rounded-md bg-blue-50 p-4">
            <h4 className="mb-2 text-sm font-medium text-blue-900">
              Journal Entry:
            </h4>
            <div className="space-y-1 text-sm text-blue-800">
              <div className="flex justify-between">
                <span>Debit: Deferred Revenue</span>
                <span className="font-medium">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Credit: Revenue</span>
                <span className="font-medium">
                  {formatCurrency(totalAmount)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 rounded-md bg-yellow-50 p-4">
            <AlertTriangle className="h-5 w-5 flex-shrink-0 text-yellow-600" />
            <div className="text-sm text-yellow-800">
              <p className="font-medium">Important:</p>
              <p className="mt-1">
                Once posted, these schedules cannot be modified without
                adjusting the journal entry in QuickBooks.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isProcessing}>
            {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
            {isProcessing ? 'Posting...' : 'Post to QuickBooks'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
