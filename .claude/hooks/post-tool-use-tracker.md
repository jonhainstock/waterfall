---
eventType: PostToolUse
---

# Post Tool Use Tracker

**THIS HOOK RUNS AFTER EACH TOOL USE (Edit, Write, MultiEdit)**

## Your Task

Track file modifications for the build checker. Create/update a log file that the build checker will read.

## Which Tools to Track

Track these tool uses:
- `Edit` - File edits
- `Write` - File writes
- `MultiEdit` - Multiple file edits

Ignore other tools (Read, Bash, Grep, etc.)

## Log File Location

`.claude/hooks/.edit-log.json`

## Log Format

```json
{
  "lastUpdated": "ISO timestamp",
  "files": [
    {
      "path": "/absolute/path/to/file.ts",
      "timestamp": "ISO timestamp",
      "tool": "Edit|Write|MultiEdit"
    }
  ]
}
```

## Implementation Steps

1. **Check if tracked tool was used:**
   - If not Edit/Write/MultiEdit, do nothing

2. **Extract file path(s):**
   - From tool parameters
   - Get absolute path

3. **Read existing log (if exists):**
   - Read `.claude/hooks/.edit-log.json`
   - Parse JSON
   - If doesn't exist, start with empty structure

4. **Add new entry:**
   - Append file path with current timestamp
   - Update `lastUpdated`

5. **Write log back:**
   - Save to `.claude/hooks/.edit-log.json`

6. **Output nothing:**
   - This hook runs silently
   - Don't show messages to user

## Important Rules

1. **Silent operation** - Don't output anything to user
2. **Append only** - Don't remove old entries (build checker will clean up)
3. **Absolute paths** - Always store full absolute paths
4. **Handle errors gracefully** - If log file is corrupted, start fresh
5. **Efficient** - This runs after EVERY edit, keep it fast

## Example

After Edit tool on `app/page.tsx`:

```json
{
  "lastUpdated": "2025-01-30T10:30:00Z",
  "files": [
    {
      "path": "/Users/jonhainstock/Development/waterfall/app/page.tsx",
      "timestamp": "2025-01-30T10:30:00Z",
      "tool": "Edit"
    }
  ]
}
```

After another Write on `lib/db.ts`:

```json
{
  "lastUpdated": "2025-01-30T10:35:00Z",
  "files": [
    {
      "path": "/Users/jonhainstock/Development/waterfall/app/page.tsx",
      "timestamp": "2025-01-30T10:30:00Z",
      "tool": "Edit"
    },
    {
      "path": "/Users/jonhainstock/Development/waterfall/lib/db.ts",
      "timestamp": "2025-01-30T10:35:00Z",
      "tool": "Write"
    }
  ]
}
```

## Implementation

Check the tool type, extract file paths, update log file, and exit silently.

**This runs frequently - keep it fast and silent.**
