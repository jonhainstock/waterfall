# Supabase Migrations Guide

Best practices for managing database migrations in Waterfall.

## Overview

Waterfall uses **SQL migrations** managed through Supabase for all database schema changes.

**Key Principles:**
- Migrations are SQL files in `supabase/migrations/`
- Run migrations manually in Supabase Dashboard (remote-only workflow)
- Timestamp-based ordering ensures correct execution sequence
- Always regenerate TypeScript types after migrations

## Migration File Naming

### Standard Format

```
YYYYMMDDHHMMSS_description.sql
```

**Examples:**
```
20241030000001_initial_schema.sql
20241030000002_rls_policies.sql
20241030120000_add_user_preferences.sql
```

### Naming Best Practices

**Good:**
- `20241030000001_initial_schema.sql` - Clear, descriptive
- `20241030120000_add_quickbooks_sync_status.sql` - Specific feature

**Bad:**
- `migration.sql` - No timestamp
- `20241030_update.sql` - Missing time, vague

## Best Practices

### 1. Idempotency

Always use `IF NOT EXISTS`:

```sql
CREATE TABLE IF NOT EXISTS tablename (...);
CREATE INDEX IF NOT EXISTS idx_name ON table(column);
```

### 2. One Logical Change Per Migration

Keep migrations focused and atomic.

### 3. Document Rollback Steps

```sql
-- ROLLBACK INSTRUCTIONS
-- To undo: DROP TABLE IF EXISTS new_table CASCADE;
```

### 4. Test Before Production

1. Run in dev Supabase project
2. Regenerate types
3. Test application
4. Deploy to production

### 5. Never Modify Existing Migrations

Create new migration to fix issues instead.

## Remote-Only Workflow

1. Create migration file in `supabase/migrations/`
2. Copy SQL to Supabase Dashboard → SQL Editor
3. Execute
4. Verify in Table Editor
5. Regenerate types: `npm run supabase:types`
6. Test application
7. Commit migration file + types

See `supabase/migrations/README.md` for details.
