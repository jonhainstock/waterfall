# QuickBooks API Capability Verification

**Date:** 2025-01-XX  
**Purpose:** Verify all planned functionality is possible via QuickBooks Online API

---

## Summary

✅ **All planned functionality is supported by the QuickBooks Online API**

All three features (Initial Transaction JE, Date Picker/Search, Zero Balance Filtering) and the reconciliation/tie-out functionality can be implemented using the QuickBooks API.

---

## Feature 1: Initial Transaction Journal Entry

### ✅ **VERIFIED: Fully Supported**

**What We Need:**
- Post journal entry: DR Clearing Account, CR Deferred Revenue
- Get journal entry ID back
- Store ID for tracking

**QuickBooks API Support:**

1. **Journal Entry Creation** ✅
   - **API Endpoint:** `POST /v3/company/{realmId}/journalentry`
   - **Entity:** `JournalEntry`
   - **Documentation:** [QuickBooks JournalEntry API](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/journalentry)

2. **Journal Entry Structure:**
   ```json
   {
     "TxnDate": "2025-01-15",
     "PrivateNote": "Waterfall - Initial Deferred Revenue for Invoice INV-001",
     "Line": [
       {
         "DetailType": "JournalEntryLineDetail",
         "Amount": 12000.00,
         "JournalEntryLineDetail": {
           "PostingType": "Debit",
           "AccountRef": {
             "value": "clearing-account-id"
           }
         },
         "Description": "Clearing for INV-001"
       },
       {
         "DetailType": "JournalEntryLineDetail",
         "Amount": 12000.00,
         "JournalEntryLineDetail": {
           "PostingType": "Credit",
           "AccountRef": {
             "value": "deferred-revenue-account-id"
           }
         },
         "Description": "Deferred Revenue for INV-001"
       }
     ]
   }
   ```

3. **Response Includes Entry ID:**
   ```json
   {
     "JournalEntry": {
       "Id": "123",
       "SyncToken": "0",
       ...
     }
   }
   ```

**Implementation Status:**
- ✅ Can be implemented using `postJournalEntry()` method
- ✅ Returns `entryId` which we can store
- ✅ Supports all required fields (date, memo, debit/credit lines)

**Limitations:**
- ❌ Cannot query QuickBooks to verify if entry still exists
- ❌ Cannot detect if entry was posted by another system (A2X, Cinder, manual)
- ✅ **Workaround:** Track in our database, use tie-out to verify balances match

---

## Feature 1 (continued): Monthly Recognition Journal Entry

### ✅ **VERIFIED: Fully Supported**

**What We Need:**
- Post journal entry: DR Deferred Revenue, CR Revenue
- Aggregate multiple contracts for the month
- Get journal entry ID back

**QuickBooks API Support:**
- Same as Initial Transaction (uses `JournalEntry` entity)
- Can aggregate multiple contracts into single journal entry
- Supports any number of line items

**Current Implementation:**
- ✅ Already implemented in `postMonthToAccounting()`
- ✅ Uses `postJournalEntry()` method
- ✅ Aggregates all schedules for the month into one entry

**No Issues:** This is already working (in mock mode).

---

## Feature 2: Date Picker & Search

### ✅ **NOT APPLICABLE: No QuickBooks API Required**

This feature is **UI-only** and doesn't interact with QuickBooks API:
- Date picker: Client-side filtering of contracts
- Search: Client-side filtering by customer name/invoice ID

**No QuickBooks API calls needed.**

---

## Feature 3: Zero Balance Filtering

### ✅ **NOT APPLICABLE: No QuickBooks API Required**

This feature is **UI-only** and doesn't interact with QuickBooks API:
- Zero balance detection: Calculated from our own data (contracts + schedules)
- Filter toggle: Client-side UI component

**No QuickBooks API calls needed.**

---

## Reconciliation/Tie-Out Functionality

### ✅ **VERIFIED: Fully Supported**

**What We Need:**
1. Get Deferred Revenue account balance from Balance Sheet report
2. Get Revenue account balance from Profit & Loss report
3. Compare to our calculated balances

**QuickBooks API Support:**

### 1. Balance Sheet Report ✅

**API Endpoint:** `GET /v3/company/{realmId}/reports/BalanceSheet`

**Parameters:**
- `start_date`: Date to get balance as of (YYYY-MM-DD)
- `end_date`: Same as start_date (for point-in-time balance)

**Response Structure:**
```json
{
  "Header": {
    "ReportName": "Balance Sheet",
    "StartPeriod": "2025-01-01",
    "EndPeriod": "2025-01-31",
    ...
  },
  "Rows": {
    "Row": [
      {
        "group": "Liabilities",
        "Rows": {
          "Row": [
            {
              "group": "Current Liabilities",
              "Rows": {
                "Row": [
                  {
                    "ColData": [
                      { "value": "Deferred Revenue - Current" },
                      { "value": "12000.00" }
                    ]
                  }
                ]
              }
            }
          ]
        }
      }
    ]
  }
}
```

**Implementation:**
- ✅ Can fetch Balance Sheet report
- ✅ Can parse account balance from report structure
- ✅ Can filter by account ID/name to find specific account
- ⚠️ **Note:** Must parse nested JSON structure to find account

**Current Status:**
- Method `getBalanceSheetAccountBalance()` exists in interface
- Currently mocked, needs real implementation

---

### 2. Profit & Loss Report ✅

**API Endpoint:** `GET /v3/company/{realmId}/reports/ProfitAndLoss`

**Parameters:**
- `start_date`: Start of period (YYYY-MM-DD)
- `end_date`: End of period (YYYY-MM-DD)
- Returns YTD balance through end_date

**Response Structure:**
```json
{
  "Header": {
    "ReportName": "Profit and Loss",
    "StartPeriod": "2025-01-01",
    "EndPeriod": "2025-12-31",
    ...
  },
  "Rows": {
    "Row": [
      {
        "group": "Income",
        "Rows": {
          "Row": [
            {
              "ColData": [
                { "value": "Revenue - Services" },
                { "value": "5000.00" }
              ]
            }
          ]
        }
      }
    ]
  }
}
```

**Implementation:**
- ✅ Can fetch P&L report
- ✅ Can parse account balance from report structure
- ✅ Returns YTD balance through end_date (perfect for our use case)
- ⚠️ **Note:** Must parse nested JSON structure to find account

**Current Status:**
- Method `getProfitAndLossAccountBalance()` exists in interface
- Currently mocked, needs real implementation

---

## Account Listing (Already Implemented)

### ✅ **VERIFIED: Fully Supported**

**What We Need:**
- Get list of accounts for account mapping
- Filter by account type (Asset, Liability, Income)

**QuickBooks API Support:**
- **API Endpoint:** `GET /v3/company/{realmId}/query?query=SELECT * FROM Account`
- **Entity:** `Account`
- Returns account ID, name, type, sub-type

**Current Implementation:**
- ✅ `getAccounts()` method exists
- ✅ Currently mocked, but API supports it
- ✅ Used in account mapping dialog

---

## API Rate Limits

### ⚠️ **IMPORTANT: Rate Limits**

**QuickBooks Online API Limits:**
- **500 requests per minute** per realm ID
- Fixed-window rate limiting
- Exceeding limit returns `429 Too Many Requests`

**Impact on Our Features:**

1. **Initial Transaction Posting:**
   - One API call per contract
   - Bulk posting 100 contracts = 100 API calls
   - ✅ **Safe:** Well under 500/minute limit

2. **Monthly Recognition Posting:**
   - One API call per month (aggregated)
   - ✅ **Safe:** Very low usage

3. **Tie-Out/Reconciliation:**
   - Two API calls per tie-out (Balance Sheet + P&L)
   - ✅ **Safe:** Very low usage

4. **Account Listing:**
   - One API call when configuring account mapping
   - ✅ **Safe:** Very low usage

**Recommendation:**
- ✅ No rate limiting concerns for planned features
- Consider adding retry logic with exponential backoff for 429 errors
- Consider caching account list (changes infrequently)

---

## OAuth & Authentication

### ✅ **VERIFIED: Fully Supported**

**What We Need:**
- OAuth 2.0 flow
- Token refresh
- Store tokens securely

**QuickBooks API Support:**
- ✅ OAuth 2.0 fully supported
- ✅ Token refresh supported
- ✅ Tokens expire after 100 days of inactivity
- ✅ Can store tokens encrypted in database

**Current Implementation:**
- ✅ OAuth flow methods exist (`getAuthorizationUrl`, `handleCallback`, `refreshAccessToken`)
- ✅ Currently mocked, but API supports it

---

## Summary by Feature

| Feature | QuickBooks API Support | Status | Notes |
|---------|----------------------|--------|-------|
| **Initial Transaction JE** | ✅ Fully Supported | Ready to implement | Use `JournalEntry` entity |
| **Monthly Recognition JE** | ✅ Fully Supported | Already implemented | Uses `JournalEntry` entity |
| **Date Picker** | N/A (UI only) | Ready to implement | No API needed |
| **Search** | N/A (UI only) | Ready to implement | No API needed |
| **Zero Balance Filter** | N/A (UI only) | Ready to implement | No API needed |
| **Balance Sheet Report** | ✅ Fully Supported | Needs implementation | Parse nested JSON structure |
| **P&L Report** | ✅ Fully Supported | Needs implementation | Parse nested JSON structure |
| **Account Listing** | ✅ Fully Supported | Mocked, ready for real | Already in interface |

---

## Implementation Checklist

### ✅ Ready to Implement (No Blockers)

- [x] Initial Transaction Journal Entry posting
- [x] Monthly Recognition Journal Entry posting (already done)
- [x] Date Picker UI (no API needed)
- [x] Search UI (no API needed)
- [x] Zero Balance Filter UI (no API needed)
- [x] Account listing (API ready, just needs real implementation)

### ⚠️ Needs Implementation (API Supported, Code Needed)

- [ ] Balance Sheet report fetching and parsing
- [ ] P&L report fetching and parsing
- [ ] Real OAuth implementation (currently mocked)
- [ ] Real journal entry posting (currently mocked)
- [ ] Account listing real implementation (currently mocked)

### ❌ Not Possible (Workarounds Available)

- [ ] Detect if initial transaction posted elsewhere
  - **Workaround:** User marks as posted, tie-out verifies balance
- [ ] Verify individual journal entry exists
  - **Workaround:** Compare aggregate balances via tie-out
- [ ] Automatically fix discrepancies
  - **Workaround:** User investigates and fixes manually

---

## Key Takeaways

1. ✅ **All planned functionality is possible** via QuickBooks API
2. ✅ **No blockers** - everything we need is supported
3. ⚠️ **Some features need real implementation** (currently mocked)
4. ⚠️ **Report parsing** requires handling nested JSON structure
5. ✅ **Rate limits are not a concern** for our usage patterns
6. ✅ **OAuth is fully supported** for secure authentication

---

## Next Steps

1. **Implement real QuickBooks API calls** (replace mocks):
   - Journal entry posting
   - Balance Sheet report fetching
   - P&L report fetching
   - Account listing
   - OAuth flow

2. **Add report parsing logic:**
   - Parse nested JSON structure from Balance Sheet report
   - Parse nested JSON structure from P&L report
   - Extract account balance by account ID/name

3. **Add error handling:**
   - Handle 429 rate limit errors (retry with backoff)
   - Handle token expiration (auto-refresh)
   - Handle API errors gracefully

4. **Test in QuickBooks Sandbox:**
   - Test journal entry creation
   - Test report fetching
   - Test OAuth flow
   - Verify all functionality works end-to-end

---

## Implementation Libraries

Based on the codebase, the following libraries are planned for QuickBooks integration:

### OAuth
- **Library:** `intuit-oauth` (npm package)
- **Usage:** OAuth 2.0 flow, token management
- **Documentation:** [intuit-oauth on npm](https://www.npmjs.com/package/intuit-oauth)

### API Calls
- **Library:** `node-quickbooks` (npm package)
- **Usage:** Journal entry creation, account queries, report fetching
- **Documentation:** [node-quickbooks on npm](https://www.npmjs.com/package/node-quickbooks)

**Note:** Both libraries are well-maintained and widely used in the QuickBooks integration ecosystem.

---

## References

- [QuickBooks Online API Documentation](https://developer.intuit.com/app/developer/qbo/docs)
- [JournalEntry Entity Reference](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/journalentry)
- [Reports API Reference](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/reports)
- [OAuth 2.0 Guide](https://developer.intuit.com/app/developer/qbo/docs/develop/authentication-and-authorization)
- [node-quickbooks Library](https://www.npmjs.com/package/node-quickbooks)
- [intuit-oauth Library](https://www.npmjs.com/package/intuit-oauth)

---

## Final Verification Summary

✅ **All planned functionality is possible and supported by the QuickBooks Online API**

### Verified Capabilities:
1. ✅ **Initial Transaction Journal Entry** - Fully supported via `JournalEntry` entity
2. ✅ **Monthly Recognition Journal Entry** - Fully supported (already implemented)
3. ✅ **Balance Sheet Report** - Fully supported via Reports API
4. ✅ **Profit & Loss Report** - Fully supported via Reports API
5. ✅ **Account Listing** - Fully supported via Account query
6. ✅ **OAuth Authentication** - Fully supported via OAuth 2.0

### No Blockers:
- All required API endpoints exist and are documented
- Required libraries (`node-quickbooks`, `intuit-oauth`) are available and maintained
- Rate limits are sufficient for our usage patterns
- No unsupported operations identified

### Next Steps:
1. Replace mock implementations with real API calls
2. Implement report parsing logic for Balance Sheet and P&L
3. Test in QuickBooks Sandbox environment
4. Handle error cases (rate limits, token expiration, etc.)

**Ready to proceed with implementation.**

