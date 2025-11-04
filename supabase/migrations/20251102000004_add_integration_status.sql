-- Add integration status tracking columns to accounting_integrations table
-- Allows monitoring connection health and sync status

ALTER TABLE accounting_integrations
ADD COLUMN last_sync_at TIMESTAMPTZ,
ADD COLUMN sync_status TEXT CHECK (sync_status IN ('connected', 'error', 'disconnected')) DEFAULT 'connected',
ADD COLUMN sync_error TEXT;

-- Add comments explaining the fields
COMMENT ON COLUMN accounting_integrations.last_sync_at IS 'Timestamp of last successful sync/posting to QuickBooks/Xero';
COMMENT ON COLUMN accounting_integrations.sync_status IS 'Current connection status: connected (healthy), error (auth issue), disconnected (inactive)';
COMMENT ON COLUMN accounting_integrations.sync_error IS 'Error message if sync_status is error (e.g., token expired)';

-- Index for finding integrations with errors (for monitoring/alerts)
CREATE INDEX idx_integration_sync_status ON accounting_integrations(sync_status)
WHERE sync_status != 'connected';

-- Index for finding recently synced integrations
CREATE INDEX idx_integration_last_sync ON accounting_integrations(last_sync_at DESC)
WHERE last_sync_at IS NOT NULL;
