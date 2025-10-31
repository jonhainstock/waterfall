# Waterfall - Project Guide

**Multi-tenant SaaS for automated revenue recognition and QuickBooks integration**

> For detailed technical patterns, use the Skills system. This file contains project-specific commands and workflows.

---

## Quick Start

### Tech Stack

- Next.js 16 (App Router) + TypeScript
- Supabase (PostgreSQL + Auth + RLS)
- shadcn/ui + Tailwind CSS
- QuickBooks Online API
- Vercel deployment

### Skills System

All technical patterns are in **Skills** (auto-activate based on context):

- **waterfall-overview** - Architecture, project structure, quick reference
- **waterfall-data-model** - Database schema, RLS policies, Supabase
- **waterfall-auth** - Authentication, permissions, roles, team management
- **waterfall-business-logic** - Revenue recognition, CSV import, QuickBooks
- **waterfall-ui-patterns** - React components, forms, tables, shadcn/ui
- **waterfall-testing** - Vitest patterns, unit tests, mocking strategies
- **skill-developer** - Create/update skills as project evolves

**Skills auto-activate** when you work on related files or mention keywords. Reference them explicitly when needed.

---

## Application vs Marketing Site

**IMPORTANT:** This repository contains ONLY the application code.

### Separation of Concerns

- **This Repo (Waterfall App):**
  - Authenticated user flows
  - Login/signup (unauthenticated entry points)
  - Dashboard, contracts, schedules
  - QuickBooks integration
  - Team management
  - Deployed to: app.waterfallhq.com (example)

- **Separate Repo (Marketing Site):**
  - Public landing page
  - Pricing page
  - About, features, testimonials
  - Blog (if needed)
  - Deployed to: waterfallhq.com (example)

### Root Route Behavior

The root route (`/`) in THIS repo serves the **application entry point**:

- **Unauthenticated users** → Show login/signup options
- **Authenticated users** → Redirect to dashboard or organizations

NO marketing content lives in this repository. All public-facing marketing materials are in a separate codebase.

### Authentication with Supabase

This application uses **Supabase Authentication** for:
- User signup and login
- Session management
- Password reset flows
- Team invitation acceptance

All auth flows are handled through Supabase client libraries (`@supabase/supabase-js` and `@supabase/ssr`).

---

## Project Commands

### Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

### Supabase

```bash
# Generate TypeScript types from Supabase
npx supabase gen types typescript --project-id PROJECT_ID > types/supabase.ts
```

### Testing

```bash
# Run tests in watch mode
pnpm test

# Run tests once (CI mode)
pnpm test:run

# Run tests with UI
pnpm test:ui

# Run tests with coverage report
pnpm test:coverage
```

### Next.js MCP (Model Context Protocol)

**Automatic real-time access to dev server:**

The Next.js MCP server (configured in `.mcp.json`) gives Claude live access to:
- Build errors (TypeScript, ESLint)
- Runtime errors (browser console)
- Page metadata (routes, components, Server Actions)
- Development logs

**Available MCP Tools:**
```typescript
mcp__next-devtools__get_errors        // Current build/runtime errors
mcp__next-devtools__get_logs          // Dev log file path
mcp__next-devtools__get_page_metadata // Route information
mcp__next-devtools__get_project_metadata // Project config
mcp__next-devtools__get_server_action_by_id // Server Action source
```

**Auto-activates** when dev server runs (`pnpm dev`). No manual setup required.

**Integration with hooks:**
- **build-checker** hook uses MCP to get errors in real-time
- **build-error-resolver** agent uses MCP for live error feed
- Faster than running `tsc` separately

---

## Development Workflow

### Planning Mode

**Always plan before implementing features.**

1. Enter planning mode (or use strategic-plan-architect agent)
2. Research codebase, gather context
3. Create comprehensive plan
4. **Review plan thoroughly** before proceeding
5. Exit planning mode with approved plan

### Dev Docs System

**For large tasks, create dev docs to prevent "losing the plot":**

#### Starting Large Tasks

When exiting plan mode with an accepted plan:

1. **Create Task Directory:**
```bash
mkdir -p dev/active/[task-name]/
```

2. **Create Documents:**
   - `[task-name]-plan.md` - The accepted plan
   - `[task-name]-context.md` - Key files, decisions, relevant context
   - `[task-name]-tasks.md` - Checklist of work items

3. **Update Regularly:**
   - Mark tasks complete immediately
   - Add new context as discovered
   - Update "Last Updated" timestamps

#### Continuing Tasks

- Check `dev/active/` for existing tasks
- Read all three files before proceeding
- Update context and tasks as you work
- Before compaction: Update dev docs with current state

#### Custom Slash Commands (Create These)

```bash
# Create dev docs from approved plan
/create-dev-docs

# Update dev docs before compaction
/update-dev-docs

# Create strategic plan
/dev-docs
```

---

## Multi-Tenant Architecture

**Three-Tier Hierarchy:**
```
Account (Tenant)
└── Team Members (via AccountUser)
└── Organizations (Client businesses)
    └── Contracts
    └── Recognition Schedules
```

**Security Model:**
- **RLS (Row Level Security)** - Database-level enforcement
- **Application Logic** - Business rule permissions
- **Hybrid Approach** - RLS catches mistakes, app handles complex rules

**Key Principle:** Users can only access data in organizations that belong to their account.

---

## Core Business Rules

### Revenue Recognition

**Straight-Line Formula:**
```
monthly_recognition = contract_amount ÷ term_months
```

**Critical:**
- Always use `Decimal.js` for financial calculations
- Round to 2 decimal places
- Adjust last month if rounding errors exist
- One schedule entry per contract per month

### Contract Import

**CSV Format:**
- Required: `invoice_id`, `amount`, `start_date`
- Required: Either `end_date` OR `term_months`
- Optional: `customer_name`, `description`

**Validation:**
- Invoice ID unique per organization
- Amount must be positive
- Dates in YYYY-MM-DD format
- End date after start date

### Accounting Integrations (QuickBooks & Xero)

**Multi-Platform Architecture:**
- Organizations connect to ONE platform (QuickBooks OR Xero)
- Adapter pattern handles platform-specific APIs
- Shared interfaces for OAuth, account mapping, posting

**Database:**
- `accounting_integrations` table stores connection per org
- Platform field: `'quickbooks' | 'xero'`
- OAuth tokens (encrypted), realm/tenant ID, account mapping

**OAuth Flow (Both Platforms):**
1. User clicks "Connect to [Platform]"
2. Redirect to platform OAuth endpoint
3. User authorizes
4. Exchange code for tokens
5. Save encrypted tokens to `accounting_integrations`
6. Prompt for account mapping

**Account Mapping:**
- Deferred Revenue Account (Liability)
- Revenue Account (Income)
- Stored as JSON in `account_mapping` field

**Journal Entry Posting:**
- Date: Last day of recognition month
- Debit: Deferred Revenue Account
- Credit: Revenue Account
- Memo: "Waterfall - Revenue Recognition for [Month Year]"
- Uses provider adapter (`QuickBooksProvider` or `XeroProvider`)

**Audit Trail:**
- Track who posted (userId)
- Track when posted (timestamp)
- Store external entry ID (QuickBooks JE ID or Xero Manual Journal ID)
- Never allow editing posted schedules

**Provider Pattern:**
```typescript
// Get provider for organization's platform
const provider = getAccountingProvider(integration.platform)

// Post journal entry (same interface for both)
const result = await provider.postJournalEntry(tokens, params)
```

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."
SUPABASE_SERVICE_ROLE_KEY="eyJ..."

# QuickBooks
QUICKBOOKS_CLIENT_ID="..."
QUICKBOOKS_CLIENT_SECRET="..."
QUICKBOOKS_REDIRECT_URI="http://localhost:3000/api/quickbooks/callback"
QUICKBOOKS_ENVIRONMENT="sandbox" # or "production"

# Xero
XERO_CLIENT_ID="..."
XERO_CLIENT_SECRET="..."
XERO_REDIRECT_URI="http://localhost:3000/api/xero/callback"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXTAUTH_SECRET="random-secret-here"
```

---

## Testing Patterns

**Test Framework:** Vitest

**Philosophy:** We don't aim for 100% coverage, but we DO test critical business logic to prevent regressions.

### What to Test

**Priority 1 - Critical Business Logic:**
- Revenue recognition calculations (financial accuracy)
- Permission/role logic (security)
- CSV import validation (data integrity)
- Contract date calculations (business rules)

**Priority 2 - Utility Functions:**
- Date formatting helpers
- Currency formatting
- QuickBooks API helpers (mocked)
- Data transformations

**Priority 3 - Integration Tests:**
- API route handlers (with mocked auth)
- Server Actions (with mocked Supabase)

**Skip:**
- React components (for now)
- UI interactions
- Supabase queries (covered by integration tests)

### Writing Tests

**Unit Test Example:**
```typescript
// src/lib/calculations/revenue-recognition.test.ts
import { describe, it, expect } from 'vitest'
import { calculateMonthlyRecognition } from './revenue-recognition'

describe('calculateMonthlyRecognition', () => {
  it('should calculate monthly recognition for evenly divisible amounts', () => {
    const result = calculateMonthlyRecognition(12000, 12)
    expect(result).toBe('1000.00')
  })
})
```

**Testing with Decimal.js:**
```typescript
import Decimal from 'decimal.js'

// When summing financial values, use Decimal to avoid floating-point errors
const total = schedule
  .reduce((sum, amount) => sum.plus(amount), new Decimal(0))
  .toNumber()
```

**Test File Location:**
- Place tests next to the code they test: `revenue-recognition.ts` → `revenue-recognition.test.ts`
- Use `.test.ts` or `.spec.ts` extension
- Test utilities go in `src/test/utils/`

**Running Tests:**
```bash
# Watch mode during development
pnpm test

# Run once (for CI)
pnpm test:run

# Visual UI for debugging
pnpm test:ui

# Coverage report
pnpm test:coverage
```

### Manual Testing Checklist

- [ ] Signup flow (company + firm types)
- [ ] Login/logout
- [ ] QuickBooks OAuth in sandbox
- [ ] CSV import (valid + errors)
- [ ] Contract CRUD operations
- [ ] Waterfall schedule view
- [ ] Journal entry posting
- [ ] Multi-org switching
- [ ] Team invitations
- [ ] Permission checks

---

## Security Checklist

- [ ] RLS policies enabled on all tables
- [ ] Environment variables secured
- [ ] OAuth tokens encrypted in database
- [ ] Service role key never exposed to browser
- [ ] API routes check authentication
- [ ] Permission checks before sensitive operations
- [ ] Input validation with Zod
- [ ] CSRF protection (Next.js handles)
- [ ] Audit logging for critical actions

---

## Deployment (Vercel)

### Prerequisites

1. Vercel account connected to GitHub
2. Supabase project created
3. QuickBooks developer app (production credentials)

### Setup

1. Connect repo to Vercel
2. Set environment variables in Vercel dashboard
3. Deploy
4. Run migrations: `npx prisma migrate deploy`
5. Update QuickBooks redirect URI to production URL
6. Test OAuth flow in production

### Post-Deployment

- Monitor error logs
- Test critical flows
- Set up alerts for errors
- Monitor database performance

---

## Common Patterns

### Get Current User (Server)

```typescript
import { createClient } from '@/lib/supabase/server'

const supabase = createClient()
const { data: { user } } = await supabase.auth.getUser()

if (!user) redirect('/login')
```

### Check Organization Access

```typescript
import { canAccessOrganization } from '@/lib/auth/permissions'

const hasAccess = await canAccessOrganization(user.id, organizationId)
if (!hasAccess) return { error: 'Forbidden' }
```

### Check Permission

```typescript
import { hasPermission } from '@/lib/auth/permissions'

const canPost = await hasPermission(user.id, orgId, 'post_to_quickbooks')
if (!canPost) return { error: 'Forbidden' }
```

### Prisma Query with Multi-Tenant Filter

```typescript
const contracts = await prisma.contract.findMany({
  where: {
    organizationId: orgId, // Always filter by org
    organization: {
      account: {
        accountUsers: {
          some: { userId: user.id } // Verify user has access
        }
      }
    }
  }
})
```

---

## Critical Rules

### Always

- **Plan before implementing** (use planning mode)
- **Create dev docs** for large tasks
- **Update dev docs** before compaction
- **Use Decimal.js** for financial calculations
- **Filter by organization** in all queries
- **Check permissions** before operations
- **Validate inputs** with Zod
- **Encrypt OAuth tokens** before storing (QuickBooks, Xero)
- **Log critical actions** (imports, posts)
- **Write tests** for critical business logic (revenue calculations, permissions)

### Never

- Skip planning on large tasks
- Use floating-point math for money
- Bypass RLS policies in application code
- Allow editing posted schedules
- Expose service role key to browser
- Commit sensitive data (tokens, keys)
- Query without tenant filters

---

## File Structure

```
app/
├── page.tsx                      # Root: redirects authenticated users, shows login for others
├── login/page.tsx                # Login form
├── signup/page.tsx               # Signup form
├── forgot-password/page.tsx      # Password reset request
├── accept-invitation/
│   └── [token]/page.tsx          # Team invitation acceptance
├── [organizationId]/             # Org-scoped routes (authenticated)
│   ├── dashboard/
│   ├── contracts/
│   ├── schedule/
│   ├── quickbooks/
│   └── settings/
├── account/                      # Account-level routes (authenticated)
│   ├── organizations/
│   ├── team/
│   ├── settings/
│   └── billing/
└── api/                          # API routes

components/
├── ui/                           # shadcn/ui components
├── auth/                         # Login/signup forms
├── layout/                       # Header, sidebar, org-switcher
├── contracts/                    # Contract features
├── schedule/                     # Waterfall views
├── accounting/                   # Platform-agnostic integration UI
└── quickbooks/                   # QuickBooks-specific (legacy)

lib/
├── supabase/                     # Server/client/admin clients
├── auth/                         # Permission helpers
├── accounting/                   # Multi-platform integration
│   ├── types.ts                 # Shared interfaces
│   ├── provider-factory.ts      # Get provider by platform
│   └── providers/
│       ├── quickbooks.ts        # QuickBooks adapter
│       └── xero.ts              # Xero adapter
├── calculations/                 # Revenue recognition
├── import/                       # CSV/Excel parsing
└── db.ts                         # Prisma client

prisma/
└── schema.prisma                 # Database schema
```

**Route Strategy:**
- **Flat auth routes** (`/login`, `/signup`) - no route groups for simplicity
- **Root route** (`/`) - checks auth and redirects or shows login
- **Org routes** (`/[organizationId]/*`) - require authentication
- **Account routes** (`/account/*`) - require authentication
- **Middleware** protects all routes except root and auth routes

---

## Reference

**For detailed technical patterns, invoke the appropriate skill:**

- Database/Schema → `waterfall-data-model`
- Auth/Permissions → `waterfall-auth`
- Business Logic → `waterfall-business-logic`
- UI/Components → `waterfall-ui-patterns`
- Testing → `waterfall-testing`
- Project Overview → `waterfall-overview`

**Skills auto-activate** based on file context and keywords.

---

## Notes

This CLAUDE.md file is intentionally concise. Detailed patterns, code examples, and best practices are in the Skills system.

**Skills = "How to write code"**
**CLAUDE.md = "How this project works"**

Keep this file focused on project-specific commands, workflows, and quirks. Skills handle the reusable patterns.
