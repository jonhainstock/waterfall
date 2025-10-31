# TanStack Table Patterns

## Basic Setup
```typescript
const table = useReactTable({
  data,
  columns,
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
})
```

## Sorting
```typescript
{
  accessorKey: 'amount',
  header: ({ column }) => (
    <button onClick={() => column.toggleSorting()}>
      Amount {column.getIsSorted() === 'asc' ? '↑' : '↓'}
    </button>
  ),
}
```

## Pagination
```typescript
const table = useReactTable({
  ...config,
  getPaginationRowModel: getPaginationRowModel(),
  state: {
    pagination: { pageIndex: 0, pageSize: 50 },
  },
})
```
