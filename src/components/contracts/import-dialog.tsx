/**
 * Import Dialog Component
 *
 * Dialog for uploading and importing contract CSV files.
 * Handles file selection, parsing, validation, and submission.
 */

'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Papa from 'papaparse'
import { importContracts } from '@/app/(dashboard)/[organizationId]/actions'

interface ImportDialogProps {
  organizationId: string
  isOpen: boolean
  onClose: () => void
}

interface ContractRow {
  invoice_id: string
  customer_name?: string
  description?: string
  amount: string
  start_date: string
  end_date?: string
  term_months?: string
}

export function ImportDialog({
  organizationId,
  isOpen,
  onClose,
}: ImportDialogProps) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
      setSuccess(null)
    }
  }

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file')
      return
    }

    setIsProcessing(true)
    setError(null)
    setSuccess(null)

    try {
      // Parse CSV file
      Papa.parse<ContractRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            // Validate required fields
            const contracts = results.data.map((row, index) => {
              if (!row.invoice_id || !row.amount || !row.start_date) {
                throw new Error(
                  `Row ${index + 1}: Missing required fields (invoice_id, amount, start_date)`
                )
              }

              if (!row.end_date && !row.term_months) {
                throw new Error(
                  `Row ${index + 1}: Must provide either end_date or term_months`
                )
              }

              return {
                invoice_id: row.invoice_id.trim(),
                customer_name: row.customer_name?.trim() || null,
                description: row.description?.trim() || null,
                amount: row.amount.trim(),
                start_date: row.start_date.trim(),
                end_date: row.end_date?.trim() || null,
                term_months: row.term_months?.trim() || null,
              }
            })

            if (contracts.length === 0) {
              throw new Error('CSV file contains no valid data')
            }

            // Call server action
            const result = await importContracts(organizationId, contracts)

            if (result.error) {
              setError(result.error)
            } else {
              setSuccess(
                `Successfully imported ${result.succeeded} contract(s)${
                  result.failed > 0 ? `. ${result.failed} failed.` : ''
                }`
              )
              setFile(null)
              if (fileInputRef.current) {
                fileInputRef.current.value = ''
              }

              // Refresh the page to show new contracts
              setTimeout(() => {
                router.refresh()
                onClose()
              }, 1500)
            }
          } catch (err) {
            setError(
              err instanceof Error ? err.message : 'Failed to import contracts'
            )
          } finally {
            setIsProcessing(false)
          }
        },
        error: (err) => {
          setError(`CSV parsing error: ${err.message}`)
          setIsProcessing(false)
        },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
      setIsProcessing(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="relative w-full max-w-md rounded-lg bg-white shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Import Contracts
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
              disabled={isProcessing}
            >
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="px-6 py-4">
            {/* File Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                CSV File
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isProcessing}
                className="mt-2 block w-full text-sm text-gray-900 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
              />
              {file && (
                <p className="mt-2 text-sm text-gray-500">
                  Selected: {file.name}
                </p>
              )}
            </div>

            {/* CSV Format Instructions */}
            <div className="rounded-md bg-blue-50 p-4">
              <h4 className="text-sm font-medium text-blue-900">
                CSV Format Requirements:
              </h4>
              <ul className="mt-2 space-y-1 text-sm text-blue-700">
                <li>• Required: invoice_id, amount, start_date</li>
                <li>• Required: end_date OR term_months</li>
                <li>• Optional: customer_name, description</li>
                <li>• Date format: YYYY-MM-DD</li>
                <li>• Amount format: numeric (e.g., 12000.00)</li>
              </ul>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-4 rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="mt-4 rounded-md bg-green-50 p-4">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-gray-200 px-6 py-4">
            <button
              onClick={onClose}
              disabled={isProcessing}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleImport}
              disabled={!file || isProcessing}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Processing...
                </>
              ) : (
                'Import'
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
