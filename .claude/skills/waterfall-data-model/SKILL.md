# Waterfall Data Model

**Domain Skill** - Database schema, multi-tenancy, RLS policies, Supabase patterns

## Overview

This skill covers Waterfall's multi-tenant data model, Row Level Security (RLS) policies, Supabase client usage, and SQL migrations.

**When to use this skill:**
- Creating or modifying database schema
- Writing Supabase queries
- Implementing RLS policies
- Working with Supabase client (server/browser/admin)
- Managing SQL migrations
- Multi-tenant data access patterns

**Tech Stack:**
- **Database:** Supabase (PostgreSQL)
- **ORM:** None (Direct Supabase client queries)
- **Migrations:** SQL files in `supabase/migrations/`
- **Types:** Auto-generated from database via Supabase CLI

## Multi-Tenant Architecture

### Three-Tier Hierarchy

```
User ←→ AccountUser ←→ Account (Tenant)
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
   - Users are global entities (stored in `public.users`)
   - Links to Supabase Auth (`auth.users`)
   - AccountUser join table links users to accounts with roles

## Core Entities

### Account (Tenant)

**Purpose:** The billing entity. One subscription, one team.

**SQL Schema:**
```sql
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('company', 'firm')),
  subscription_tier TEXT NOT NULL DEFAULT 'free',
  subscription_status TEXT NOT NULL DEFAULT 'trial',
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**TypeScript Type:**
```typescript
type Account = Database['public']['Tables']['accounts']['Row']
```

**Relationships:**
- `account_users` → Team members (via AccountUser join table)
- `organizations` → Client organizations

**Business Rules:**
- Free tier: 1 user, 1 organization
- Starter tier: 3 users, 5 organizations
- Pro tier: 10 users, 50 organizations

### User

**Purpose:** Individual person who can belong to multiple accounts.

**SQL Schema:**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**TypeScript Type:**
```typescript
type User = Database['public']['Tables']['users']['Row']
```

**Relationships:**
- `id` → References `auth.users(id)` (Supabase Auth)
- `account_users` → Account memberships

**Business Rules:**
- Email must be unique globally
- ID comes from Supabase Auth (`auth.uid()`)
- Users can be in multiple accounts

### AccountUser (Join Table)

**Purpose:** Links users to accounts with roles.

**SQL Schema:**
```sql
CREATE TABLE account_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, user_id)
);
```

**Roles:**
- `owner` - Full account control, billing, delete account
- `admin` - Manage team, manage organizations, all member permissions
- `member` - Manage contracts, post to QuickBooks, view dashboards

### Organization

**Purpose:** Client business entity with its own QuickBooks connection.

**SQL Schema:**
```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT,
  quickbooks_realm_id TEXT UNIQUE,
  quickbooks_access_token TEXT,
  quickbooks_refresh_token TEXT,
  quickbooks_expires_at TIMESTAMPTZ,
  account_mapping JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**TypeScript Type:**
```typescript
type Organization = Database['public']['Tables']['organizations']['Row']

// Account mapping structure
type AccountMapping = {
  deferredRevenueAccountId: string
  revenueAccountId: string
}
```

**Business Rules:**
- Each organization has ONE QuickBooks connection
- QuickBooks realm_id must be unique across all organizations
- Account mapping stored as JSONB

### Contract

**Purpose:** Customer contract requiring revenue recognition.

**SQL Schema:**
```sql
CREATE TABLE contracts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  invoice_id TEXT NOT NULL,
  customer_name TEXT,
  description TEXT,
  contract_amount DECIMAL(12,2) NOT NULL CHECK (contract_amount > 0),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  term_months INTEGER NOT NULL CHECK (term_months > 0),
  monthly_recognition DECIMAL(12,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(organization_id, invoice_id)
);
```

**TypeScript Type:**
```typescript
type Contract = Database['public']['Tables']['contracts']['Row']
```

**Business Rules:**
- `invoice_id` must be unique within organization
- `monthly_recognition` = `contract_amount` / `term_months`
- Status auto-changes to 'completed' when `end_date` passes

### Recognition Schedule

**Purpose:** Individual monthly recognition entries (the "waterfall").

**SQL Schema:**
```sql
CREATE TABLE recognition_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  recognition_month DATE NOT NULL,
  recognition_amount DECIMAL(12,2) NOT NULL,
  journal_entry_id TEXT,
  posted BOOLEAN NOT NULL DEFAULT false,
  posted_at TIMESTAMPTZ,
  posted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(contract_id, recognition_month)
);
```

**TypeScript Type:**
```typescript
type RecognitionSchedule = Database['public']['Tables']['recognition_schedules']['Row']
```

**Business Rules:**
- One schedule entry per contract per month
- `recognition_month` must be first day of month
- Cannot modify after `posted = true`
- Track audit trail (who posted, when)

## Querying with Supabase Client

### Basic Queries

**SELECT:**
```typescript
import { createClient } from '@/lib/supabase/server'

// Get all contracts for an organization
const supabase = await createClient()
const { data: contracts, error } = await supabase
  .from('contracts')
  .select('*')
  .eq('organization_id', organizationId)
  .order('start_date', { ascending: false })

if (error) throw error
```

**INSERT:**
```typescript
const { data: contract, error } = await supabase
  .from('contracts')
  .insert({
    organization_id: organizationId,
    invoice_id: 'INV-001',
    contract_amount: 12000,
    start_date: '2025-01-01',
    end_date: '2025-12-31',
    term_months: 12,
    monthly_recognition: 1000
  })
  .select()
  .single()

if (error) throw error
```

**UPDATE:**
```typescript
const { data: updated, error } = await supabase
  .from('contracts')
  .update({ status: 'completed' })
  .eq('id', contractId)
  .select()
  .single()

if (error) throw error
```

**DELETE:**
```typescript
const { error } = await supabase
  .from('contracts')
  .delete()
  .eq('id', contractId)

if (error) throw error
```

### Joins (Foreign Key Expansion)

**Basic Join:**
```typescript
const { data, error } = await supabase
  .from('contracts')
  .select(`
    *,
    organization:organizations(id, name)
  `)
  .eq('organization_id', organizationId)
```

**Nested Joins:**
```typescript
const { data, error } = await supabase
  .from('organizations')
  .select(`
    *,
    account:accounts(
      id,
      name,
      account_type
    ),
    contracts(
      id,
      invoice_id,
      contract_amount,
      recognition_schedules(
        id,
        recognition_month,
        recognition_amount,
        posted
      )
    )
  `)
  .eq('id', organizationId)
  .single()
```

### Aggregations

**Count:**
```typescript
const { count, error } = await supabase
  .from('contracts')
  .select('*', { count: 'exact', head: true })
  .eq('organization_id', organizationId)
  .eq('status', 'active')
```

**Sum (using PostgreSQL function):**
```typescript
// Create function in migration:
// CREATE FUNCTION get_total_deferred_revenue(org_id UUID)
// RETURNS DECIMAL AS $$
//   SELECT SUM(recognition_amount)
//   FROM recognition_schedules
//   WHERE organization_id = org_id AND posted = false
// $$ LANGUAGE SQL;

const { data: total, error } = await supabase
  .rpc('get_total_deferred_revenue', { org_id: organizationId })
```

### Filters

```typescript
// Multiple conditions
const { data, error } = await supabase
  .from('contracts')
  .select('*')
  .eq('organization_id', organizationId)
  .eq('status', 'active')
  .gte('end_date', new Date().toISOString())
  .limit(50)

// OR conditions
const { data, error } = await supabase
  .from('contracts')
  .select('*')
  .or('status.eq.active,status.eq.completed')

// NOT
const { data, error } = await supabase
  .from('contracts')
  .select('*')
  .not('status', 'eq', 'cancelled')

// IN
const { data, error } = await supabase
  .from('contracts')
  .select('*')
  .in('status', ['active', 'completed'])
```

## Row Level Security (RLS)

### Core Principle

Users can only access data in organizations that belong to their account.

### How RLS Works

1. **Enabled on all tables** - Database enforces access control
2. **Uses auth.uid()** - Current user's ID from Supabase Auth
3. **Cascading policies** - Organizations check accounts, contracts check organizations
4. **Automatic filtering** - Queries automatically filtered by RLS

### Example Policy

**Organizations Table:**
```sql
CREATE POLICY "Users can view their account's organizations"
  ON organizations FOR SELECT
  USING (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );
```

**Cascading Policy (Contracts):**
```sql
CREATE POLICY "Users can view their organizations' contracts"
  ON contracts FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM organizations
      -- RLS on organizations table handles access check
    )
  );
```

### Testing RLS

**In Supabase SQL Editor:**
```sql
-- Set user context
SET LOCAL jwt.claims.sub = 'user-uuid-here';

-- Now queries run as that user
SELECT * FROM organizations; -- Only shows accessible orgs
```

### Bypassing RLS (Admin Operations)

Use the admin client (service role key):

```typescript
import { createAdminClient } from '@/lib/supabase/admin'

const supabase = createAdminClient()

// This query bypasses RLS - use carefully!
const { data, error } = await supabase
  .from('organizations')
  .select('*')
```

**⚠️ WARNING:** Service role key has FULL access. Only use in trusted server code.

## Migration Patterns

### File Naming

Use timestamp-based naming:
```
YYYYMMDDHHMMSS_description.sql
```

Example:
```
20241030000001_initial_schema.sql
20241030000002_rls_policies.sql
20241030120000_add_user_preferences.sql
```

### Migration Structure

```sql
-- Description of what this migration does

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create tables
CREATE TABLE tablename (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- columns
);

-- Create indexes
CREATE INDEX idx_tablename_column ON tablename(column);

-- Create triggers
CREATE TRIGGER trigger_name
  BEFORE UPDATE ON tablename
  FOR EACH ROW
  EXECUTE FUNCTION function_name();

-- Add comments
COMMENT ON TABLE tablename IS 'Description';
```

### Best Practices

1. **Idempotency** - Use `IF NOT EXISTS` where possible
2. **Ordering** - Run migrations in timestamp order
3. **Atomic** - One logical change per migration
4. **Reversible** - Document how to rollback
5. **Tested** - Test in development before production

### Running Migrations

**Remote-Only Workflow:**

1. Create migration file in `supabase/migrations/`
2. Copy SQL to Supabase Dashboard → SQL Editor
3. Execute
4. Verify in Table Editor
5. Regenerate types: `npm run supabase:types`

**See:** `supabase/migrations/README.md` for detailed instructions

## Type Generation

### Generate Types

```bash
# Add SUPABASE_PROJECT_ID to .env.local
npm run supabase:types
```

This creates `src/types/supabase.ts` with auto-generated types.

### Using Generated Types

```typescript
// Import database types
import { Database } from '@/types/supabase'

// Create type helpers
export type Account = Database['public']['Tables']['accounts']['Row']
export type AccountInsert = Database['public']['Tables']['accounts']['Insert']
export type AccountUpdate = Database['public']['Tables']['accounts']['Update']

// Use in Supabase client
const supabase = createClient<Database>()
```

### Type Safety

**Queries are fully typed:**
```typescript
const { data, error } = await supabase
  .from('contracts') // ← autocomplete
  .select('*')        // ← type-checked
  .eq('status', 'active') // ← column name autocomplete, value type-checked
```

## Common Patterns

### Multi-Step Operations (No Transactions)

**Option 1: PostgreSQL Function**
```sql
CREATE OR REPLACE FUNCTION create_contract_with_schedules(...)
RETURNS UUID AS $$
BEGIN
  -- Insert contract
  -- Insert schedules
  -- All in one transaction
END;
$$ LANGUAGE plpgsql;
```

**Option 2: Manual Cleanup**
```typescript
async function createContractWithSchedules(contract, schedules) {
  const { data: newContract, error: contractError } = await supabase
    .from('contracts')
    .insert(contract)
    .select()
    .single()

  if (contractError) throw contractError

  const { error: schedulesError } = await supabase
    .from('recognition_schedules')
    .insert(schedules.map(s => ({ ...s, contract_id: newContract.id })))

  if (schedulesError) {
    // Cleanup: delete contract
    await supabase.from('contracts').delete().eq('id', newContract.id)
    throw schedulesError
  }

  return newContract
}
```

### Decimal Handling

PostgreSQL returns decimals as strings:

```typescript
import Decimal from 'decimal.js'

const { data: contract } = await supabase
  .from('contracts')
  .select('contract_amount')
  .single()

// contract.contract_amount is a string!
const amount = new Decimal(contract.contract_amount)
```

### Date Handling

Supabase returns ISO 8601 strings:

```typescript
const { data: contract } = await supabase
  .from('contracts')
  .select('start_date')
  .single()

// Parse to Date
const startDate = new Date(contract.start_date)
```

## Resource Files

For detailed patterns and examples, see:

- **supabase-schema-patterns.md** - SQL schema patterns and best practices
- **rls-policies.md** - Complete RLS policy examples
- **supabase-client-patterns.md** - Advanced Supabase client usage
- **migrations-guide.md** - Migration workflow and best practices

## Key Differences from Prisma

| Feature | Prisma | Supabase |
|---------|--------|----------|
| **Query Language** | JavaScript/TypeScript | JavaScript/TypeScript |
| **Schema** | schema.prisma file | SQL migrations |
| **Migrations** | Prisma CLI | SQL files |
| **Types** | Generated from schema | Generated from database |
| **Joins** | include/select | Foreign key expansion |
| **Transactions** | Built-in | PostgreSQL functions |
| **Error Handling** | Try/catch (throws) | Check error tuple |
| **RLS** | Application-level | Database-level |

## Summary

**Use Supabase client for:**
- All database operations
- Type-safe queries
- RLS enforcement
- Real-time subscriptions (future)

**Use SQL migrations for:**
- Schema changes
- Index creation
- RLS policy updates
- Database functions

**Use admin client for:**
- Signup flow (bypass RLS)
- System operations
- Bulk data operations

**Always:**
- Check error after queries
- Use TypeScript types
- Let RLS filter data
- Regenerate types after migrations
