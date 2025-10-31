# Revenue Recognition Calculations

## Core Formula

```typescript
import Decimal from 'decimal.js'

monthly_recognition = contract_amount ÷ term_months
```

## Calculate Term Months

```typescript
import { differenceInMonths } from 'date-fns'

function calculateTermMonths(startDate: Date, endDate: Date): number {
  return differenceInMonths(endDate, startDate) + 1 // Inclusive
}
```

## Handle Rounding Errors

```typescript
function adjustForRounding(
  contractAmount: Decimal,
  monthlyRecognition: Decimal,
  termMonths: number
): Decimal[] {
  const amounts = Array(termMonths).fill(monthlyRecognition)
  const total = monthlyRecognition.times(termMonths)
  const difference = contractAmount.minus(total)

  if (!difference.isZero()) {
    amounts[termMonths - 1] = amounts[termMonths - 1].plus(difference)
  }

  return amounts
}
```

## Edge Cases

- Contract starts mid-month: Still recognize full month (V1 simplification)
- End date before start date: Validation error
- Zero or negative amount: Validation error
- Term less than 1 month: Validation error
