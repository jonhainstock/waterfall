# Accounting Context for Developers

## The Problem We're Solving

### The Real-World Scenario

Imagine you run a SaaS company. A customer signs up for a 12-month subscription and pays you $12,000 upfront on January 1st.

**The Question:** When do you "earn" that $12,000?

**Wrong Answer:** "I earned it all on January 1st because that's when I received the payment."

**Right Answer:** "I earn $1,000 each month for 12 months, even though I received all the money upfront."

### Why This Matters

This is called **accrual accounting**, and it's required by accounting standards (GAAP, IFRS). Here's why:

1. **Accurate Financial Reporting:** Your income statement should show revenue when you actually deliver the service, not when you receive payment.

2. **Tax Compliance:** Tax authorities require accrual accounting for most businesses.

3. **Investor Confidence:** Investors want to see accurate revenue recognition, not inflated numbers from upfront payments.

4. **Cash Flow vs. Revenue:** You can have cash in the bank but not have "earned" it yet. This distinction is critical.

---

## Understanding DR and CR (Debit and Credit)

Before we dive into the accounting concepts, you need to understand **DR** (Debit) and **CR** (Credit). These are the foundation of all accounting transactions.

### What Are Debits and Credits?

**Debit (DR)** and **Credit (CR)** are not "good" or "bad" - they're just the two sides of every accounting transaction. Think of them like the two sides of a scale that must always balance.

**Key Rule:** Every transaction must have equal debits and credits. This is called **double-entry bookkeeping**.

### The Confusing Part (And How to Remember It)

Here's what trips up developers: **Debit doesn't always mean "increase" and Credit doesn't always mean "decrease"**. It depends on the **type of account**.

### Account Types and How DR/CR Affect Them

There are 5 main account types:

| Account Type | Debit (DR) Does... | Credit (CR) Does... | Examples |
|--------------|-------------------|---------------------|----------|
| **Assets** | Increases | Decreases | Cash, Bank Accounts, Equipment |
| **Liabilities** | Decreases | Increases | Deferred Revenue, Loans, Accounts Payable |
| **Equity** | Decreases | Increases | Owner's Equity, Retained Earnings |
| **Revenue** | Decreases | Increases | Sales Revenue, Service Revenue |
| **Expenses** | Increases | Decreases | Rent, Salaries, Cost of Goods Sold |

### Memory Trick: DEALER

A common mnemonic to remember:

- **D**ividends (Equity) - DR increases
- **E**xpenses - DR increases
- **A**ssets - DR increases
- **L**iabilities - CR increases
- **E**quity - CR increases
- **R**evenue - CR increases

**The pattern:** DEA accounts increase with Debit, LER accounts increase with Credit.

### Real Examples from Our App

#### Example 1: Initial Transaction
```
DR Clearing Account (Asset) $12,000
CR Deferred Revenue (Liability) $12,000
```

**What's happening:**
- **DR Clearing Account:** Asset increases (we have more money)
- **CR Deferred Revenue:** Liability increases (we owe more service)
- Both sides equal $12,000 ✓

#### Example 2: Monthly Recognition
```
DR Deferred Revenue (Liability) $1,000
CR Revenue (Revenue) $1,000
```

**What's happening:**
- **DR Deferred Revenue:** Liability decreases (we owe less service)
- **CR Revenue:** Revenue increases (we earned more income)
- Both sides equal $1,000 ✓

### Why This Matters for Developers

When you're coding journal entries, you need to:

1. **Identify the account types** you're working with
2. **Determine if you're increasing or decreasing** each account
3. **Use DR for increases in Assets/Expenses**, **CR for increases in Liabilities/Revenue/Equity**
4. **Always ensure DR = CR** (the transaction balances)

### Common Mistakes to Avoid

❌ **Wrong:** "DR always means increase"
- Assets: DR increases ✓
- Liabilities: DR decreases ✗

❌ **Wrong:** "CR always means decrease"
- Revenue: CR increases ✓
- Assets: CR decreases ✗

✅ **Right:** "DR/CR effect depends on account type"

### Quick Reference for Our App

In our app, we work with these account types:

- **Clearing Account** = Asset → DR increases it
- **Deferred Revenue** = Liability → CR increases it, DR decreases it
- **Revenue** = Revenue → CR increases it

So when we post:
- **Initial Transaction:** DR Asset (increase), CR Liability (increase)
- **Monthly Recognition:** DR Liability (decrease), CR Revenue (increase)

---

## The Accounting Concepts

### 1. Deferred Revenue (Liability)

When you receive payment upfront, you haven't "earned" it yet. So you record it as a **liability** called "Deferred Revenue" (also called "Unearned Revenue").

**Think of it like this:** You're holding someone's money that you haven't earned yet. You owe them the service.

**Example:**
- Customer pays $12,000 on Jan 1
- You record: **DR Cash $12,000, CR Deferred Revenue $12,000**
- This means: "I have $12,000 in cash, but I owe $12,000 worth of service"

### 2. Revenue Recognition

Each month, as you deliver the service, you "recognize" revenue. This means you move money from Deferred Revenue (liability) to Revenue (income).

**Example (January):**
- You delivered 1/12 of the service
- You record: **DR Deferred Revenue $1,000, CR Revenue $1,000**
- This means: "I earned $1,000 this month, so I reduce my liability by $1,000 and increase my income by $1,000"

### 3. The "Waterfall"

The **waterfall** is a visual representation of how deferred revenue decreases over time as you recognize revenue each month.

```
Month    | Deferred Revenue | Revenue Recognized | Remaining Balance
---------|------------------|-------------------|------------------
Jan 1    | $12,000         | $0                 | $12,000
Jan 31   | $11,000         | $1,000             | $11,000
Feb 28   | $10,000         | $1,000             | $10,000
Mar 31   | $9,000          | $1,000             | $9,000
...      | ...             | ...                | ...
Dec 31   | $0              | $1,000             | $0
```

This creates a "waterfall" effect where the deferred revenue balance decreases each month.

---

## How Our App Works

### The Two-Step Process

Our app handles **two separate accounting transactions**:

#### Step 1: Initial Transaction (When Contract is Created)

**When:** Customer pays upfront, contract is created/imported

**Transaction:**
- **DR Clearing Account** (e.g., "Stripe Clearing", "Bank Account") - $12,000
- **CR Deferred Revenue** - $12,000

**What this means:**
- "I received $12,000 in my clearing account (where payments land)"
- "I now owe $12,000 worth of service (deferred revenue liability)"

**Why a "Clearing Account"?**
- Payments often land in a clearing account (Stripe, PayPal, bank) before being moved to main accounts
- This account tracks where the money actually came from
- It's usually an Asset account (like a bank account)

#### Step 2: Monthly Recognition (Each Month)

**When:** End of each month (e.g., January 31, February 28, etc.)

**Transaction:**
- **DR Deferred Revenue** - $1,000
- **CR Revenue** - $1,000

**What this means:**
- "I delivered service this month, so I reduce my liability by $1,000"
- "I earned $1,000 in revenue this month"

**Why end of month?**
- Accounting periods are monthly
- You recognize revenue for the entire month at once
- Standard practice is to post on the last day of the month

---

## Component Breakdown

### 1. Contracts

**What it is:** A customer agreement with payment terms.

**Key Fields:**
- `invoice_id` - Unique identifier (e.g., "INV-001")
- `customer_name` - Who the contract is with
- `contract_amount` - Total amount paid upfront (e.g., $12,000)
- `start_date` - When the contract/service period begins
- `end_date` - When the contract/service period ends
- `term_months` - How many months the contract covers (e.g., 12)

**Example:**
```
Invoice ID: INV-001
Customer: Acme Corp
Amount: $12,000
Start: 2025-01-01
End: 2025-12-31
Term: 12 months
```

**The Math:**
- Monthly recognition = `contract_amount / term_months`
- $12,000 / 12 = $1,000 per month

### 2. Recognition Schedules

**What it is:** A monthly breakdown of how much revenue to recognize each month.

**Key Fields:**
- `contract_id` - Which contract this schedule belongs to
- `recognition_month` - Which month to recognize (e.g., "2025-01-01" for January)
- `recognition_amount` - How much to recognize that month (e.g., $1,000)
- `posted` - Whether this month has been posted to accounting system
- `posted_at` - When it was posted
- `journal_entry_id` - Reference to the accounting system's journal entry

**Example Schedule:**
```
Contract: INV-001 ($12,000, 12 months)

Month          | Amount  | Posted
---------------|---------|--------
2025-01-01     | $1,000  | Yes
2025-02-01     | $1,000  | Yes
2025-03-01     | $1,000  | No
2025-04-01     | $1,000  | No
...            | ...     | ...
2025-12-01     | $1,000  | No
```

**Why One Entry Per Month?**
- Accounting is done monthly
- Each month gets its own journal entry
- Makes it easy to see what was recognized when

### 3. The Waterfall Table

**What it is:** A visual representation of contracts and their recognition schedules.

**Layout:**
- **Rows:** One row per contract
- **Columns:** 
  - Fixed columns: Customer, Invoice, Start Date, End Date, Amount, Term
  - Dynamic columns: One column group per month (showing Revenue + Balance)

**What Each Month Column Shows:**
- **Revenue:** How much revenue is recognized that month (from schedule)
- **Balance:** How much deferred revenue remains after that month

**Example Row:**
```
Customer: Acme Corp
Invoice: INV-001
Amount: $12,000
Term: 12mo

Jan 2025        | Feb 2025        | Mar 2025        | ...
Revenue: $1,000 | Revenue: $1,000 | Revenue: $1,000 | ...
Balance: $11,000| Balance: $10,000| Balance: $9,000 | ...
```

**Why This View is Useful:**
- See all contracts at once
- See recognition schedule across time
- See which months have been posted
- See remaining deferred revenue balance

### 4. Journal Entries

**What it is:** The actual accounting transaction posted to QuickBooks/Xero.

**Two Types:**

#### Type 1: Initial Transaction
```
Date: 2025-01-01 (contract start date)
DR Clearing Account: $12,000
CR Deferred Revenue: $12,000
Memo: "Waterfall - Initial Deferred Revenue for Invoice INV-001"
```

#### Type 2: Monthly Recognition
```
Date: 2025-01-31 (last day of month)
DR Deferred Revenue: $1,000
CR Revenue: $1,000
Memo: "Waterfall - Revenue Recognition for January 2025"
```

**Why We Post to Accounting Systems:**
- QuickBooks/Xero are the "source of truth" for accounting
- Accountants use these systems to prepare financial statements
- Our app calculates what should be posted, then posts it
- Once posted, we mark it as "posted" so we don't post twice

### 5. Account Mapping

**What it is:** Configuration that tells our app which accounts to use in QuickBooks/Xero.

**Why We Need It:**
- Every company has different account names
- One company might call it "Deferred Revenue", another "Unearned Revenue"
- We need to know which accounts to debit/credit

**What Gets Mapped:**
1. **Clearing Account** - Where payments land (Asset)
   - Example: "Stripe Clearing", "Bank Account - Payments"
2. **Deferred Revenue Account** - Liability account (Liability)
   - Example: "Deferred Revenue - Current", "Unearned Revenue"
3. **Revenue Account** - Income account (Income)
   - Example: "Revenue - Services", "Subscription Revenue"

**How It Works:**
1. User connects QuickBooks/Xero
2. App fetches list of accounts
3. User selects which accounts to use
4. App saves the mapping
5. When posting, app uses these accounts

---

## The Complete Flow

### Scenario: New Contract Imported

1. **User imports contract:**
   - Invoice: INV-001
   - Customer: Acme Corp
   - Amount: $12,000
   - Term: 12 months
   - Start: 2025-01-01

2. **App creates contract record:**
   - Saves to `contracts` table
   - Calculates monthly recognition: $1,000/month

3. **App generates recognition schedule:**
   - Creates 12 entries in `recognition_schedules` table
   - One for each month (Jan 2025 through Dec 2025)
   - Each with `recognition_amount = $1,000`
   - All marked as `posted = false`

4. **User posts initial transaction (optional, but recommended):**
   - App creates journal entry in QuickBooks/Xero:
     - DR Clearing Account $12,000
     - CR Deferred Revenue $12,000
   - Marks contract as `initial_transaction_posted = true`
   - Saves journal entry ID

5. **Each month, user posts recognition:**
   - At end of January, user clicks "Post" for January
   - App creates journal entry:
     - DR Deferred Revenue $1,000
     - CR Revenue $1,000
   - Marks January schedule as `posted = true`
   - Saves journal entry ID
   - Repeats for each month

### Why This Flow Works

- **Separation of Concerns:** Initial transaction is separate from monthly recognition
- **Audit Trail:** Every transaction is logged with who posted it and when
- **Flexibility:** User can post initial transaction separately from recognition
- **Accuracy:** Each month is posted individually, preventing errors

---

## Common Questions

### Q: Why not post the initial transaction automatically?

**A:** Some companies handle initial transactions differently:
- They might post it manually in their accounting system
- They might use a different clearing account per payment method
- They might batch multiple contracts together
- Giving users control is safer

### Q: What if a contract amount changes?

**A:** We handle this with **adjustment entries**:
- If contract amount increases, we post an adjustment:
  - DR Clearing Account (additional amount)
  - CR Deferred Revenue (additional amount)
- If contract amount decreases, we post a reversal
- Then we recalculate future recognition schedules

### Q: What if I post the wrong month?

**A:** Once posted, we don't allow editing (prevents errors). Instead:
- Post an adjustment entry to correct it
- Or contact support to reverse the entry

### Q: Why show zero balance contracts?

**A:** Sometimes you want to see historical contracts even if they're fully recognized. But we also provide a filter to hide them if they clutter the view.

### Q: What's the difference between "posted" and "not posted"?

**A:**
- **Not Posted:** Calculated but not yet sent to QuickBooks/Xero
- **Posted:** Sent to QuickBooks/Xero, marked as complete, cannot be edited

### Q: Can I post multiple months at once?

**A:** Currently, we post one month at a time. This ensures:
- Each month gets its own journal entry
- Clear audit trail
- Easier to identify errors
- Matches standard accounting practice

---

## Key Principles for Developers

### 1. Never Use Floating-Point Math for Money

**Why:** Floating-point numbers have rounding errors.

**Wrong:**
```typescript
const monthly = 12000 / 12  // Might be 999.9999999999
```

**Right:**
```typescript
import Decimal from 'decimal.js'
const monthly = new Decimal(12000).div(12).toFixed(2)  // Always 1000.00
```

### 2. Always Round to 2 Decimal Places

**Why:** Money is always in dollars and cents.

**Example:**
```typescript
const amount = new Decimal(12000).div(12).toFixed(2)  // "1000.00"
```

### 3. Handle Rounding Errors in Last Month

**Why:** Dividing $12,000 by 12 might not equal exactly $1,000 × 12.

**Solution:** Adjust the last month:
```typescript
// Calculate 11 months normally
const monthly = new Decimal(12000).div(12).toFixed(2)  // "1000.00"

// Last month gets the remainder
const lastMonth = new Decimal(12000)
  .minus(new Decimal(monthly).times(11))
  .toFixed(2)  // "1000.00" (or whatever remains)
```

### 4. One Schedule Entry Per Contract Per Month

**Why:** Simplifies queries and prevents duplicates.

**Database Constraint:**
```sql
UNIQUE(contract_id, recognition_month)
```

### 5. Never Edit Posted Schedules

**Why:** Once posted to accounting system, it's part of the official record.

**Solution:** Use adjustment entries instead.

### 6. Always Filter by Organization

**Why:** Multi-tenant security - users should only see their organization's data.

**Example:**
```typescript
const contracts = await supabase
  .from('contracts')
  .select('*')
  .eq('organization_id', organizationId)  // Always include this
```

### 7. Post on Last Day of Month

**Why:** Standard accounting practice - recognize revenue for the entire month.

**Example:**
```typescript
const lastDayOfMonth = new Date(year, month + 1, 0)  // Last day
const postingDate = format(lastDayOfMonth, 'yyyy-MM-dd')
```

---

## Visual Example: Complete Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Contract Created                                         │
│    Invoice: INV-001                                         │
│    Amount: $12,000                                          │
│    Term: 12 months                                          │
│    Start: 2025-01-01                                        │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Recognition Schedule Generated                            │
│    Jan: $1,000 (not posted)                                 │
│    Feb: $1,000 (not posted)                                 │
│    Mar: $1,000 (not posted)                                 │
│    ...                                                       │
│    Dec: $1,000 (not posted)                                 │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Initial Transaction Posted (Optional)                     │
│    QuickBooks/Xero:                                          │
│    DR Clearing Account: $12,000                              │
│    CR Deferred Revenue: $12,000                             │
│    ✅ Contract marked as initial_transaction_posted = true   │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Monthly Recognition (Each Month)                          │
│    End of January:                                           │
│    QuickBooks/Xero:                                          │
│    DR Deferred Revenue: $1,000                               │
│    CR Revenue: $1,000                                        │
│    ✅ January schedule marked as posted = true               │
│                                                              │
│    End of February:                                          │
│    QuickBooks/Xero:                                          │
│    DR Deferred Revenue: $1,000                               │
│    CR Revenue: $1,000                                        │
│    ✅ February schedule marked as posted = true              │
│    ...                                                       │
└─────────────────────────────────────────────────────────────┘
```

---

## Summary

**The Core Concept:**
- Money received upfront is a liability (Deferred Revenue)
- Each month, you earn a portion of it (Revenue Recognition)
- The waterfall shows how the liability decreases over time

**What Our App Does:**
1. Tracks contracts and calculates monthly recognition
2. Generates recognition schedules automatically
3. Posts journal entries to QuickBooks/Xero
4. Provides a visual waterfall view

**Why It Matters:**
- Required for accurate financial reporting
- Ensures compliance with accounting standards
- Helps companies understand their revenue recognition

**Key Developer Rules:**
- Use Decimal.js for money calculations
- Never edit posted schedules
- Always filter by organization
- Post on last day of month
- One schedule entry per contract per month

---

## Additional Resources

- **GAAP Revenue Recognition:** ASC 606 (US) / IFRS 15 (International)
- **Deferred Revenue:** Liability account that represents unearned revenue
- **Accrual Accounting:** Method of accounting that records revenue when earned, not when received

