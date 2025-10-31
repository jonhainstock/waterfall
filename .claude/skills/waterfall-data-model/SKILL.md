# Waterfall Data Model

**Domain Skill** - Database schema, multi-tenancy, RLS policies, Prisma patterns

## Overview

This skill covers Waterfall's multi-tenant data model, Row Level Security (RLS) policies, Prisma ORM usage, and Supabase client patterns.

**When to use this skill:**
- Creating or modifying database schema
- Writing Prisma queries
- Implementing RLS policies
- Working with Supabase client (server/browser)
- Managing migrations
- Multi-tenant data access patterns

## Multi-Tenant Architecture

### Three-Tier Hierarchy

```
User ←→ AccountUser ←→ Account
                       ↓
                  Organization
                       ↓
                   Contract
                       ↓
            RecognitionSchedule
```

**Key Principles:**

1. **Account = Tenant**
   - One subscription per account
   - One team per account
   - Multiple organizations per account

2. **Organization = Data Isolation Boundary**
   - Each organization has its own QuickBooks connection
   - Each organization's contracts are completely isolated
   - RLS enforces data isolation at database level

3. **User can belong to multiple Accounts**
   - Users are global entities
   - AccountUser join table links users to accounts with roles
   - Single email, multiple account memberships

## Core Entities

### Account (Tenant)

**Purpose:** The billing entity. One subscription, one team.

**Key Fields:**
```typescript
Account {
  id              String   @id @default(uuid())
  name            String
  accountType     String   // "company" or "firm"
  subscriptionTier String  // "free", "starter", "pro"
  subscriptionStatus String // "trial", "active", "cancelled"
  trialEndsAt     DateTime?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}
```

**Relationships:**
- `accountUsers` - Team members (via AccountUser join table)
- `organizations` - Client organizations

**Business Rules:**
- Free tier: 1 user, 1 organization
- Starter tier: 3 users, 5 organizations
- Pro tier: 10 users, 50 organizations

### User

**Purpose:** Individual person who can belong to multiple accounts.

**Key Fields:**
```typescript
User {
  id        String   @id // From Supabase Auth
  email     String   @unique
  name      String
  avatarUrl String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

**Relationships:**
- `accountUsers` - Account memberships (via AccountUser join table)

**Business Rules:**
- Email must be unique globally
- Users can be in multiple accounts (e.g., consultant works with multiple firms)
- User ID comes from Supabase Auth (auth.uid())

### AccountUser (Join Table)

**Purpose:** Links users to accounts with roles.

**Key Fields:**
```typescript
AccountUser {
  id         String   @id @default(uuid())
  accountId  String
  userId     String
  role       String   // "owner", "admin", "member"
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@unique([accountId, userId])
}
```

**Roles:**
- **owner** - Full control, billing, settings
- **admin** - Manage team, organizations, contracts
- **member** - Manage contracts only

### Organization

**Purpose:** A client business entity (the "client" in the multi-tenant system).

**Key Fields:**
```typescript
Organization {
  id                      String   @id @default(uuid())
  accountId               String
  name                    String
  slug                    String?
  quickbooksRealmId       String?  @unique
  quickbooksAccessToken   String?  // Encrypted
  quickbooksRefreshToken  String?  // Encrypted
  quickbooksExpiresAt     DateTime?
  quickbooksConnectedAt   DateTime?
  accountMapping          Json?    // { deferredRevenueAccountId, revenueAccountId }
  settings                Json?
  isActive                Boolean  @default(true)
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
}
```

**Relationships:**
- `account` - Parent account
- `contracts` - Customer contracts
- `recognitionSchedules` - Recognition entries (denormalized for RLS)

**Business Rules:**
- Each organization can connect to ONE QuickBooks company
- QuickBooks realm ID must be unique across all organizations
- Account mapping stored as JSON: `{ deferredRevenueAccountId: "123", revenueAccountId: "456" }`

### Contract

**Purpose:** A customer contract that requires revenue recognition.

**Key Fields:**
```typescript
Contract {
  id                  String   @id @default(uuid())
  organizationId      String
  invoiceId           String   // User's invoice identifier
  customerName        String?
  description         String?
  contractAmount      Decimal  @db.Decimal(12, 2)
  startDate           DateTime @db.Date
  endDate             DateTime @db.Date
  termMonths          Int
  monthlyRecognition  Decimal  @db.Decimal(12, 2)
  status              String   @default("active") // "active", "completed", "cancelled"
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@unique([organizationId, invoiceId])
}
```

**Relationships:**
- `organization` - Parent organization
- `recognitionSchedules` - Monthly recognition entries

**Business Rules:**
- `invoiceId` must be unique within organization
- `contractAmount` must be positive
- `termMonths` = months between startDate and endDate
- `monthlyRecognition` = contractAmount ÷ termMonths (straight-line)
- Status automatically changes to "completed" when endDate passes

### RecognitionSchedule

**Purpose:** Individual monthly recognition entries (the "waterfall").

**Key Fields:**
```typescript
RecognitionSchedule {
  id                 String   @id @default(uuid())
  contractId         String
  organizationId     String   // Denormalized for RLS performance
  recognitionMonth   DateTime @db.Date // First day of month
  recognitionAmount  Decimal  @db.Decimal(12, 2)
  journalEntryId     String?  // QuickBooks JE ID
  posted             Boolean  @default(false)
  postedAt           DateTime?
  postedBy           String?  // User ID
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@unique([contractId, recognitionMonth])
}
```

**Relationships:**
- `contract` - Parent contract
- `organization` - Parent organization (denormalized)

**Business Rules:**
- One schedule entry per contract per month
- `recognitionMonth` must be first day of month
- Cannot modify after `posted = true`
- Must track audit trail (who posted, when)

### ImportLog

**Purpose:** Audit trail for CSV imports.

**Key Fields:**
```typescript
ImportLog {
  id             String   @id @default(uuid())
  organizationId String
  importedBy     String   // User ID
  filename       String
  rowsProcessed  Int
  rowsSucceeded  Int
  rowsFailed     Int
  errorDetails   Json?    // Array of errors
  createdAt      DateTime @default(now())
}
```

**Business Rules:**
- Create one log entry per import
- Store detailed error information for debugging
- Never delete (immutable audit trail)

## Row Level Security (RLS)

**Core Principle:** Users can only access data in organizations that belong to their account.

### Why RLS?

- **Database-level enforcement** - Cannot be bypassed by application bugs
- **Automatic filtering** - No manual WHERE clauses needed
- **Security safety net** - Catches auth mistakes
- **Cascading access** - Foreign key relationships enforce access

### RLS Policy Patterns

**Organizations Table:**
```sql
CREATE POLICY "Users access their account's organizations"
ON organizations
FOR ALL
USING (
  account_id IN (
    SELECT account_id
    FROM account_users
    WHERE user_id = auth.uid()
  )
);
```

**Contracts Table:**
```sql
CREATE POLICY "Users access their organizations' contracts"
ON contracts
FOR ALL
USING (
  organization_id IN (
    SELECT id FROM organizations
    -- RLS on organizations table handles access check
  )
);
```

**Recognition Schedules Table:**
```sql
CREATE POLICY "Users access their organizations' schedules"
ON recognition_schedules
FOR ALL
USING (
  organization_id IN (
    SELECT id FROM organizations
  )
);
```

**How Cascading Works:**
1. User tries to query contracts
2. RLS checks: Is contract's organization_id in accessible organizations?
3. To check organizations, RLS on organizations table runs
4. Organizations RLS checks: Does user's account own this organization?
5. Access granted only if full chain passes

### Denormalization for Performance

Notice `organizationId` is denormalized in `RecognitionSchedule`:

```typescript
RecognitionSchedule {
  contractId     String
  organizationId String  // Denormalized from contract.organizationId
}
```

**Why?**
- RLS can check `organization_id` directly without joining through `contracts`
- Faster queries, simpler RLS policies
- Trade-off: Slight data duplication for security performance

## Supabase Client Patterns

### Server vs Browser Client

**Server Client** (`lib/supabase/server.ts`):
- Use in Server Components, API routes, Server Actions
- Has service role key (bypasses RLS if needed)
- Accesses user session via cookies

**Browser Client** (`lib/supabase/client.ts`):
- Use in Client Components ("use client")
- Never has service role key
- Always subject to RLS
- Accesses user session from browser storage

### When to Use Which?

| Context | Client Type | Why |
|---------|-------------|-----|
| Server Component | Server | Data fetching, no user interaction |
| API Route | Server | Backend logic, auth checks |
| Server Action | Server | Form submissions, mutations |
| Client Component | Browser | Interactive UI, real-time subscriptions |

**Resource File:** See `resources/supabase-client-patterns.md` for detailed examples.

## Prisma Patterns

### Basic Query Pattern

```typescript
import { prisma } from '@/lib/db'

// Fetch user's organizations
const organizations = await prisma.organization.findMany({
  where: {
    accountId: {
      in: userAccountIds  // From AccountUser join
    }
  },
  include: {
    contracts: true
  }
})
```

### Multi-Tenant Query Pattern

**Always filter by account/organization:**

```typescript
// Get contracts for specific organization
const contracts = await prisma.contract.findMany({
  where: {
    organizationId: orgId,
    organization: {
      accountId: {
        in: userAccountIds  // Verify user has access
      }
    }
  }
})
```

**Never query without tenant filter:**
```typescript
// ❌ BAD - No tenant filter
const contracts = await prisma.contract.findMany()

// ✅ GOOD - Always filter by organization/account
const contracts = await prisma.contract.findMany({
  where: {
    organizationId: orgId
  }
})
```

### Transactions for Multi-Step Operations

```typescript
await prisma.$transaction(async (tx) => {
  // Create contract
  const contract = await tx.contract.create({
    data: {
      organizationId,
      invoiceId,
      contractAmount,
      startDate,
      endDate,
      termMonths,
      monthlyRecognition
    }
  })

  // Create recognition schedules
  const schedules = generateSchedules(contract)
  await tx.recognitionSchedule.createMany({
    data: schedules
  })
})
```

**Resource File:** See `resources/prisma-schema-patterns.md` for complete schema examples.

## Migrations

### Creating Migrations

```bash
# Create migration file
npx prisma migrate dev --name add_import_log_table

# Apply migrations to production
npx prisma migrate deploy

# Generate Prisma Client (after schema changes)
npx prisma generate
```

### Migration Best Practices

1. **Always create migrations for schema changes** - Never edit database directly
2. **Test migrations locally first** - Run on dev database before production
3. **One logical change per migration** - Easier to rollback if needed
4. **Name migrations descriptively** - `add_quickbooks_fields`, not `update_schema`
5. **Include RLS policies** - Create SQL migrations for RLS changes

**Resource File:** See `resources/migrations-guide.md` for detailed migration workflow.

## Common Patterns

### Get User's Organizations

```typescript
async function getUserOrganizations(userId: string) {
  return await prisma.organization.findMany({
    where: {
      account: {
        accountUsers: {
          some: {
            userId: userId
          }
        }
      }
    },
    orderBy: {
      name: 'asc'
    }
  })
}
```

### Check Organization Access

```typescript
async function canAccessOrganization(userId: string, organizationId: string): Promise<boolean> {
  const org = await prisma.organization.findFirst({
    where: {
      id: organizationId,
      account: {
        accountUsers: {
          some: {
            userId: userId
          }
        }
      }
    }
  })

  return !!org
}
```

### Get User Role in Account

```typescript
async function getUserRole(userId: string, accountId: string): Promise<string | null> {
  const accountUser = await prisma.accountUser.findUnique({
    where: {
      accountId_userId: {
        accountId,
        userId
      }
    },
    select: {
      role: true
    }
  })

  return accountUser?.role || null
}
```

## Resource Files

For detailed implementations, see:

- **`resources/prisma-schema-patterns.md`** - Complete Prisma schema, relationships, indexes
- **`resources/rls-policies.md`** - Detailed RLS policy examples and explanations
- **`resources/supabase-client-patterns.md`** - Server vs client usage, auth patterns
- **`resources/migrations-guide.md`** - Migration workflow, best practices, troubleshooting

## Best Practices

**Always:**
- Use RLS policies for all tables with sensitive data
- Filter queries by account/organization
- Use transactions for multi-step operations
- Use Decimal type for monetary values
- Index foreign keys and frequently queried fields

**Never:**
- Query without tenant filters (organization/account)
- Bypass RLS in application code
- Use floating-point types for money (use Decimal)
- Delete audit trail data (ImportLog, posted schedules)
- Allow editing posted recognition schedules
