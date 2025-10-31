# CSV Import & Validation

## Template

```csv
invoice_id,customer_name,description,amount,start_date,end_date,term_months
INV-001,Acme Corp,Annual subscription,12000.00,2025-01-01,2025-12-31,
INV-002,TechStart,Monthly plan,1200.00,2025-01-01,,12
```

## Validation Rules

- `invoice_id`: Required, unique per organization
- `amount`: Required, positive number
- `start_date`: Required, YYYY-MM-DD format
- `end_date` OR `term_months`: One required
- If both provided: Validate they match

## Import Flow

1. Parse CSV with papaparse
2. Validate each row
3. Show preview (valid + errors)
4. User confirms
5. Transaction: Create contracts + schedules
6. Log import result

## Error Handling

- Row-level errors don't block other rows
- Return detailed error messages
- Allow download of error CSV
