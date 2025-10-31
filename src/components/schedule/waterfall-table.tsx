/**
 * Waterfall Table Component
 *
 * Displays contracts with monthly revenue recognition schedule in a waterfall format.
 * Shows contract details on the left and monthly recognition amounts across the top.
 */

'use client'

import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'

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
}

interface WaterfallTableProps {
  contracts: Contract[]
  schedules: Schedule[]
}

export function WaterfallTable({ contracts, schedules }: WaterfallTableProps) {
  // Get unique months across all schedules, sorted chronologically
  const months = useMemo(() => {
    const uniqueMonths = Array.from(
      new Set(schedules.map((s) => s.recognition_month))
    ).sort()
    return uniqueMonths
  }, [schedules])

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

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {/* Fixed columns */}
              <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Invoice ID
              </th>
              <th className="bg-gray-50 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Customer
              </th>
              <th className="bg-gray-50 px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                Contract Amount
              </th>
              <th className="bg-gray-50 px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                Term
              </th>

              {/* Dynamic month columns */}
              {months.map((month) => (
                <th
                  key={month}
                  className="whitespace-nowrap bg-gray-50 px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500"
                >
                  {formatMonth(month)}
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 bg-white">
            {contracts.map((contract) => (
              <tr key={contract.id} className="hover:bg-gray-50">
                {/* Fixed columns */}
                <td className="sticky left-0 z-10 bg-white whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900 group-hover:bg-gray-50">
                  {contract.invoice_id}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-700">
                  {contract.customer_name || '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-gray-900">
                  {formatCurrency(contract.contract_amount)}
                </td>
                <td className="whitespace-nowrap px-4 py-4 text-center text-sm text-gray-700">
                  {contract.term_months}mo
                </td>

                {/* Dynamic month columns */}
                {months.map((month) => {
                  const key = `${contract.id}-${month}`
                  const amount = scheduleMap.get(key)

                  return (
                    <td
                      key={month}
                      className="whitespace-nowrap px-4 py-4 text-right text-sm text-gray-900"
                    >
                      {amount ? formatCurrency(amount) : '—'}
                    </td>
                  )
                })}
              </tr>
            ))}

            {/* Totals row */}
            <tr className="bg-gray-100 font-semibold">
              <td
                className="sticky left-0 z-10 bg-gray-100 whitespace-nowrap px-4 py-4 text-sm text-gray-900"
                colSpan={2}
              >
                TOTAL
              </td>
              <td className="whitespace-nowrap px-4 py-4 text-right text-sm text-gray-900">
                {formatCurrency(
                  contracts.reduce(
                    (sum, c) => sum + c.contract_amount,
                    0
                  )
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-4"></td>

              {/* Monthly totals */}
              {months.map((month) => (
                <td
                  key={month}
                  className="whitespace-nowrap px-4 py-4 text-right text-sm text-gray-900"
                >
                  {formatCurrency(monthlyTotals.get(month) || 0)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
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
    </div>
  )
}
