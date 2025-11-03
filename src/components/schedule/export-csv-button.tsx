/**
 * Export CSV Button Component
 *
 * Exports the waterfall schedule to CSV format.
 * Respects current view mode (Summary/Detail) and date range filtering.
 */

'use client'

import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import Papa from 'papaparse'
import { format, parseISO } from 'date-fns'
import Decimal from 'decimal.js'
import {
  calculateDeferredBalanceForMonth,
  getRecognizedToDate,
} from '@/lib/calculations/revenue-recognition'

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

interface ExportCSVButtonProps {
  contracts: Contract[]
  schedules: Schedule[]
  startDate?: string
  endDate?: string
  viewMode?: 'summary' | 'detail'
}

export function ExportCSVButton({
  contracts,
  schedules,
  startDate,
  endDate,
  viewMode = 'summary',
}: ExportCSVButtonProps) {
  // Format currency for CSV (remove $ and commas, keep decimals)
  const formatCurrency = (amount: number): string => {
    return amount.toFixed(2)
  }

  // Format date for CSV
  const formatDate = (dateString: string): string => {
    return format(parseISO(dateString), 'MMM d, yyyy')
  }

  // Format month for CSV header
  const formatMonth = (dateString: string): string => {
    return format(parseISO(dateString), 'MMM yyyy')
  }

  // Get all unique months from schedules, sorted chronologically
  const getAllMonths = (): string[] => {
    const monthSet = new Set<string>()
    schedules.forEach((schedule) => {
      monthSet.add(schedule.recognition_month)
    })
    const months = Array.from(monthSet).sort()

    // Filter by date range if provided
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)
      return months.filter((month) => {
        const monthDate = new Date(month)
        return monthDate >= start && monthDate <= end
      })
    }

    return months
  }

  // Calculate starting balance (before date range)
  const getStartingBalance = (contractId: string, contractAmount: number): number => {
    if (!startDate) return contractAmount

    // Get all revenue recognized before the start date
    const beforeStartDate = new Date(startDate)
    beforeStartDate.setDate(beforeStartDate.getDate() - 1)
    const beforeStartMonth = beforeStartDate.toISOString().split('T')[0]

    const recognized = parseFloat(
      getRecognizedToDate(contractId, schedules, beforeStartMonth)
    )
    return contractAmount - recognized
  }

  // Calculate ending balance (after date range)
  const getEndingBalance = (contractId: string, contractAmount: number): number => {
    if (!endDate) {
      // Calculate balance at the last month
      const months = getAllMonths()
      if (months.length === 0) return contractAmount

      const balance = parseFloat(
        calculateDeferredBalanceForMonth(contractAmount, contractId, schedules, months[months.length - 1])
      )
      return balance
    }

    const balance = parseFloat(
      calculateDeferredBalanceForMonth(contractAmount, contractId, schedules, endDate)
    )
    return balance
  }

  // Get revenue amount for a specific contract and month
  const getRevenueForMonth = (contractId: string, month: string): number => {
    const schedule = schedules.find(
      (s) => s.contract_id === contractId && s.recognition_month === month
    )
    return schedule ? schedule.recognition_amount : 0
  }

  // Get deferred balance for a specific contract and month
  const getBalanceForMonth = (contractId: string, contractAmount: number, month: string): number => {
    return parseFloat(
      calculateDeferredBalanceForMonth(contractAmount, contractId, schedules, month)
    )
  }

  // Generate CSV data
  const generateCSVData = () => {
    const months = getAllMonths()
    const hasDateRange = startDate && endDate

    // Build header row
    const header: string[] = [
      'Invoice ID',
      'Customer',
      'Start Date',
      'End Date',
      'Contract Amount',
      'Term',
    ]

    // Add starting balance column if date range is active
    if (hasDateRange) {
      header.push('Starting Balance')
    }

    // Add monthly columns based on view mode
    months.forEach((month) => {
      const monthLabel = formatMonth(month)

      if (viewMode === 'summary') {
        // Summary mode: only revenue
        header.push(monthLabel)
      } else {
        // Detail mode: revenue + balance
        header.push(`${monthLabel} Revenue`)
        header.push(`${monthLabel} Balance`)
      }
    })

    // Add ending balance column if date range is active
    if (hasDateRange) {
      header.push('Ending Balance')
    }

    // Build data rows
    const rows: any[][] = []

    contracts.forEach((contract) => {
      const row: any[] = [
        contract.invoice_id,
        contract.customer_name || '',
        formatDate(contract.start_date),
        formatDate(contract.end_date),
        formatCurrency(contract.contract_amount),
        `${contract.term_months}mo`,
      ]

      // Add starting balance if date range is active
      if (hasDateRange) {
        const startingBalance = getStartingBalance(contract.id, contract.contract_amount)
        row.push(formatCurrency(startingBalance))
      }

      // Add monthly data
      months.forEach((month) => {
        const revenue = getRevenueForMonth(contract.id, month)

        if (viewMode === 'summary') {
          // Summary mode: only revenue
          row.push(formatCurrency(revenue))
        } else {
          // Detail mode: revenue + balance
          const balance = getBalanceForMonth(contract.id, contract.contract_amount, month)
          row.push(formatCurrency(revenue))
          row.push(formatCurrency(balance))
        }
      })

      // Add ending balance if date range is active
      if (hasDateRange) {
        const endingBalance = getEndingBalance(contract.id, contract.contract_amount)
        row.push(formatCurrency(endingBalance))
      }

      rows.push(row)
    })

    // Add totals row
    const totalsRow: any[] = ['TOTAL', '', '', '', formatCurrency(
      contracts.reduce((sum, c) => sum + c.contract_amount, 0)
    ), '']

    // Add starting balance total if date range is active
    if (hasDateRange) {
      const startingBalanceTotal = contracts.reduce((sum, c) =>
        sum + getStartingBalance(c.id, c.contract_amount), 0
      )
      totalsRow.push(formatCurrency(startingBalanceTotal))
    }

    // Add monthly totals
    months.forEach((month) => {
      const monthRevenue = contracts.reduce((sum, c) =>
        sum + getRevenueForMonth(c.id, month), 0
      )

      if (viewMode === 'summary') {
        totalsRow.push(formatCurrency(monthRevenue))
      } else {
        const monthBalance = contracts.reduce((sum, c) =>
          sum + getBalanceForMonth(c.id, c.contract_amount, month), 0
        )
        totalsRow.push(formatCurrency(monthRevenue))
        totalsRow.push(formatCurrency(monthBalance))
      }
    })

    // Add ending balance total if date range is active
    if (hasDateRange) {
      const endingBalanceTotal = contracts.reduce((sum, c) =>
        sum + getEndingBalance(c.id, c.contract_amount), 0
      )
      totalsRow.push(formatCurrency(endingBalanceTotal))
    }

    rows.push(totalsRow)

    return [header, ...rows]
  }

  // Trigger CSV download
  const handleExport = () => {
    const data = generateCSVData()
    const csv = Papa.unparse(data)

    // Create filename
    let filename = 'waterfall-schedule'
    if (startDate && endDate) {
      filename += `-${startDate}-to-${endDate}`
    } else {
      filename += `-${new Date().toISOString().split('T')[0]}`
    }
    filename += '.csv'

    // Create blob and download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-9 gap-2"
      onClick={handleExport}
      title="Export waterfall schedule to CSV"
    >
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">Export CSV</span>
      <span className="sm:hidden">Export</span>
    </Button>
  )
}
