# Accountant Feedback - Implementation Tasks

**Last Updated:** 2025-01-XX

## Feature 1: Initial Transaction Journal Entry

### Database & Types
- [x] Add `initial_transaction_posted` field to contracts table (✅ Done - used in reconciliation)
- [ ] Create migration: Add remaining initial transaction fields (`initial_journal_entry_id`, `initial_transaction_posted_at`, `initial_transaction_posted_by`)
- [ ] Update `AccountMapping` interface to include clearing account (`clearingAccountId`, `clearingAccountName`)
- [ ] Update Supabase types (regenerate after migration)
- [ ] Add index for querying contracts needing initial transaction

### Accounting Provider
- [ ] Add `postInitialTransaction` to `AccountingProvider` interface
- [ ] Implement `postInitialTransaction` in `QuickBooksProvider`
- [ ] Implement `postInitialTransaction` in `XeroProvider`
- [ ] Add unit tests for provider methods

### Server Actions
- [ ] Create `postContractInitialTransaction` server action
- [ ] Add authentication and permission checks
- [ ] Add validation (already posted, account mapping exists)
- [ ] Update contract after successful posting
- [ ] Log to `journal_entry_log` table
- [ ] Add error handling and retry logic
- [ ] Write integration tests

### UI Components
- [ ] Update account mapping dialog to include clearing account field
- [ ] Add validation for clearing account (must be Asset type)
- [ ] Add "Post Initial Transaction" button to contract edit sheet
- [ ] Add status indicator (posted/not posted) to contract list
- [ ] Add confirmation dialog before posting
- [ ] Show journal entry ID after posting
- [ ] Disable button if already posted

### Testing
- [ ] Unit tests for zero balance calculation
- [ ] Integration tests for server action
- [ ] E2E test for posting flow
- [ ] Test error cases (missing account, already posted, etc.)

---

## Feature 2: Enhanced Date Picker & Search

### Date Picker
- [ ] Install date picker library (react-day-picker or shadcn calendar)
- [ ] Create `EnhancedDateRangeFilter` component
- [ ] Add preset options (Last 3/6 months, This year, All time)
- [ ] Improve mobile experience
- [ ] Add keyboard navigation
- [ ] Replace existing `DateRangeFilter` usage
- [ ] Test date picker UX

### Search Bar
- [ ] Create `ContractSearchBar` component
- [ ] Create `useDebounce` hook
- [ ] Implement search by customer name
- [ ] Implement search by invoice number
- [ ] Add clear button
- [ ] Add result count display
- [ ] Add debouncing (300ms)
- [ ] Test search performance

### Integration
- [ ] Update `WaterfallTable` to accept filtered contracts
- [ ] Add search state management
- [ ] Combine search with date range filter
- [ ] Update `OrganizationTabs` layout
- [ ] Test filter combinations
- [ ] Test with large contract lists (>100 contracts)

### Testing
- [ ] Unit tests for search filtering logic
- [ ] Unit tests for debounce hook
- [ ] Integration tests for filter combinations
- [ ] Performance tests with large datasets

---

## Feature 3: Zero Balance Filtering

### Calculation Logic
- [ ] Create `hasZeroBalanceForPeriod` function
- [ ] Handle contracts with no schedules in period
- [ ] Handle partially recognized contracts
- [ ] Add rounding tolerance (< $0.01)
- [ ] Optimize calculation with memoization
- [ ] Write unit tests

### UI Component
- [ ] Create `ZeroBalanceFilter` component
- [ ] Add Switch UI component (if needed)
- [ ] Add toggle to waterfall table controls
- [ ] Show count of hidden contracts
- [ ] Add empty state when all filtered
- [ ] Test toggle behavior

### Integration
- [ ] Update `WaterfallTable` to calculate zero balance status
- [ ] Filter contracts based on toggle
- [ ] Combine with search and date range filters
- [ ] Update totals row for filtered contracts
- [ ] Test edge cases (no contracts, all zero, etc.)

### Testing
- [ ] Unit tests for zero balance detection
- [ ] Integration tests for filter toggle
- [ ] Test with various contract states
- [ ] Performance tests with large lists

---

## Cross-Feature Tasks

### Documentation
- [ ] Update CLAUDE.md with new features
- [ ] Document initial transaction workflow
- [ ] Document search and filtering capabilities
- [ ] Update user guide (if exists)

### Polish
- [ ] Consistent styling across new components
- [ ] Mobile responsiveness
- [ ] Accessibility (keyboard nav, screen readers)
- [ ] Loading states
- [ ] Error messages
- [ ] Success feedback

### Performance
- [ ] Optimize contract filtering calculations
- [ ] Add database indexes if needed
- [ ] Consider virtual scrolling for large tables
- [ ] Profile and optimize slow operations

---

## Testing Checklist

### Feature 1: Initial Transaction
- [ ] Can configure clearing account in account mapping
- [ ] Can post initial transaction for contract
- [ ] Initial transaction posts correct JE (DR Clearing, CR Deferred)
- [ ] Monthly recognition still works (DR Deferred, CR Revenue)
- [ ] Cannot post initial transaction twice
- [ ] Status indicators show correctly
- [ ] Audit log created

### Feature 2: Date Picker & Search
- [ ] Date picker has better UX than HTML inputs
- [ ] Presets work correctly
- [ ] Can search by customer name
- [ ] Can search by invoice number
- [ ] Search is debounced
- [ ] Search works with date range
- [ ] Clear search works
- [ ] Result count displays correctly

### Feature 3: Zero Balance Filtering
- [ ] Toggle shows/hides zero balance contracts
- [ ] Zero balance detection is accurate
- [ ] Works with date range filter
- [ ] Works with search filter
- [ ] Totals reflect filtered contracts
- [ ] Empty state shows when all filtered
- [ ] Count of hidden contracts displays

### Combined
- [ ] All three filters work together
- [ ] No performance issues with 100+ contracts
- [ ] Mobile experience is good
- [ ] Accessibility is maintained

---

## Deployment Checklist

- [ ] Run database migrations
- [ ] Verify TypeScript types are updated
- [ ] Test in staging environment
- [ ] Get accountant review
- [ ] Update documentation
- [ ] Deploy to production
- [ ] Monitor for errors
- [ ] Gather user feedback

---

## Notes

- Start with Feature 1 (highest priority)
- Features 2 and 3 can be done in parallel after Feature 1
- Test thoroughly before accountant review
- Consider user feedback after initial release


