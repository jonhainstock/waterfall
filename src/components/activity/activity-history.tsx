/**
 * Activity History Component
 *
 * Displays chronological activity feed of imports and posts
 */

'use client'

import { useEffect, useState } from 'react'
import { Loader2, Clock } from 'lucide-react'
import { getActivityFeed } from '@/app/(dashboard)/[organizationId]/actions'
import { ActivityFeedItem } from './activity-feed-item'
import { Separator } from '@/components/ui/separator'

interface ActivityHistoryProps {
  organizationId: string
}

interface Activity {
  id: string
  type: 'import' | 'post'
  created_at: string
  user_name: string | null
  metadata: {
    succeeded?: number
    failed?: number
    skipped?: number
    filename?: string
    month?: string
    amount?: number
    journal_entry_id?: string
  }
}

export function ActivityHistory({ organizationId }: ActivityHistoryProps) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadActivities() {
      setIsLoading(true)
      setError(null)

      const result = await getActivityFeed(organizationId)

      if (result.error) {
        setError(result.error)
      } else {
        setActivities(result.activities)
      }

      setIsLoading(false)
    }

    loadActivities()
  }, [organizationId])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">Loading activity...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-md bg-red-50 p-4">
        <p className="text-sm text-red-700">{error}</p>
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center">
        <Clock className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          No activity yet
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          Import contracts or post to QuickBooks to see activity here.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Activity History</h2>
        <span className="text-sm text-gray-500">
          {activities.length} {activities.length === 1 ? 'entry' : 'entries'}
        </span>
      </div>

      <div>
        {activities.map((activity, index) => (
          <div key={activity.id}>
            <ActivityFeedItem
              type={activity.type}
              createdAt={activity.created_at}
              userName={activity.user_name}
              metadata={activity.metadata}
            />
            {index < activities.length - 1 && <Separator />}
          </div>
        ))}
      </div>
    </div>
  )
}
