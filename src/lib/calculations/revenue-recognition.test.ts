/**
 * Revenue Recognition Calculation Tests
 *
 * Tests for the core business logic of revenue recognition using straight-line method.
 */

import { describe, it, expect } from 'vitest'
import Decimal from 'decimal.js'
import {
  calculateMonthlyRecognition,
  generateRecognitionSchedule,
  calculateTotalRecognized,
  calculateDeferredRevenue,
} from './revenue-recognition'

describe('calculateMonthlyRecognition', () => {
  it('should calculate monthly recognition for evenly divisible amounts', () => {
    const result = calculateMonthlyRecognition(12000, 12)
    expect(result).toBe('1000.00')
  })

  it('should calculate monthly recognition for amounts with decimals', () => {
    const result = calculateMonthlyRecognition(10000, 12)
    expect(result).toBe('833.33')
  })

  it('should handle string input for contract amount', () => {
    const result = calculateMonthlyRecognition('12000.00', 12)
    expect(result).toBe('1000.00')
  })

  it('should round to 2 decimal places', () => {
    const result = calculateMonthlyRecognition(100, 3)
    expect(result).toBe('33.33')
  })

  it('should throw error for zero term months', () => {
    expect(() => calculateMonthlyRecognition(12000, 0)).toThrow(
      'Term months must be greater than 0'
    )
  })

  it('should throw error for negative term months', () => {
    expect(() => calculateMonthlyRecognition(12000, -1)).toThrow(
      'Term months must be greater than 0'
    )
  })

  it('should handle large contract amounts accurately', () => {
    const result = calculateMonthlyRecognition(1000000, 36)
    expect(result).toBe('27777.78')
  })

  it('should handle small contract amounts', () => {
    const result = calculateMonthlyRecognition(99.99, 12)
    expect(result).toBe('8.33')
  })
})

describe('generateRecognitionSchedule', () => {
  it('should generate schedule with equal amounts for evenly divisible contracts', () => {
    const schedule = generateRecognitionSchedule(12000, 12)

    expect(schedule).toHaveLength(12)
    expect(schedule.every((amount) => amount === '1000.00')).toBe(true)
  })

  it('should adjust last month for rounding differences', () => {
    const schedule = generateRecognitionSchedule(10000, 12)

    expect(schedule).toHaveLength(12)

    // First 11 months should be 833.33
    for (let i = 0; i < 11; i++) {
      expect(schedule[i]).toBe('833.33')
    }

    // Last month should be adjusted: 10000 - (833.33 * 11) = 833.37
    expect(schedule[11]).toBe('833.37')
  })

  it('should ensure total equals contract amount', () => {
    const schedule = generateRecognitionSchedule(10000, 12)

    // Use Decimal for accurate summation
    const total = schedule
      .reduce((sum, amount) => sum.plus(amount), new Decimal(0))
      .toNumber()

    expect(total).toBe(10000)
  })

  it('should handle contract with 1 month term', () => {
    const schedule = generateRecognitionSchedule(1000, 1)

    expect(schedule).toHaveLength(1)
    expect(schedule[0]).toBe('1000.00')
  })

  it('should handle 36 month contract', () => {
    const schedule = generateRecognitionSchedule(36000, 36)

    expect(schedule).toHaveLength(36)
    expect(schedule.every((amount) => amount === '1000.00')).toBe(true)
  })

  it('should throw error for invalid term months', () => {
    expect(() => generateRecognitionSchedule(12000, 0)).toThrow(
      'Term months must be greater than 0'
    )
  })

  it('should handle edge case: 100 divided by 3', () => {
    const schedule = generateRecognitionSchedule(100, 3)

    expect(schedule).toHaveLength(3)
    expect(schedule[0]).toBe('33.33')
    expect(schedule[1]).toBe('33.33')
    expect(schedule[2]).toBe('33.34') // Adjusted for rounding

    // Use Decimal for accurate summation
    const total = schedule
      .reduce((sum, amount) => sum.plus(amount), new Decimal(0))
      .toNumber()
    expect(total).toBe(100)
  })
})

describe('calculateTotalRecognized', () => {
  it('should calculate total for multiple months', () => {
    const result = calculateTotalRecognized(1000, 6)
    expect(result).toBe('6000.00')
  })

  it('should calculate total for zero months elapsed', () => {
    const result = calculateTotalRecognized(1000, 0)
    expect(result).toBe('0.00')
  })

  it('should handle string input', () => {
    const result = calculateTotalRecognized('833.33', 12)
    expect(result).toBe('9999.96')
  })

  it('should throw error for negative months', () => {
    expect(() => calculateTotalRecognized(1000, -1)).toThrow(
      'Months elapsed cannot be negative'
    )
  })

  it('should handle decimal monthly amounts', () => {
    const result = calculateTotalRecognized(833.33, 11)
    expect(result).toBe('9166.63')
  })
})

describe('calculateDeferredRevenue', () => {
  it('should calculate remaining deferred revenue', () => {
    const result = calculateDeferredRevenue(12000, 3000)
    expect(result).toBe('9000.00')
  })

  it('should handle zero recognized amount', () => {
    const result = calculateDeferredRevenue(12000, 0)
    expect(result).toBe('12000.00')
  })

  it('should handle fully recognized contract', () => {
    const result = calculateDeferredRevenue(12000, 12000)
    expect(result).toBe('0.00')
  })

  it('should handle string inputs', () => {
    const result = calculateDeferredRevenue('12000.00', '3000.00')
    expect(result).toBe('9000.00')
  })

  it('should handle decimal amounts', () => {
    const result = calculateDeferredRevenue(10000, 833.33)
    expect(result).toBe('9166.67')
  })

  it('should maintain precision with large amounts', () => {
    const result = calculateDeferredRevenue(1000000, 250000.25)
    expect(result).toBe('749999.75')
  })
})

// Integration test: Full contract lifecycle
describe('Revenue Recognition Integration', () => {
  it('should correctly calculate a complete 12-month contract lifecycle', () => {
    const contractAmount = 12000
    const termMonths = 12

    // Generate schedule
    const schedule = generateRecognitionSchedule(contractAmount, termMonths)
    expect(schedule).toHaveLength(12)

    // Calculate monthly amount
    const monthlyAmount = calculateMonthlyRecognition(contractAmount, termMonths)
    expect(monthlyAmount).toBe('1000.00')

    // After 6 months
    const recognizedAt6 = calculateTotalRecognized(monthlyAmount, 6)
    expect(recognizedAt6).toBe('6000.00')

    const deferredAt6 = calculateDeferredRevenue(contractAmount, recognizedAt6)
    expect(deferredAt6).toBe('6000.00')

    // After 12 months
    const recognizedAt12 = calculateTotalRecognized(monthlyAmount, 12)
    expect(recognizedAt12).toBe('12000.00')

    const deferredAt12 = calculateDeferredRevenue(contractAmount, recognizedAt12)
    expect(deferredAt12).toBe('0.00')
  })

  it('should handle complex contract with rounding adjustments', () => {
    const contractAmount = 10000
    const termMonths = 12

    // Generate schedule
    const schedule = generateRecognitionSchedule(contractAmount, termMonths)

    // Sum schedule to verify it equals contract amount (use Decimal for accuracy)
    const scheduleTotal = schedule
      .reduce((sum, amount) => sum.plus(amount), new Decimal(0))
      .toNumber()
    expect(scheduleTotal).toBe(contractAmount)

    // Verify first month
    expect(schedule[0]).toBe('833.33')

    // Verify last month has adjustment
    expect(schedule[11]).toBe('833.37')
  })
})
