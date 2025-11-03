/**
 * Schedule Adjustment Tests
 *
 * Tests for contract editing with posted schedules, focusing on:
 * - Retroactive adjustments (amount changes, date changes)
 * - Orphaned month detection (months removed from schedule)
 * - New past month detection (months added to schedule)
 */

import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import {
  calculateRetroactiveAdjustments,
  calculateCatchUpAdjustment,
  calculateProspectiveAdjustment,
  type AdjustmentEntry,
  type NewSchedule,
} from './schedule-adjustment'

// Helper to create mock schedules
function createMockSchedule(
  month: string,
  amount: number,
  posted: boolean = false,
  isAdjustment: boolean = false
) {
  return {
    id: `schedule-${month}`,
    recognition_month: month,
    recognition_amount: amount,
    posted,
    is_adjustment: isAdjustment,
  }
}

describe('calculateRetroactiveAdjustments', () => {
  describe('Amount changes only (no date changes)', () => {
    it('should calculate adjustments for amount increase', () => {
      const existingSchedules = [
        createMockSchedule('2024-01-01', 1000, true),
        createMockSchedule('2024-02-01', 1000, true),
        createMockSchedule('2024-03-01', 1000, true),
        createMockSchedule('2024-04-01', 1000, false),
        createMockSchedule('2024-05-01', 1000, false),
        createMockSchedule('2024-06-01', 1000, false),
      ]

      // Change from $6,000 to $9,000 (increase of $500/month)
      const result = calculateRetroactiveAdjustments(
        existingSchedules,
        9000, // new amount
        6, // same term
        '2024-01-01', // same start
        'INV-001'
      )

      // Should create 3 adjustment entries for posted months
      expect(result.adjustmentEntries).toHaveLength(3)
      expect(result.adjustmentEntries[0]).toMatchObject({
        month: '2024-01-01',
        amount: 500, // $1,500 - $1,000
        reason: expect.stringContaining('INV-001'),
      })
      expect(result.adjustmentEntries[1]).toMatchObject({
        month: '2024-02-01',
        amount: 500,
      })
      expect(result.adjustmentEntries[2]).toMatchObject({
        month: '2024-03-01',
        amount: 500,
      })

      // Should create 3 new unposted schedules at $1,500/month
      expect(result.unpostedSchedules).toHaveLength(3)
      expect(result.unpostedSchedules[0].recognition_amount).toBe(1500)
      expect(result.unpostedSchedules[1].recognition_amount).toBe(1500)
      expect(result.unpostedSchedules[2].recognition_amount).toBe(1500)
    })

    it('should calculate adjustments for amount decrease', () => {
      const existingSchedules = [
        createMockSchedule('2024-01-01', 1000, true),
        createMockSchedule('2024-02-01', 1000, true),
        createMockSchedule('2024-03-01', 1000, false),
      ]

      // Change from $3,000 to $2,400 (decrease of $200/month)
      const result = calculateRetroactiveAdjustments(
        existingSchedules,
        2400,
        3,
        '2024-01-01',
        'INV-002'
      )

      // Should create 2 adjustment entries with NEGATIVE amounts
      expect(result.adjustmentEntries).toHaveLength(2)
      expect(result.adjustmentEntries[0].amount).toBe(-200) // $800 - $1,000
      expect(result.adjustmentEntries[1].amount).toBe(-200)
    })

    it('should skip adjustments when difference is less than 1 cent', () => {
      const existingSchedules = [
        createMockSchedule('2024-01-01', 1000, true),
        createMockSchedule('2024-02-01', 1000, true),
      ]

      // Same amount, no change
      const result = calculateRetroactiveAdjustments(
        existingSchedules,
        2000,
        2,
        '2024-01-01',
        'INV-003'
      )

      expect(result.adjustmentEntries).toHaveLength(0)
    })
  })

  describe('Start date moves forward (orphaned months)', () => {
    it('should reverse orphaned months when start date moves forward', () => {
      const existingSchedules = [
        createMockSchedule('2024-01-01', 1000, true), // Will be orphaned
        createMockSchedule('2024-02-01', 1000, true), // Will be orphaned
        createMockSchedule('2024-03-01', 1000, true), // Still in range
        createMockSchedule('2024-04-01', 1000, false),
        createMockSchedule('2024-05-01', 1000, false),
        createMockSchedule('2024-06-01', 1000, false),
      ]

      // Change start date from Jan 1 to Mar 1 (removes Jan & Feb)
      const result = calculateRetroactiveAdjustments(
        existingSchedules,
        6000, // same amount
        6, // Adjusted term
        '2024-03-01', // NEW start date
        'INV-004'
      )

      // Should create reversal entries for Jan & Feb (NEGATIVE amounts)
      const janAdjustment = result.adjustmentEntries.find((a) => a.month === '2024-01-01')
      const febAdjustment = result.adjustmentEntries.find((a) => a.month === '2024-02-01')

      expect(janAdjustment).toBeDefined()
      expect(janAdjustment?.amount).toBe(-1000) // Reverse full amount
      expect(janAdjustment?.reason).toContain('removed from schedule')

      expect(febAdjustment).toBeDefined()
      expect(febAdjustment?.amount).toBe(-1000)
      expect(febAdjustment?.reason).toContain('removed from schedule')

      // Mar should still exist (no adjustment if amount unchanged)
      const marAdjustment = result.adjustmentEntries.find((a) => a.month === '2024-03-01')
      if (marAdjustment) {
        // If amount changed, verify it's correct
        expect(Math.abs(marAdjustment.amount)).toBeLessThanOrEqual(1000)
      }
    })

    it('should handle multiple orphaned months at different positions', () => {
      const existingSchedules = [
        createMockSchedule('2024-01-01', 1000, true),
        createMockSchedule('2024-02-01', 1000, true),
        createMockSchedule('2024-03-01', 1000, true),
        createMockSchedule('2024-04-01', 1000, true),
        createMockSchedule('2024-05-01', 1000, false),
        createMockSchedule('2024-06-01', 1000, false),
      ]

      // Change from Jan-Jun to Apr-Sep (removes Jan, Feb, Mar)
      const result = calculateRetroactiveAdjustments(
        existingSchedules,
        6000,
        6,
        '2024-04-01', // Start moved forward by 3 months
        'INV-005'
      )

      // Should reverse all 3 orphaned months
      const reversals = result.adjustmentEntries.filter((a) => a.amount < 0)
      expect(reversals.length).toBeGreaterThanOrEqual(3)

      const janReversal = reversals.find((a) => a.month === '2024-01-01')
      expect(janReversal?.amount).toBe(-1000)
    })
  })

  describe('Start date moves backward (new past months)', () => {
    it('should create unposted schedules for new past months', () => {
      const existingSchedules = [
        createMockSchedule('2024-03-01', 1000, true),
        createMockSchedule('2024-04-01', 1000, true),
        createMockSchedule('2024-05-01', 1000, false),
        createMockSchedule('2024-06-01', 1000, false),
      ]

      // Change from Mar-Jun to Jan-Jun (adds Jan & Feb as past months)
      const result = calculateRetroactiveAdjustments(
        existingSchedules,
        6000,
        6,
        '2024-01-01', // Start moved backward by 2 months
        'INV-006'
      )

      // Should create unposted schedules for Jan & Feb
      const janSchedule = result.unpostedSchedules.find((s) => s.recognition_month === '2024-01-01')
      const febSchedule = result.unpostedSchedules.find((s) => s.recognition_month === '2024-02-01')

      expect(janSchedule).toBeDefined()
      expect(janSchedule?.recognition_amount).toBe(1000)
      expect(janSchedule?.adjustment_reason).toContain('manual review')

      expect(febSchedule).toBeDefined()
      expect(febSchedule?.adjustment_reason).toContain('manual review')
    })
  })

  describe('End date changes', () => {
    it('should handle end date moving backward (shortens term)', () => {
      const existingSchedules = [
        createMockSchedule('2024-01-01', 1000, true),
        createMockSchedule('2024-02-01', 1000, true),
        createMockSchedule('2024-03-01', 1000, true),
        createMockSchedule('2024-04-01', 1000, true),
        createMockSchedule('2024-05-01', 1000, false),
        createMockSchedule('2024-06-01', 1000, false),
      ]

      // Change from 6 months (Jan-Jun) to 4 months (Jan-Apr)
      // May & Jun become orphaned if they were posted (but they're not in this case)
      const result = calculateRetroactiveAdjustments(
        existingSchedules,
        6000, // Keep total same
        4, // Shorten term
        '2024-01-01',
        'INV-007'
      )

      // Should recalculate: $6,000 / 4 months = $1,500/month
      // Jan-Apr posted at $1,000, should be $1,500
      expect(result.adjustmentEntries).toHaveLength(4)
      expect(result.adjustmentEntries[0].amount).toBe(500) // +$500 each
    })

    it('should handle end date moving forward (extends term)', () => {
      const existingSchedules = [
        createMockSchedule('2024-01-01', 1000, true),
        createMockSchedule('2024-02-01', 1000, true),
        createMockSchedule('2024-03-01', 1000, false),
      ]

      // Change from 3 months to 6 months
      const result = calculateRetroactiveAdjustments(
        existingSchedules,
        6000,
        6, // Extended term
        '2024-01-01',
        'INV-008'
      )

      // Should recalculate: $6,000 / 6 months = $1,000/month (no change for posted)
      // But should add Apr, May, Jun as unposted
      expect(result.unpostedSchedules.length).toBeGreaterThanOrEqual(3)
    })
  })

  describe('Date AND amount changes together', () => {
    it('should handle start date forward + amount increase', () => {
      const existingSchedules = [
        createMockSchedule('2024-01-01', 1000, true),
        createMockSchedule('2024-02-01', 1000, true),
        createMockSchedule('2024-03-01', 1000, true),
        createMockSchedule('2024-04-01', 1000, false),
        createMockSchedule('2024-05-01', 1000, false),
        createMockSchedule('2024-06-01', 1000, false),
      ]

      // Change: Jan-Jun $6,000 → Feb-Jul $9,000
      // Jan becomes orphaned
      // Feb-Jul at $1,285.71/month (rounded)
      const result = calculateRetroactiveAdjustments(
        existingSchedules,
        9000,
        6,
        '2024-02-01', // Start moved forward
        'INV-009'
      )

      // Should reverse Jan
      const janReversal = result.adjustmentEntries.find((a) => a.month === '2024-01-01')
      expect(janReversal).toBeDefined()
      expect(janReversal?.amount).toBe(-1000)

      // Should adjust Feb (from $1,000 to ~$1,500)
      const febAdjustment = result.adjustmentEntries.find((a) => a.month === '2024-02-01')
      expect(febAdjustment).toBeDefined()
      expect(febAdjustment?.amount).toBeGreaterThan(400) // Approximately +$500
    })
  })

  describe('Complete date range shift', () => {
    it('should reverse all posted months when date range completely shifts', () => {
      const existingSchedules = [
        createMockSchedule('2024-01-01', 1000, true),
        createMockSchedule('2024-02-01', 1000, true),
        createMockSchedule('2024-03-01', 1000, true),
      ]

      // Completely new date range: Sep-Nov 2024
      const result = calculateRetroactiveAdjustments(
        existingSchedules,
        3000,
        3,
        '2024-09-01', // Completely different start
        'INV-010'
      )

      // Should reverse ALL posted months
      expect(result.adjustmentEntries).toHaveLength(3)
      expect(result.adjustmentEntries.every((a) => a.amount === -1000)).toBe(true)

      // Should create all new unposted schedules
      expect(result.unpostedSchedules).toHaveLength(3)
      expect(result.unpostedSchedules[0].recognition_month).toBe('2024-09-01')
      expect(result.unpostedSchedules[1].recognition_month).toBe('2024-10-01')
      expect(result.unpostedSchedules[2].recognition_month).toBe('2024-11-01')
    })
  })

  describe('Rounding adjustments', () => {
    it('should handle rounding correctly when dates change', () => {
      const existingSchedules = [
        createMockSchedule('2024-01-01', 833.33, true),
        createMockSchedule('2024-02-01', 833.33, true),
        createMockSchedule('2024-03-01', 833.33, true),
        createMockSchedule('2024-04-01', 833.33, false),
        // ... rest would have 833.33 except last at 833.37
      ]

      // $10,000 / 12 months = $833.33 x 11 + $833.37
      // Change to different amount
      const result = calculateRetroactiveAdjustments(
        existingSchedules,
        15000,
        12,
        '2024-01-01',
        'INV-011'
      )

      // Should adjust posted months correctly
      // $15,000 / 12 = $1,250/month
      expect(result.adjustmentEntries[0].amount).toBeCloseTo(416.67, 2) // $1,250 - $833.33
    })
  })

  describe('Ignore adjustment schedules', () => {
    it('should ignore existing adjustment schedules when calculating', () => {
      const existingSchedules = [
        createMockSchedule('2024-01-01', 1000, true, false), // Original
        createMockSchedule('2024-01-01', 100, true, true), // Adjustment (should be ignored)
        createMockSchedule('2024-02-01', 1000, true, false),
      ]

      const result = calculateRetroactiveAdjustments(
        existingSchedules,
        3000,
        2,
        '2024-01-01',
        'INV-012'
      )

      // Should only consider original schedules (2 months)
      // Not the adjustment schedule
      expect(result.adjustmentEntries.length).toBeLessThanOrEqual(2)
    })
  })
})

describe('calculateCatchUpAdjustment', () => {
  it('should absorb difference in catch-up month', () => {
    const existingSchedules = [
      createMockSchedule('2024-01-01', 1000, true),
      createMockSchedule('2024-02-01', 1000, true),
      createMockSchedule('2024-03-01', 1000, false),
    ]

    // Change from $3,000 to $4,500, catch up in March
    const result = calculateCatchUpAdjustment(
      existingSchedules,
      4500,
      3,
      '2024-01-01',
      '2024-03-01',
      'INV-013'
    )

    // March should get base amount + difference
    // Base: $1,500, Difference: $4,500 - $2,000 = $2,500
    // March: $1,500 + $2,500 = $4,000
    const marchSchedule = result.unpostedSchedules.find((s) => s.recognition_month === '2024-03-01')
    expect(marchSchedule?.recognition_amount).toBeCloseTo(4000, 0)
  })
})

describe('calculateProspectiveAdjustment', () => {
  it('should spread difference evenly over unposted months', () => {
    const existingSchedules = [
      createMockSchedule('2024-01-01', 1000, true),
      createMockSchedule('2024-02-01', 1000, true),
      createMockSchedule('2024-03-01', 1000, false),
      createMockSchedule('2024-04-01', 1000, false),
    ]

    // Change from $4,000 to $5,000
    // Posted: $2,000 (Jan-Feb)
    // Remaining: $3,000 over 2 months = $1,500/month
    const result = calculateProspectiveAdjustment(
      existingSchedules,
      5000,
      4,
      '2024-01-01',
      'INV-014'
    )

    expect(result.unpostedSchedules).toHaveLength(2)
    expect(result.unpostedSchedules[0].recognition_amount).toBe(1500)
    expect(result.unpostedSchedules[1].recognition_amount).toBe(1500)
  })
})
