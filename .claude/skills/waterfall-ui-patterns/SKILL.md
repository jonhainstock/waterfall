# Waterfall UI Patterns

**Domain Skill** - Next.js App Router, shadcn/ui, forms, tables, client vs server components

## Overview

Frontend patterns for Waterfall using Next.js 14 App Router, shadcn/ui, Tailwind CSS, React Hook Form, and TanStack Table.

**When to use this skill:**
- Building React components
- Creating forms with validation
- Building data tables
- Server vs Client component decisions
- Styling with Tailwind + shadcn/ui

## Server vs Client Components

### Default to Server Components

```typescript
// app/[organizationId]/dashboard/page.tsx
// Server Component (default, no "use client")

import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: contracts } = await supabase.from('contracts').select('*')

  return <div>{/* Render contracts */}</div>
}
```

### Use Client Components When Needed

```typescript
// components/contracts/contract-form.tsx
'use client' // Required for interactivity

import { useState } from 'react'
import { useForm } from 'react-hook-form'

export function ContractForm() {
  const [loading, setLoading] = useState(false)
  const form = useForm()

  return <form>{/* Interactive form */}</form>
}
```

**Use "use client" for:**
- Event handlers (onClick, onChange)
- React hooks (useState, useEffect)
- Browser APIs
- Interactive UI

**Resource:** See `resources/shadcn-component-patterns.md`

## Forms with React Hook Form + Zod

```typescript
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const contractSchema = z.object({
  invoiceId: z.string().min(1, 'Required'),
  amount: z.number().positive('Must be positive'),
  startDate: z.date(),
  termMonths: z.number().int().positive(),
})

export function ContractForm() {
  const form = useForm({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      invoiceId: '',
      amount: 0,
      startDate: new Date(),
      termMonths: 12,
    },
  })

  async function onSubmit(data: z.infer<typeof contractSchema>) {
    // Submit to API
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <input {...form.register('invoiceId')} />
      {form.formState.errors.invoiceId && <span>{form.formState.errors.invoiceId.message}</span>}
      {/* More fields */}
    </form>
  )
}
```

**Resource:** See `resources/react-hook-form-zod.md`

## Tables with TanStack Table

```typescript
'use client'

import { useReactTable, getCoreRowModel, flexRender } from '@tanstack/react-table'

export function ContractTable({ data }: { data: Contract[] }) {
  const table = useReactTable({
    data,
    columns: [
      { accessorKey: 'invoiceId', header: 'Invoice ID' },
      { accessorKey: 'customerName', header: 'Customer' },
      { accessorKey: 'contractAmount', header: 'Amount' },
    ],
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <table>
      <thead>
        {table.getHeaderGroups().map((headerGroup) => (
          <tr key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <th key={header.id}>{flexRender(header.column.columnDef.header, header.getContext())}</th>
            ))}
          </tr>
        ))}
      </thead>
      <tbody>
        {table.getRowModel().rows.map((row) => (
          <tr key={row.id}>
            {row.getVisibleCells().map((cell) => (
              <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

**Resource:** See `resources/tanstack-table-patterns.md`

## shadcn/ui Components

```typescript
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormField, FormItem, FormLabel } from '@/components/ui/form'

// Use shadcn components for consistent UI
<Dialog>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Add Contract</DialogTitle>
    </DialogHeader>
    <Form>
      <FormField name="invoiceId" render={({ field }) => (
        <FormItem>
          <FormLabel>Invoice ID</FormLabel>
          <Input {...field} />
        </FormItem>
      )} />
    </Form>
  </DialogContent>
</Dialog>
```

## Resource Files

- `resources/shadcn-component-patterns.md` - Dialog, Table, Form, Toast usage
- `resources/tanstack-table-patterns.md` - Sorting, filtering, pagination
- `resources/react-hook-form-zod.md` - Form validation, error handling
