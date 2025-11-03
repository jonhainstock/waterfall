/**
 * Currency Input Component
 *
 * Displays formatted currency ($10,000.00) while storing as a number.
 * Works seamlessly with React Hook Form and Zod validation.
 */

'use client'

import * as React from 'react'
import { Input } from './input'
import { cn } from '@/lib/utils'

interface CurrencyInputProps extends Omit<React.ComponentProps<'input'>, 'type' | 'onChange' | 'value'> {
  value: number | undefined
  onChange: (value: number) => void
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState('')
    const [isFocused, setIsFocused] = React.useState(false)

    // Update display value when prop value changes (from form reset, etc.)
    React.useEffect(() => {
      if (!isFocused && value !== undefined && !isNaN(value)) {
        // Format with thousands separators when not focused
        const formatted = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value)
        setDisplayValue(formatted)
      } else if (!isFocused && (value === undefined || isNaN(value))) {
        setDisplayValue('')
      }
    }, [value, isFocused])

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true)
      // Remove formatting when focused for easier editing
      if (value !== undefined && !isNaN(value)) {
        setDisplayValue(value.toString())
      }
      props.onFocus?.(e)
    }

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false)
      // Reformat on blur
      if (value !== undefined && !isNaN(value)) {
        const formatted = new Intl.NumberFormat('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }).format(value)
        setDisplayValue(formatted)
      }
      props.onBlur?.(e)
    }

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const input = e.target.value

      // Allow empty input
      if (input === '') {
        setDisplayValue('')
        onChange(0)
        return
      }

      // Remove all non-numeric characters except decimal point
      const cleaned = input.replace(/[^0-9.]/g, '')

      // Prevent multiple decimal points
      const parts = cleaned.split('.')
      const sanitized = parts.length > 2
        ? parts[0] + '.' + parts.slice(1).join('')
        : cleaned

      // Limit to 2 decimal places
      const [whole, decimal] = sanitized.split('.')
      const limited = decimal !== undefined
        ? `${whole}.${decimal.slice(0, 2)}`
        : sanitized

      setDisplayValue(limited)

      // Parse to number and update form
      const numericValue = parseFloat(limited)
      onChange(isNaN(numericValue) ? 0 : numericValue)
    }

    return (
      <div className="relative flex items-center">
        <span className="absolute left-3 text-sm text-muted-foreground pointer-events-none">
          $
        </span>
        <Input
          {...props}
          ref={ref}
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          className={cn('pl-7', className)}
        />
      </div>
    )
  }
)

CurrencyInput.displayName = 'CurrencyInput'
