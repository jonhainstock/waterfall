/**
 * Post Confirmation Dialog Component
 *
 * Dialog for confirming QuickBooks journal entry posting.
 * Shows month details, amount breakdown, and warning about immutability.
 */

'use client'

import { format, parseISO } from 'date-fns'

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
  if (!isOpen) return null

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
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={isProcessing ? undefined : onClose}
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
              Post to QuickBooks
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
              disabled={isProcessing}
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
            <p className="mb-4 text-sm text-gray-600">
              You're about to create a journal entry for:
            </p>

            <div className="mb-4 rounded-md bg-gray-50 p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Month:</span>
                  <span className="text-gray-900">{formatMonth(month)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">
                    Total Amount:
                  </span>
                  <span className="text-gray-900">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Contracts:</span>
                  <span className="text-gray-900">{contractCount}</span>
                </div>
              </div>
            </div>

            <div className="mb-4 rounded-md bg-blue-50 p-4">
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

            <div className="rounded-md bg-yellow-50 p-4">
              <div className="flex gap-3">
                <svg
                  className="h-5 w-5 flex-shrink-0 text-yellow-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Important:</p>
                  <p className="mt-1">
                    Once posted, these schedules cannot be modified without
                    adjusting the journal entry in QuickBooks.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isProcessing}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isProcessing ? (
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
                  Posting...
                </>
              ) : (
                'Post to QuickBooks'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
