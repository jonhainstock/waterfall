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
}

export function ExportCSVButton({
  contracts,
  schedules,
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
    return Array.from(monthSet).sort()
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

    // Build header row
    const header: string[] = [
      'Invoice ID',
      'Customer',
      'Start Date',
      'End Date',
      'Contract Amount',
      'Term',
    ]

    // Add monthly columns (revenue + balance for each month)
    months.forEach((month) => {
      const monthLabel = formatMonth(month)
      header.push(`${monthLabel} Revenue`)
      header.push(`${monthLabel} Balance`)
    })

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

      // Add monthly data (revenue + balance for each month)
      months.forEach((month) => {
        const revenue = getRevenueForMonth(contract.id, month)
        const balance = getBalanceForMonth(contract.id, contract.contract_amount, month)
        row.push(formatCurrency(revenue))
        row.push(formatCurrency(balance))
      })

      rows.push(row)
    })

    // Add totals row
    const totalsRow: any[] = ['TOTAL', '', '', '', formatCurrency(
      contracts.reduce((sum, c) => sum + c.contract_amount, 0)
    ), '']

    // Add monthly totals (revenue + balance for each month)
    months.forEach((month) => {
      const monthRevenue = contracts.reduce((sum, c) =>
        sum + getRevenueForMonth(c.id, month), 0
      )
      const monthBalance = contracts.reduce((sum, c) =>
        sum + getBalanceForMonth(c.id, c.contract_amount, month), 0
      )
      totalsRow.push(formatCurrency(monthRevenue))
      totalsRow.push(formatCurrency(monthBalance))
    })

    rows.push(totalsRow)

    return [header, ...rows]
  }

  // Trigger CSV download
  const handleExport = () => {
    const data = generateCSVData()
    const csv = Papa.unparse(data)

    // Create filename
    const filename = `waterfall-schedule-${new Date().toISOString().split('T')[0]}.csv`

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
