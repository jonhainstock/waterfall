# Waterfall Business Logic

**Domain Skill** - Revenue recognition, contract import, QuickBooks integration, journal entries

## Overview

Core business logic for Waterfall: revenue recognition calculations, CSV/Excel import, waterfall schedule generation, and QuickBooks Online integration.

**When to use this skill:**
- Implementing revenue recognition calculations
- Building CSV/Excel import features
- Generating waterfall schedules
- Integrating with QuickBooks OAuth
- Creating journal entries
- Handling QB token refresh

## Revenue Recognition

### Straight-Line Calculation

**Formula:**
```typescript
monthly_recognition = contract_amount ÷ term_months
```

**Always use Decimal.js** to avoid floating-point errors:

```typescript
import Decimal from 'decimal.js'

function calculateMonthlyRecognition(
  contractAmount: number,
  termMonths: number
): Decimal {
  const amount = new Decimal(contractAmount)
  const term = new Decimal(termMonths)

  return amount.dividedBy(term).toDecimalPlaces(2)
}
```

### Generate Recognition Schedule

```typescript
import { addMonths, startOfMonth } from 'date-fns'

function generateSchedule(contract: {
  id: string
  organizationId: string
  contractAmount: Decimal
  startDate: Date
  endDate: Date
  termMonths: number
  monthlyRecognition: Decimal
}) {
  const schedules = []

  for (let i = 0; i < contract.termMonths; i++) {
    const recognitionMonth = startOfMonth(addMonths(contract.startDate, i))

    schedules.push({
      contractId: contract.id,
      organizationId: contract.organizationId,
      recognitionMonth,
      recognitionAmount: contract.monthlyRecognition,
      posted: false,
    })
  }

  return schedules
}
```

**Resource File:** See `resources/revenue-recognition-calculations.md` for edge cases and rounding.

## CSV Import

### Parse CSV

```typescript
import Papa from 'papaparse'

type CSVRow = {
  invoice_id: string
  customer_name?: string
  description?: string
  amount: string
  start_date: string
  end_date?: string
  term_months?: string
}

function parseCSV(file: File): Promise<CSVRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data as CSVRow[]),
      error: (error) => reject(error),
    })
  })
}
```

### Validate Rows

```typescript
import { z } from 'zod'

const contractSchema = z.object({
  invoice_id: z.string().min(1, 'Invoice ID required'),
  customer_name: z.string().optional(),
  description: z.string().optional(),
  amount: z.string().refine((val) => !isNaN(parseFloat(val)) && parseFloat(val) > 0, {
    message: 'Amount must be positive number',
  }),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD').optional(),
  term_months: z.string().refine((val) => !isNaN(parseInt(val)) && parseInt(val) > 0, {
    message: 'Term must be positive integer',
  }).optional(),
})

function validateRow(row: CSVRow, rowIndex: number) {
  try {
    const validated = contractSchema.parse(row)

    // Check that either end_date or term_months is provided
    if (!validated.end_date && !validated.term_months) {
      return { valid: false, error: 'Either end_date or term_months required', row: rowIndex }
    }

    return { valid: true, data: validated }
  } catch (error) {
    return { valid: false, error: error.errors[0].message, row: rowIndex }
  }
}
```

**Resource File:** See `resources/csv-import-validation.md` for complete import flow.

## QuickBooks Integration

### OAuth Flow

```typescript
// lib/quickbooks/oauth.ts
import OAuthClient from 'intuit-oauth'

const oauthClient = new OAuthClient({
  clientId: process.env.QUICKBOOKS_CLIENT_ID!,
  clientSecret: process.env.QUICKBOOKS_CLIENT_SECRET!,
  environment: process.env.QUICKBOOKS_ENVIRONMENT as 'sandbox' | 'production',
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/quickbooks/callback`,
})

// Generate auth URL
export function getAuthorizationUrl(organizationId: string) {
  return oauthClient.authorizeUri({
    scope: [OAuthClient.scopes.Accounting],
    state: organizationId, // Pass org ID via state
  })
}

// Exchange code for tokens
export async function exchangeCodeForTokens(code: string) {
  const authResponse = await oauthClient.createToken(code)
  return {
    accessToken: authResponse.token.access_token,
    refreshToken: authResponse.token.refresh_token,
    realmId: authResponse.token.realmId,
    expiresAt: new Date(Date.now() + authResponse.token.expires_in * 1000),
  }
}

// Refresh token
export async function refreshAccessToken(refreshToken: string) {
  oauthClient.setToken({ refresh_token: refreshToken })
  const authResponse = await oauthClient.refresh()

  return {
    accessToken: authResponse.token.access_token,
    refreshToken: authResponse.token.refresh_token,
    expiresAt: new Date(Date.now() + authResponse.token.expires_in * 1000),
  }
}
```

**Resource File:** See `resources/quickbooks-oauth-flow.md` for complete OAuth implementation.

### Create Journal Entry

```typescript
// lib/quickbooks/journal-entry.ts
import QuickBooks from 'node-quickbooks'

export async function createJournalEntry(params: {
  realmId: string
  accessToken: string
  recognitionMonth: Date
  totalAmount: Decimal
  deferredRevenueAccountId: string
  revenueAccountId: string
}) {
  const qbo = new QuickBooks(
    process.env.QUICKBOOKS_CLIENT_ID!,
    process.env.QUICKBOOKS_CLIENT_SECRET!,
    params.accessToken,
    false, // no token secret for OAuth 2.0
    params.realmId,
    process.env.QUICKBOOKS_ENVIRONMENT === 'sandbox',
    true, // use OAuth 2.0
    null,
    '2.0',
    '2.0'
  )

  const journalEntry = {
    TxnDate: format(endOfMonth(params.recognitionMonth), 'yyyy-MM-dd'),
    Line: [
      {
        Description: 'Deferred Revenue Recognition',
        DetailType: 'JournalEntryLineDetail',
        Amount: params.totalAmount.toNumber(),
        JournalEntryLineDetail: {
          PostingType: 'Debit',
          AccountRef: {
            value: params.deferredRevenueAccountId,
          },
        },
      },
      {
        Description: 'Revenue Recognition',
        DetailType: 'JournalEntryLineDetail',
        Amount: params.totalAmount.toNumber(),
        JournalEntryLineDetail: {
          PostingType: 'Credit',
          AccountRef: {
            value: params.revenueAccountId,
          },
        },
      },
    ],
    PrivateNote: `Waterfall - Revenue Recognition for ${format(params.recognitionMonth, 'MMMM yyyy')}`,
  }

  return new Promise((resolve, reject) => {
    qbo.createJournalEntry(journalEntry, (err: any, journalEntry: any) => {
      if (err) reject(err)
      else resolve(journalEntry)
    })
  })
}
```

**Resource File:** See `resources/journal-entry-posting.md` for error handling and retry logic.

## Resource Files

- **`resources/revenue-recognition-calculations.md`** - Detailed calculation logic, edge cases
- **`resources/csv-import-validation.md`** - Complete import workflow, error handling
- **`resources/quickbooks-oauth-flow.md`** - OAuth setup, token refresh, disconnect
- **`resources/journal-entry-posting.md`** - JE creation, batch posting, audit trail

## Best Practices

**Revenue Recognition:**
- Always use Decimal.js for money calculations
- Round to 2 decimal places
- Handle rounding errors (adjust last month if needed)
- Validate date ranges

**CSV Import:**
- Validate all rows before importing
- Show preview with errors
- Log imports for audit trail
- Handle duplicate invoice IDs gracefully

**QuickBooks:**
- Encrypt tokens before storing
- Refresh tokens proactively (before expiry)
- Handle API rate limits
- Log all QB API calls
- Never post same month twice (check if already posted)
