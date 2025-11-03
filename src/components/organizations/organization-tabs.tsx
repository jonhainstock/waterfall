/**
 * Organization Tabs Component
 *
 * Tab navigation for organization pages (Waterfall Schedule / Activity History)
 */

'use client'

import { useRouter } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { WaterfallTable } from '@/components/schedule/waterfall-table'
import { ActivityHistory } from '@/components/activity/activity-history'
import { ImportButton } from '@/components/contracts/import-button'
import { ExportCSVButton } from '@/components/schedule/export-csv-button'
import { FileText } from 'lucide-react'

interface OrganizationTabsProps {
  organizationId: string
  activeTab: string
  contracts: any[]
  schedules: any[]
  connectedPlatform?: string | null
}

export function OrganizationTabs({
  organizationId,
  activeTab,
  contracts,
  schedules,
  connectedPlatform,
}: OrganizationTabsProps) {
  const router = useRouter()

  const handleTabChange = (value: string) => {
    router.push(`/${organizationId}?tab=${value}`)
  }

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="mt-8">
      <div className="flex items-center justify-between gap-4 mb-6">
        <TabsList>
          <TabsTrigger value="waterfall">Waterfall Schedule</TabsTrigger>
          <TabsTrigger value="history">Activity History</TabsTrigger>
        </TabsList>

        {activeTab === 'waterfall' && (
          <div className="flex items-center gap-3">
            <ExportCSVButton
              contracts={contracts}
              schedules={schedules}
            />
          </div>
        )}
      </div>

      <TabsContent value="waterfall" className="mt-6">
        {!contracts || contracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400" />
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No contracts yet
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              Get started by importing your contract data via CSV.
            </p>
            <div className="mt-6">
              <ImportButton organizationId={organizationId} />
            </div>
          </div>
        ) : (
          <WaterfallTable
            contracts={contracts || []}
            schedules={schedules || []}
            organizationId={organizationId}
            canPostToAccounting={true}
            connectedPlatform={connectedPlatform}
          />
        )}
      </TabsContent>

      <TabsContent value="history" className="mt-6">
        <ActivityHistory organizationId={organizationId} />
      </TabsContent>
    </Tabs>
  )
}
