-- Create journal_entry_log table for tracking all JE posting attempts
-- Supports both mocked (development) and real (production) entries

CREATE TABLE journal_entry_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  accounting_integration_id UUID REFERENCES accounting_integrations(id) ON DELETE SET NULL,

  -- What was posted
  entry_type TEXT NOT NULL CHECK (entry_type IN ('recognition', 'adjustment', 'reversal')),
  recognition_schedule_ids UUID[] NOT NULL,
  posting_month DATE NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,

  -- External system details
  external_entry_id TEXT, -- QuickBooks JE ID or Xero Manual Journal ID
  is_mocked BOOLEAN NOT NULL DEFAULT false, -- TRUE during development

  -- Posting result
  posted_at TIMESTAMPTZ,
  posted_by UUID REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'mocked', 'posted', 'failed')),
  error_message TEXT,

  -- Audit trail (for debugging and reconciliation)
  request_payload JSONB, -- What we sent to QB/Xero
  response_payload JSONB, -- What they returned

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add comments explaining the fields
COMMENT ON TABLE journal_entry_log IS 'Complete log of all journal entry posting attempts to QuickBooks/Xero';
COMMENT ON COLUMN journal_entry_log.entry_type IS 'Type of entry: recognition (monthly), adjustment (fix), or reversal (deletion)';
COMMENT ON COLUMN journal_entry_log.recognition_schedule_ids IS 'Array of schedule IDs included in this journal entry';
COMMENT ON COLUMN journal_entry_log.is_mocked IS 'TRUE if this was a mocked posting (development), FALSE if real API call';
COMMENT ON COLUMN journal_entry_log.status IS 'pending = not yet posted, mocked = dev mode, posted = success, failed = error';
COMMENT ON COLUMN journal_entry_log.request_payload IS 'The JSON sent to QuickBooks/Xero API (for debugging)';
COMMENT ON COLUMN journal_entry_log.response_payload IS 'The JSON received from QuickBooks/Xero API (for debugging)';

-- Indexes for common queries
CREATE INDEX idx_je_log_org ON journal_entry_log(organization_id);
CREATE INDEX idx_je_log_integration ON journal_entry_log(accounting_integration_id)
WHERE accounting_integration_id IS NOT NULL;
CREATE INDEX idx_je_log_status ON journal_entry_log(status);
CREATE INDEX idx_je_log_month ON journal_entry_log(posting_month DESC);
CREATE INDEX idx_je_log_external ON journal_entry_log(external_entry_id)
WHERE external_entry_id IS NOT NULL;
CREATE INDEX idx_je_log_mocked ON journal_entry_log(is_mocked);
CREATE INDEX idx_je_log_entry_type ON journal_entry_log(entry_type);
CREATE INDEX idx_je_log_failed ON journal_entry_log(organization_id, status)
WHERE status = 'failed';

-- Enable Row Level Security
ALTER TABLE journal_entry_log ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view JE logs for organizations in their account
CREATE POLICY "Users can view JE logs for their orgs" ON journal_entry_log
  FOR SELECT USING (
    organization_id IN (
      SELECT o.id FROM organizations o
      JOIN accounts a ON a.id = o.account_id
      JOIN account_users au ON au.account_id = a.id
      WHERE au.user_id = auth.uid()
    )
  );

-- RLS Policy: Users can insert JE logs for organizations in their account
-- (Server actions will insert these)
CREATE POLICY "Users can insert JE logs for their orgs" ON journal_entry_log
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT o.id FROM organizations o
      JOIN accounts a ON a.id = o.account_id
      JOIN account_users au ON au.account_id = a.id
      WHERE au.user_id = auth.uid()
    )
  );
