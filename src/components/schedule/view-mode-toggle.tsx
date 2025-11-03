/**
 * View Mode Toggle Component
 *
 * Allows switching between Summary and Detail views for the waterfall schedule.
 * - Summary: Shows only revenue columns (cleaner)
 * - Detail: Shows revenue + balance columns (full rollforward)
 */

'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { LayoutGrid, List } from 'lucide-react'

interface ViewModeToggleProps {
  organizationId: string
  currentViewMode?: 'summary' | 'detail'
}

export function ViewModeToggle({
  organizationId,
  currentViewMode = 'summary',
}: ViewModeToggleProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleModeChange = (mode: 'summary' | 'detail') => {
    if (mode === currentViewMode) return

    const params = new URLSearchParams(searchParams)
    params.set('viewMode', mode)

    // Preserve other params
    if (!params.has('tab')) {
      params.set('tab', 'waterfall')
    }

    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="inline-flex items-center h-9 rounded-lg border border-gray-300 bg-white p-1 shadow-sm">
      <button
        onClick={() => handleModeChange('summary')}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors ${
          currentViewMode === 'summary'
            ? 'bg-gray-900 text-white shadow-sm'
            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
        }`}
        title="Summary view - shows revenue columns only"
      >
        <LayoutGrid className="h-4 w-4" />
        <span className="hidden sm:inline">Summary</span>
      </button>
      <button
        onClick={() => handleModeChange('detail')}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-sm font-medium transition-colors ${
          currentViewMode === 'detail'
            ? 'bg-gray-900 text-white shadow-sm'
            : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
        }`}
        title="Detail view - shows revenue and balance columns"
      >
        <List className="h-4 w-4" />
        <span className="hidden sm:inline">Detail</span>
      </button>
    </div>
  )
}
