# Journal Entry Posting

## Create JE

```typescript
const journalEntry = {
  TxnDate: '2025-01-31', // End of month
  Line: [
    {
      DetailType: 'JournalEntryLineDetail',
      Amount: 1000.00,
      JournalEntryLineDetail: {
        PostingType: 'Debit',
        AccountRef: { value: deferredRevenueAccountId },
      },
    },
    {
      DetailType: 'JournalEntryLineDetail',
      Amount: 1000.00,
      JournalEntryLineDetail: {
        PostingType: 'Credit',
        AccountRef: { value: revenueAccountId },
      },
    },
  ],
  PrivateNote: 'Waterfall - Revenue Recognition for January 2025',
}
```

## Error Handling

- Token expired → Refresh → Retry
- Network error → Show error, allow retry
- Invalid account → Prompt to remap

## Mark as Posted

```typescript
await prisma.recognitionSchedule.updateMany({
  where: {
    organizationId,
    recognitionMonth,
    posted: false,
  },
  data: {
    posted: true,
    postedAt: new Date(),
    postedBy: userId,
    journalEntryId: qbJournalEntryId,
  },
})
```
