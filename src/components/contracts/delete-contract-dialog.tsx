'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertTriangle, Trash2 } from 'lucide-react'
import {
  getContractWithSchedules,
  cancelContract,
  deleteContractWithReversal,
  forceDeleteContract,
  type Contract,
} from '@/app/(dashboard)/[organizationId]/contract-actions'

interface DeleteContractDialogProps {
  organizationId: string
  contractId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

type DeleteMode = 'cancel' | 'delete_with_reversal' | 'force_delete'

export function DeleteContractDialog({
  organizationId,
  contractId,
  open,
  onOpenChange,
}: DeleteContractDialogProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [contract, setContract] = useState<Contract | null>(null)
  const [postedCount, setPostedCount] = useState(0)
  const [totalPosted, setTotalPosted] = useState(0)
  const [remainingBalance, setRemainingBalance] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [deleteMode, setDeleteMode] = useState<DeleteMode>('cancel')
  const [confirmation, setConfirmation] = useState('')

  // Load contract data when dialog opens
  useEffect(() => {
    if (open && contractId) {
      loadContract()
    } else {
      // Reset state when closed
      setContract(null)
      setError(null)
      setDeleteMode('cancel')
      setConfirmation('')
    }
  }, [open, contractId])

  const loadContract = async () => {
    if (!contractId) return

    setLoading(true)
    setError(null)

    try {
      const result = await getContractWithSchedules(organizationId, contractId)

      if (result.error || !result.contract) {
        setError(result.error || 'Failed to load contract')
        return
      }

      setContract(result.contract)
      setPostedCount(result.postedCount)

      // Calculate totals
      const posted = result.schedules
        .filter((s) => s.posted && !s.is_adjustment)
        .reduce((sum, s) => sum + s.recognition_amount, 0)

      setTotalPosted(posted)
      setRemainingBalance(result.contract.contract_amount - posted)

      // Set default delete mode based on posted status
      if (result.postedCount > 0) {
        setDeleteMode('delete_with_reversal')
      } else {
        setDeleteMode('cancel')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!contractId || !contract) return

    // Validate force delete confirmation
    if (deleteMode === 'force_delete' && confirmation !== 'DELETE') {
      setError('You must type "DELETE" to confirm force deletion')
      return
    }

    setLoading(true)
    setError(null)

    try {
      let result

      if (deleteMode === 'cancel') {
        result = await cancelContract(organizationId, contractId)
      } else if (deleteMode === 'delete_with_reversal') {
        result = await deleteContractWithReversal(organizationId, contractId)
      } else {
        result = await forceDeleteContract(organizationId, contractId, confirmation)
      }

      if (!result.success) {
        setError(result.error || 'Failed to delete contract')
        return
      }

      // Success - close dialog and refresh
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (!contract) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            Delete Contract
          </DialogTitle>
          <DialogDescription>
            Choose how you want to remove this contract from the system.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Contract Summary */}
        <div className="rounded-md border p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Invoice ID:</span>
            <span className="font-medium">{contract.invoice_id}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Customer:</span>
            <span className="font-medium">{contract.customer_name || '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Amount:</span>
            <span className="font-medium">${contract.contract_amount.toLocaleString()}</span>
          </div>
          {postedCount > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Posted:</span>
                <span className="font-medium">
                  {postedCount} {postedCount === 1 ? 'entry' : 'entries'} (${totalPosted.toLocaleString()})
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Remaining:</span>
                <span className="font-medium">${remainingBalance.toLocaleString()}</span>
              </div>
            </>
          )}
        </div>

        {/* Deletion Mode Options */}
        <div className="space-y-3">
          <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-accent">
            <input
              type="radio"
              value="cancel"
              checked={deleteMode === 'cancel'}
              onChange={(e) => setDeleteMode(e.target.value as DeleteMode)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-medium text-sm">Cancel Contract</div>
              <div className="text-xs text-muted-foreground">
                Marks as cancelled, keeps history, stops future recognition
              </div>
            </div>
          </label>

          {postedCount > 0 && (
            <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-accent">
              <input
                type="radio"
                value="delete_with_reversal"
                checked={deleteMode === 'delete_with_reversal'}
                onChange={(e) => setDeleteMode(e.target.value as DeleteMode)}
                className="mt-1"
              />
              <div className="flex-1">
                <div className="font-medium text-sm flex items-center gap-2">
                  Delete with Reversal
                  <Badge variant="outline" className="text-xs">Recommended</Badge>
                </div>
                <div className="text-xs text-muted-foreground">
                  Posts reversal entry for ${remainingBalance.toLocaleString()}, then deletes contract
                </div>
              </div>
            </label>
          )}

          <label className="flex items-start gap-3 rounded-md border border-destructive/50 p-3 cursor-pointer hover:bg-destructive/5">
            <input
              type="radio"
              value="force_delete"
              checked={deleteMode === 'force_delete'}
              onChange={(e) => setDeleteMode(e.target.value as DeleteMode)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="font-medium text-sm text-destructive flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Force Delete
              </div>
              <div className="text-xs text-muted-foreground">
                Deletes immediately without posting reversal. Use only if contract was entered in error.
              </div>
            </div>
          </label>
        </div>

        {/* Force Delete Confirmation */}
        {deleteMode === 'force_delete' && (
          <div className="space-y-2">
            <p className="text-sm text-destructive font-medium">
              Type "DELETE" to confirm force deletion:
            </p>
            <Input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="DELETE"
              className="font-mono"
            />
          </div>
        )}

        {/* Warning for posted schedules */}
        {postedCount > 0 && deleteMode !== 'cancel' && (
          <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-900">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                {deleteMode === 'delete_with_reversal' ? (
                  <p>
                    A reversal entry will be automatically posted to your accounting system for the remaining
                    balance of ${remainingBalance.toLocaleString()}.
                  </p>
                ) : (
                  <p>
                    {postedCount} posted {postedCount === 1 ? 'entry' : 'entries'} will be removed without
                    reversal. You must manually handle the ${remainingBalance.toLocaleString()} remaining
                    balance in your accounting system.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            variant={deleteMode === 'force_delete' ? 'destructive' : 'default'}
            onClick={handleDelete}
            disabled={loading || (deleteMode === 'force_delete' && confirmation !== 'DELETE')}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : deleteMode === 'cancel' ? (
              'Cancel Contract'
            ) : deleteMode === 'delete_with_reversal' ? (
              'Delete & Post Reversal'
            ) : (
              'Force Delete'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
