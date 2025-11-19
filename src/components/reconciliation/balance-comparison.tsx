'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface BalanceComparisonProps {
  label: string
  softwareBalance: number
  quickbooksBalance: number
  difference: number
  matches: boolean
  withinTolerance: boolean
}

export function BalanceComparison({
  label,
  softwareBalance,
  quickbooksBalance,
  difference,
  matches,
  withinTolerance,
}: BalanceComparisonProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>{label}</span>
          {matches ? (
            <Badge variant="default" className="bg-green-600">
              Matches
            </Badge>
          ) : (
            <Badge variant="destructive">Does Not Match</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Software Balance</p>
            <p className="text-lg font-semibold">{formatCurrency(softwareBalance)}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">QuickBooks Balance</p>
            <p className="text-lg font-semibold">{formatCurrency(quickbooksBalance)}</p>
          </div>
        </div>
        {!matches && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground mb-1">Difference</p>
            <p
              className={`text-lg font-semibold ${
                Math.abs(difference) > 0.01 ? 'text-destructive' : 'text-muted-foreground'
              }`}
            >
              {formatCurrency(Math.abs(difference))}
            </p>
            {!withinTolerance && (
              <p className="text-xs text-muted-foreground mt-1">
                Difference exceeds tolerance ($0.01)
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}


