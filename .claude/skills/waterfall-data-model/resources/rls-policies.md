# Row Level Security (RLS) Policies

Complete guide to implementing RLS policies for Waterfall's multi-tenant architecture.

## Why RLS?

**Database-Level Security:**
- Cannot be bypassed by application bugs
- Enforced automatically by PostgreSQL
- No manual WHERE clauses needed
- Catches authentication mistakes

**Multi-Tenancy:**
- Users only see their account's data
- Organization-level data isolation
- Automatic filtering on all queries

## Core Principle

**Users can only access data in organizations that belong to their account.**

The access chain:
```
User → AccountUser → Account → Organization → Contract → RecognitionSchedule
```

## Enabling RLS

RLS must be enabled on each table:

```sql
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE recognition_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;
```

**Important:** Once RLS is enabled, NO rows are accessible by default. You must create policies to grant access.

## Policy Structure

```sql
CREATE POLICY "policy_name"
ON table_name
FOR operation  -- ALL, SELECT, INSERT, UPDATE, DELETE
USING (condition_for_select)
WITH CHECK (condition_for_insert_update);
```

**USING:** Applied to SELECT, UPDATE, DELETE (what rows can be read/modified)
**WITH CHECK:** Applied to INSERT, UPDATE (what rows can be created/modified to)

## User Table Policies

Users can see all users (needed for team invites, user lookups):

```sql
CREATE POLICY "Users are viewable by authenticated users"
ON users
FOR SELECT
USING (auth.uid() IS NOT NULL);
```

Users can update their own profile:

```sql
CREATE POLICY "Users can update own profile"
ON users
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
```

## Account Table Policies

Users can access accounts they belong to:

```sql
CREATE POLICY "Users access their accounts"
ON accounts
FOR SELECT
USING (
  id IN (
    SELECT account_id
    FROM account_users
    WHERE user_id = auth.uid()
  )
);
```

Only owners can update account settings:

```sql
CREATE POLICY "Account owners can update settings"
ON accounts
FOR UPDATE
USING (
  id IN (
    SELECT account_id
    FROM account_users
    WHERE user_id = auth.uid()
    AND role = 'owner'
  )
)
WITH CHECK (
  id IN (
    SELECT account_id
    FROM account_users
    WHERE user_id = auth.uid()
    AND role = 'owner'
  )
);
```

## AccountUser Table Policies

Users can see team members in their accounts:

```sql
CREATE POLICY "Users can view team members"
ON account_users
FOR SELECT
USING (
  account_id IN (
    SELECT account_id
    FROM account_users
    WHERE user_id = auth.uid()
  )
);
```

Owners and admins can add team members:

```sql
CREATE POLICY "Owners and admins can add team members"
ON account_users
FOR INSERT
WITH CHECK (
  account_id IN (
    SELECT account_id
    FROM account_users
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);
```

Owners and admins can remove team members:

```sql
CREATE POLICY "Owners and admins can remove team members"
ON account_users
FOR DELETE
USING (
  account_id IN (
    SELECT account_id
    FROM account_users
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);
```

## Organization Table Policies

Users can access organizations in their accounts:

```sql
CREATE POLICY "Users access their account's organizations"
ON organizations
FOR SELECT
USING (
  account_id IN (
    SELECT account_id
    FROM account_users
    WHERE user_id = auth.uid()
  )
);
```

Owners and admins can create organizations:

```sql
CREATE POLICY "Owners and admins can create organizations"
ON organizations
FOR INSERT
WITH CHECK (
  account_id IN (
    SELECT account_id
    FROM account_users
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);
```

Owners and admins can update organizations:

```sql
CREATE POLICY "Owners and admins can update organizations"
ON organizations
FOR UPDATE
USING (
  account_id IN (
    SELECT account_id
    FROM account_users
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  account_id IN (
    SELECT account_id
    FROM account_users
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);
```

Owners and admins can delete organizations:

```sql
CREATE POLICY "Owners and admins can delete organizations"
ON organizations
FOR DELETE
USING (
  account_id IN (
    SELECT account_id
    FROM account_users
    WHERE user_id = auth.uid()
    AND role IN ('owner', 'admin')
  )
);
```

## Contract Table Policies

Users can access contracts in their organizations (cascading access):

```sql
CREATE POLICY "Users access their organizations' contracts"
ON contracts
FOR SELECT
USING (
  organization_id IN (
    SELECT id FROM organizations
    -- RLS on organizations table handles the account check
  )
);
```

All team members can create contracts:

```sql
CREATE POLICY "Team members can create contracts"
ON contracts
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT id FROM organizations
    -- RLS on organizations ensures user has access
  )
);
```

All team members can update contracts:

```sql
CREATE POLICY "Team members can update contracts"
ON contracts
FOR UPDATE
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

All team members can delete contracts (app logic prevents if posted):

```sql
CREATE POLICY "Team members can delete contracts"
ON contracts
FOR DELETE
USING (
  organization_id IN (
    SELECT id FROM organizations
  )
);
```

## RecognitionSchedule Table Policies

Users can access schedules in their organizations:

```sql
CREATE POLICY "Users access their organizations' schedules"
ON recognition_schedules
FOR SELECT
USING (
  organization_id IN (
    SELECT id FROM organizations
  )
);
```

**Note:** `organization_id` is denormalized here for performance. Without it, we'd need to join through contracts:

```sql
-- Slower alternative (requires join)
contract_id IN (
  SELECT id FROM contracts
  WHERE organization_id IN (
    SELECT id FROM organizations
  )
)
```

All team members can create schedules:

```sql
CREATE POLICY "Team members can create schedules"
ON recognition_schedules
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT id FROM organizations
  )
);
```

All team members can update schedules:

```sql
CREATE POLICY "Team members can update schedules"
ON recognition_schedules
FOR UPDATE
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

## ImportLog Table Policies

Users can access import logs in their organizations:

```sql
CREATE POLICY "Users access their organizations' import logs"
ON import_logs
FOR SELECT
USING (
  organization_id IN (
    SELECT id FROM organizations
  )
);
```

All team members can create import logs:

```sql
CREATE POLICY "Team members can create import logs"
ON import_logs
FOR INSERT
WITH CHECK (
  organization_id IN (
    SELECT id FROM organizations
  )
);
```

## Testing RLS Policies

### Test as Specific User

```sql
-- Set user context
SET LOCAL role TO authenticated;
SET LOCAL request.jwt.claims TO '{"sub": "user-uuid-here"}';

-- Run queries
SELECT * FROM organizations;
SELECT * FROM contracts WHERE organization_id = 'org-uuid';

-- Reset
RESET role;
```

### Test Policy Coverage

```sql
-- Check if RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- View policies on a table
SELECT *
FROM pg_policies
WHERE tablename = 'organizations';
```

### Test Unauthorized Access

```sql
-- Should return empty (user not in account)
SET LOCAL request.jwt.claims TO '{"sub": "unauthorized-user-uuid"}';
SELECT * FROM organizations WHERE id = 'some-org-id';
-- Expected: No rows returned
```

## Bypassing RLS (Service Role)

Sometimes you need to bypass RLS (e.g., signup flow, admin tasks):

```typescript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role bypasses RLS
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// This query bypasses RLS
const { data } = await supabase
  .from('organizations')
  .select('*')
```

**⚠️ Use service role sparingly:**
- Only in trusted server-side code
- Never expose service role key to browser
- Document why RLS bypass is needed
- Add application-level checks

## Common Pitfalls

### 1. Forgetting to Enable RLS

```sql
-- ❌ Table has no RLS, all data exposed!
CREATE TABLE organizations (...);

-- ✅ Always enable RLS
CREATE TABLE organizations (...);
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
```

### 2. Too Permissive Policies

```sql
-- ❌ BAD - All authenticated users see all data
CREATE POLICY "Allow all" ON organizations
FOR SELECT USING (auth.uid() IS NOT NULL);

-- ✅ GOOD - Only account members see data
CREATE POLICY "Account access" ON organizations
FOR SELECT USING (
  account_id IN (
    SELECT account_id FROM account_users WHERE user_id = auth.uid()
  )
);
```

### 3. Missing WITH CHECK Clause

```sql
-- ❌ BAD - Can read but not create
CREATE POLICY "Users access orgs" ON organizations
FOR ALL USING (account_id IN (...));

-- ✅ GOOD - Can both read and create
CREATE POLICY "Users access orgs" ON organizations
FOR ALL
USING (account_id IN (...))
WITH CHECK (account_id IN (...));
```

### 4. Not Testing Policies

Always test:
- User can access their own data ✓
- User CANNOT access other accounts' data ✓
- Role-based access works (owner vs member) ✓
- Cascading access works (org → contract → schedule) ✓

## Migration Template

Create RLS policies via Prisma migration:

```sql
-- migrations/20250130_add_rls_policies.sql

-- Enable RLS
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE recognition_schedules ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "users_access_orgs"
ON organizations FOR SELECT
USING (
  account_id IN (
    SELECT account_id FROM account_users WHERE user_id = auth.uid()
  )
);

CREATE POLICY "admins_manage_orgs"
ON organizations FOR ALL
USING (
  account_id IN (
    SELECT account_id FROM account_users
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  account_id IN (
    SELECT account_id FROM account_users
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  )
);

-- Contracts policies (cascading from organizations)
CREATE POLICY "users_access_contracts"
ON contracts FOR ALL
USING (
  organization_id IN (SELECT id FROM organizations)
)
WITH CHECK (
  organization_id IN (SELECT id FROM organizations)
);

-- Recognition schedules policies
CREATE POLICY "users_access_schedules"
ON recognition_schedules FOR ALL
USING (
  organization_id IN (SELECT id FROM organizations)
)
WITH CHECK (
  organization_id IN (SELECT id FROM organizations)
);
```

## Monitoring RLS

Log RLS denials for debugging:

```sql
-- Enable logging (in postgresql.conf or via Supabase dashboard)
log_statement = 'all'
log_duration = on

-- View recent queries that failed RLS
SELECT * FROM pg_stat_activity
WHERE state = 'active' AND query LIKE '%organizations%';
```

## Best Practices

1. **Enable RLS on all tables** - Default deny, explicit allow
2. **Test policies thoroughly** - Automated tests for access control
3. **Document bypass reasons** - When using service role
4. **Use cascading access** - Leverage foreign keys (org → contract)
5. **Denormalize for performance** - Add `organization_id` to child tables
6. **Monitor policy changes** - Code review RLS migrations carefully
7. **Keep policies simple** - Complex policies are hard to audit
