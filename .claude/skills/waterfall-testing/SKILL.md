# Waterfall Testing

**Domain Skill** - Vitest testing patterns, unit tests, mocking strategies for Waterfall

## Overview

Testing patterns and practices for the Waterfall application using Vitest. Focus on critical business logic testing without aiming for 100% coverage.

**When to use this skill:**
- Writing tests for revenue recognition calculations
- Testing permission and role logic
- Creating mocked Supabase clients
- Testing financial calculations with Decimal.js
- Setting up unit tests for business logic
- Testing utility functions

**Philosophy:** Test what matters. Priority on critical business logic that could cause financial or security issues if broken.

---

## Test Setup

### Configuration

**vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node', // Use 'jsdom' for DOM tests
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
    include: ['**/*.test.ts', '**/*.test.tsx'],
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

**vitest.setup.ts:**
```typescript
// Global test setup
// Mock environment variables if needed
// process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
```

### Running Tests

```bash
# Watch mode during development
pnpm test

# Run once (CI mode)
pnpm test:run

# Visual UI for debugging tests
pnpm test:ui

# Generate coverage report
pnpm test:coverage
```

---

## Testing Priorities

### Priority 1: Critical Business Logic

**Must test:**
- Revenue recognition calculations (financial accuracy)
- Permission/role checking (security)
- CSV import validation (data integrity)
- Contract date calculations (business rules)
- Deferred revenue calculations (accounting)

### Priority 2: Utility Functions

**Should test:**
- Date formatting helpers
- Currency formatting
- Data transformations
- QuickBooks API helpers (mocked)

### Priority 3: Integration Tests

**Nice to have:**
- API route handlers (with mocked auth)
- Server Actions (with mocked Supabase)

### Skip (for now)

- React components
- UI interactions
- Direct Supabase queries

---

## Testing Financial Calculations

### Revenue Recognition Tests

**Critical: Always use Decimal.js in tests when working with money**

```typescript
// src/lib/calculations/revenue-recognition.test.ts
import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import {
  calculateMonthlyRecognition,
  generateRecognitionSchedule,
} from './revenue-recognition'

describe('calculateMonthlyRecognition', () => {
  it('should calculate monthly recognition for evenly divisible amounts', () => {
    const result = calculateMonthlyRecognition(12000, 12)
    expect(result).toBe('1000.00')
  })

  it('should round to 2 decimal places', () => {
    const result = calculateMonthlyRecognition(10000, 12)
    expect(result).toBe('833.33')
  })

  it('should throw error for invalid term months', () => {
    expect(() => calculateMonthlyRecognition(12000, 0)).toThrow(
      'Term months must be greater than 0'
    )
  })
})

describe('generateRecognitionSchedule', () => {
  it('should adjust last month for rounding differences', () => {
    const schedule = generateRecognitionSchedule(10000, 12)

    expect(schedule).toHaveLength(12)
    expect(schedule[0]).toBe('833.33')
    expect(schedule[11]).toBe('833.37') // Adjusted
  })

  it('should ensure total equals contract amount', () => {
    const schedule = generateRecognitionSchedule(10000, 12)

    // Use Decimal for accurate summation to avoid floating-point errors
    const total = schedule
      .reduce((sum, amount) => sum.plus(amount), new Decimal(0))
      .toNumber()

    expect(total).toBe(10000)
  })
})
```

**Key patterns:**
- Test edge cases (rounding, zero values, large numbers)
- Verify totals match contract amounts exactly
- Use Decimal.js in test assertions for money
- Test error handling (negative values, invalid inputs)

### Testing with Decimal.js

**Problem:** Floating-point arithmetic can cause test failures

```typescript
// ❌ BAD - floating-point errors
const total = schedule.reduce((sum, amount) => sum + parseFloat(amount), 0)
expect(total).toBe(10000) // May fail: 10000.000000000002

// ✅ GOOD - use Decimal.js
const total = schedule
  .reduce((sum, amount) => sum.plus(amount), new Decimal(0))
  .toNumber()
expect(total).toBe(10000) // Always accurate
```

---

## Testing Permissions and Roles

### Role Permission Tests

**Test role-based permission mappings without database:**

```typescript
// src/lib/auth/role-permissions.test.ts
import { describe, it, expect } from 'vitest'
import { ROLE_PERMISSIONS, type Permission } from './permissions'

describe('ROLE_PERMISSIONS', () => {
  describe('owner role', () => {
    it('should have all permissions', () => {
      const ownerPermissions = ROLE_PERMISSIONS.owner

      expect(ownerPermissions).toContain('view_contracts')
      expect(ownerPermissions).toContain('manage_settings')
      expect(ownerPermissions).toContain('post_to_quickbooks')
    })
  })

  describe('viewer role', () => {
    it('should only have view permissions', () => {
      const viewerPermissions = ROLE_PERMISSIONS.viewer

      expect(viewerPermissions).toContain('view_contracts')
      expect(viewerPermissions).not.toContain('delete_contracts')
    })
  })

  describe('critical permissions', () => {
    it('should restrict post_to_quickbooks to owner and admin only', () => {
      expect(ROLE_PERMISSIONS.owner).toContain('post_to_quickbooks')
      expect(ROLE_PERMISSIONS.admin).toContain('post_to_quickbooks')
      expect(ROLE_PERMISSIONS.member).not.toContain('post_to_quickbooks')
      expect(ROLE_PERMISSIONS.viewer).not.toContain('post_to_quickbooks')
    })
  })
})
```

**Key patterns:**
- Test permission constants without database access
- Verify role hierarchies (owner > admin > member > viewer)
- Ensure critical permissions are properly restricted
- Test that dangerous permissions require appropriate roles

---

## Mocking Patterns

### Mock Supabase Client

**Test helper for Supabase mocks:**

```typescript
// src/test/utils/test-helpers.ts
import { vi } from 'vitest'

export function createMockSupabaseClient() {
  return {
    auth: {
      getUser: vi.fn(),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
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
```

### Mock Test Data

**Reusable test fixtures:**

```typescript
// src/test/utils/test-helpers.ts
export function createMockUser(overrides: Partial<any> = {}) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

export function createMockOrganization(overrides: Partial<any> = {}) {
  return {
    id: 'test-org-id',
    name: 'Test Organization',
    account_id: 'test-account-id',
    created_at: new Date().toISOString(),
    ...overrides,
  }
}

export function createMockContract(overrides: Partial<any> = {}) {
  return {
    id: 'test-contract-id',
    invoice_id: 'INV-001',
    organization_id: 'test-org-id',
    amount: '12000.00',
    start_date: '2025-01-01',
    end_date: '2025-12-31',
    term_months: 12,
    ...overrides,
  }
}
```

**Usage:**
```typescript
import { createMockContract } from '@/test/utils/test-helpers'

it('should calculate revenue for contract', () => {
  const contract = createMockContract({ amount: '24000.00' })
  // test logic
})
```

---

## Test File Organization

### File Location

**Place tests next to the code they test:**

```
lib/
├── calculations/
│   ├── revenue-recognition.ts
│   └── revenue-recognition.test.ts    ← Test file here
├── auth/
│   ├── permissions.ts
│   └── permissions.test.ts
└── utils/
    ├── dates.ts
    └── dates.test.ts
```

### Naming Conventions

- Use `.test.ts` or `.spec.ts` extension
- Match the filename: `revenue-recognition.ts` → `revenue-recognition.test.ts`
- Test utilities in `src/test/utils/`
- Mock fixtures in `src/test/fixtures/`

---

## Testing Best Practices

### Do

- **Test critical business logic** (revenue, permissions)
- **Use Decimal.js** for money in tests
- **Test edge cases** (zero, negative, large numbers)
- **Test error handling** (invalid inputs, boundary conditions)
- **Use descriptive test names** ("should calculate monthly recognition for evenly divisible amounts")
- **Group related tests** with `describe` blocks
- **Keep tests simple** - one assertion per test when possible

### Don't

- **Don't test implementation details** - test behavior
- **Don't test external libraries** (Decimal.js, date-fns)
- **Don't test React components** (yet - not a priority)
- **Don't aim for 100% coverage** - focus on critical paths
- **Don't use floating-point math** for money assertions

---

## Common Test Patterns

### Testing Pure Functions

```typescript
import { describe, it, expect } from 'vitest'

describe('myPureFunction', () => {
  it('should transform input correctly', () => {
    const input = { foo: 'bar' }
    const result = myPureFunction(input)
    expect(result).toEqual({ foo: 'BAR' })
  })
})
```

### Testing with Mocks

```typescript
import { describe, it, expect, vi } from 'vitest'

describe('myFunction', () => {
  it('should call external service', () => {
    const mockService = vi.fn().mockResolvedValue('result')

    const result = await myFunction(mockService)

    expect(mockService).toHaveBeenCalledWith(expect.any(String))
    expect(result).toBe('result')
  })
})
```

### Testing Error Cases

```typescript
describe('myFunction', () => {
  it('should throw error for invalid input', () => {
    expect(() => myFunction(-1)).toThrow('Input must be positive')
  })

  it('should return error for missing data', async () => {
    const result = await myFunction(null)
    expect(result.error).toBe('Missing required data')
  })
})
```

---

## Integration with CI/CD

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm test:run
```

### Pre-commit Hook

```bash
# .husky/pre-commit
pnpm test:run
```

---

## When to Write Tests

### Write tests AFTER implementing for:
- New revenue calculation functions
- Permission checking logic
- CSV validation rules
- Date/currency utilities

### Write tests BEFORE fixing bugs:
1. Write failing test that reproduces bug
2. Fix the bug
3. Verify test passes
4. Commit both test and fix

---

## Quick Reference

**Run tests:**
```bash
pnpm test           # Watch mode
pnpm test:run       # Run once
pnpm test:ui        # Visual UI
pnpm test:coverage  # Coverage report
```

**Import common tools:**
```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import Decimal from 'decimal.js'
```

**Test file structure:**
```typescript
describe('ModuleName', () => {
  describe('functionName', () => {
    it('should do something', () => {
      // Arrange
      const input = ...

      // Act
      const result = functionName(input)

      // Assert
      expect(result).toBe(expected)
    })
  })
})
```

---

## Related Skills

- **waterfall-business-logic** - Revenue recognition implementation
- **waterfall-auth** - Permission system implementation
- **waterfall-data-model** - Database schema for test data

---

## Notes

- Tests are in the same directory as the code they test
- Test helpers are in `src/test/utils/`
- Focus on business logic, not UI
- Use Decimal.js for all money calculations in tests
- Mock Supabase for unit tests
- Keep tests simple and readable
