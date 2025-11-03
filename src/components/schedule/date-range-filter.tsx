/**
 * Date Range Filter Component
 *
 * Provides a popover-based date range filter for the waterfall schedule.
 * Updates URL parameters when a date range is applied.
 */

'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { Calendar, X } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

interface DateRangeFilterProps {
  organizationId: string
  currentStartDate?: string
  currentEndDate?: string
}

export function DateRangeFilter({
  organizationId,
  currentStartDate,
  currentEndDate,
}: DateRangeFilterProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [isOpen, setIsOpen] = useState(false)
  const [startDate, setStartDate] = useState(currentStartDate || '')
  const [endDate, setEndDate] = useState(currentEndDate || '')
  const [error, setError] = useState<string | null>(null)

  // Format display text for button
  const getDisplayText = () => {
    if (currentStartDate && currentEndDate) {
      try {
        const start = format(parseISO(currentStartDate), 'MMM yyyy')
        const end = format(parseISO(currentEndDate), 'MMM yyyy')
        return `${start} - ${end}`
      } catch {
        return 'Date Range'
      }
    }
    return 'Date Range'
  }

  // Validate date range
  const validateDates = (start: string, end: string): boolean => {
    if (!start || !end) {
      setError('Both start and end dates are required')
      return false
    }

    const startDateObj = new Date(start)
    const endDateObj = new Date(end)

    if (startDateObj > endDateObj) {
      setError('Start date must be before or equal to end date')
      return false
    }

    setError(null)
    return true
  }

  // Apply filter
  const handleApply = () => {
    if (!validateDates(startDate, endDate)) {
      return
    }

    // Build new URL with date range params
    const params = new URLSearchParams(searchParams)
    params.set('startDate', startDate)
    params.set('endDate', endDate)

    // Preserve existing tab param
    if (!params.has('tab')) {
      params.set('tab', 'waterfall')
    }

    router.push(`${pathname}?${params.toString()}`)
    setIsOpen(false)
  }

  // Clear filter
  const handleClear = () => {
    setStartDate('')
    setEndDate('')
    setError(null)

    // Build new URL without date range params
    const params = new URLSearchParams(searchParams)
    params.delete('startDate')
    params.delete('endDate')

    // Preserve existing tab param
    if (!params.has('tab')) {
      params.set('tab', 'waterfall')
    }

    const newUrl = params.toString()
      ? `${pathname}?${params.toString()}`
      : pathname

    router.push(newUrl)
    setIsOpen(false)
  }

  // Reset local state when popover opens
  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (open) {
      setStartDate(currentStartDate || '')
      setEndDate(currentEndDate || '')
      setError(null)
    }
  }

  const isFiltered = currentStartDate && currentEndDate

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={`h-9 gap-2 ${isFiltered ? 'border-blue-500 bg-blue-50 text-blue-700' : ''}`}
        >
          <Calendar className="h-4 w-4" />
          <span className="hidden sm:inline">{getDisplayText()}</span>
          <span className="sm:hidden">Filter</span>
          {isFiltered && (
            <X
              className="h-3.5 w-3.5 opacity-70 hover:opacity-100"
              onClick={(e) => {
                e.stopPropagation()
                handleClear()
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Filter by Date Range</h4>
            <p className="text-sm text-gray-500">
              Show waterfall for a specific time period
            </p>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="start-date" className="text-sm font-medium">
                Start Date
              </Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="end-date" className="text-sm font-medium">
                End Date
              </Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full"
              />
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleApply}
              disabled={!startDate || !endDate}
              size="sm"
              className="flex-1"
            >
              Apply Filter
            </Button>
            <Button
              onClick={handleClear}
              variant="outline"
              size="sm"
              className="flex-1"
            >
              Clear
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
