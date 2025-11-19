# Feature 2: Enhanced Date Picker & Search

## Overview
Improve date range selection UX and add search functionality for customer name and invoice number.

**Current:** Basic HTML date inputs, no search  
**New:** Enhanced date picker with presets + search bar with real-time filtering

---

## Enhanced Date Picker

### Component: Enhanced Date Range Picker

**File:** `src/components/schedule/enhanced-date-range-filter.tsx` (new)

**Requirements:**
- Replace basic HTML date inputs
- Use `react-day-picker` or similar library
- Preset options: "Last 3 months", "Last 6 months", "This year", "All time"
- Visual calendar picker
- Keyboard navigation
- Better mobile experience

### Implementation Options

#### Option A: react-day-picker (Recommended)
```bash
pnpm add react-day-picker date-fns
```

**Pros:**
- Modern, accessible
- Good TypeScript support
- Flexible customization
- Active maintenance

**Cons:**
- Additional dependency

#### Option B: shadcn/ui Calendar Component
If shadcn/ui has a calendar component, use that for consistency.

### Preset Options

```typescript
const datePresets = [
  {
    label: 'Last 3 months',
    getValue: () => {
      const end = new Date()
      const start = subMonths(end, 3)
      return { start, end }
    }
  },
  {
    label: 'Last 6 months',
    getValue: () => {
      const end = new Date()
      const start = subMonths(end, 6)
      return { start, end }
    }
  },
  {
    label: 'This year',
    getValue: () => {
      const start = startOfYear(new Date())
      const end = endOfYear(new Date())
      return { start, end }
    }
  },
  {
    label: 'All time',
    getValue: () => null // Clear filter
  }
]
```

### Component Structure

```typescript
'use client'

import { useState } from 'react'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { DateRange } from 'react-day-picker'
import { Calendar, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar as CalendarComponent } from '@/components/ui/calendar'

export function EnhancedDateRangeFilter({
  organizationId,
  currentStartDate,
  currentEndDate,
}: {
  organizationId: string
  currentStartDate?: string
  currentEndDate?: string
}) {
  // ... implementation
}
```

---

## Search Bar Component

### Component: Contract Search Bar

**File:** `src/components/schedule/contract-search-bar.tsx` (new)

**Requirements:**
- Search input with icon
- Debounced search (300ms)
- Search by customer name and invoice number
- Clear button
- Result count display
- Highlight matching text

### Implementation

```typescript
'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useDebounce } from '@/hooks/use-debounce' // Create if needed

interface ContractSearchBarProps {
  contracts: Contract[]
  onSearchChange: (filteredContracts: Contract[]) => void
}

export function ContractSearchBar({
  contracts,
  onSearchChange,
}: ContractSearchBarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedQuery = useDebounce(searchQuery, 300)
  
  const filteredContracts = useMemo(() => {
    if (!debouncedQuery.trim()) {
      return contracts
    }
    
    const query = debouncedQuery.toLowerCase()
    return contracts.filter(contract => {
      const customerMatch = contract.customer_name
        ?.toLowerCase()
        .includes(query)
      const invoiceMatch = contract.invoice_id
        .toLowerCase()
        .includes(query)
      
      return customerMatch || invoiceMatch
    })
  }, [contracts, debouncedQuery])
  
  useEffect(() => {
    onSearchChange(filteredContracts)
  }, [filteredContracts, onSearchChange])
  
  const resultCount = filteredContracts.length
  const totalCount = contracts.length
  
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <Input
        type="text"
        placeholder="Search by customer name or invoice number..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="pl-9 pr-9"
      />
      {searchQuery && (
        <button
          onClick={() => setSearchQuery('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      )}
      {searchQuery && (
        <div className="absolute right-12 top-1/2 -translate-y-1/2 text-sm text-gray-500">
          {resultCount} of {totalCount}
        </div>
      )}
    </div>
  )
}
```

### Debounce Hook

**File:** `src/hooks/use-debounce.ts` (new)

```typescript
import { useState, useEffect } from 'react'

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)
    
    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])
  
  return debouncedValue
}
```

---

## Integration with Waterfall Table

### Update WaterfallTable Component

**File:** `src/components/schedule/waterfall-table.tsx`

**Changes:**
1. Add search state
2. Filter contracts based on search
3. Combine search with date range filter
4. Update props to accept filtered contracts

```typescript
interface WaterfallTableProps {
  contracts: Contract[]
  schedules: Schedule[]
  organizationId: string
  canPostToAccounting?: boolean
  connectedPlatform?: string | null
  // Add filtered contracts prop
  filteredContracts?: Contract[] // If parent handles filtering
  // OR handle filtering internally
  searchQuery?: string
  dateRange?: { start: string; end: string }
}

export function WaterfallTable({
  contracts,
  schedules,
  organizationId,
  canPostToAccounting = false,
  connectedPlatform = null,
  searchQuery,
  dateRange,
}: WaterfallTableProps) {
  // Filter contracts based on search and date range
  const filteredContracts = useMemo(() => {
    let filtered = contracts
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(contract => {
        const customerMatch = contract.customer_name
          ?.toLowerCase()
          .includes(query)
        const invoiceMatch = contract.invoice_id
          .toLowerCase()
          .includes(query)
        return customerMatch || invoiceMatch
      })
    }
    
    // Apply date range filter (if schedules need filtering)
    // Note: Date range primarily affects which months are shown
    // Contracts are shown if they have schedules in the range
    
    return filtered
  }, [contracts, searchQuery, dateRange])
  
  // Use filteredContracts instead of contracts for table data
  const table = useReactTable({
    data: filteredContracts,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })
  
  // ... rest of component
}
```

---

## Layout Updates

### Update Organization Tabs

**File:** `src/components/organizations/organization-tabs.tsx`

Add search bar and enhanced date picker to header:

```typescript
<div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
  <ContractSearchBar
    contracts={contracts}
    onSearchChange={setFilteredContracts}
  />
  <div className="flex gap-2">
    <EnhancedDateRangeFilter
      organizationId={organizationId}
      currentStartDate={startDate}
      currentEndDate={endDate}
    />
  </div>
</div>
```

---

## URL State Management

### Search in URL (Optional)

If we want shareable search URLs:

```typescript
// In ContractSearchBar
const router = useRouter()
const pathname = usePathname()
const searchParams = useSearchParams()

const handleSearchChange = (query: string) => {
  const params = new URLSearchParams(searchParams)
  if (query) {
    params.set('search', query)
  } else {
    params.delete('search')
  }
  router.push(`${pathname}?${params.toString()}`)
}

// Read from URL on mount
useEffect(() => {
  const urlSearch = searchParams.get('search')
  if (urlSearch) {
    setSearchQuery(urlSearch)
  }
}, [])
```

**Decision:** Start without URL state for search (simpler), add later if needed.

---

## Performance Considerations

### Client-Side Filtering

**Current approach:** Filter contracts array in memory

**Limitations:**
- Works well for <1000 contracts
- May slow down with 1000+ contracts

**Optimization:**
- Use `useMemo` for filtered results
- Debounce search input
- Virtual scrolling if table gets very large

### Server-Side Search (Future)

If contract count grows large:
- Add database indexes on `customer_name` and `invoice_id`
- Create API endpoint: `GET /api/contracts/search?q=...&orgId=...`
- Use server-side filtering

---

## Testing

### Unit Tests

**File:** `src/components/schedule/contract-search-bar.test.tsx`

```typescript
describe('ContractSearchBar', () => {
  it('should filter by customer name', () => {
    // Test implementation
  })
  
  it('should filter by invoice number', () => {
    // Test implementation
  })
  
  it('should debounce search input', () => {
    // Test implementation
  })
})
```

### Integration Tests

- Test search + date range filter combination
- Test search with empty results
- Test search with special characters

---

## Implementation Checklist

- [ ] Install date picker library (react-day-picker or shadcn calendar)
- [ ] Create `EnhancedDateRangeFilter` component
- [ ] Add preset options
- [ ] Create `ContractSearchBar` component
- [ ] Create `useDebounce` hook
- [ ] Update `WaterfallTable` to handle filtered contracts
- [ ] Update `OrganizationTabs` layout
- [ ] Test search functionality
- [ ] Test date picker UX
- [ ] Test combination of filters
- [ ] Mobile responsiveness
- [ ] Accessibility (keyboard navigation, screen readers)

---

## Future Enhancements

- Search in contract descriptions
- Advanced search (filters for amount, date range, status)
- Saved search presets
- Export filtered results
- Search highlighting in results
- Fuzzy search (typo tolerance)


