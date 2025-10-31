# Waterfall Hooks

Hooks that enhance Claude Code's capabilities with auto-activation and quality checks.

## Hook Pipeline

### 1. **skill-activation-prompt.md** (UserPromptSubmit)
**Runs:** BEFORE Claude sees your message
**Purpose:** Auto-activate relevant skills based on prompt and file context

- Analyzes your prompt for keywords and intent patterns
- Checks which files are open/edited
- Matches against `skill-rules.json`
- Suggests 1-3 most relevant skills
- Silent when not relevant

**Example:**
```
You: "Create the Prisma schema"
Hook: 🎯 Suggests waterfall-data-model skill
Claude: [Loads skill and responds with schema patterns]
```

---

### 2. **post-tool-use-tracker.md** (PostToolUse)
**Runs:** AFTER every Edit/Write/MultiEdit
**Purpose:** Track file modifications for build checker

- Logs edited files to `.claude/hooks/.edit-log.json`
- Runs silently (no output)
- Used by build-checker hook

**Log Format:**
```json
{
  "lastUpdated": "2025-01-30T10:30:00Z",
  "files": [
    {
      "path": "/absolute/path/to/file.ts",
      "timestamp": "2025-01-30T10:30:00Z",
      "tool": "Edit"
    }
  ]
}
```

---

### 3. **build-checker.md** (Stop)
**Runs:** WHEN Claude finishes responding
**Purpose:** Catch TypeScript errors immediately (#NoMessLeftBehind)

- Reads edit log to see what files were changed
- If TypeScript files edited, runs `npx tsc --noEmit`
- Shows errors if found (1-5 errors) or suggests running tsc (6+ errors)
- Clears edit log after check
- Silent if no errors

**Example Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⚠️  TYPESCRIPT ERRORS DETECTED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Found 2 TypeScript error(s):

app/page.tsx:15:7 - error TS2304: Cannot find name 'user'.
lib/db.ts:8:12 - error TS2345: Argument mismatch.

Please fix these errors before continuing.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

### 4. **error-handling-reminder.md** (Stop)
**Runs:** WHEN Claude finishes responding
**Purpose:** Gentle reminder about error handling patterns

- Scans edited files for risky patterns:
  - API routes without try-catch
  - Database operations without error handling
  - QuickBooks calls without token refresh checks
  - Async functions without error handling
- Shows contextual reminder if patterns detected
- Silent if code already has error handling

**Example Output:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 ERROR HANDLING SELF-CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️  API Route Modified: app/api/contracts/route.ts

   ❓ Did you add try-catch for async operations?
   ❓ Are database operations wrapped in error handling?

   💡 Best Practice:
      Wrap Prisma operations in try-catch blocks
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## Hook Execution Order

```
User sends message
  ↓
[1] skill-activation-prompt runs
  → Suggests relevant skills
  ↓
Claude processes message with skills
  ↓
Claude uses Edit/Write tools
  ↓
[2] post-tool-use-tracker runs (per edit)
  → Logs file changes
  ↓
Claude finishes response
  ↓
[3] build-checker runs
  → Checks TypeScript
  → Shows errors if found
  ↓
[4] error-handling-reminder runs
  → Shows reminder if risky patterns
  ↓
User sees final response
```

---

## Files Created by Hooks

- `.claude/hooks/.edit-log.json` - Temporary file tracking edits
  - Created by: post-tool-use-tracker
  - Read by: build-checker, error-handling-reminder
  - Cleaned up after each check

---

## Benefits

### Skill Auto-Activation
**Before hooks:**
- Skills just sit there unused
- You have to manually invoke them
- Easy to forget they exist

**With hooks:**
- Skills activate automatically
- Contextual suggestions
- Consistent patterns enforced

### Build Checking
**Before hooks:**
- TypeScript errors pile up
- You find them hours later
- "Wait, when did this break?"

**With hooks:**
- Errors caught immediately
- Fix as you go
- Zero errors left behind

### Error Handling
**Before hooks:**
- Easy to forget error handling
- Inconsistent patterns
- Production bugs

**With hooks:**
- Gentle reminders
- Consistent patterns
- Fewer bugs

---

## Customizing Hooks

### Disable a Hook
Move or rename the `.md` file:
```bash
mv skill-activation-prompt.md skill-activation-prompt.md.disabled
```

### Adjust Sensitivity

**build-checker.md:**
- Change error threshold (currently 1-5 show, 6+ suggest running tsc)
- Adjust timeout (currently 30 seconds)

**error-handling-reminder.md:**
- Add/remove risky patterns
- Adjust reminder frequency

### Add New Hooks

1. Create `new-hook.md` in `.claude/hooks/`
2. Add frontmatter with `eventType`
3. Write instructions for Claude
4. Test with relevant actions

**Available Event Types:**
- `UserPromptSubmit` - Before Claude sees message
- `PostToolUse` - After each tool use
- `Stop` - When Claude finishes response

---

## Troubleshooting

### Skills Not Auto-Activating
1. Check `skill-rules.json` exists
2. Verify skill keywords match your prompts
3. Check file path patterns

### Build Checker Not Running
1. Verify `tsconfig.json` exists
2. Check TypeScript is installed (`npx tsc --version`)
3. Look for `.edit-log.json` after edits

### Edit Log Growing Large
- Build checker should clear it after each check
- If it persists, manually delete `.edit-log.json`

---

## Notes

- Hooks run automatically, no manual invocation needed
- Hooks are instructions for Claude, not executable scripts
- Keep hooks efficient - they run frequently
- Be specific in hook instructions - Claude follows them literally
