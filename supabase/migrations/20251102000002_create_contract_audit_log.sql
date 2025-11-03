-- Create contract_audit_log table for tracking all contract changes
-- Stores who, when, what changed, and how adjustments were handled

CREATE TABLE contract_audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'cancelled', 'deleted')),
  changed_by UUID NOT NULL REFERENCES users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Store what changed
  changed_fields TEXT[] NOT NULL,
  old_values JSONB NOT NULL,
  new_values JSONB,

  -- How adjustments were handled
  adjustment_mode TEXT CHECK (adjustment_mode IN ('retroactive', 'catch_up', 'prospective', 'none')),
  catch_up_month DATE, -- If catch-up mode, which month was selected

  -- Track integration posting (even if mocked)
  adjustment_entry_ids TEXT[], -- Array of QB/Xero JE IDs posted
  posting_status TEXT CHECK (posting_status IN ('not_applicable', 'pending', 'mocked', 'posted', 'failed')),
  posting_error TEXT,

  -- Additional context
  notes TEXT
);

-- Add comments explaining the fields
COMMENT ON TABLE contract_audit_log IS 'Complete audit trail of all contract changes (edits, cancellations, deletions)';
COMMENT ON COLUMN contract_audit_log.changed_fields IS 'Array of field names that changed (e.g., ["contract_amount", "end_date"])';
COMMENT ON COLUMN contract_audit_log.old_values IS 'JSON object with old values for changed fields';
COMMENT ON COLUMN contract_audit_log.new_values IS 'JSON object with new values for changed fields (NULL for deletions)';
COMMENT ON COLUMN contract_audit_log.adjustment_mode IS 'How schedule adjustments were handled if any posted schedules existed';
COMMENT ON COLUMN contract_audit_log.adjustment_entry_ids IS 'Array of external JE IDs (e.g., ["QBO-JE-001", "MOCKED-JE-999"])';
COMMENT ON COLUMN contract_audit_log.posting_status IS 'Status of posting adjustment entries to accounting system';

-- Indexes for common queries
CREATE INDEX idx_audit_contract ON contract_audit_log(contract_id);
CREATE INDEX idx_audit_org ON contract_audit_log(organization_id);
CREATE INDEX idx_audit_date ON contract_audit_log(changed_at DESC);
CREATE INDEX idx_audit_user ON contract_audit_log(changed_by);
CREATE INDEX idx_audit_action ON contract_audit_log(action);
CREATE INDEX idx_audit_posting_status ON contract_audit_log(posting_status)
WHERE posting_status = 'failed';

-- Enable Row Level Security
ALTER TABLE contract_audit_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view audit logs for organizations in their account
CREATE POLICY "Users can view audit logs for their orgs" ON contract_audit_log
  FOR SELECT USING (
    organization_id IN (
      SELECT o.id FROM organizations o
      JOIN accounts a ON a.id = o.account_id
      JOIN account_users au ON au.account_id = a.id
      WHERE au.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert audit logs for organizations in their account
-- (Server actions will insert these)
CREATE POLICY "Users can insert audit logs for their orgs" ON contract_audit_log
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT o.id FROM organizations o
      JOIN accounts a ON a.id = o.account_id
      JOIN account_users au ON au.account_id = a.id
      WHERE au.user_id = auth.uid()
    )
  );
