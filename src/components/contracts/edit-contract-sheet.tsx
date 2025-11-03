'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { format, addMonths, startOfMonth } from 'date-fns'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Loader2, AlertCircle } from 'lucide-react'
import { contractEditSchema, type ContractEditInput, type AdjustmentMode, calculateTermMonths } from '@/lib/validations/contract'
import {
  getContractWithSchedules,
  updateContractWithPosting,
  type Contract,
} from '@/app/(dashboard)/[organizationId]/contract-actions'

interface EditContractSheetProps {
  organizationId: string
  contractId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditContractSheet({
  organizationId,
  contractId,
  open,
  onOpenChange,
}: EditContractSheetProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [contract, setContract] = useState<Contract | null>(null)
  const [postedCount, setPostedCount] = useState(0)
  const [unpostedCount, setUnpostedCount] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [adjustmentMode, setAdjustmentMode] = useState<AdjustmentMode>('none')
  const [catchUpMonth, setCatchUpMonth] = useState<string>('')
  const [unpostedMonths, setUnpostedMonths] = useState<string[]>([])

  const form = useForm<ContractEditInput>({
    resolver: zodResolver(contractEditSchema),
    defaultValues: {
      invoiceId: '',
      customerName: '',
      description: '',
      contractAmount: 0,
      startDate: '',
      endDate: '',
      termMonths: 0,
    },
  })

  // Load contract data when sheet opens
  useEffect(() => {
    if (open && contractId) {
      loadContract()
    } else {
      // Reset form when closed
      form.reset()
      setContract(null)
      setError(null)
      setAdjustmentMode('none')
      setCatchUpMonth('')
    }
  }, [open, contractId])

  // Auto-calculate term when dates change
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if ((name === 'startDate' || name === 'endDate') && value.startDate && value.endDate) {
        const calculatedTerm = calculateTermMonths(value.startDate, value.endDate)
        form.setValue('termMonths', calculatedTerm)
      }
    })
    return () => subscription.unsubscribe()
  }, [form])

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
      setUnpostedCount(result.unpostedCount)

      // Set form values
      form.reset({
        invoiceId: result.contract.invoice_id,
        customerName: result.contract.customer_name || '',
        description: result.contract.description || '',
        contractAmount: result.contract.contract_amount,
        startDate: result.contract.start_date,
        endDate: result.contract.end_date,
        termMonths: result.contract.term_months,
      })

      // Set default adjustment mode
      if (result.postedCount > 0) {
        setAdjustmentMode('retroactive')
      } else {
        setAdjustmentMode('none')
      }

      // Calculate unposted months for catch-up dropdown
      const allMonths: string[] = []
      const start = new Date(result.contract.start_date)
      for (let i = 0; i < result.contract.term_months; i++) {
        allMonths.push(format(startOfMonth(addMonths(start, i)), 'yyyy-MM-dd'))
      }

      const posted = result.schedules
        .filter((s) => s.posted && !s.is_adjustment)
        .map((s) => s.recognition_month)

      const unposted = allMonths.filter((month) => !posted.includes(month))
      setUnpostedMonths(unposted)

      if (unposted.length > 0) {
        setCatchUpMonth(unposted[0])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const onSubmit = async (data: ContractEditInput) => {
    if (!contractId) return

    setLoading(true)
    setError(null)

    try {
      const result = await updateContractWithPosting(
        organizationId,
        contractId,
        data,
        adjustmentMode,
        adjustmentMode === 'catch_up' ? catchUpMonth : undefined
      )

      if (!result.success) {
        setError(result.error || 'Failed to update contract')
        return
      }

      // Show success message
      if (result.adjustmentEntryIds && result.adjustmentEntryIds.length > 0) {
        // Could show a success dialog with JE IDs here
        console.log('Posted adjustment entries:', result.adjustmentEntryIds)
      }

      // Close sheet and refresh
      onOpenChange(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[600px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Edit Contract</SheetTitle>
          <SheetDescription>
            Update contract details. Changes to amounts or dates will affect recognition schedules.
          </SheetDescription>
        </SheetHeader>

        {loading && !contract ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : error && !contract ? (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" />
            {error}
          </div>
        ) : contract ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-6">
              {/* Posted Schedules Warning */}
              {postedCount > 0 && (
                <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-sm text-yellow-900">
                        This contract has {postedCount} posted journal {postedCount === 1 ? 'entry' : 'entries'}
                      </h4>
                      <p className="text-sm text-yellow-700 mt-1">
                        Changes to amounts or dates may require adjustment entries in your accounting system.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {error && (
                <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-4 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              {/* Invoice ID */}
              <FormField
                control={form.control}
                name="invoiceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice ID *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="INV-001" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Customer Name */}
              <FormField
                control={form.control}
                name="customerName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Customer Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Acme Corp" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Annual subscription" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contract Amount */}
              <FormField
                control={form.control}
                name="contractAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contract Amount *</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        step="0.01"
                        placeholder="10000.00"
                        onChange={(e) => field.onChange(parseFloat(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Start Date and End Date (side by side) */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date *</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date *</FormLabel>
                      <FormControl>
                        <Input {...field} type="date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Adjustment Mode (only if posted schedules exist) */}
              {postedCount > 0 && (
                <div className="space-y-4 border-t pt-4">
                  <div>
                    <h4 className="font-medium text-sm mb-2">How should we handle posted entries?</h4>
                    <div className="space-y-2">
                      <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-accent">
                        <input
                          type="radio"
                          value="retroactive"
                          checked={adjustmentMode === 'retroactive'}
                          onChange={(e) => setAdjustmentMode(e.target.value as AdjustmentMode)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="font-medium text-sm">Retroactive</div>
                          <div className="text-xs text-muted-foreground">
                            Post adjustment entries to fix past months
                          </div>
                        </div>
                      </label>

                      {unpostedCount > 0 && (
                        <>
                          <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-accent">
                            <input
                              type="radio"
                              value="catch_up"
                              checked={adjustmentMode === 'catch_up'}
                              onChange={(e) => setAdjustmentMode(e.target.value as AdjustmentMode)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-sm">Catch-up</div>
                              <div className="text-xs text-muted-foreground">
                                Add difference to selected month going forward
                              </div>
                            </div>
                          </label>

                          <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-accent">
                            <input
                              type="radio"
                              value="prospective"
                              checked={adjustmentMode === 'prospective'}
                              onChange={(e) => setAdjustmentMode(e.target.value as AdjustmentMode)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <div className="font-medium text-sm">Prospective</div>
                              <div className="text-xs text-muted-foreground">
                                Spread difference over remaining months
                              </div>
                            </div>
                          </label>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Catch-up Month Selector */}
                  {adjustmentMode === 'catch_up' && unpostedMonths.length > 0 && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">Catch-up Month</label>
                      <Select value={catchUpMonth} onValueChange={setCatchUpMonth}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                        <SelectContent>
                          {unpostedMonths.map((month) => (
                            <SelectItem key={month} value={month}>
                              {format(new Date(month), 'MMMM yyyy')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {/* Form Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading} className="flex-1">
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
