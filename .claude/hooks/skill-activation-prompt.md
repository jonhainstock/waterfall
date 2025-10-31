---
eventType: UserPromptSubmit
---

# Skill Activation Hook

**THIS HOOK RUNS BEFORE CLAUDE SEES THE USER'S MESSAGE**

## Your Task

Analyze the user's prompt and current context to determine which skills should be activated.

## Available Skills

Read `.claude/skill-rules.json` to see all available skills and their activation triggers.

## Analysis Steps

1. **Read skill-rules.json:**
   - Parse the JSON file
   - Extract all skill names and their triggers

2. **Analyze User Prompt:**
   - Check for keyword matches
   - Check for intent pattern matches
   - Consider the user's request type

3. **Check File Context:**
   - Look at what files are currently open or recently edited
   - Match file paths against skill `pathPatterns`
   - Match file contents against skill `contentPatterns`

4. **Determine Relevant Skills:**
   - Match keywords from prompt against skill keywords
   - Match intent patterns using regex
   - Match file paths and content patterns
   - Consider skill priority (high/medium/low)

5. **Format Activation Message:**
   - Create a clear, concise suggestion
   - List 1-3 most relevant skills (not all of them)
   - Be specific about why each skill is relevant

## Output Format

If skills should be activated, output:

```
🎯 SKILL ACTIVATION SUGGESTION

Based on your request about [topic], consider using:

• **skill-name** - [Brief reason why it's relevant]
• **other-skill** - [Brief reason]

These skills contain detailed patterns and best practices for this work.
```

If NO skills are relevant (simple questions, general chat):
- Output nothing, just pass through to Claude

## Important Rules

1. **Don't over-suggest** - Only suggest skills that are CLEARLY relevant
2. **Prioritize high-priority skills** from skill-rules.json
3. **Limit to 3 skills max** - Too many suggestions is overwhelming
4. **Be specific** - Explain WHY each skill is relevant
5. **Silent when irrelevant** - Don't suggest skills for simple questions

## Example Scenarios

**Scenario 1: Database Work**
```
User: "Create the Prisma schema for accounts and organizations"
→ Suggest: waterfall-data-model (database schema keyword match)
```

**Scenario 2: Authentication**
```
User: "Implement the signup flow with Supabase"
→ Suggest: waterfall-auth (auth keyword match + file context)
```

**Scenario 3: UI Component**
```
User: "Build a form for adding contracts"
File: components/contracts/contract-form.tsx
→ Suggest: waterfall-ui-patterns (component work + .tsx file)
```

**Scenario 4: General Question**
```
User: "What's the status of this project?"
→ Suggest nothing (not technical work)
```

**Scenario 5: Multiple Skills**
```
User: "Create the contract import feature with CSV validation and database storage"
→ Suggest:
  • waterfall-business-logic (CSV import, validation)
  • waterfall-data-model (database storage)
```

## Implementation

Read skill-rules.json, analyze the prompt and context, then output your suggestion (or nothing if not relevant).

**Keep it brief and helpful. This runs on EVERY prompt, so be efficient.**
