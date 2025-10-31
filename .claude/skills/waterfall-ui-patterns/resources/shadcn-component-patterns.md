# shadcn/ui Component Patterns

## Install Components

```bash
npx shadcn-ui@latest add button dialog form input table
```

## Common Patterns

### Dialog (Modal)
```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

<Dialog>
  <DialogTrigger asChild>
    <Button>Open</Button>
  </DialogTrigger>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
    </DialogHeader>
    {/* Content */}
  </DialogContent>
</Dialog>
```

### Toast (Notifications)
```typescript
import { useToast } from '@/components/ui/use-toast'

const { toast } = useToast()

toast({
  title: 'Success',
  description: 'Contract created',
})
```
