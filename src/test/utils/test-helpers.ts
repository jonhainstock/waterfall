/**
 * Test helper utilities
 *
 * Common utilities for writing tests across the application.
 */

import { vi } from 'vitest'

/**
 * Mock Supabase client for testing
 */
export function createMockSupabaseClient() {
  return {
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      signUp: vi.fn(),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
  }
}

/**
 * Create a mock user for testing
 */
export function createMockUser(overrides: Partial<any> = {}) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Create mock organization for testing
 */
export function createMockOrganization(overrides: Partial<any> = {}) {
  return {
    id: 'test-org-id',
    name: 'Test Organization',
    account_id: 'test-account-id',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

/**
 * Create mock contract for testing
 */
export function createMockContract(overrides: Partial<any> = {}) {
  return {
    id: 'test-contract-id',
    invoice_id: 'INV-001',
    organization_id: 'test-org-id',
    amount: '12000.00',
    start_date: '2025-01-01',
    end_date: '2025-12-31',
    term_months: 12,
    customer_name: 'Test Customer',
    description: 'Test contract',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}
