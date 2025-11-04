-- Cleanup deprecated QuickBooks-specific fields from organizations table
-- These have been migrated to the accounting_integrations table in migration 20241031000002

-- Safety check: Verify all QuickBooks data has been migrated
DO $$
DECLARE
  unmigrated_count INTEGER;
BEGIN
  -- Count organizations with QuickBooks data but no integration record
  SELECT COUNT(*)
  INTO unmigrated_count
  FROM organizations o
  WHERE o.quickbooks_realm_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1
      FROM accounting_integrations ai
      WHERE ai.organization_id = o.id
        AND ai.platform = 'quickbooks'
    );

  -- If there are unmigrated records, raise an error
  IF unmigrated_count > 0 THEN
    RAISE EXCEPTION 'Found % organizations with QuickBooks data that have not been migrated. Please run migration 20241031000002 first.', unmigrated_count;
  END IF;

  RAISE NOTICE 'All QuickBooks data has been migrated. Proceeding with cleanup.';
END $$;

-- Drop deprecated columns from organizations table
ALTER TABLE organizations
  DROP COLUMN IF EXISTS quickbooks_access_token,
  DROP COLUMN IF EXISTS quickbooks_refresh_token,
  DROP COLUMN IF EXISTS quickbooks_expires_at,
  DROP COLUMN IF EXISTS quickbooks_realm_id,
  DROP COLUMN IF EXISTS quickbooks_connected_at;

-- Note: We keep account_mapping for now as it's still referenced in the code
-- and can be used for non-accounting settings. It will be evaluated for removal later.

-- Add comment to account_mapping to clarify its purpose
COMMENT ON COLUMN organizations.account_mapping IS 'DEPRECATED: Accounting-related mappings have moved to accounting_integrations table. This field may be repurposed for other organization settings or removed in a future migration.';
