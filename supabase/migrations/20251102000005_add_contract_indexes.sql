-- Add performance indexes to contracts table
-- Improves query speed for common operations

-- Index for filtering non-active contracts (cancelled, completed)
-- Partial index only stores non-active rows (more efficient)
CREATE INDEX idx_contracts_status ON contracts(organization_id, status)
WHERE status != 'active';

-- Index for finding contracts by invoice_id (for duplicate checking during edit)
-- This supports quick lookup when validating invoice_id uniqueness
CREATE INDEX idx_contracts_invoice_id ON contracts(organization_id, invoice_id);

-- Index for finding contracts by customer name (for search/filtering)
CREATE INDEX idx_contracts_customer_name ON contracts(organization_id, customer_name)
WHERE customer_name IS NOT NULL;

-- Index for date range queries (finding contracts in a date range)
CREATE INDEX idx_contracts_dates ON contracts(organization_id, start_date, end_date);

-- Index for recently updated contracts (for audit/activity views)
CREATE INDEX idx_contracts_updated ON contracts(organization_id, updated_at DESC);
