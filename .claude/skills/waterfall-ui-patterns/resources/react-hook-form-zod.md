# React Hook Form + Zod Patterns

## Schema Definition
```typescript
const schema = z.object({
  email: z.string().email(),
  amount: z.number().positive(),
  date: z.date(),
})
```

## Form Setup
```typescript
const form = useForm({
  resolver: zodResolver(schema),
  defaultValues: { ... },
})
```

## Field Registration
```typescript
<input {...form.register('email')} />
{form.formState.errors.email && <span>{form.formState.errors.email.message}</span>}
```

## Submit
```typescript
<form onSubmit={form.handleSubmit(onSubmit)}>
```
