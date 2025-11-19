# Feature 1: Initial Transaction Journal Entry

## Overview
Add support for posting initial transaction when contract is created, separate from monthly recognition entries.

**Current:** Only monthly recognition (DR Deferred Revenue, CR Revenue)  
**New:** Initial transaction (DR Clearing Account, CR Deferred Revenue) + Monthly recognition

---

## Database Changes

### Migration: Add Initial Transaction Fields

```sql
-- Add fields to contracts table
ALTER TABLE contracts
  ADD COLUMN initial_transaction_posted BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN initial_journal_entry_id TEXT,
  ADD COLUMN initial_transaction_posted_at TIMESTAMPTZ,
  ADD COLUMN initial_transaction_posted_by UUID REFERENCES users(id);

-- Add index for querying contracts needing initial transaction
CREATE INDEX idx_contracts_initial_transaction_pending 
  ON contracts(organization_id, initial_transaction_posted) 
  WHERE initial_transaction_posted = false;
```

### Update Account Mapping Schema

The `accounting_integrations.account_mapping` JSON field currently has:
```json
{
  "deferredRevenueAccountId": "...",
  "deferredRevenueAccountName": "...",
  "revenueAccountId": "...",
  "revenueAccountName": "..."
}
```

**Add:**
```json
{
  "clearingAccountId": "...",
  "clearingAccountName": "..."
}
```

---

## TypeScript Type Updates

### Update `AccountMapping` Interface

**File:** `src/lib/accounting/types.ts`

```typescript
export interface AccountMapping {
  deferredRevenueAccountId: string
  deferredRevenueAccountName: string
  revenueAccountId: string
  revenueAccountName: string
  clearingAccountId: string        // NEW
  clearingAccountName: string      // NEW
}
```

### Update Contract Type

**File:** `src/types/supabase.ts` (auto-generated, but document expected fields)

Expected fields after migration:
- `initial_transaction_posted: boolean`
- `initial_journal_entry_id: string | null`
- `initial_transaction_posted_at: string | null`
- `initial_transaction_posted_by: string | null`

---

## Accounting Provider Updates

### Add Method to `AccountingProvider` Interface

**File:** `src/lib/accounting/types.ts`

```typescript
export interface AccountingProvider {
  // ... existing methods ...
  
  /**
   * Post initial transaction for a contract
   * DR Clearing Account, CR Deferred Revenue
   */
  postInitialTransaction(
    tokens: AccountingTokens,
    params: {
      date: string // YYYY-MM-DD (contract start date)
      clearingAccountId: string
      deferredAccountId: string
      amount: number
      memo: string // e.g., "Waterfall - Initial Deferred Revenue for Invoice INV-001"
      invoiceId: string // For reference in memo
    }
  ): Promise<JournalEntryResult>
}
```

### Implement in QuickBooks Provider

**File:** `src/lib/accounting/providers/quickbooks.ts`

```typescript
async postInitialTransaction(
  tokens: AccountingTokens,
  params: {
    date: string
    clearingAccountId: string
    deferredAccountId: string
    amount: number
    memo: string
    invoiceId: string
  }
): Promise<JournalEntryResult> {
  // TODO: Real implementation
  // const journalEntry = {
  //   TxnDate: params.date,
  //   PrivateNote: params.memo,
  //   Line: [
  //     {
  //       DetailType: 'JournalEntryLineDetail',
  //       Amount: params.amount,
  //       JournalEntryLineDetail: {
  //         PostingType: 'Debit',
  //         AccountRef: { value: params.clearingAccountId }
  //       },
  //       Description: `Clearing for ${params.invoiceId}`
  //     },
  //     {
  //       DetailType: 'JournalEntryLineDetail',
  //       Amount: params.amount,
  //       JournalEntryLineDetail: {
  //         PostingType: 'Credit',
  //         AccountRef: { value: params.deferredAccountId }
  //       },
  //       Description: `Deferred Revenue for ${params.invoiceId}`
  //     }
  //   ]
  // }
  
  // Mock implementation
  console.log('Mock QuickBooks initial transaction:', {
    date: params.date,
    memo: params.memo,
    amount: params.amount,
    clearingAccount: params.clearingAccountId,
    deferredAccount: params.deferredAccountId,
  })
  
  await new Promise((resolve) => setTimeout(resolve, 500))
  
  return {
    success: true,
    entryId: `QB-IT-${Date.now()}`,
  }
}
```

### Implement in Xero Provider

**File:** `src/lib/accounting/providers/xero.ts`

Similar implementation for Xero API.

---

## Server Actions

### New Server Action: Post Initial Transaction

**File:** `src/app/(dashboard)/[organizationId]/actions.ts`

```typescript
/**
 * Post initial transaction for a contract
 * DR Clearing Account, CR Deferred Revenue
 */
export async function postContractInitialTransaction(
  organizationId: string,
  contractId: string
): Promise<{
  success: boolean
  journalEntryId?: string
  error?: string
}> {
  const supabase = await createClient()
  
  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }
  
  // Verify user has access to organization
  // ... (similar to postMonthToAccounting)
  
  // Get contract
  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .select('*')
    .eq('id', contractId)
    .eq('organization_id', organizationId)
    .single()
  
  if (contractError || !contract) {
    return { success: false, error: 'Contract not found' }
  }
  
  // Check if already posted
  if (contract.initial_transaction_posted) {
    return { success: false, error: 'Initial transaction already posted' }
  }
  
  // Get accounting integration
  const { data: integration } = await supabase
    .from('accounting_integrations')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('is_active', true)
    .single()
  
  if (!integration || !integration.account_mapping) {
    return { success: false, error: 'Accounting integration not configured' }
  }
  
  const accountMapping = integration.account_mapping as any
  
  if (!accountMapping.clearingAccountId) {
    return { success: false, error: 'Clearing account not configured' }
  }
  
  // Get provider
  const { getAccountingProvider } = await import('@/lib/accounting/provider-factory')
  const provider = getAccountingProvider(integration.platform as any)
  
  // Prepare tokens
  const tokens = {
    accessToken: integration.access_token || '',
    refreshToken: integration.refresh_token || '',
    expiresAt: integration.expires_at || '',
    realmId: integration.realm_id || '',
  }
  
  // Post initial transaction
  const result = await provider.postInitialTransaction(tokens, {
    date: contract.start_date,
    clearingAccountId: accountMapping.clearingAccountId,
    deferredAccountId: accountMapping.deferredRevenueAccountId,
    amount: contract.contract_amount,
    memo: `Waterfall - Initial Deferred Revenue for Invoice ${contract.invoice_id}`,
    invoiceId: contract.invoice_id,
  })
  
  if (!result.success) {
    return { success: false, error: result.error || 'Failed to post initial transaction' }
  }
  
  // Update contract
  const { error: updateError } = await supabase
    .from('contracts')
    .update({
      initial_transaction_posted: true,
      initial_journal_entry_id: result.entryId,
      initial_transaction_posted_at: new Date().toISOString(),
      initial_transaction_posted_by: user.id,
    })
    .eq('id', contractId)
  
  if (updateError) {
    return { success: false, error: 'Failed to update contract' }
  }
  
  // Log to journal_entry_log
  await logJournalEntry({
    organizationId,
    accountingIntegrationId: integration.id,
    entryType: 'initial_transaction',
    scheduleIds: [], // No schedules for initial transaction
    postingMonth: contract.start_date.substring(0, 7), // YYYY-MM
    totalAmount: contract.contract_amount,
    externalEntryId: result.entryId,
    isMocked: true, // Change when real integration ready
    status: 'mocked',
    postedBy: user.id,
  })
  
  return {
    success: true,
    journalEntryId: result.entryId,
  }
}
```

---

## UI Components

### Update Account Mapping Dialog

**File:** `src/components/accounting/accounting-connection-dialog.tsx`

Add third account selection:
1. Deferred Revenue Account (existing)
2. Revenue Account (existing)
3. **Clearing Account** (new)

Validation:
- Clearing account must be an Asset account type
- Show helpful text: "Account where initial payment is recorded (e.g., Stripe Clearing, Bank Account)"

### Add Initial Transaction Button

**File:** `src/components/contracts/edit-contract-sheet.tsx`

Add button/status indicator:
- Show "Post Initial Transaction" button if not posted
- Show "Posted" badge with journal entry ID if posted
- Disable button if already posted
- Show confirmation dialog before posting

### Contract List Status Indicator

**File:** `src/components/schedule/waterfall-table.tsx`

Add column or badge showing initial transaction status:
- Green checkmark if posted
- Gray indicator if not posted
- Tooltip with details

---

## Testing

### Unit Tests

**File:** `src/lib/accounting/providers/quickbooks.test.ts`

```typescript
describe('postInitialTransaction', () => {
  it('should post DR Clearing, CR Deferred Revenue', async () => {
    const provider = new QuickBooksProvider()
    const result = await provider.postInitialTransaction(tokens, {
      date: '2025-01-01',
      clearingAccountId: 'clearing-123',
      deferredAccountId: 'deferred-456',
      amount: 12000,
      memo: 'Test',
      invoiceId: 'INV-001',
    })
    
    expect(result.success).toBe(true)
    expect(result.entryId).toBeDefined()
  })
})
```

### Integration Tests

**File:** `src/app/(dashboard)/[organizationId]/actions.test.ts`

Test server action:
- Authentication check
- Permission check
- Contract not found
- Already posted check
- Successful posting
- Database update
- Audit log creation

---

## Implementation Checklist

- [ ] Create database migration
- [ ] Update TypeScript types
- [ ] Add `postInitialTransaction` to `AccountingProvider` interface
- [ ] Implement in `QuickBooksProvider`
- [ ] Implement in `XeroProvider`
- [ ] Create server action `postContractInitialTransaction`
- [ ] Update account mapping dialog UI
- [ ] Add initial transaction button to contract edit sheet
- [ ] Add status indicator to waterfall table
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Update documentation

---

## Edge Cases

1. **Contract edited after initial transaction posted:**
   - Should we allow re-posting? **No** - initial transaction is historical
   - If contract amount changes, handle via adjustment entries

2. **Missing clearing account:**
   - Show clear error message
   - Prompt user to configure account mapping

3. **Initial transaction fails:**
   - Don't update contract
   - Show error to user
   - Allow retry

4. **Bulk import:**
   - Option to post initial transactions for all imported contracts
   - Show progress indicator
   - Handle partial failures gracefully

---

## Future Enhancements

- Bulk post initial transactions for multiple contracts
- Scheduled posting (e.g., post all initial transactions at end of day)
- Different clearing accounts per contract type
- Support for multiple clearing accounts (e.g., Stripe, PayPal, Bank)


