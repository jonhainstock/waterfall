-- Waterfall Seed Data (Optional)
-- This file contains sample data for development/testing
-- Run this AFTER all migrations are complete

-- NOTE: This is for local development/testing only
-- Do NOT run this on production database

-- =====================================================
-- DEVELOPMENT TEST DATA (Optional)
-- =====================================================

-- Example: Create a test account
-- Uncomment to use:

/*
INSERT INTO accounts (id, name, account_type, subscription_tier, subscription_status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Test Company',
  'company',
  'pro',
  'active'
);

-- Example: Create a test organization
INSERT INTO organizations (id, account_id, name)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Example Organization'
);
*/

-- =====================================================
-- HELPER FUNCTIONS FOR DEVELOPMENT
-- =====================================================

-- Function to generate test contracts (useful for development)
CREATE OR REPLACE FUNCTION generate_test_contracts(
  p_organization_id UUID,
  p_count INTEGER DEFAULT 10
)
RETURNS VOID AS $$
DECLARE
  i INTEGER;
  v_start_date DATE;
  v_end_date DATE;
  v_amount DECIMAL(12,2);
  v_term_months INTEGER;
BEGIN
  FOR i IN 1..p_count LOOP
    -- Random contract parameters
    v_amount := (RANDOM() * 100000 + 10000)::DECIMAL(12,2);
    v_term_months := (RANDOM() * 23 + 1)::INTEGER; -- 1-24 months
    v_start_date := CURRENT_DATE - (RANDOM() * 365)::INTEGER;
    v_end_date := v_start_date + (v_term_months || ' months')::INTERVAL;

    -- Insert contract
    INSERT INTO contracts (
      organization_id,
      invoice_id,
      customer_name,
      description,
      contract_amount,
      start_date,
      end_date,
      term_months,
      monthly_recognition
    ) VALUES (
      p_organization_id,
      'TEST-' || LPAD(i::TEXT, 5, '0'),
      'Test Customer ' || i,
      'Test contract for development',
      v_amount,
      v_start_date,
      v_end_date,
      v_term_months,
      (v_amount / v_term_months)::DECIMAL(12,2)
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Example usage (commented out):
-- SELECT generate_test_contracts('00000000-0000-0000-0000-000000000002'::UUID, 50);
