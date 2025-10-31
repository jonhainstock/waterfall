/**
 * Edit Organization Name Dialog Component
 *
 * Modal dialog for editing an organization's name
 */

'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
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
import { Label } from '@/components/ui/label'
import { updateOrganizationName } from '@/app/(dashboard)/[organizationId]/actions'
import { useRouter } from 'next/navigation'

interface EditOrganizationNameDialogProps {
  organizationId: string
  currentName: string
  isOpen: boolean
  onClose: () => void
}

export function EditOrganizationNameDialog({
  organizationId,
  currentName,
  isOpen,
  onClose,
}: EditOrganizationNameDialogProps) {
  const router = useRouter()
  const [name, setName] = useState(currentName)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Reset state when dialog opens
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setName(currentName)
      setError(null)
      onClose()
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Organization name is required')
      return
    }

    setIsSaving(true)
    setError(null)

    const result = await updateOrganizationName(organizationId, name)

    if (result.success) {
      router.refresh()
      onClose()
    } else {
      setError(result.error || 'Failed to update organization name')
    }

    setIsSaving(false)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Organization Name</DialogTitle>
          <DialogDescription>
            Update the name of your organization
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="org-name">Organization Name</Label>
            <Input
              id="org-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter organization name"
              disabled={isSaving}
              maxLength={100}
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
