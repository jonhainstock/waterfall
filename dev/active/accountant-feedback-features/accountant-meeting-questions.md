# Accountant Meeting - Clarifying Questions

**Date:** [Meeting Date]  
**Purpose:** Prioritize features, clarify requirements, validate approach

---

## Feature Prioritization

### 1. Initial Transaction Journal Entry (Feature 1)

**Questions:**
- [ ] **Priority:** Is this the #1 priority, or can we start with UX improvements (search/filtering)?
- [ ] **Timing:** Should initial transactions be posted automatically during import, or always manual?
- [ ] **Clearing Account:** 
  - Do most clients use a single clearing account (e.g., "Stripe Clearing"), or do they vary by payment method?
  - Should we support per-contract clearing account selection, or is organization-level default sufficient?
- [ ] **Workflow:** What's the typical volume? (e.g., "We import 50 contracts/month, all use Stripe")
- [ ] **Edge Cases:**
  - What if a contract is imported but the payment hasn't actually been received yet?
  - Should we allow posting initial transactions retroactively (for contracts imported months ago)?
  - What if a contract amount changes after initial transaction is posted?

### 2. Enhanced Date Picker & Search (Feature 2)

**Questions:**
- [ ] **Priority:** How important is this vs. initial transaction posting?
- [ ] **Search Scope:** 
  - Is searching by customer name and invoice number sufficient, or should we also search contract descriptions?
  - Do you need fuzzy search (partial matches) or exact matches only?
- [ ] **Date Presets:** Which date range presets are most useful?
  - "Last 3 months", "Last 6 months", "This year", "All time"?
  - Any others specific to your workflow?
- [ ] **Performance:** What's the typical contract count? (affects whether we need server-side search)

### 3. Zero Balance Filtering (Feature 3)

**Questions:**
- [ ] **Definition:** When you said "zero balances fall off the view" - do you mean:
  - **Option A:** Zero balance for the selected date range only (contracts with no recognition in that period)?
  - **Option B:** All-time zero balance (contracts fully recognized, no remaining deferred revenue)?
  - **Option C:** Both, with a toggle?
- [ ] **Default Behavior:** Should the filter default to hiding zeros, or showing all?
- [ ] **Rounding:** Should contracts with < $0.01 balance be considered "zero"?
- [ ] **Use Case:** Is this mainly for cleaning up the view, or do you have a specific reporting need?

---

## Workflow & Process Questions

### Initial Transaction Workflow

**Questions:**
- [ ] **When do you typically post initial transactions?**
  - Immediately when contract is created/imported?
  - In batches at end of day/week?
  - Only after payment is confirmed received?
- [ ] **Bulk Operations:** Do you need to post multiple contracts at once, or is one-at-a-time sufficient?
- [ ] **Review Process:** Do you need to review contracts before posting, or is automatic posting acceptable?

### Monthly Recognition Workflow

**Questions:**
- [ ] **Posting Frequency:** How often do you post monthly recognition?
  - End of each month?
  - Beginning of next month?
  - Quarterly batches?
- [ ] **Bulk Posting:** Do you need to post multiple months at once, or is current one-month-at-a-time approach sufficient?
- [ ] **Error Handling:** If a monthly recognition fails to post, what's the typical recovery process?

### Account Mapping

**Questions:**
- [ ] **Clearing Account:** 
  - What's the typical name/structure? (e.g., "Stripe Clearing", "Bank Account - Payments")
  - Is it always an Asset account type?
  - Do clients ever have multiple clearing accounts (one per payment method)?
- [ ] **Account Names:** Do account names vary significantly between clients, or are they fairly standardized?
- [ ] **Validation:** Should we validate that selected accounts are the correct type (Asset vs Liability vs Income)?

---

## Technical & Accounting Questions

### Journal Entry Structure

**Questions:**
- [ ] **Initial Transaction:** Confirm the structure:
  - DR Clearing Account (Asset)
  - CR Deferred Revenue (Liability)
  - ✓ Is this correct?
- [ ] **Monthly Recognition:** Confirm the structure:
  - DR Deferred Revenue (Liability)
  - CR Revenue (Income)
  - ✓ Is this correct?
- [ ] **Memo/Description:** What information should be in the journal entry memo?
  - Current: "Waterfall - Initial Deferred Revenue for Invoice INV-001"
  - Is this sufficient, or should we include more details (customer name, contract dates, etc.)?

### Date Handling

**Questions:**
- [ ] **Initial Transaction Date:** Should the journal entry date be:
  - Contract start date?
  - Date contract was imported?
  - Date payment was received?
  - User-selectable?
- [ ] **Monthly Recognition Date:** Should it always be the last day of the month, or can it vary?

### Adjustments & Corrections

**Questions:**
- [ ] **Contract Amount Changes:** If a contract amount changes after initial transaction is posted, what's the process?
  - Post an adjustment entry?
  - Reverse and re-post?
  - Manual correction only?
- [ ] **Posted Schedule Edits:** Once a monthly recognition is posted, should we allow any edits, or is it locked?
- [ ] **Reversals:** Do you need the ability to reverse/undo posted transactions, or is that handled manually in QuickBooks/Xero?

---

## UX & Interface Questions

### Status Indicators

**Questions:**
- [ ] **Initial Transaction Status:** How should we show whether initial transaction is posted?
  - Badge/icon in contract list?
  - Separate column?
  - Only visible in detail view?
- [ ] **Visual Design:** What's most important to see at a glance?
  - Which contracts need initial transaction?
  - Which months need recognition posted?
  - Overall posting status?

### Filtering & Organization

**Questions:**
- [ ] **Filter Combinations:** Do you need to combine filters (e.g., search + date range + zero balance)?
- [ ] **Saved Filters:** Should we save filter preferences (e.g., "always hide zeros")?
- [ ] **Export:** Do you need to export filtered views to CSV/Excel?

### Bulk Operations

**Questions:**
- [ ] **Selection:** Do you need to select multiple contracts for bulk operations (post, export, delete)?
- [ ] **Bulk Posting:** If posting multiple initial transactions, should they be:
  - Individual journal entries (one per contract)?
  - Combined into a single journal entry?
  - Your preference?

---

## Integration & Platform Questions

### QuickBooks vs Xero

**Questions:**
- [ ] **Platform Priority:** Are most clients on QuickBooks, Xero, or split?
- [ ] **Feature Parity:** Do features need to work identically on both platforms, or can there be differences?
- [ ] **Testing:** Do you have access to test/sandbox accounts for both platforms?

### Account Discovery

**Questions:**
- [ ] **Account Selection:** When mapping accounts, should we:
  - Show all accounts and let user search/filter?
  - Only show accounts of the correct type (Asset/Liability/Income)?
  - Suggest accounts based on name (e.g., "Deferred Revenue")?
- [ ] **Account Creation:** If a needed account doesn't exist, should we allow creating it, or require manual creation in QuickBooks/Xero?

---

## Reporting & Analytics Questions

**Questions:**
- [ ] **Reports Needed:** Beyond the waterfall view, do you need:
  - Summary reports (total deferred revenue, total recognized)?
  - Contract status reports (posted vs. not posted)?
  - Recognition schedule reports?
- [ ] **Export Formats:** What export formats are needed? (CSV, Excel, PDF?)

---

## Edge Cases & Scenarios

**Questions:**
- [ ] **Partial Recognition:** What if a contract is partially recognized (some months posted, some not)?
  - Should we show this clearly in the UI?
  - Should we allow posting missing months?
- [ ] **Contract Modifications:** 
  - What if contract amount changes mid-term?
  - What if contract term changes (e.g., 12 months → 18 months)?
  - What if contract is cancelled/refunded?
- [ ] **Historical Data:** 
  - Should we support importing contracts that started months/years ago?
  - Should we allow posting initial transactions retroactively?
  - Should we allow posting past monthly recognitions?

---

## Success Criteria

**Questions:**
- [ ] **Must-Haves:** What are the absolute must-have features for this to be useful?
- [ ] **Nice-to-Haves:** What features would be nice but aren't critical?
- [ ] **Timeline:** Are there any deadlines or time-sensitive needs?
- [ ] **Testing:** How would you like to test/review features before they go live?
  - Staging environment?
  - Demo sessions?
  - Beta testing with select clients?

---

## Open Discussion

**Questions:**
- [ ] **Pain Points:** What are the biggest pain points in the current workflow?
- [ ] **Wish List:** If you could add any feature, what would it be?
- [ ] **Feedback Loop:** How would you like to provide ongoing feedback?
- [ ] **Documentation:** What documentation would be helpful? (User guides, video tutorials, etc.)

---

## Notes Section

_Use this space to capture answers and decisions during the meeting:_

### Feature Priority Decision:
- [ ] Feature 1 (Initial Transaction) - Priority: ___
- [ ] Feature 2 (Date Picker & Search) - Priority: ___
- [ ] Feature 3 (Zero Balance Filtering) - Priority: ___

### Key Decisions:
- Initial Transaction Timing: ___
- Clearing Account Approach: ___
- Zero Balance Definition: ___
- Other: ___

### Next Steps:
1. ___
2. ___
3. ___

### Follow-Up Items:
- [ ] ___
- [ ] ___
- [ ] ___

---

## Meeting Summary Template

**Date:** ___  
**Attendees:** ___  
**Duration:** ___

**Key Takeaways:**
1. ___
2. ___
3. ___

**Action Items:**
1. [ ] ___ (Owner: ___, Due: ___)
2. [ ] ___ (Owner: ___, Due: ___)
3. [ ] ___ (Owner: ___, Due: ___)

**Next Meeting:** ___


