/**
 * Activity Feed Item Component
 *
 * Individual activity entry (import or post) in the activity feed
 */

'use client'

import { format, parseISO } from 'date-fns'
import { Upload, CheckCircle2 } from 'lucide-react'

interface ActivityFeedItemProps {
  type: 'import' | 'post'
  createdAt: string
  userName: string | null
  metadata: {
    // For imports
    succeeded?: number
    failed?: number
    skipped?: number
    filename?: string
    // For posts
    month?: string
    amount?: number
    journal_entry_id?: string
  }
}

export function ActivityFeedItem({
  type,
  createdAt,
  userName,
  metadata,
}: ActivityFeedItemProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const formatDateTime = (dateString: string) => {
    return format(parseISO(dateString), 'MMM d, yyyy \'at\' h:mm a')
  }

  const formatMonth = (dateString: string) => {
    return format(parseISO(dateString), 'MMMM yyyy')
  }

  return (
    <div className="py-4 hover:bg-gray-50 transition-colors rounded-md px-2">
      <div className="flex gap-3">
        {/* Icon */}
        <div className="flex-shrink-0">
          {type === 'import' ? (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <Upload className="h-5 w-5 text-blue-600" />
            </div>
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {type === 'import' ? (
            <>
              <h3 className="text-sm font-medium text-gray-900">
                Import Completed
              </h3>
              <div className="mt-1 flex items-center gap-2 text-sm text-gray-600 tabular-nums">
                {metadata.succeeded !== undefined && metadata.succeeded > 0 && (
                  <span className="text-green-600">
                    {metadata.succeeded} imported
                  </span>
                )}
                {metadata.skipped !== undefined && metadata.skipped > 0 && (
                  <span className="text-yellow-600">
                    {metadata.skipped} skipped
                  </span>
                )}
                {metadata.failed !== undefined && metadata.failed > 0 && (
                  <span className="text-red-600">{metadata.failed} failed</span>
                )}
              </div>
            </>
          ) : (
            <>
              <h3 className="text-sm font-medium text-gray-900">
                Posted to QuickBooks
              </h3>
              <div className="mt-1 text-sm text-gray-600 tabular-nums">
                {metadata.month && formatMonth(metadata.month)} •{' '}
                {metadata.amount && formatCurrency(metadata.amount)}
                {metadata.journal_entry_id && (
                  <span className="ml-2 font-mono text-xs text-gray-500">
                    {metadata.journal_entry_id}
                  </span>
                )}
              </div>
            </>
          )}

          {/* Metadata */}
          <div className="mt-2 text-xs text-gray-500">
            {formatDateTime(createdAt)} by {userName || 'Unknown'}
          </div>
        </div>
      </div>
    </div>
  )
}
