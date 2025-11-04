/**
 * Import Button Component
 *
 * Button that opens the import dialog for uploading contract CSV files.
 */

'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ImportDialog } from './import-dialog'

interface ImportButtonProps {
  organizationId: string
}

export function ImportButton({ organizationId }: ImportButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <Upload className="h-4 w-4" />
        Import CSV
      </Button>

      <ImportDialog
        organizationId={organizationId}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  )
}
