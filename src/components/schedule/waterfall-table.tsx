/**
 * Waterfall Table Component
 *
 * Displays contracts with monthly revenue recognition schedule in a waterfall format.
 * Shows contract details on the left and monthly recognition amounts across the top.
 */

'use client'

import { useMemo, useState, useEffect } from 'react'
import { format, parseISO } from 'date-fns'
import { Check, X } from 'lucide-react'
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type ColumnDef,
} from '@tanstack/react-table'
import { PostConfirmationDialog } from './post-confirmation-dialog'
import { PostActivityDialog } from './post-activity-dialog'
import { postMonthToQuickBooks } from '@/app/(dashboard)/[organizationId]/actions'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'

interface Contract {
  id: string
  invoice_id: string
  customer_name: string | null
  contract_amount: number
  start_date: string
  end_date: string
  term_months: number
}

interface Schedule {
  id: string
  contract_id: string
  recognition_month: string
  recognition_amount: number
  posted: boolean
  posted_at: string | null
  posted_by: string | null
  journal_entry_id: string | null
}

interface WaterfallTableProps {
  contracts: Contract[]
  schedules: Schedule[]
  organizationId: string
  canPostToAccounting?: boolean
  connectedPlatform?: string | null
}

export function WaterfallTable({
  contracts,
  schedules,
  organizationId,
  canPostToAccounting = false,
  connectedPlatform = null,
}: WaterfallTableProps) {
  const router = useRouter()
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [accountingConnected, setAccountingConnected] = useState(false)
  const [hasAccountMapping, setHasAccountMapping] = useState(false)
  const [platform, setPlatform] = useState<string | null>(null)
  const [viewingPostActivity, setViewingPostActivity] = useState<{
    month: string
    amount: number
    journal_entry_id: string | null
    posted_by: string | null
    posted_at: string | null
  } | null>(null)

  // Check accounting connection and account mapping from localStorage (mock)
  useEffect(() => {
    const connected = localStorage.getItem(`accounting_connected_${organizationId}`)
    const mapping = localStorage.getItem(`accounting_mapping_${organizationId}`)
    const storedPlatform = localStorage.getItem(`accounting_platform_${organizationId}`)

    setAccountingConnected(connected === 'true')
    setHasAccountMapping(!!mapping)
    setPlatform(storedPlatform)
  }, [organizationId])

  // Use mock state for accounting connection
  const effectiveConnected = accountingConnected
  const effectiveCanPost = canPostToAccounting && accountingConnected && hasAccountMapping
  const platformDisplayName = platform === 'xero' ? 'Xero' : 'QuickBooks'

  // Get unique months across all schedules, sorted chronologically
  const months = useMemo(() => {
    const uniqueMonths = Array.from(
      new Set(schedules.map((s) => s.recognition_month))
    ).sort()
    return uniqueMonths
  }, [schedules])

  // Determine which months are fully posted
  const monthPostingStatus = useMemo(() => {
    const status = new Map<string, boolean>()
    months.forEach((month) => {
      const monthSchedules = schedules.filter((s) => s.recognition_month === month)
      const allPosted = monthSchedules.length > 0 && monthSchedules.every((s) => s.posted)
      status.set(month, allPosted)
    })
    return status
  }, [months, schedules])

  // Create a map for quick schedule lookup
  const scheduleMap = useMemo(() => {
    const map = new Map<string, number>()
    schedules.forEach((schedule) => {
      const key = `${schedule.contract_id}-${schedule.recognition_month}`
      map.set(key, schedule.recognition_amount)
    })
    return map
  }, [schedules])

  // Calculate monthly totals
  const monthlyTotals = useMemo(() => {
    const totals = new Map<string, number>()
    months.forEach((month) => {
      const total = schedules
        .filter((s) => s.recognition_month === month)
        .reduce((sum, s) => sum + s.recognition_amount, 0)
      totals.set(month, total)
    })
    return totals
  }, [months, schedules])

  // Define columns for TanStack Table
  const columns = useMemo<ColumnDef<Contract>[]>(() => {
    const fixedColumns: ColumnDef<Contract>[] = [
      {
        accessorKey: 'invoice_id',
        header: 'Invoice ID',
        cell: ({ row }) => (
          <div className="font-medium text-gray-900">{row.original.invoice_id}</div>
        ),
      },
      {
        accessorKey: 'customer_name',
        header: 'Customer',
        cell: ({ row }) => (
          <div className="text-gray-700">{row.original.customer_name || '—'}</div>
        ),
      },
      {
        accessorKey: 'contract_amount',
        header: () => <div className="text-right">Contract Amount</div>,
        cell: ({ row }) => (
          <div className="text-right text-gray-900">
            {formatCurrency(row.original.contract_amount)}
          </div>
        ),
      },
      {
        accessorKey: 'term_months',
        header: () => <div className="text-center">Term</div>,
        cell: ({ row }) => (
          <div className="text-center text-gray-700">{row.original.term_months}mo</div>
        ),
      },
    ]

    // Add dynamic month columns
    const monthColumns: ColumnDef<Contract>[] = months.map((month) => ({
      id: month,
      header: () => {
        const isPosted = monthPostingStatus.get(month)
        return (
          <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
            <span>{formatMonth(month)}</span>
            {isPosted && <Check className="h-4 w-4 text-green-600" />}
          </div>
        )
      },
      cell: ({ row }) => {
        const key = `${row.original.id}-${month}`
        const amount = scheduleMap.get(key)
        return (
          <div className="text-right text-gray-900">
            {amount ? formatCurrency(amount) : '—'}
          </div>
        )
      },
    }))

    return [...fixedColumns, ...monthColumns]
  }, [months, monthPostingStatus, scheduleMap])

  // Initialize TanStack Table
  const table = useReactTable({
    data: contracts,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  // Format month header
  const formatMonth = (dateString: string) => {
    return format(parseISO(dateString), 'MMM yyyy')
  }

  // Handle opening the post dialog
  const handlePostClick = (month: string) => {
    setSelectedMonth(month)
    setError(null)
    setSuccess(null)
  }

  // Handle closing the dialog
  const handleCloseDialog = () => {
    if (!isProcessing) {
      setSelectedMonth(null)
      setError(null)
    }
  }

  // Handle confirming the post
  const handleConfirmPost = async () => {
    if (!selectedMonth) return

    setIsProcessing(true)
    setError(null)

    try {
      const result = await postMonthToQuickBooks(organizationId, selectedMonth)

      if (result.success) {
        setSuccess(`Posted ${formatMonth(selectedMonth)} to ${platformDisplayName} (${result.journalEntryId})`)
        setSelectedMonth(null)
        router.refresh()
      } else {
        setError(result.error || `Failed to post to ${platformDisplayName}`)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsProcessing(false)
    }
  }

  // Get contract count for selected month
  const getMonthContractCount = (month: string) => {
    return schedules.filter((s) => s.recognition_month === month).length
  }

  // Handle viewing posted activity
  const handleViewPostedActivity = (month: string) => {
    const monthSchedules = schedules.filter((s) => s.recognition_month === month && s.posted)
    if (monthSchedules.length === 0) return

    // Get the first posted schedule for metadata (they should all have same post data)
    const firstSchedule = monthSchedules[0]
    const totalAmount = monthSchedules.reduce((sum, s) => sum + s.recognition_amount, 0)

    setViewingPostActivity({
      month,
      amount: totalAmount,
      journal_entry_id: firstSchedule.journal_entry_id,
      posted_by: firstSchedule.posted_by,
      posted_at: firstSchedule.posted_at,
    })
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header, index) => (
                  <TableHead
                    key={header.id}
                    className={`px-4 py-3 text-xs font-medium uppercase tracking-wider text-gray-500 ${
                      index === 0
                        ? 'sticky left-0 z-10 bg-gray-50'
                        : 'bg-gray-50'
                    } ${
                      index >= 2 ? 'text-right' : 'text-left'
                    }`}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell, index) => (
                  <TableCell
                    key={cell.id}
                    className={`whitespace-nowrap px-4 py-4 text-sm ${
                      index === 0
                        ? 'sticky left-0 z-10 bg-white group-hover:bg-gray-50'
                        : ''
                    }`}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}

            {/* Totals row */}
            <TableRow className="bg-gray-100 font-semibold">
              <TableCell
                className="sticky left-0 z-10 bg-gray-100 whitespace-nowrap px-4 py-4 text-sm text-gray-900"
                colSpan={2}
              >
                TOTAL
              </TableCell>
              <TableCell className="whitespace-nowrap px-4 py-4 text-right text-sm text-gray-900">
                {formatCurrency(
                  contracts.reduce(
                    (sum, c) => sum + c.contract_amount,
                    0
                  )
                )}
              </TableCell>
              <TableCell className="whitespace-nowrap px-4 py-4"></TableCell>

              {/* Monthly totals */}
              {months.map((month) => (
                <TableCell
                  key={month}
                  className="whitespace-nowrap px-4 py-4 text-right text-sm text-gray-900"
                >
                  {formatCurrency(monthlyTotals.get(month) || 0)}
                </TableCell>
              ))}
            </TableRow>

            {/* Actions row - Post to Accounting Platform */}
            {(canPostToAccounting || accountingConnected) && (
              <TableRow className="bg-gray-50">
                <TableCell
                  className="sticky left-0 z-10 bg-gray-50 whitespace-nowrap px-4 py-3 text-xs text-gray-500"
                  colSpan={4}
                >
                  {platformDisplayName}
                </TableCell>

                {/* Post buttons for each month */}
                {months.map((month) => {
                  const isPosted = monthPostingStatus.get(month)
                  const monthTotal = monthlyTotals.get(month) || 0

                  return (
                    <TableCell
                      key={month}
                      className="whitespace-nowrap px-4 py-3 text-right"
                    >
                      {isPosted ? (
                        <button
                          onClick={() => handleViewPostedActivity(month)}
                          className="flex items-center justify-end gap-1.5 text-xs text-green-600 hover:text-green-700 hover:underline cursor-pointer transition-colors"
                        >
                          <Check className="h-3.5 w-3.5" />
                          <span>Posted</span>
                        </button>
                      ) : effectiveCanPost ? (
                        <Button
                          onClick={() => handlePostClick(month)}
                          size="sm"
                          disabled={monthTotal === 0}
                          title={monthTotal === 0 ? 'No revenue to post' : `Post to ${platformDisplayName}`}
                          className="h-7 px-3 text-xs"
                        >
                          Post
                        </Button>
                      ) : !accountingConnected ? (
                        <span className="text-xs text-gray-400" title={`Connect ${platformDisplayName} first`}>
                          —
                        </span>
                      ) : !hasAccountMapping ? (
                        <span className="text-xs text-gray-400" title="Configure account mapping">
                          —
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </TableCell>
                  )
                })}
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Summary stats */}
      <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>
            {contracts.length} contract{contracts.length !== 1 ? 's' : ''}
          </span>
          <span>
            {months.length} month{months.length !== 1 ? 's' : ''} of revenue
            recognition
          </span>
        </div>
      </div>

      {/* Success message */}
      {success && (
        <div className="border-t border-green-200 bg-green-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-green-800">
            <Check className="h-5 w-5 text-green-600" />
            <span>{success}</span>
            <button
              onClick={() => setSuccess(null)}
              className="ml-auto text-green-600 hover:text-green-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="border-t border-red-200 bg-red-50 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-red-800">
            <X className="h-5 w-5 text-red-600" />
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Post confirmation dialog */}
      {selectedMonth && (
        <PostConfirmationDialog
          isOpen={!!selectedMonth}
          onClose={handleCloseDialog}
          onConfirm={handleConfirmPost}
          month={selectedMonth}
          totalAmount={monthlyTotals.get(selectedMonth) || 0}
          contractCount={getMonthContractCount(selectedMonth)}
          isProcessing={isProcessing}
        />
      )}

      {/* Post activity dialog */}
      <PostActivityDialog
        isOpen={!!viewingPostActivity}
        onClose={() => setViewingPostActivity(null)}
        activity={viewingPostActivity}
        platformName={platformDisplayName}
      />
    </div>
  )
}
