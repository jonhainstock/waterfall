# Waterfall Agents

Specialized autonomous agents for complex, multi-step tasks.

## What Are Agents?

Agents are autonomous Claude instances that work in the background to complete specific tasks. Unlike regular Claude conversations, agents:

- **Work independently** - You give them a task, they research and execute
- **Have specialized roles** - Each agent is an expert in one domain
- **Return complete reports** - They work and come back with results
- **Can't be interrupted** - They run to completion (or you can view output mid-run)

## Available Agents

### 1. strategic-plan-architect 📋

**Use when:** Starting a new feature or large task
**Model:** Sonnet (complex planning)

**What it does:**
- Researches codebase for context
- Analyzes requirements
- Creates comprehensive implementation plan with phases, file structure, risks

**Example usage:**
```
Launch strategic-plan-architect agent:

"Create a plan for implementing the CSV contract import feature with
validation, preview, and batch creation."
```

**Returns:**
- Executive summary
- Technical approach
- Implementation phases (3-5 phases with specific tasks)
- File structure
- Database changes needed
- API routes
- Testing strategy
- Risks and mitigations
- Success metrics

**Time:** 5-10 minutes

---

### 2. code-architecture-reviewer 🔍

**Use when:** Code review needed before committing
**Model:** Sonnet (comprehensive review)

**What it does:**
- Reviews code for security, patterns, quality
- Checks adherence to Waterfall patterns
- Validates multi-tenant security
- Identifies issues by severity (Critical/Warning/Suggestion)

**Example usage:**
```
Launch code-architecture-reviewer agent:

"Review the contract import feature I just built. Check for security issues,
pattern adherence, and code quality."
```

**Returns:**
- Critical issues (security, data integrity)
- Warnings (quality, maintainability)
- Suggestions (improvements)
- Positive highlights
- Overall recommendation (approve/needs changes)

**Time:** 5-10 minutes

---

### 3. build-error-resolver 🔧

**Use when:** TypeScript errors need systematic fixing
**Model:** Haiku (quick, efficient)

**What it does:**
- Runs `npx tsc --noEmit`
- Categorizes errors by type
- Fixes errors systematically
- Verifies after each batch
- Repeats until clean build

**Example usage:**
```
Launch build-error-resolver agent:

"Fix all TypeScript errors in the project."
```

**Returns:**
- Starting error count
- Fixes applied (categorized)
- Final clean build confirmation
- Summary of changes

**Time:** 1-2 minutes per error

---

### 4. auth-route-tester 🔐

**Use when:** Testing API routes for security
**Model:** Haiku (quick testing)

**What it does:**
- Tests unauthenticated access (should 401)
- Tests unauthorized access (should 403)
- Tests authorized access with different roles
- Tests input validation
- Tests edge cases

**Example usage:**
```
Launch auth-route-tester agent:

"Test the POST /api/organizations/[id]/contracts route for authentication
and authorization."
```

**Returns:**
- Test results for each scenario (pass/fail)
- Issues found
- Security assessment
- Recommendations

**Time:** 3-5 minutes

---

### 5. frontend-debugger 🐛

**Use when:** Frontend errors or React issues
**Model:** Sonnet (complex debugging)

**What it does:**
- Identifies error type (Server/Client mismatch, React, data fetching, etc.)
- Analyzes root cause
- Applies fix
- Tests the fix
- Documents prevention

**Example usage:**
```
Launch frontend-debugger agent:

"Fix the hydration error on the contracts page."
```

**Returns:**
- Error identification
- Root cause analysis
- Fix applied (with before/after code)
- Testing confirmation
- Prevention advice

**Time:** 5-10 minutes

---

### 6. documentation-architect 📚

**Use when:** Documentation needed for features/APIs
**Model:** Sonnet (comprehensive writing)

**What it does:**
- Creates feature documentation
- Writes API documentation
- Documents architecture decisions
- Creates workflow diagrams (in markdown)

**Example usage:**
```
Launch documentation-architect agent:

"Document the contract import feature including user workflow,
technical implementation, and API endpoints."
```

**Returns:**
- Complete markdown documentation
- Suggested file location
- Code examples
- Diagrams (if applicable)

**Time:** 5-10 minutes

---

## How to Use Agents

### Method 1: Via Main Conversation

```
You: "I need a plan for the QuickBooks integration feature"
Claude: "I'll launch the strategic-plan-architect agent for you"
[Agent runs in background]
[Agent returns with complete plan]
Claude: "Here's the comprehensive plan the agent created..."
```

### Method 2: Direct Launch

In Claude Code, use the Task tool:
```
Launch strategic-plan-architect: "Plan the CSV import feature"
```

### Method 3: Sequential Agents

Common workflow:
1. **strategic-plan-architect** - Create plan
2. [Review plan, start implementation]
3. **code-architecture-reviewer** - Review code
4. **build-error-resolver** - Fix any TypeScript errors
5. **auth-route-tester** - Test security
6. **documentation-architect** - Document feature

---

## Agent Workflows

### New Feature Workflow

```
1. Planning
   → strategic-plan-architect
   → Review plan with user
   → Approve or revise

2. Implementation
   → Build feature (main Claude)
   → Create code

3. Quality Check
   → code-architecture-reviewer
   → Fix critical issues
   → build-error-resolver (if needed)

4. Testing
   → auth-route-tester (for API routes)
   → Manual testing

5. Documentation
   → documentation-architect
   → Create docs

6. Done! ✅
```

### Debug/Fix Workflow

```
1. Identify Issue
   → User reports error

2. Diagnose
   → frontend-debugger (if frontend)
   → build-error-resolver (if TypeScript)

3. Fix
   → Agent applies fix
   → Verifies fix works

4. Review
   → code-architecture-reviewer
   → Ensure no new issues

5. Done! ✅
```

---

## Tips for Working with Agents

### ✅ DO:

- **Be specific** - "Plan the CSV import feature with validation and preview" (not "help with imports")
- **Let them finish** - Agents work best when completing their full task
- **Review their output** - Agents are smart but not perfect
- **Use the right agent** - Match the task to the specialist
- **Chain agents** - Use multiple agents for complex workflows

### ❌ DON'T:

- **Don't interrupt** - Let agents complete their work
- **Don't over-specify** - Trust the agent's process (they know their job)
- **Don't use for simple tasks** - Agents are for complex, multi-step work
- **Don't skip review** - Always review agent output before proceeding

---

## Agent Characteristics

| Agent | Model | Speed | Autonomy | Best For |
|-------|-------|-------|----------|----------|
| strategic-plan-architect | Sonnet | Medium | High | Complex planning |
| code-architecture-reviewer | Sonnet | Medium | High | Thorough reviews |
| build-error-resolver | Haiku | Fast | High | Quick fixes |
| auth-route-tester | Haiku | Fast | Medium | Security testing |
| frontend-debugger | Sonnet | Medium | High | React debugging |
| documentation-architect | Sonnet | Medium | High | Documentation |

**Model Types:**
- **Sonnet** - Powerful, thorough, best for complex tasks
- **Haiku** - Fast, efficient, best for straightforward tasks

---

## Monitoring Agents

While agents run in the background, you can:

1. **View live output** - Some Claude Code interfaces show agent progress
2. **Wait for completion** - Agents signal when done
3. **Review final report** - Agents always return a structured report

---

## Creating Custom Agents

Want to add a new agent for Waterfall-specific tasks?

1. Create `.claude/agents/my-agent.md`
2. Add frontmatter:
   ```yaml
   ---
   name: my-agent
   description: What the agent does
   model: sonnet  # or haiku
   ---
   ```
3. Write detailed instructions (what to do, what to return)
4. Test the agent
5. Update this README

---

## Troubleshooting

### Agent Returns Incomplete Results

- Agent might have hit context limits
- Re-run with narrower scope
- Use multiple smaller agents instead of one large task

### Agent Doesn't Follow Patterns

- Ensure agent has access to relevant skills
- Update agent instructions to reference skills
- Be more specific in task description

### Agent Takes Too Long

- Consider using Haiku model instead of Sonnet
- Break task into smaller agent tasks
- Some tasks are just complex (e.g., planning large features)

---

## Best Practices

### Planning Large Features

```
1. Use strategic-plan-architect first
2. Review plan thoroughly
3. Ask clarifying questions
4. Revise plan if needed
5. THEN start implementing
```

### Code Quality

```
1. Build feature
2. Run code-architecture-reviewer
3. Fix critical issues
4. Run build-error-resolver
5. Commit clean code
```

### Testing & Documentation

```
1. Test manually first
2. Use auth-route-tester for API security
3. Use documentation-architect for docs
4. Review and adjust documentation
```

---

## Summary

Agents are your specialized team members:

- 📋 **Planner** (strategic-plan-architect) - Creates detailed plans
- 🔍 **Reviewer** (code-architecture-reviewer) - Reviews code quality
- 🔧 **Fixer** (build-error-resolver) - Fixes TypeScript errors
- 🔐 **Tester** (auth-route-tester) - Tests API security
- 🐛 **Debugger** (frontend-debugger) - Fixes React/frontend issues
- 📚 **Writer** (documentation-architect) - Creates documentation

Use them wisely, review their work, and they'll dramatically improve your development workflow.

**Remember:** Agents work FOR you, not INSTEAD of you. Review, question, and iterate with them.
