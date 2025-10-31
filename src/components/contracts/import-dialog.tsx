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
import { Loader2 } from 'lucide-react'
import {
  importContracts,
  checkDuplicateContracts,
} from '@/app/(dashboard)/[organizationId]/actions'
import { DuplicateConfirmationDialog } from './duplicate-confirmation-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

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

interface DuplicateContract {
  invoice_id: string
  created_at: string
  contract_amount: number
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
  const [parsedContracts, setParsedContracts] = useState<ContractRow[]>([])
  const [duplicates, setDuplicates] = useState<DuplicateContract[]>([])
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      setError(null)
      setSuccess(null)
    }
  }

  // Step 2: Proceed with import (with optional skip list)
  const proceedWithImport = async (
    contracts: ContractRow[],
    skipInvoiceIds: string[]
  ) => {
    setIsProcessing(true)

    try {
      const result = await importContracts(organizationId, contracts, skipInvoiceIds)

      if (result.error) {
        setError(result.error)
      } else {
        // Enhanced success message
        const parts: string[] = []
        if (result.succeeded > 0) {
          parts.push(`${result.succeeded} contract${result.succeeded !== 1 ? 's' : ''} imported`)
        }
        if (result.skipped > 0) {
          parts.push(`${result.skipped} duplicate${result.skipped !== 1 ? 's' : ''} skipped`)
        }
        if (result.failed > 0) {
          parts.push(`${result.failed} failed`)
        }

        setSuccess(parts.join(', '))
        setFile(null)
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
        }

        // Refresh the page to show new contracts
        setTimeout(() => {
          router.refresh()
          onClose()
        }, 2000)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import contracts')
    } finally {
      setIsProcessing(false)
    }
  }

  // Handle duplicate dialog confirmation
  const handleDuplicateConfirm = async (skipInvoiceIds: string[]) => {
    setShowDuplicateDialog(false)
    await proceedWithImport(parsedContracts, skipInvoiceIds)
  }

  // Step 1: Parse and check for duplicates
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
              if (!row.invoice_id?.trim() || !row.amount?.trim() || !row.start_date?.trim()) {
                throw new Error(
                  `Row ${index + 1}: Missing required fields (invoice_id, amount, start_date)`
                )
              }

              // Check if at least one of end_date or term_months is provided (non-empty)
              const hasEndDate = row.end_date?.trim()
              const hasTermMonths = row.term_months?.trim()

              if (!hasEndDate && !hasTermMonths) {
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
                end_date: hasEndDate || null,
                term_months: hasTermMonths || null,
              }
            })

            if (contracts.length === 0) {
              throw new Error('CSV file contains no valid data')
            }

            // Store parsed contracts for later use
            setParsedContracts(contracts)

            // Check for duplicates
            const invoiceIds = contracts.map((c) => c.invoice_id)
            const duplicateCheck = await checkDuplicateContracts(
              organizationId,
              invoiceIds
            )

            if (duplicateCheck.error) {
              throw new Error(duplicateCheck.error)
            }

            // If duplicates found, show confirmation dialog
            if (duplicateCheck.duplicates.length > 0) {
              setDuplicates(duplicateCheck.duplicates)
              setShowDuplicateDialog(true)
              setIsProcessing(false)
            } else {
              // No duplicates, proceed with import
              await proceedWithImport(contracts, [])
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
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Contracts</DialogTitle>
            <DialogDescription>
              Upload a CSV file containing your contract data
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* File Input */}
            <div className="grid gap-2">
              <label htmlFor="file" className="text-sm font-medium">
                CSV File
              </label>
              <input
                id="file"
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                disabled={isProcessing}
                className="block w-full text-sm text-gray-900 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
              />
              {file && (
                <p className="text-sm text-muted-foreground">
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
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Success Message */}
            {success && (
              <div className="rounded-md bg-green-50 p-4">
                <p className="text-sm text-green-700">{success}</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || isProcessing}
            >
              {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
              {isProcessing ? 'Processing...' : 'Import'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Duplicate Confirmation Dialog */}
      <DuplicateConfirmationDialog
        isOpen={showDuplicateDialog}
        onClose={() => setShowDuplicateDialog(false)}
        onConfirm={handleDuplicateConfirm}
        duplicates={duplicates}
        newContractsCount={parsedContracts.length - duplicates.length}
        totalContractsCount={parsedContracts.length}
      />
    </>
  )
}
