-- Waterfall RLS Policies Migration
-- Run this AFTER 20241030000001_initial_schema.sql

-- =====================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- =====================================================

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE recognition_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- USERS TABLE POLICIES
-- =====================================================

-- Users can view their own record
CREATE POLICY "Users can view own record"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own record
CREATE POLICY "Users can update own record"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- =====================================================
-- ACCOUNTS TABLE POLICIES
-- =====================================================

-- Users can view accounts they belong to
CREATE POLICY "Users can view their accounts"
  ON accounts FOR SELECT
  USING (
    id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );

-- Only account owners can update accounts
CREATE POLICY "Account owners can update their accounts"
  ON accounts FOR UPDATE
  USING (
    id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- =====================================================
-- ACCOUNT_USERS TABLE POLICIES
-- =====================================================

-- Users can see members of their accounts
CREATE POLICY "Users can view account members"
  ON account_users FOR SELECT
  USING (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );

-- Owners and admins can insert new team members
CREATE POLICY "Owners and admins can add team members"
  ON account_users FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Owners and admins can update team members (change roles)
CREATE POLICY "Owners and admins can update team members"
  ON account_users FOR UPDATE
  USING (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Owners and admins can remove team members
CREATE POLICY "Owners and admins can remove team members"
  ON account_users FOR DELETE
  USING (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- ORGANIZATIONS TABLE POLICIES
-- =====================================================

-- Users can view their account's organizations
CREATE POLICY "Users can view their account's organizations"
  ON organizations FOR SELECT
  USING (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
    )
  );

-- Owners and admins can create organizations
CREATE POLICY "Owners and admins can create organizations"
  ON organizations FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Owners and admins can update organizations
CREATE POLICY "Owners and admins can update organizations"
  ON organizations FOR UPDATE
  USING (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- Owners and admins can delete organizations
CREATE POLICY "Owners and admins can delete organizations"
  ON organizations FOR DELETE
  USING (
    account_id IN (
      SELECT account_id
      FROM account_users
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );

-- =====================================================
-- CONTRACTS TABLE POLICIES
-- =====================================================

-- Users can view contracts from their organizations
CREATE POLICY "Users can view their organizations' contracts"
  ON contracts FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM organizations
      -- RLS on organizations table handles access check
    )
  );

-- All team members can create contracts
CREATE POLICY "Users can create contracts in their organizations"
  ON contracts FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations
    )
  );

-- All team members can update contracts
CREATE POLICY "Users can update their organizations' contracts"
  ON contracts FOR UPDATE
  USING (
    organization_id IN (
      SELECT id FROM organizations
    )
  );

-- All team members can delete contracts
CREATE POLICY "Users can delete their organizations' contracts"
  ON contracts FOR DELETE
  USING (
    organization_id IN (
      SELECT id FROM organizations
    )
  );

-- =====================================================
-- RECOGNITION_SCHEDULES TABLE POLICIES
-- =====================================================

-- Users can view schedules from their organizations
CREATE POLICY "Users can view their organizations' schedules"
  ON recognition_schedules FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM organizations
    )
  );

-- All team members can create schedules
CREATE POLICY "Users can create schedules"
  ON recognition_schedules FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations
    )
  );

-- All team members can update schedules
CREATE POLICY "Users can update schedules"
  ON recognition_schedules FOR UPDATE
  USING (
    organization_id IN (
      SELECT id FROM organizations
    )
  );

-- All team members can delete schedules
CREATE POLICY "Users can delete schedules"
  ON recognition_schedules FOR DELETE
  USING (
    organization_id IN (
      SELECT id FROM organizations
    )
  );

-- =====================================================
-- IMPORT_LOGS TABLE POLICIES
-- =====================================================

-- Users can view import logs from their organizations
CREATE POLICY "Users can view their organizations' import logs"
  ON import_logs FOR SELECT
  USING (
    organization_id IN (
      SELECT id FROM organizations
    )
  );

-- All team members can create import logs
CREATE POLICY "Users can create import logs"
  ON import_logs FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT id FROM organizations
    )
  );

-- =====================================================
-- POLICY COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON POLICY "Users can view own record" ON users IS
  'Users can only see their own user record';

COMMENT ON POLICY "Users can view their accounts" ON accounts IS
  'Users can view accounts they are members of via account_users join table';

COMMENT ON POLICY "Users can view their organizations' contracts" ON contracts IS
  'Cascading RLS: contracts accessible if user can access parent organization';

COMMENT ON POLICY "Owners and admins can create organizations" ON organizations IS
  'Only owners and admins can create new client organizations';
