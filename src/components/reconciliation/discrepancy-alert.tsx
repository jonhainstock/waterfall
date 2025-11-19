'use client'

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

interface DiscrepancyAlertProps {
  title: string
  message: string
  details?: string[]
}

export function DiscrepancyAlert({
  title,
  message,
  details,
}: DiscrepancyAlertProps) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="mt-2">
        <p>{message}</p>
        {details && details.length > 0 && (
          <ul className="mt-2 list-disc list-inside space-y-1">
            {details.map((detail, index) => (
              <li key={index} className="text-sm">
                {detail}
              </li>
            ))}
          </ul>
        )}
      </AlertDescription>
    </Alert>
  )
}


