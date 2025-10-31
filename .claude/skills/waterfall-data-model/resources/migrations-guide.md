# Database Migrations Guide

Complete workflow for managing database schema changes with Prisma and Supabase.

## Migration Workflow

### 1. Development Flow

**Make Schema Changes:**
```prisma
// prisma/schema.prisma

model Contract {
  id        String @id @default(uuid())
  // ... existing fields

  // NEW: Add notes field
  notes     String?
}
```

**Create Migration:**
```bash
npx prisma migrate dev --name add_contract_notes
```

**What Happens:**
1. Prisma analyzes schema changes
2. Generates SQL migration file
3. Applies migration to dev database
4. Regenerates Prisma Client

**Generated Migration File:**
```sql
-- migrations/20250130120000_add_contract_notes/migration.sql

ALTER TABLE "contracts" ADD COLUMN "notes" TEXT;
```

### 2. Production Flow

**Deploy to Production:**
```bash
npx prisma migrate deploy
```

**What Happens:**
1. Applies all pending migrations
2. Updates `_prisma_migrations` table
3. Does NOT regenerate Prisma Client (build step handles this)

**In Vercel/Production:**
```json
// package.json
{
  "scripts": {
    "build": "prisma generate && next build",
    "postinstall": "prisma generate"
  }
}
```

## Common Migration Scenarios

### Add New Table

```prisma
// prisma/schema.prisma

model Notification {
  id        String   @id @default(uuid())
  userId    String
  message   String
  read      Boolean  @default(false)
  createdAt DateTime @default(now())

  @@index([userId])
  @@map("notifications")
}
```

```bash
npx prisma migrate dev --name add_notification_table
```

### Add Column with Default

```prisma
model Organization {
  // ... existing fields

  timezone  String  @default("America/New_York")
}
```

```bash
npx prisma migrate dev --name add_organization_timezone
```

**Generated SQL:**
```sql
ALTER TABLE "organizations"
ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'America/New_York';
```

### Add Nullable Column (Safer)

```prisma
model Contract {
  // ... existing fields

  externalId  String?  // Nullable, no default needed

  @@unique([organizationId, externalId])
}
```

```bash
npx prisma migrate dev --name add_contract_external_id
```

**Why Nullable?**
- Doesn't require default value
- Doesn't lock table during migration
- Can backfill data later

### Rename Column

```prisma
model Contract {
  // Rename invoiceId → externalInvoiceId

  // externalInvoiceId  String  // ⚠️ Prisma sees this as new column!
}
```

**Manual Migration Required:**
```bash
npx prisma migrate dev --create-only --name rename_invoice_id
```

**Edit Generated Migration:**
```sql
-- Rename instead of drop + add
ALTER TABLE "contracts"
RENAME COLUMN "invoice_id" TO "external_invoice_id";
```

```bash
npx prisma migrate dev
```

### Add Foreign Key

```prisma
model RecognitionSchedule {
  // ... existing fields

  postedBy  String?
  user      User?   @relation(fields: [postedBy], references: [id])
}

model User {
  // ... existing fields

  postedSchedules  RecognitionSchedule[]
}
```

```bash
npx prisma migrate dev --name add_posted_by_user_relation
```

### Change Column Type

```prisma
model Contract {
  // Change from String to Decimal
  contractAmount  Decimal  @db.Decimal(12, 2)  // Was String before
}
```

**Manual Migration Required:**
```bash
npx prisma migrate dev --create-only --name change_amount_to_decimal
```

**Edit Migration:**
```sql
-- Cast existing data
ALTER TABLE "contracts"
ALTER COLUMN "contract_amount" TYPE DECIMAL(12,2)
USING "contract_amount"::DECIMAL(12,2);
```

### Add RLS Policies

RLS policies require custom SQL migrations.

```bash
npx prisma migrate dev --create-only --name add_contract_rls_policies
```

**Edit Migration:**
```sql
-- migrations/20250130_add_contract_rls_policies/migration.sql

-- Enable RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Allow users to view their organizations' contracts
CREATE POLICY "users_access_contracts"
ON contracts
FOR SELECT
USING (
  organization_id IN (
    SELECT id FROM organizations
  )
);

-- Allow users to manage their organizations' contracts
CREATE POLICY "users_manage_contracts"
ON contracts
FOR ALL
USING (
  organization_id IN (
    SELECT id FROM organizations
  )
)
WITH CHECK (
  organization_id IN (
    SELECT id FROM organizations
  )
);
```

```bash
npx prisma migrate dev
```

## Migration Best Practices

### 1. One Logical Change Per Migration

```bash
# ❌ BAD - Multiple unrelated changes
npx prisma migrate dev --name update_schema

# ✅ GOOD - Specific, focused changes
npx prisma migrate dev --name add_contract_notes
npx prisma migrate dev --name add_organization_timezone
```

### 2. Descriptive Names

```bash
# ❌ BAD
npx prisma migrate dev --name update
npx prisma migrate dev --name fix

# ✅ GOOD
npx prisma migrate dev --name add_posted_by_user_relation
npx prisma migrate dev --name change_amount_to_decimal
npx prisma migrate dev --name add_contract_rls_policies
```

### 3. Test Locally First

```bash
# 1. Create migration
npx prisma migrate dev --name add_new_field

# 2. Test in local development
# - Run application
# - Test affected features
# - Check data integrity

# 3. Commit migration
git add prisma/migrations
git commit -m "Add new field to contracts"

# 4. Deploy to staging
# 5. Deploy to production
```

### 4. Avoid Breaking Changes

```prisma
# ❌ BAD - Breaking change
model Contract {
  invoiceId  String  // Removed nullable, will fail on existing data
}

# ✅ GOOD - Backwards compatible
model Contract {
  invoiceId  String?  // Keep nullable initially
}

# Later: Backfill data, then make NOT NULL
```

### 5. Use Transactions for Complex Migrations

```sql
-- migrations/20250130_complex_migration/migration.sql

BEGIN;

-- Step 1: Add new column
ALTER TABLE contracts ADD COLUMN new_field TEXT;

-- Step 2: Backfill data
UPDATE contracts SET new_field = old_field WHERE old_field IS NOT NULL;

-- Step 3: Drop old column
ALTER TABLE contracts DROP COLUMN old_field;

COMMIT;
```

## Handling Migration Failures

### Reset Development Database

```bash
# ⚠️ Deletes all data!
npx prisma migrate reset

# What happens:
# 1. Drop database
# 2. Create database
# 3. Apply all migrations
# 4. Run seed script (if configured)
```

### Resolve Migration Conflicts

**Scenario:** Migration applied manually, Prisma doesn't know about it.

```bash
# Mark migration as applied (without running)
npx prisma migrate resolve --applied "20250130120000_migration_name"
```

**Scenario:** Migration failed halfway through.

```bash
# Mark migration as rolled back
npx prisma migrate resolve --rolled-back "20250130120000_migration_name"

# Fix migration file, then retry
npx prisma migrate dev
```

### Manual Migration Rollback

Prisma doesn't have automatic rollback. Manual SQL required:

```sql
-- Example: Rollback add_contract_notes migration

ALTER TABLE "contracts" DROP COLUMN "notes";

-- Mark as rolled back in Prisma
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20250130120000_add_contract_notes';
```

## Production Migration Strategy

### Zero-Downtime Migrations

**Step 1: Add Column (Nullable)**
```prisma
model Contract {
  newField  String?
}
```

**Deploy Migration:**
```bash
npx prisma migrate deploy
```

**Step 2: Deploy Application Code**
- Application writes to both old and new columns
- Application reads from new column (fallback to old)

**Step 3: Backfill Data**
```sql
UPDATE contracts SET new_field = old_field WHERE new_field IS NULL;
```

**Step 4: Make Column NOT NULL**
```prisma
model Contract {
  newField  String  // Remove nullable
}
```

**Step 5: Remove Old Column**
```prisma
model Contract {
  // old_field removed
  newField  String
}
```

### Blue-Green Deployments

1. **Blue (Current):** Production running v1 schema
2. **Green (New):** Deploy v2 with backward-compatible schema changes
3. **Migrate Data:** Run migrations on database
4. **Switch Traffic:** Route to green
5. **Cleanup:** Remove old code/columns

## Supabase-Specific Considerations

### Migration via Supabase Dashboard

Supabase provides a SQL editor for manual migrations:

1. Go to Supabase Dashboard → SQL Editor
2. Write migration SQL
3. Execute
4. ⚠️ Prisma doesn't know about this!

**Solution:** Create matching Prisma migration

```bash
# Create empty migration
npx prisma migrate dev --create-only --name manual_supabase_migration

# Leave migration.sql empty or add comment
# migrations/.../migration.sql
-- This migration was applied manually via Supabase Dashboard

# Mark as applied
npx prisma migrate resolve --applied "20250130_manual_supabase_migration"
```

### RLS Policies in Migrations

Always include RLS policy changes in migrations:

```sql
-- Enable RLS
ALTER TABLE new_table ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "policy_name" ON new_table ...;
```

### Supabase Connection Pooling

Supabase uses PgBouncer for connection pooling.

**Database URLs:**
```env
# Direct connection (for migrations)
DATABASE_URL="postgresql://user:pass@db.xxx.supabase.co:5432/postgres"

# Pooled connection (for application)
DATABASE_URL="postgresql://user:pass@db.xxx.supabase.co:6543/postgres?pgbouncer=true"
```

**For Migrations:**
```bash
# Use direct connection
DATABASE_URL="direct_url" npx prisma migrate deploy
```

## Seeding Database

```typescript
// prisma/seed.ts

import { PrismaClient } from '@prisma/client'
import Decimal from 'decimal.js'

const prisma = new PrismaClient()

async function main() {
  // Create test account
  const account = await prisma.account.create({
    data: {
      name: 'Test Account',
      accountType: 'company',
      subscriptionTier: 'pro',
      subscriptionStatus: 'active',
    },
  })

  // Create test organization
  const org = await prisma.organization.create({
    data: {
      accountId: account.id,
      name: 'Test Org',
    },
  })

  // Create test contracts
  await prisma.contract.createMany({
    data: [
      {
        organizationId: org.id,
        invoiceId: 'INV-001',
        customerName: 'Acme Corp',
        contractAmount: new Decimal(12000),
        startDate: new Date(2025, 0, 1),
        endDate: new Date(2025, 11, 31),
        termMonths: 12,
        monthlyRecognition: new Decimal(1000),
      },
    ],
  })

  console.log('Seed complete!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
```

```json
// package.json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

```bash
# Run seed
npx prisma db seed
```

## Troubleshooting

### "Migration already applied"

```bash
# Migration exists in database but not in filesystem
npx prisma migrate resolve --rolled-back "migration_name"
```

### "Migration not yet applied"

```bash
# Migration in filesystem but not in database
npx prisma migrate deploy
```

### "Migration failed"

```bash
# Check migration table
npx prisma migrate status

# View last migration
SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 1;

# Resolve and retry
npx prisma migrate resolve --rolled-back "migration_name"
npx prisma migrate dev
```

### "Schema drift detected"

```bash
# Schema in database doesn't match Prisma schema
npx prisma migrate diff --from-schema-datamodel prisma/schema.prisma --to-schema-datasource prisma/schema.prisma

# Create migration to fix drift
npx prisma migrate dev --name fix_schema_drift
```

## Quick Reference

```bash
# Create and apply migration (dev)
npx prisma migrate dev --name migration_name

# Create migration without applying (for manual edits)
npx prisma migrate dev --create-only --name migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Check migration status
npx prisma migrate status

# Reset database (dev only, deletes data!)
npx prisma migrate reset

# Mark migration as applied
npx prisma migrate resolve --applied "migration_name"

# Mark migration as rolled back
npx prisma migrate resolve --rolled-back "migration_name"

# Generate Prisma Client
npx prisma generate

# View schema in database
npx prisma db pull

# Seed database
npx prisma db seed
```
