# Feature 3: Zero Balance Filtering

## Overview
Add ability to hide contracts with zero deferred balance from the waterfall view.

**Question:** "Would the rows with zero balances fall off the view? For example, three years from now, will the first pages be all zeros, or will the invoices with zero balances for the period selected not show."

---

## Zero Balance Detection Logic

### Definition

**Zero Balance for Selected Period:**
A contract has zero balance if:
1. All recognition schedules in the selected date range have `posted = true`
2. AND the deferred balance at the end of the selected period is zero (or very close to zero, accounting for rounding)

**All-Time Zero Balance:**
A contract has all-time zero balance if:
1. All recognition schedules (regardless of date range) have `posted = true`
2. Contract is fully recognized

### Calculation

**File:** `src/lib/calculations/revenue-recognition.ts`

Add helper function:

```typescript
/**
 * Check if contract has zero balance for selected period
 */
export function hasZeroBalanceForPeriod(
  contract: Contract,
  schedules: Schedule[],
  startDate?: string,
  endDate?: string
): boolean {
  // Get schedules for this contract
  const contractSchedules = schedules.filter(
    s => s.contract_id === contract.id
  )
  
  // Filter by date range if provided
  const periodSchedules = startDate && endDate
    ? contractSchedules.filter(s => {
        const month = s.recognition_month
        return month >= startDate && month <= endDate
      })
    : contractSchedules
  
  // If no schedules in period, consider it zero (or maybe show it?)
  if (periodSchedules.length === 0) {
    return true // Or false, depending on desired behavior
  }
  
  // Check if all schedules in period are posted
  const allPosted = periodSchedules.every(s => s.posted)
  
  if (!allPosted) {
    return false // Has unposted recognition, so not zero
  }
  
  // Calculate deferred balance at end of period
  const endDateForBalance = endDate 
    ? endOfMonth(parseISO(endDate))
    : parseISO(contract.end_date)
  
  const balance = calculateDeferredBalanceForMonth(
    contract.contract_amount,
    contract.id,
    schedules,
    format(endDateForBalance, 'yyyy-MM-dd')
  )
  
  // Consider zero if balance is less than $0.01 (rounding tolerance)
  return parseFloat(balance) < 0.01
}
```

---

## UI Component: Zero Balance Toggle

### Component: Zero Balance Filter Toggle

**File:** `src/components/schedule/zero-balance-filter.tsx` (new)

```typescript
'use client'

import { useState } from 'react'
import { Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch' // Add if not exists

interface ZeroBalanceFilterProps {
  hideZeroBalances: boolean
  onToggle: (hide: boolean) => void
  zeroBalanceCount: number
  totalCount: number
}

export function ZeroBalanceFilter({
  hideZeroBalances,
  onToggle,
  zeroBalanceCount,
  totalCount,
}: ZeroBalanceFilterProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Switch
          id="hide-zero-balances"
          checked={hideZeroBalances}
          onCheckedChange={onToggle}
        />
        <Label
          htmlFor="hide-zero-balances"
          className="text-sm font-medium cursor-pointer"
        >
          Hide zero balances
        </Label>
      </div>
      {hideZeroBalances && (
        <span className="text-sm text-gray-500">
          ({zeroBalanceCount} hidden)
        </span>
      )}
    </div>
  )
}
```

### Add Switch Component (if needed)

**File:** `src/components/ui/switch.tsx`

If shadcn/ui doesn't have Switch component, add it:

```bash
npx shadcn@latest add switch
```

Or create manually based on Radix UI Switch.

---

## Integration with Waterfall Table

### Update WaterfallTable Component

**File:** `src/components/schedule/waterfall-table.tsx`

**Changes:**

1. Add zero balance filter state
2. Calculate zero balance for each contract
3. Filter contracts based on toggle
4. Show count of hidden contracts

```typescript
export function WaterfallTable({
  contracts,
  schedules,
  organizationId,
  canPostToAccounting = false,
  connectedPlatform = null,
  startDate,
  endDate,
}: WaterfallTableProps) {
  const [hideZeroBalances, setHideZeroBalances] = useState(false)
  
  // Calculate zero balance status for each contract
  const contractZeroBalanceStatus = useMemo(() => {
    const status = new Map<string, boolean>()
    contracts.forEach(contract => {
      const isZero = hasZeroBalanceForPeriod(
        contract,
        schedules,
        startDate,
        endDate
      )
      status.set(contract.id, isZero)
    })
    return status
  }, [contracts, schedules, startDate, endDate])
  
  // Filter contracts based on zero balance toggle
  const visibleContracts = useMemo(() => {
    if (!hideZeroBalances) {
      return contracts
    }
    return contracts.filter(contract => {
      const isZero = contractZeroBalanceStatus.get(contract.id)
      return !isZero
    })
  }, [contracts, hideZeroBalances, contractZeroBalanceStatus])
  
  // Count zero balance contracts
  const zeroBalanceCount = useMemo(() => {
    return Array.from(contractZeroBalanceStatus.values())
      .filter(isZero => isZero).length
  }, [contractZeroBalanceStatus])
  
  // Use visibleContracts instead of contracts for table
  const table = useReactTable({
    data: visibleContracts,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })
  
  // ... rest of component
  
  // Add filter toggle to UI (near date range filter)
  return (
    <div>
      {/* Filter controls */}
      <div className="mb-4 flex items-center justify-between">
        <ZeroBalanceFilter
          hideZeroBalances={hideZeroBalances}
          onToggle={setHideZeroBalances}
          zeroBalanceCount={zeroBalanceCount}
          totalCount={contracts.length}
        />
        {/* Date range filter, search bar, etc. */}
      </div>
      
      {/* Table */}
      {/* ... */}
      
      {/* Show message if all contracts filtered */}
      {hideZeroBalances && visibleContracts.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
          <p className="text-sm text-gray-600">
            All contracts have zero balance for the selected period.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setHideZeroBalances(false)}
            className="mt-4"
          >
            Show all contracts
          </Button>
        </div>
      )}
    </div>
  )
}
```

---

## Layout Integration

### Update Organization Tabs

**File:** `src/components/organizations/organization-tabs.tsx`

Add zero balance filter to filter controls section:

```typescript
<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <ContractSearchBar ... />
  <div className="flex items-center gap-3">
    <ZeroBalanceFilter ... />
    <EnhancedDateRangeFilter ... />
  </div>
</div>
```

---

## Edge Cases & Behavior

### 1. Contract with No Schedules in Period

**Scenario:** Contract exists but has no recognition schedules in selected date range.

**Options:**
- **Option A:** Show it (default behavior)
- **Option B:** Hide it (treat as zero)

**Recommendation:** Show it, but consider it "zero balance" for filtering purposes.

### 2. Partially Recognized Contract

**Scenario:** Contract has some posted schedules, some unposted, in selected period.

**Behavior:** Don't hide (has non-zero balance).

### 3. Contract Outside Date Range

**Scenario:** Contract's recognition months are outside selected date range.

**Behavior:** 
- If contract has schedules outside range but none in range → treat as zero for period
- If contract has schedules in range → evaluate normally

### 4. Rounding Tolerance

**Scenario:** Balance is $0.00 vs $0.01 due to rounding.

**Behavior:** Consider < $0.01 as zero.

---

## Performance Considerations

### Calculation Optimization

**Current:** Calculate balance for each contract on every render.

**Optimization:**
- Use `useMemo` to cache zero balance calculations
- Only recalculate when contracts, schedules, or date range changes
- Consider memoizing `hasZeroBalanceForPeriod` function

### Large Contract Lists

If contract count is very large (>1000):
- Consider server-side filtering
- Add database query to filter zero balance contracts
- Use virtual scrolling for table

---

## User Preferences

### Persist Filter State (Optional)

**File:** `src/components/schedule/waterfall-table.tsx`

```typescript
// Load from localStorage
useEffect(() => {
  const saved = localStorage.getItem(`hideZeroBalances_${organizationId}`)
  if (saved === 'true') {
    setHideZeroBalances(true)
  }
}, [organizationId])

// Save to localStorage
useEffect(() => {
  localStorage.setItem(
    `hideZeroBalances_${organizationId}`,
    hideZeroBalances.toString()
  )
}, [hideZeroBalances, organizationId])
```

**Decision:** Start without persistence, add if users request it.

---

## Testing

### Unit Tests

**File:** `src/lib/calculations/revenue-recognition.test.ts`

```typescript
describe('hasZeroBalanceForPeriod', () => {
  it('should return true when all schedules in period are posted', () => {
    // Test implementation
  })
  
  it('should return false when some schedules are unposted', () => {
    // Test implementation
  })
  
  it('should handle contracts with no schedules in period', () => {
    // Test implementation
  })
  
  it('should account for rounding tolerance', () => {
    // Test implementation
  })
})
```

### Integration Tests

- Test filter toggle shows/hides contracts correctly
- Test filter works with date range
- Test filter works with search
- Test combination of all filters
- Test empty state when all contracts filtered

---

## Implementation Checklist

- [ ] Add `hasZeroBalanceForPeriod` calculation function
- [ ] Create `ZeroBalanceFilter` component
- [ ] Add Switch UI component (if needed)
- [ ] Update `WaterfallTable` to calculate zero balance status
- [ ] Add filter toggle to UI
- [ ] Filter contracts based on toggle
- [ ] Show count of hidden contracts
- [ ] Handle empty state (all filtered)
- [ ] Test edge cases
- [ ] Test performance with large contract lists
- [ ] Update documentation

---

## Future Enhancements

- **Different zero balance definitions:**
  - "Zero for period" vs "All-time zero"
  - Toggle between definitions

- **Visual indicators:**
  - Badge on contracts showing balance status
  - Color coding (green for zero, yellow for low, etc.)

- **Bulk actions:**
  - "Archive zero balance contracts" action
  - Export only non-zero contracts

- **Analytics:**
  - Show percentage of contracts with zero balance
  - Trend over time


