# Accountant Feedback - Feature Implementation Plan

**Last Updated:** 2025-01-XX  
**Status:** In Progress  
**Source:** Accountant review feedback

---

## Overview

This plan addresses three key areas of feedback from accountant review:

1. **Journal Entry Posting Confirmation** - Clarify and implement correct JE structure
2. **UI Enhancements** - Add date picker and search functionality
3. **Zero Balance Filtering** - Handle contracts with zero balances in the view

## Current Implementation Status

### ✅ Completed
- **Reconciliation/Tie-Out Functionality** - Fully implemented
  - `reconciliation-actions.ts` - Server actions for tie-out verification
  - `tie-out.ts` - Balance calculation logic
  - `tie-out-panel.tsx` - UI component for displaying tie-out results
  - Compares software calculations vs QuickBooks balances
  - Identifies missing initial transactions

### 🚧 Partially Implemented
- **Feature 1: Initial Transaction Database Fields**
  - `initial_transaction_posted` field exists in contracts table
  - Used in reconciliation logic
  - **Missing:** Posting logic, UI components, account mapping updates

### 📋 Planned (Not Started)
- **Feature 2: Enhanced Date Picker & Search** - No implementation yet
- **Feature 3: Zero Balance Filtering** - No implementation yet

---

## Feature 1: Initial Transaction Journal Entry

### Current State
- System currently only posts monthly recognition entries: **DR Deferred Revenue, CR Revenue**
- No support for initial transaction posting when contract is created/imported

### Accountant Requirement
**Initial Transaction (when contract is created):**
- **DR Stripe Clearing** (or similar clearing account)
- **CR Deferred Revenue**

**Monthly Recognition (existing):**
- **DR Deferred Revenue**
- **CR Revenue**

### Implementation Plan

#### 1.1 Database Schema Updates
- [x] Add `initial_transaction_posted` boolean to `contracts` table (✅ Done - used in reconciliation)
- [ ] Add `clearing_account_id` to `accounting_integrations.account_mapping` JSON field
- [ ] Add `initial_journal_entry_id` to `contracts` table
- [ ] Add `initial_transaction_posted_at` timestamp
- [ ] Add `initial_transaction_posted_by` user ID
- [ ] Create migration for remaining schema changes

#### 1.2 Account Mapping UI Updates
- [ ] Update account mapping dialog to include "Clearing Account" field
- [ ] Update `AccountMapping` TypeScript interface to include `clearingAccountId` and `clearingAccountName`
- [ ] Validate that clearing account is an Asset account type

#### 1.3 Initial Transaction Posting Logic
- [ ] Create `postInitialTransaction` function in accounting providers
- [ ] Add `postInitialTransaction` to `AccountingProvider` interface
- [ ] Implement in `QuickBooksProvider` and `XeroProvider`
- [ ] Create server action `postContractInitialTransaction(organizationId, contractId)`
- [ ] Add permission check: `post_to_accounting`

#### 1.4 Contract Import/Creation Flow
- [ ] Add option to post initial transaction during contract import
- [ ] Add "Post Initial Transaction" button to contract detail/edit view
- [ ] Show status indicator if initial transaction is posted
- [ ] Prevent posting initial transaction if already posted

#### 1.5 Audit Trail
- [ ] Log initial transaction posting to `journal_entry_log` table
- [ ] Store `initial_journal_entry_id` on contract
- [ ] Store `initial_transaction_posted_at` timestamp
- [ ] Store `initial_transaction_posted_by` user ID

### Acceptance Criteria
- [ ] User can configure clearing account in account mapping
- [ ] Initial transaction posts: DR Clearing Account, CR Deferred Revenue
- [ ] Monthly recognition posts: DR Deferred Revenue, CR Revenue
- [ ] Both transactions are logged and auditable
- [ ] UI clearly shows which contracts have initial transaction posted

---

## Feature 2: Enhanced Date Picker & Search

### Current State
- Date range filter exists (`DateRangeFilter` component) but uses basic HTML date inputs
- No search functionality for customer name or invoice number
- Date filter updates URL params but may not be intuitive

### Accountant Requirement
- **Date picker** - Better UX for selecting date ranges
- **Search bar** - Search by customer name and/or invoice number

### Implementation Plan

#### 2.1 Enhanced Date Picker
- [ ] Replace basic HTML date inputs with a proper date range picker component
- [ ] Consider using `react-day-picker` or similar library for better UX
- [ ] Add preset options: "Last 3 months", "Last 6 months", "This year", "All time"
- [ ] Improve visual feedback when date range is active
- [ ] Add keyboard shortcuts for common ranges

#### 2.2 Search Bar Component
- [ ] Create `ContractSearchBar` component
- [ ] Add search input to waterfall table header
- [ ] Implement client-side filtering for customer name and invoice number
- [ ] Add debouncing (300ms) for performance
- [ ] Show search result count
- [ ] Clear search button
- [ ] Highlight matching text in results

#### 2.3 Search Integration
- [ ] Add search state to `WaterfallTable` component
- [ ] Filter contracts array based on search query
- [ ] Update URL params with search query (optional, for shareable links)
- [ ] Preserve search when date range changes
- [ ] Clear search when appropriate

#### 2.4 Server-Side Search (Future Enhancement)
- [ ] Consider server-side search if contract count grows large (>1000)
- [ ] Add database indexes on `customer_name` and `invoice_id`
- [ ] Implement search API endpoint if needed

### Acceptance Criteria
- [ ] Date picker has better UX than current HTML date inputs
- [ ] User can search contracts by customer name
- [ ] User can search contracts by invoice number
- [ ] Search is fast and responsive (debounced)
- [ ] Search works in combination with date range filter
- [ ] Search results update waterfall table in real-time

---

## Feature 3: Zero Balance Filtering

### Current State
- All contracts are shown in waterfall table regardless of balance
- Contracts with zero deferred balance still appear in view
- No option to hide zero-balance contracts

### Accountant Question
> "Would the rows with zero balances fall off the view? For example, three years from now, will the first pages be all zeros, or will the invoices with zero balances for the period selected not show."

### Implementation Plan

#### 3.1 Zero Balance Detection
- [ ] Add logic to calculate if contract has zero balance for selected period
- [ ] Consider both:
  - **All-time zero balance** - Contract fully recognized (all months posted)
  - **Period-specific zero balance** - No recognition in selected date range
- [ ] Add `hasZeroBalance` computed property to contract filtering logic

#### 3.2 Filter Toggle UI
- [ ] Add "Hide Zero Balances" toggle/checkbox to waterfall table controls
- [ ] Place near date range filter and search bar
- [ ] Default to showing all contracts (including zeros)
- [ ] Persist preference in localStorage (optional)

#### 3.3 Filtering Logic
- [ ] Filter contracts based on:
  - Selected date range (if any)
  - Zero balance status
  - Search query (from Feature 2)
- [ ] Update waterfall table to only show filtered contracts
- [ ] Show message when all contracts are filtered out
- [ ] Update totals row to reflect filtered contracts

#### 3.4 Edge Cases
- [ ] Handle contracts with zero balance in selected period but non-zero outside
- [ ] Handle contracts that are partially recognized
- [ ] Consider "Show All" vs "Show Active Only" distinction
- [ ] Document behavior in UI tooltips

### Acceptance Criteria
- [ ] User can toggle "Hide Zero Balances" filter
- [ ] Contracts with zero balance for selected period are hidden when filter is on
- [ ] Filter works in combination with date range and search
- [ ] Totals row reflects filtered contracts
- [ ] Clear messaging when no contracts match filters
- [ ] Default behavior shows all contracts (backward compatible)

---

## Implementation Order

### Phase 1: Critical (JE Posting)
1. **Feature 1: Initial Transaction Journal Entry**
   - Highest priority - affects accounting accuracy
   - Required for proper revenue recognition workflow

### Phase 2: UX Improvements
2. **Feature 2: Enhanced Date Picker & Search**
   - Improves usability as contract count grows
   - Can be implemented independently

3. **Feature 3: Zero Balance Filtering**
   - Addresses scalability concern
   - Can be implemented after search is working

---

## Technical Considerations

### Database
- Migration for `contracts.initial_transaction_posted` and related fields
- Index on `customer_name` and `invoice_id` for search performance
- Consider composite index on `(organization_id, customer_name, invoice_id)`

### API/Server Actions
- New server action: `postContractInitialTransaction`
- Update existing `postMonthToAccounting` to ensure correct JE structure
- Consider search endpoint if server-side search is needed

### UI Components
- New: `ContractSearchBar` component
- Enhanced: `DateRangeFilter` component
- New: Zero balance filter toggle
- Update: `WaterfallTable` to handle all filters

### Testing
- Unit tests for initial transaction posting logic
- Integration tests for JE posting (both initial and recognition)
- E2E tests for search and filtering
- Test zero balance detection logic

---

## Open Questions

1. **Initial Transaction Timing:**
   - Should initial transaction be posted automatically on import?
   - Or should it be a manual action?
   - **Recommendation:** Manual action with option to bulk-post during import

2. **Clearing Account:**
   - Is "Stripe Clearing" always the right account, or should it be configurable per organization?
   - **Recommendation:** Configurable, but default to a common clearing account name

3. **Zero Balance Definition:**
   - Zero balance for selected period only, or all-time zero balance?
   - **Recommendation:** Zero balance for selected period (more flexible)

4. **Search Scope:**
   - Should search also search in contract descriptions?
   - **Recommendation:** Start with customer name and invoice ID, add description later if needed

---

## Success Metrics

- [ ] All contracts can have initial transaction posted
- [ ] Monthly recognition JEs match accountant's expected structure
- [ ] Users can find contracts quickly using search
- [ ] Date range selection is intuitive
- [ ] Zero balance contracts can be hidden when needed
- [ ] No performance degradation with 1000+ contracts

---

## Notes

- Accountant confirmed video looks good - UI is on the right track
- Focus on accounting accuracy first (JE structure)
- UX improvements will become more important as data grows
- Consider user preferences/settings for default filter states


