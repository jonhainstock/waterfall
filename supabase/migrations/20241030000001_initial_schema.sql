-- Waterfall Initial Schema Migration
-- Run this in Supabase Dashboard → SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- ACCOUNTS TABLE (Tenant/Billing Entity)
-- =====================================================
CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  account_type TEXT NOT NULL CHECK (account_type IN ('company', 'firm')),
  subscription_tier TEXT NOT NULL DEFAULT 'free' CHECK (subscription_tier IN ('free', 'starter', 'pro')),
  subscription_status TEXT NOT NULL DEFAULT 'trial' CHECK (subscription_status IN ('trial', 'active', 'cancelled')),
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- USERS TABLE (Extends Supabase auth.users)
-- =====================================================
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- ACCOUNT_USERS TABLE (Team Membership with Roles)
-- =====================================================
CREATE TABLE account_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, user_id)
);

-- =====================================================
-- ORGANIZATIONS TABLE (Client Businesses)
-- =====================================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT,
  quickbooks_realm_id TEXT UNIQUE,
  quickbooks_access_token TEXT, -- Encrypt at application level
  quickbooks_refresh_token TEXT, -- Encrypt at application level
  quickbooks_expires_at TIMESTAMPTZ,
  quickbooks_connected_at TIMESTAMPTZ,
  account_mapping JSONB DEFAULT '{}', -- {deferredRevenueAccountId: "123", revenueAccountId: "456"}
  settings JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- CONTRACTS TABLE (Customer Contracts)
-- =====================================================
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

-- =====================================================
-- RECOGNITION_SCHEDULES TABLE (Monthly Recognition Entries)
-- =====================================================
CREATE TABLE recognition_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contract_id UUID NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE, -- Denormalized for RLS
  recognition_month DATE NOT NULL,
  recognition_amount DECIMAL(12,2) NOT NULL,
  journal_entry_id TEXT,
  posted BOOLEAN NOT NULL DEFAULT false,
  posted_at TIMESTAMPTZ,
  posted_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(contract_id, recognition_month),
  CHECK (EXTRACT(DAY FROM recognition_month) = 1) -- Ensure first day of month
);

-- =====================================================
-- IMPORT_LOGS TABLE (Audit Trail for CSV Imports)
-- =====================================================
CREATE TABLE import_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  imported_by UUID NOT NULL REFERENCES users(id),
  filename TEXT NOT NULL,
  rows_processed INTEGER NOT NULL,
  rows_succeeded INTEGER NOT NULL,
  rows_failed INTEGER NOT NULL,
  error_details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Account users indexes
CREATE INDEX idx_account_users_user_id ON account_users(user_id);
CREATE INDEX idx_account_users_account_id ON account_users(account_id);

-- Organizations indexes
CREATE INDEX idx_organizations_account_id ON organizations(account_id);
CREATE INDEX idx_organizations_quickbooks_realm_id ON organizations(quickbooks_realm_id) WHERE quickbooks_realm_id IS NOT NULL;

-- Contracts indexes
CREATE INDEX idx_contracts_organization_id ON contracts(organization_id);
CREATE INDEX idx_contracts_status ON contracts(status);
CREATE INDEX idx_contracts_dates ON contracts(start_date, end_date);

-- Recognition schedules indexes
CREATE INDEX idx_recognition_schedules_contract_id ON recognition_schedules(contract_id);
CREATE INDEX idx_recognition_schedules_organization_id ON recognition_schedules(organization_id);
CREATE INDEX idx_recognition_schedules_month_posted ON recognition_schedules(recognition_month, posted);

-- Import logs indexes
CREATE INDEX idx_import_logs_organization_id ON import_logs(organization_id);
CREATE INDEX idx_import_logs_imported_by ON import_logs(imported_by);

-- =====================================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- =====================================================

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_contracts_updated_at
  BEFORE UPDATE ON contracts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON TABLE accounts IS 'Tenant/billing entities - one per company or accounting firm';
COMMENT ON TABLE users IS 'User profiles linked to Supabase auth.users';
COMMENT ON TABLE account_users IS 'Team membership with role-based access (owner, admin, member)';
COMMENT ON TABLE organizations IS 'Client businesses managed by accounts';
COMMENT ON TABLE contracts IS 'Customer contracts requiring revenue recognition';
COMMENT ON TABLE recognition_schedules IS 'Monthly revenue recognition schedule entries';
COMMENT ON TABLE import_logs IS 'Audit trail for CSV/Excel imports';

COMMENT ON COLUMN organizations.account_mapping IS 'JSON mapping of QuickBooks accounts: {deferredRevenueAccountId, revenueAccountId}';
COMMENT ON COLUMN recognition_schedules.organization_id IS 'Denormalized for RLS performance - must match contract.organization_id';
COMMENT ON COLUMN contracts.monthly_recognition IS 'Calculated as contract_amount / term_months';
