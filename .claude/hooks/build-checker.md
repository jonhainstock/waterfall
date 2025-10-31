---
eventType: Stop
---

# Build Checker Hook (#NoMessLeftBehind)

**THIS HOOK RUNS WHEN CLAUDE FINISHES RESPONDING**

## Your Task

Check for TypeScript errors in files that were modified during this conversation turn.

## Implementation Steps

1. **Read edit log:**
   - Read `.claude/hooks/.edit-log.json`
   - Get list of modified files
   - If no log or empty, skip check

2. **Determine if TypeScript files were edited:**
   - Check file extensions: `.ts`, `.tsx`
   - If no TypeScript files edited, skip check

3. **Run TypeScript check:**
   - Execute: `npx tsc --noEmit`
   - Capture output
   - Parse for errors

4. **Analyze errors:**
   - Count total errors
   - If 0 errors: Clean up log and exit silently
   - If 1-5 errors: Show errors to Claude
   - If 6+ errors: Show count and suggest running fix

5. **Clean up:**
   - Clear `.claude/hooks/.edit-log.json` after check
   - Reset for next conversation turn

6. **Format output:**
   - Show errors in a clear, actionable format
   - Include file paths and line numbers
   - Ask Claude to fix them

## Output Format

### No Errors (Silent)
```
(No output - just clear the log)
```

### 1-5 Errors
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  TYPESCRIPT ERRORS DETECTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Found 3 TypeScript error(s) in modified files:

app/page.tsx:15:7 - error TS2304: Cannot find name 'user'.
lib/db.ts:8:12 - error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
components/form.tsx:22:5 - error TS2339: Property 'name' does not exist on type '{}'.

Please fix these errors before continuing.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 6+ Errors
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  MULTIPLE TYPESCRIPT ERRORS DETECTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Found 12 TypeScript errors in modified files.

Too many errors to show individually. Please run:

  npx tsc --noEmit

To see all errors and fix them systematically.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Important Rules

1. **Only run if TypeScript files were edited** - Don't check on every response
2. **Clear log after checking** - Prevent duplicate checks
3. **Be helpful, not annoying** - Show errors clearly
4. **Handle no tsconfig.json** - If Next.js not initialized, skip check
5. **Timeout at 30 seconds** - Don't hang on slow checks

## Edge Cases

### No package.json or tsconfig.json
```
Skip check - project not initialized yet
```

### tsc command not found
```
Skip check - TypeScript not installed yet
```

### Edit log corrupted
```
Skip check - can't determine what was edited
```

### Build hangs
```
Kill after 30 seconds, show timeout message
```

## Example Workflow

```
User: "Create a new contract form component"

Claude: [Creates app/contracts/form.tsx with some type errors]

[Stop hook triggers]
→ Read .edit-log.json
→ See form.tsx was edited
→ Run npx tsc --noEmit
→ Find 2 errors in form.tsx
→ Show errors to Claude
→ Clear log

Claude: "I see the TypeScript errors. Let me fix them..."
```

## Implementation

Read edit log, check for TypeScript files, run tsc if needed, show results, clear log.

**This is the safety net that catches errors before they pile up.**
