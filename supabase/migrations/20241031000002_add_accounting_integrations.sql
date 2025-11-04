-- Add accounting_integrations table for multi-platform support (QuickBooks + Xero)
-- Since organizations can only connect to ONE platform at a time,
-- we enforce a unique constraint on organization_id.

CREATE TABLE IF NOT EXISTS accounting_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- Platform identifier ('quickbooks' | 'xero')
  platform TEXT NOT NULL CHECK (platform IN ('quickbooks', 'xero')),

  -- OAuth tokens (encrypted in application layer)
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ,

  -- Platform-specific identifier
  -- QuickBooks: realm_id
  -- Xero: tenant_id
  realm_id TEXT,

  -- Account mapping (JSONB for platform-specific structure)
  -- Example: { "deferredRevenueAccountId": "123", "revenueAccountId": "456" }
  account_mapping JSONB,

  -- Connection metadata
  is_active BOOLEAN NOT NULL DEFAULT true,
  connected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Audit timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one active integration per organization
  UNIQUE(organization_id)
);

-- Create index for faster lookups
CREATE INDEX idx_accounting_integrations_org_id ON accounting_integrations(organization_id);
CREATE INDEX idx_accounting_integrations_platform ON accounting_integrations(platform);

-- Enable RLS
ALTER TABLE accounting_integrations ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see integrations for organizations they have access to
CREATE POLICY accounting_integrations_select_policy ON accounting_integrations
  FOR SELECT
  USING (
    organization_id IN (
      SELECT o.id
      FROM organizations o
      JOIN accounts a ON o.account_id = a.id
      JOIN account_users au ON a.id = au.account_id
      WHERE au.user_id = auth.uid()
    )
  );

-- RLS Policy: Only owners and admins can insert integrations
CREATE POLICY accounting_integrations_insert_policy ON accounting_integrations
  FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT o.id
      FROM organizations o
      JOIN accounts a ON o.account_id = a.id
      JOIN account_users au ON a.id = au.account_id
      WHERE au.user_id = auth.uid()
        AND au.role IN ('owner', 'admin')
    )
  );

-- RLS Policy: Only owners and admins can update integrations
CREATE POLICY accounting_integrations_update_policy ON accounting_integrations
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT o.id
      FROM organizations o
      JOIN accounts a ON o.account_id = a.id
      JOIN account_users au ON a.id = au.account_id
      WHERE au.user_id = auth.uid()
        AND au.role IN ('owner', 'admin')
    )
  );

-- RLS Policy: Only owners can delete integrations
CREATE POLICY accounting_integrations_delete_policy ON accounting_integrations
  FOR DELETE
  USING (
    organization_id IN (
      SELECT o.id
      FROM organizations o
      JOIN accounts a ON o.account_id = a.id
      JOIN account_users au ON a.id = au.account_id
      WHERE au.user_id = auth.uid()
        AND au.role = 'owner'
    )
  );

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_accounting_integrations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER accounting_integrations_updated_at
  BEFORE UPDATE ON accounting_integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_accounting_integrations_updated_at();

-- Migrate existing QuickBooks data from organizations table
-- Only migrate organizations that have QuickBooks connected
INSERT INTO accounting_integrations (
  organization_id,
  platform,
  access_token,
  refresh_token,
  expires_at,
  realm_id,
  account_mapping,
  connected_at
)
SELECT
  id,
  'quickbooks',
  quickbooks_access_token,
  quickbooks_refresh_token,
  quickbooks_expires_at,
  quickbooks_realm_id,
  account_mapping,
  quickbooks_connected_at
FROM organizations
WHERE quickbooks_realm_id IS NOT NULL
ON CONFLICT (organization_id) DO NOTHING;

-- Note: We keep the old quickbooks_* columns on organizations for now
-- for backward compatibility. They will be deprecated in a future migration.
