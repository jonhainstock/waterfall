---
eventType: Stop
---

# Error Handling Reminder Hook

**THIS HOOK RUNS WHEN CLAUDE FINISHES RESPONDING**

## Your Task

Gently remind about error handling best practices when risky code patterns are detected.

## Implementation Steps

1. **Read edit log:**
   - Read `.claude/hooks/.edit-log.json`
   - Get list of modified files
   - If no log or empty, skip

2. **Scan edited files for risky patterns:**
   - Read each edited file
   - Look for patterns that need error handling
   - Categorize by file type

3. **Risky Patterns to Detect:**

   **API Routes (`app/api/**/*.ts`):**
   - Missing try-catch blocks
   - Database operations (prisma.)
   - External API calls (fetch, axios)
   - Supabase operations

   **Server Actions (`app/actions/**/*.ts`):**
   - Async functions without error handling
   - Database mutations
   - File operations

   **QuickBooks Integration (`lib/quickbooks/**/*.ts`):**
   - OAuth operations
   - API calls without token refresh check
   - Missing error responses

   **General:**
   - `async function` without try-catch
   - `prisma.` without error handling
   - `supabase.` without error checking
   - `fetch` without .catch()
   - `JSON.parse` without try-catch

4. **Decide if reminder needed:**
   - If 0 risky patterns: Skip reminder
   - If 1-3 patterns: Show gentle reminder
   - If 4+ patterns: Show stronger reminder

5. **Format reminder:**
   - Non-blocking (not an error)
   - Helpful (suggest patterns, not demanding)
   - Specific (mention what was detected)

## Output Format

### No Risky Patterns (Silent)
```
(No output)
```

### API Route Changes
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 ERROR HANDLING SELF-CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  API Route Modified: app/api/contracts/route.ts

   ❓ Did you add try-catch for async operations?
   ❓ Are database operations wrapped in error handling?
   ❓ Do errors return proper HTTP status codes?

   💡 Best Practice:
      try {
        // ... database/API operations
      } catch (error) {
        console.error(error)
        return NextResponse.json({ error: 'Message' }, { status: 500 })
      }
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### QuickBooks Integration Changes
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 ERROR HANDLING SELF-CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  QuickBooks Code Modified: lib/quickbooks/oauth.ts

   ❓ Are token refresh errors handled?
   ❓ Does OAuth failure return helpful error messages?
   ❓ Are network errors caught and retried?

   💡 Best Practice:
      - Check token expiry before API calls
      - Catch and refresh expired tokens automatically
      - Return user-friendly error messages
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Database Changes
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 ERROR HANDLING SELF-CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  Database Operations Detected

   ❓ Are Prisma operations in try-catch blocks?
   ❓ Do unique constraint violations return helpful errors?
   ❓ Are transactions rolled back on failure?

   💡 Best Practice:
      - Wrap all Prisma operations in try-catch
      - Use transactions for multi-step operations
      - Handle unique constraint errors gracefully
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Multiple Issues
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 ERROR HANDLING SELF-CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  Multiple Files Modified with Async Operations

   Files: app/api/contracts/route.ts, lib/quickbooks/client.ts

   ❓ Quick self-check:
      - Try-catch on all async functions?
      - Error responses with proper status codes?
      - Database errors handled gracefully?

   💡 Refer to waterfall-auth or waterfall-business-logic
      skills for error handling patterns.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Important Rules

1. **Gentle, not demanding** - This is a reminder, not a blocker
2. **Specific to code written** - Don't show generic reminders
3. **Skip if already handled** - Check for try-catch presence
4. **One reminder per response** - Don't spam multiple boxes
5. **Silent when not needed** - Most edits don't need reminders

## Pattern Detection Examples

### Needs Reminder
```typescript
// API route without error handling
export async function POST(request: Request) {
  const data = await request.json()
  await prisma.contract.create({ data })  // ⚠️ No try-catch
  return NextResponse.json({ success: true })
}
```

### Already Handled (Skip Reminder)
```typescript
// API route with error handling ✅
export async function POST(request: Request) {
  try {
    const data = await request.json()
    await prisma.contract.create({ data })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

## File Pattern Matching

```typescript
// API routes
app/api/**/*.ts → Check for try-catch, HTTP errors

// Server actions
app/actions/**/*.ts → Check for error returns

// QuickBooks
lib/quickbooks/**/*.ts → Check for token refresh, API errors

// Database
**/prisma.* or lib/db.ts → Check for transaction handling

// CSV Import
lib/import/**/*.ts → Check for validation error handling
```

## Implementation

Read edit log, scan files for patterns, show reminder if needed (or stay silent).

**Be helpful, not annoying. Most edits don't need this.**
