/**
 * Post Activity Dialog Component
 *
 * Modal dialog showing details of a posted month's revenue recognition
 */

'use client'

import { useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { CheckCircle2, X, RefreshCw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { TieOutPanel } from '@/components/reconciliation/tie-out-panel'
import { verifyTieOut } from '@/app/(dashboard)/[organizationId]/reconciliation-actions'
import type { TieOutResult } from '@/app/(dashboard)/[organizationId]/reconciliation-actions'

interface PostActivityData {
  month: string
  amount: number
  journal_entry_id: string | null
  posted_by: string | null
  posted_at: string | null
}

interface PostActivityDialogProps {
  isOpen: boolean
  onClose: () => void
  activity: PostActivityData | null
  platformName: string
  organizationId: string
}

export function PostActivityDialog({
  isOpen,
  onClose,
  activity,
  platformName,
  organizationId,
}: PostActivityDialogProps) {
  const [tieOutResult, setTieOutResult] = useState<TieOutResult | null>(null)
  const [isLoadingTieOut, setIsLoadingTieOut] = useState(false)
  const [showTieOut, setShowTieOut] = useState(false)

  // Run tie-out verification when dialog opens after posting
  useEffect(() => {
    if (isOpen && activity && activity.posted_at) {
      setIsLoadingTieOut(true)
      verifyTieOut(organizationId)
        .then((result) => {
          setTieOutResult(result)
        })
        .catch((error) => {
          console.error('Failed to verify tie-out:', error)
        })
        .finally(() => {
          setIsLoadingTieOut(false)
        })
    }
  }, [isOpen, activity, organizationId])

  if (!activity) return null

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

  const formatDateTime = (dateString: string) => {
    return format(parseISO(dateString), 'MMM d, yyyy \'at\' h:mm a')
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Posted to {platformName}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Month */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Month
            </label>
            <p className="mt-1 text-sm font-medium text-gray-900">
              {formatMonth(activity.month)}
            </p>
          </div>

          {/* Amount */}
          <div>
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Amount
            </label>
            <p className="mt-1 text-lg font-semibold text-gray-900 tabular-nums">
              {formatCurrency(activity.amount)}
            </p>
          </div>

          {/* Journal Entry ID */}
          {activity.journal_entry_id && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Journal Entry ID
              </label>
              <p className="mt-1 font-mono text-sm text-gray-700">
                {activity.journal_entry_id}
              </p>
            </div>
          )}

          {/* Posted By */}
          {activity.posted_by && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Posted By
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {activity.posted_by}
              </p>
            </div>
          )}

          {/* Posted At */}
          {activity.posted_at && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Posted At
              </label>
              <p className="mt-1 text-sm text-gray-900">
                {formatDateTime(activity.posted_at)}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {tieOutResult && (
            <div className="rounded-md border p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium">Tie-Out Verification</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTieOut(!showTieOut)}
                >
                  {showTieOut ? 'Hide' : 'Show'} Details
                </Button>
              </div>
              {tieOutResult.overallMatches ? (
                <p className="text-sm text-green-600">
                  ✓ All balances match
                </p>
              ) : (
                <p className="text-sm text-destructive">
                  ⚠ Discrepancies found - balances do not match
                </p>
              )}
              {showTieOut && (
                <div className="mt-4">
                  <TieOutPanel
                    organizationId={organizationId}
                    initialResult={tieOutResult}
                    onRefresh={async () => {
                      return await verifyTieOut(organizationId)
                    }}
                  />
                </div>
              )}
            </div>
          )}
          {isLoadingTieOut && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Verifying tie-out...
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
