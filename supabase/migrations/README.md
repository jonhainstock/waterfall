# Supabase Migrations

This folder contains SQL migrations for the Waterfall database schema.

## How to Run Migrations (Remote-Only)

Since you're working with remote Supabase only (no local setup), follow these steps:

### 1. Access Supabase SQL Editor

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your Waterfall project
3. Click "SQL Editor" in the left sidebar

### 2. Run Migrations in Order

Copy and paste each migration file into the SQL Editor and click "Run".

**IMPORTANT: Run in this exact order:**

#### Step 1: Initial Schema
```sql
-- Copy contents of: 20241030000001_initial_schema.sql
-- Creates all tables, indexes, and triggers
```

#### Step 2: RLS Policies
```sql
-- Copy contents of: 20241030000002_rls_policies.sql
-- Enables Row Level Security and creates policies
```

### 3. Verify Migrations

After running both migrations, verify in Supabase Dashboard:

#### Table Editor
- Go to "Table Editor"
- You should see these tables:
  - accounts
  - users
  - account_users
  - organizations
  - contracts
  - recognition_schedules
  - import_logs

#### Check RLS
- Click on any table
- Click the "⋮" menu → "View Policies"
- Verify policies exist and are enabled

### 4. Generate TypeScript Types

After migrations are complete, generate TypeScript types:

```bash
# Make sure SUPABASE_PROJECT_ID is in your .env.local
npm run supabase:types
```

This creates `src/types/supabase.ts` with auto-generated types from your database.

---

## Migration Order Reference

| File | Description | Depends On |
|------|-------------|------------|
| `20241030000001_initial_schema.sql` | Tables, indexes, triggers | None |
| `20241030000002_rls_policies.sql` | Row Level Security policies | Initial schema |

---

## Troubleshooting

### Error: "relation already exists"
- You've already run this migration
- Check "Table Editor" to see if tables exist
- If partial migration, manually drop tables and re-run

### Error: "extension uuid-ossp does not exist"
- Enable UUID extension in Supabase Dashboard → Database → Extensions
- Or run: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`

### RLS policies not working
- Verify RLS is enabled on all tables: `ALTER TABLE tablename ENABLE ROW LEVEL SECURITY;`
- Check policies exist in Table Editor → table → Policies tab

### Can't query tables after RLS setup
- This is expected! RLS restricts access
- You'll need to authenticate to query data
- Or use service role key for admin operations

---

## Future Migrations

When adding new migrations:

1. Create new file: `YYYYMMDDHHMMSS_description.sql`
2. Use timestamp format for ordering
3. Document in this README
4. Run in Supabase Dashboard SQL Editor
5. Regenerate types: `npm run supabase:types`
