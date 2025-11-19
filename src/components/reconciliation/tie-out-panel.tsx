'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { BalanceComparison } from './balance-comparison'
import { DiscrepancyAlert } from './discrepancy-alert'
import { RefreshCw, CheckCircle2, XCircle } from 'lucide-react'
import type { TieOutResult } from '@/app/(dashboard)/[organizationId]/reconciliation-actions'

interface TieOutPanelProps {
  organizationId: string
  initialResult?: TieOutResult | null
  onRefresh?: () => Promise<TieOutResult>
}

export function TieOutPanel({
  organizationId,
  initialResult,
  onRefresh,
}: TieOutPanelProps) {
  const [result, setResult] = useState<TieOutResult | null>(initialResult || null)
  const [isLoading, setIsLoading] = useState(false)

  const handleRefresh = async () => {
    if (!onRefresh) return

    setIsLoading(true)
    try {
      const newResult = await onRefresh()
      setResult(newResult)
    } catch (error) {
      console.error('Failed to refresh tie-out:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reconciliation</CardTitle>
          <CardDescription>
            Verify that your software calculations match QuickBooks balances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleRefresh} disabled={isLoading || !onRefresh}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Run Tie-Out Verification
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (!result.success) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Reconciliation</CardTitle>
          <CardDescription>
            Verify that your software calculations match QuickBooks balances
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <DiscrepancyAlert
            title="Verification Failed"
            message={result.error || 'Failed to verify tie-out'}
          />
          <Button onClick={handleRefresh} disabled={isLoading || !onRefresh}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Retry
          </Button>
        </CardContent>
      </Card>
    )
  }

  const hasDiscrepancies = !result.overallMatches
  const hasMissingInitial = result.missingInitialTransactions && result.missingInitialTransactions.count > 0

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Reconciliation</CardTitle>
            <CardDescription>
              As of {result.details?.asOfDate ? new Date(result.details.asOfDate).toLocaleDateString() : 'N/A'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {result.overallMatches ? (
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-5 w-5" />
                <span className="font-semibold">All Balances Match</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-destructive">
                <XCircle className="h-5 w-5" />
                <span className="font-semibold">Discrepancies Found</span>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading || !onRefresh}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasDiscrepancies && (
          <DiscrepancyAlert
            title="Tie-Out Failed"
            message="One or more balances do not match between your software and QuickBooks. Please review the details below."
            details={[
              result.balanceSheet && !result.balanceSheet.matches
                ? `Balance Sheet: Deferred Revenue difference of ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(result.balanceSheet.difference))}`
                : null,
              result.profitAndLoss && !result.profitAndLoss.matches
                ? `P&L: Revenue difference of ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(result.profitAndLoss.difference))}`
                : null,
              hasMissingInitial
                ? `${result.missingInitialTransactions!.count} contract(s) missing initial transactions (total: ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(result.missingInitialTransactions!.totalAmount)})`
                : null,
            ].filter(Boolean) as string[]}
          />
        )}

        {hasMissingInitial && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Missing Initial Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-2">
                The following contracts do not have initial transactions posted. This may cause the deferred revenue balance to not match.
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                {result.missingInitialTransactions!.contracts.slice(0, 5).map((contract) => (
                  <li key={contract.id}>
                    {contract.invoice_id} - {contract.customer_name || 'Unknown'} (
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: 'USD',
                    }).format(contract.contract_amount)}
                    )
                  </li>
                ))}
                {result.missingInitialTransactions!.count > 5 && (
                  <li className="text-muted-foreground">
                    ... and {result.missingInitialTransactions!.count - 5} more
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {result.balanceSheet && (
            <BalanceComparison
              label="Balance Sheet - Deferred Revenue"
              softwareBalance={result.balanceSheet.softwareBalance}
              quickbooksBalance={result.balanceSheet.quickbooksBalance}
              difference={result.balanceSheet.difference}
              matches={result.balanceSheet.matches}
              withinTolerance={result.balanceSheet.withinTolerance}
            />
          )}

          {result.profitAndLoss && (
            <BalanceComparison
              label="Profit & Loss - Revenue"
              softwareBalance={result.profitAndLoss.softwareBalance}
              quickbooksBalance={result.profitAndLoss.quickbooksBalance}
              difference={result.profitAndLoss.difference}
              matches={result.profitAndLoss.matches}
              withinTolerance={result.profitAndLoss.withinTolerance}
            />
          )}
        </div>
      </CardContent>
    </Card>
  )
}


