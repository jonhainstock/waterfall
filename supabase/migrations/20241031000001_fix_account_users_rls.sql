-- Fix infinite recursion in account_users RLS policies
-- The original policies caused recursion by referencing account_users within account_users policies
-- Solution: Use SECURITY DEFINER functions that bypass RLS

-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view account members" ON account_users;
DROP POLICY IF EXISTS "Owners and admins can add team members" ON account_users;
DROP POLICY IF EXISTS "Owners and admins can update team members" ON account_users;
DROP POLICY IF EXISTS "Owners and admins can remove team members" ON account_users;

-- Create helper functions that bypass RLS (SECURITY DEFINER)
-- These functions execute with the privileges of the function owner, bypassing RLS

CREATE OR REPLACE FUNCTION user_account_ids(p_user_id UUID)
RETURNS TABLE(account_id UUID)
SECURITY DEFINER
SET search_path = public
LANGUAGE SQL
STABLE
AS $$
  SELECT account_id FROM account_users WHERE user_id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION user_is_owner_or_admin(p_user_id UUID, p_account_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
LANGUAGE SQL
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM account_users
    WHERE user_id = p_user_id
    AND account_id = p_account_id
    AND role IN ('owner', 'admin')
  );
$$;

-- Create non-recursive policies using the helper functions

-- Users can view account_users for accounts they belong to
CREATE POLICY "Users can view account members"
  ON account_users FOR SELECT
  USING (
    account_id IN (SELECT user_account_ids(auth.uid()))
  );

-- Owners and admins can add team members
CREATE POLICY "Owners and admins can add team members"
  ON account_users FOR INSERT
  WITH CHECK (
    user_is_owner_or_admin(auth.uid(), account_id)
  );

-- Owners and admins can update team members
CREATE POLICY "Owners and admins can update team members"
  ON account_users FOR UPDATE
  USING (
    user_is_owner_or_admin(auth.uid(), account_id)
  );

-- Owners and admins can delete team members
CREATE POLICY "Owners and admins can remove team members"
  ON account_users FOR DELETE
  USING (
    user_is_owner_or_admin(auth.uid(), account_id)
  );

-- Add comments
COMMENT ON FUNCTION user_account_ids IS
  'Returns account IDs for a user without triggering RLS. Used in policies to avoid infinite recursion.';

COMMENT ON FUNCTION user_is_owner_or_admin IS
  'Checks if user is owner or admin of an account without triggering RLS. Used in policies to avoid infinite recursion.';
