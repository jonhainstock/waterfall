# Prisma Schema Patterns

Complete Prisma schema for Waterfall with relationships, indexes, and constraints.

## Full Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================================
// USER & ACCOUNT MANAGEMENT
// ============================================================================

model User {
  id           String        @id // From Supabase Auth (auth.uid())
  email        String        @unique
  name         String
  avatarUrl    String?
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  accountUsers AccountUser[]

  @@map("users")
}

model Account {
  id                 String   @id @default(uuid())
  name               String
  accountType        String   // "company" or "firm"
  subscriptionTier   String   @default("free") // "free", "starter", "pro"
  subscriptionStatus String   @default("trial") // "trial", "active", "cancelled"
  trialEndsAt        DateTime?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  accountUsers AccountUser[]
  organizations Organization[]

  @@map("accounts")
}

model AccountUser {
  id        String   @id @default(uuid())
  accountId String
  userId    String
  role      String   // "owner", "admin", "member"
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  account Account @relation(fields: [accountId], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([accountId, userId])
  @@index([userId])
  @@index([accountId])
  @@map("account_users")
}

// ============================================================================
// ORGANIZATIONS & CONTRACTS
// ============================================================================

model Organization {
  id                      String    @id @default(uuid())
  accountId               String
  name                    String
  slug                    String?   @unique
  quickbooksRealmId       String?   @unique
  quickbooksAccessToken   String?   // Encrypted
  quickbooksRefreshToken  String?   // Encrypted
  quickbooksExpiresAt     DateTime?
  quickbooksConnectedAt   DateTime?
  accountMapping          Json?     // { deferredRevenueAccountId, revenueAccountId }
  settings                Json?
  isActive                Boolean   @default(true)
  createdAt               DateTime  @default(now())
  updatedAt               DateTime  @updatedAt

  account              Account               @relation(fields: [accountId], references: [id], onDelete: Cascade)
  contracts            Contract[]
  recognitionSchedules RecognitionSchedule[]
  importLogs           ImportLog[]

  @@index([accountId])
  @@index([quickbooksRealmId])
  @@map("organizations")
}

model Contract {
  id                 String   @id @default(uuid())
  organizationId     String
  invoiceId          String   // User's invoice identifier (not necessarily numeric)
  customerName       String?
  description        String?
  contractAmount     Decimal  @db.Decimal(12, 2)
  startDate          DateTime @db.Date
  endDate            DateTime @db.Date
  termMonths         Int
  monthlyRecognition Decimal  @db.Decimal(12, 2)
  status             String   @default("active") // "active", "completed", "cancelled"
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  organization         Organization          @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  recognitionSchedules RecognitionSchedule[]

  @@unique([organizationId, invoiceId])
  @@index([organizationId])
  @@index([status])
  @@map("contracts")
}

model RecognitionSchedule {
  id                String    @id @default(uuid())
  contractId        String
  organizationId    String    // Denormalized for RLS performance
  recognitionMonth  DateTime  @db.Date // First day of month
  recognitionAmount Decimal   @db.Decimal(12, 2)
  journalEntryId    String?   // QuickBooks JE ID
  posted            Boolean   @default(false)
  postedAt          DateTime?
  postedBy          String?   // User ID
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt

  contract     Contract     @relation(fields: [contractId], references: [id], onDelete: Cascade)
  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@unique([contractId, recognitionMonth])
  @@index([organizationId])
  @@index([recognitionMonth])
  @@index([posted])
  @@map("recognition_schedules")
}

// ============================================================================
// AUDIT & LOGGING
// ============================================================================

model ImportLog {
  id             String   @id @default(uuid())
  organizationId String
  importedBy     String   // User ID
  filename       String
  rowsProcessed  Int
  rowsSucceeded  Int
  rowsFailed     Int
  errorDetails   Json?    // Array of error objects
  createdAt      DateTime @default(now())

  organization Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)

  @@index([organizationId])
  @@index([createdAt])
  @@map("import_logs")
}
```

## Key Design Decisions

### 1. Cascade Deletes

All foreign keys use `onDelete: Cascade`:

```prisma
account Account @relation(fields: [accountId], references: [id], onDelete: Cascade)
```

**Why?**
- Delete account → deletes all organizations, contracts, schedules
- Delete organization → deletes all contracts, schedules
- Delete contract → deletes all schedules
- Ensures referential integrity without orphaned records

### 2. Decimal Types for Money

```prisma
contractAmount     Decimal  @db.Decimal(12, 2)
monthlyRecognition Decimal  @db.Decimal(12, 2)
recognitionAmount  Decimal  @db.Decimal(12, 2)
```

**Why?**
- Exact precision (no floating-point errors)
- 12 digits total, 2 after decimal point
- Supports contracts up to $9,999,999,999.99

**In TypeScript:**
```typescript
import Decimal from 'decimal.js'

const amount = new Decimal(contract.contractAmount.toString())
const monthly = amount.dividedBy(contract.termMonths)
```

### 3. Date Types

```prisma
startDate          DateTime @db.Date
endDate            DateTime @db.Date
recognitionMonth   DateTime @db.Date
```

**Why `@db.Date` instead of `DateTime`?**
- Stores only date (no time component)
- Avoids timezone issues
- Consistent "first day of month" storage

**In TypeScript:**
```typescript
// Always normalize to first day of month
const recognitionMonth = new Date(year, month, 1)
```

### 4. Indexes

**Foreign Keys:**
```prisma
@@index([accountId])
@@index([organizationId])
@@index([contractId])
```

**Lookup Fields:**
```prisma
@@index([quickbooksRealmId])
@@index([status])
@@index([posted])
```

**Date Fields:**
```prisma
@@index([recognitionMonth])
@@index([createdAt])
```

**Why?**
- Speed up JOIN queries
- Speed up WHERE filters
- Essential for multi-tenant queries

### 5. Unique Constraints

```prisma
@@unique([organizationId, invoiceId])  // Contract
@@unique([contractId, recognitionMonth])  // RecognitionSchedule
@@unique([accountId, userId])  // AccountUser
```

**Why?**
- Prevent duplicate contracts per organization
- Prevent duplicate schedules per month
- Prevent duplicate team memberships

## Common Query Patterns

### Get All Contracts with Schedules

```typescript
const contracts = await prisma.contract.findMany({
  where: {
    organizationId: orgId
  },
  include: {
    recognitionSchedules: {
      orderBy: {
        recognitionMonth: 'asc'
      }
    }
  }
})
```

### Get Unposted Schedules for Month

```typescript
const schedules = await prisma.recognitionSchedule.findMany({
  where: {
    organizationId: orgId,
    recognitionMonth: new Date(year, month, 1),
    posted: false
  },
  include: {
    contract: true
  }
})
```

### Get Organizations with Contract Count

```typescript
const orgs = await prisma.organization.findMany({
  where: {
    accountId: accountId
  },
  include: {
    _count: {
      select: {
        contracts: true
      }
    }
  }
})
```

### Aggregate Recognition Amount

```typescript
const total = await prisma.recognitionSchedule.aggregate({
  where: {
    organizationId: orgId,
    recognitionMonth: {
      gte: new Date(2025, 0, 1),
      lte: new Date(2025, 11, 1)
    }
  },
  _sum: {
    recognitionAmount: true
  }
})

console.log(total._sum.recognitionAmount) // Decimal
```

## Type Safety Patterns

### Prisma Generated Types

```typescript
import { Prisma } from '@prisma/client'

// Use generated types for type safety
type ContractWithSchedules = Prisma.ContractGetPayload<{
  include: {
    recognitionSchedules: true
  }
}>

type OrganizationWithContracts = Prisma.OrganizationGetPayload<{
  include: {
    contracts: {
      include: {
        recognitionSchedules: true
      }
    }
  }
}>
```

### Custom Input Types

```typescript
type CreateContractInput = {
  organizationId: string
  invoiceId: string
  customerName?: string
  description?: string
  contractAmount: Decimal
  startDate: Date
  endDate: Date
  termMonths: number
  monthlyRecognition: Decimal
}

async function createContract(data: CreateContractInput) {
  return await prisma.contract.create({
    data: {
      ...data,
      contractAmount: data.contractAmount.toFixed(2), // Prisma accepts string
      monthlyRecognition: data.monthlyRecognition.toFixed(2)
    }
  })
}
```

## Performance Optimization

### Select Only Needed Fields

```typescript
// ❌ BAD - Fetches all fields
const contracts = await prisma.contract.findMany()

// ✅ GOOD - Only fetch needed fields
const contracts = await prisma.contract.findMany({
  select: {
    id: true,
    invoiceId: true,
    customerName: true,
    contractAmount: true
  }
})
```

### Pagination

```typescript
const PAGE_SIZE = 50

const contracts = await prisma.contract.findMany({
  where: {
    organizationId: orgId
  },
  skip: page * PAGE_SIZE,
  take: PAGE_SIZE,
  orderBy: {
    createdAt: 'desc'
  }
})
```

### Connection Pooling

```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Why?**
- Prevents creating multiple Prisma clients in development (Next.js hot reload)
- Connection pooling is automatic
- Logs queries in development for debugging
