# Waterfall Overview

**Navigation Skill** - Main entry point for Waterfall development

## What is Waterfall?

Waterfall is a multi-tenant SaaS application that automates deferred revenue recognition and depreciation schedules for accounting firms and SaaS companies.

**Core Problem:** Accountants spend 15-20 minutes per month manually calculating revenue recognition and posting journal entries.

**Solution:** Automates the entire workflow:
1. Import contracts via CSV/Excel
2. Auto-calculate monthly recognition schedules
3. Visualize waterfall schedules
4. Post journal entries to QuickBooks with one click

## Repository Scope & Boundaries

**CRITICAL:** This repository is the **Waterfall Application** ONLY.

### What This Repo Contains

✅ **Application Code:**
- User authentication (Supabase)
- Login/signup flows
- Application routes (dashboard, contracts, schedules, etc.)
- QuickBooks integration
- Team/account management
- Business logic and calculations

### What This Repo Does NOT Contain

❌ **Marketing Materials:**
- Marketing website/landing page
- Public-facing content (pricing, features, testimonials)
- Blog or documentation site
- About us, contact forms, etc.

**The marketing site lives in a separate repository and is deployed separately.**

### Root Route Behavior

The root route (`/`) in THIS repo serves the **application entry point**:

```typescript
// app/page.tsx behavior:
if (user is authenticated) {
  → Redirect to first organization dashboard
  → Or redirect to /account/organizations if no orgs
} else {
  → Show login/signup landing
}
```

**NO marketing content** (hero sections, pricing tables, feature grids) should be in this repo.

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React 18, TypeScript
- **UI:** Tailwind CSS, shadcn/ui, Lucide React
- **Database:** Supabase (PostgreSQL + Auth + RLS)
- **ORM:** Prisma (type-safe queries)
- **Tables:** TanStack Table v8
- **Forms:** React Hook Form + Zod
- **Integrations:** QuickBooks Online API
- **Calculations:** Decimal.js (financial precision)
- **Deployment:** Vercel

## Multi-Tenant Architecture

**Three-Tier Hierarchy:**

```
Account (Billing Entity)
└── Team Members (Users with roles)
└── Organizations (Client businesses)
    └── QuickBooks Connection (per org)
    └── Contracts
    └── Recognition Schedules
```

**Key Principles:**
- Account = Tenant (one subscription per account)
- Organization = Data Isolation Boundary
- Row Level Security (RLS) enforces access at database level
- Solo companies see zero "multi-tenant" complexity

## Core Features

1. **Contract Import** - CSV/Excel upload with validation and preview
2. **Contract Management** - CRUD operations, list view, filtering
3. **Revenue Recognition** - Straight-line calculation, schedule generation
4. **Waterfall View** - Visual schedule grid showing monthly recognition
5. **QuickBooks Integration** - OAuth connection, account mapping, journal entry posting
6. **Team Management** - Invite users, assign roles, manage permissions
7. **Dashboard** - Summary stats, recent activity, quick actions

## Design Principles

**Security First:**
- Row Level Security (RLS) at database level
- Application-level permission checks for business logic
- Hybrid approach: RLS catches mistakes, app code handles complex permissions

**Progressive Disclosure:**
- Show simple UI for simple use cases
- Reveal complexity only when needed
- Solo companies never see "organization" terminology

**Speed & Simplicity:**
- CSV import over API integrations (faster to build)
- Straight-line recognition only (no complex GAAP rules in V1)
- One-click QuickBooks posting

**Data Integrity:**
- Decimal precision for all financial calculations
- Immutable audit trail (track who posted what and when)
- Validation at multiple layers (UI, API, database)

## Project Structure

```
app/
├── page.tsx                    # Root: auth check + redirect logic
├── login/page.tsx              # Login form (unauthenticated)
├── signup/page.tsx             # Signup form (unauthenticated)
├── forgot-password/page.tsx    # Password reset (unauthenticated)
├── accept-invitation/          # Team invitation (unauthenticated)
│   └── [token]/page.tsx
├── [organizationId]/           # Org-scoped routes (authenticated)
│   ├── dashboard/page.tsx
│   ├── contracts/
│   │   ├── page.tsx            # Contract list
│   │   ├── new/page.tsx
│   │   ├── import/page.tsx
│   │   └── [id]/
│   │       ├── page.tsx        # Contract detail
│   │       └── edit/page.tsx
│   ├── schedule/page.tsx       # Waterfall view
│   ├── quickbooks/
│   │   ├── connect/page.tsx
│   │   └── settings/page.tsx
│   └── settings/page.tsx
├── account/                    # Account-level routes (authenticated)
│   ├── organizations/
│   │   ├── page.tsx
│   │   └── new/page.tsx
│   ├── team/
│   │   ├── page.tsx
│   │   └── invite/page.tsx
│   ├── settings/page.tsx
│   └── billing/page.tsx
├── api/                        # API routes
│   ├── auth/
│   ├── organizations/
│   └── account/
└── layout.tsx                  # Root layout

components/
├── ui/                         # shadcn/ui components
├── auth/                       # Login/signup forms
├── layout/                     # Navigation, headers, org-switcher
├── contracts/                  # Contract components
├── schedule/                   # Waterfall components
└── quickbooks/                 # QB integration components

lib/
├── supabase/                   # Supabase clients (server/browser)
├── auth/                       # Permission helpers
├── quickbooks/                 # QB API wrapper
├── calculations/               # Revenue recognition logic
├── import/                     # CSV/Excel parsing
├── db.ts                       # Prisma client
└── utils.ts

prisma/
└── schema.prisma               # Database schema
```

### Routing Philosophy

**Flat Auth Routes (No Route Groups):**
- We use **flat routes** (`/login`, `/signup`) instead of route groups (`/(auth)/login`)
- **Why?** Simpler mental model, matches middleware expectations, clearer URLs

**Root Route Pattern:**
- Root (`/`) checks authentication status
- Authenticated users → Redirect to dashboard or organizations
- Unauthenticated users → Show login/signup options

**Route Protection:**
- Middleware protects all routes except: `/`, `/login`, `/signup`, `/forgot-password`, `/accept-invitation/*`
- Unauthenticated requests to protected routes → Redirect to `/login`
- Authenticated requests to auth routes → Redirect to dashboard

## Skill Navigation

When working on specific areas, reference these specialized skills:

### **waterfall-data-model**
Use when working with:
- Database schema, migrations
- Prisma queries
- RLS policies
- Multi-tenant data access
- Supabase client usage

**Triggers:** Working with `prisma/schema.prisma`, database queries, RLS policies

---

### **waterfall-auth**
Use when working with:
- Authentication flows (signup, login)
- Authorization & permissions
- Role-based access control
- Team management
- Middleware & route protection

**Triggers:** Working with auth routes, permissions, middleware

---

### **waterfall-business-logic**
Use when working with:
- Revenue recognition calculations
- Contract import & validation
- Waterfall schedule generation
- QuickBooks OAuth & API integration
- Journal entry creation

**Triggers:** Working with calculations, imports, QuickBooks integration

---

### **waterfall-ui-patterns**
Use when working with:
- Next.js App Router patterns
- Server vs Client components
- shadcn/ui components
- Forms (React Hook Form + Zod)
- Tables (TanStack Table)
- Styling (Tailwind CSS)

**Triggers:** Working with React components, forms, tables, UI

---

### **skill-developer**
Use when:
- Creating new skills
- Updating existing skills
- Building resource files
- Documenting patterns

**Triggers:** Meta-skill development work

## Quick Reference

### Key Entities

- **Account** - Tenant/billing entity, has team members and organizations
- **User** - Individual person, can belong to multiple accounts
- **AccountUser** - Join table linking users to accounts with roles
- **Organization** - Client business entity, has contracts and QB connection
- **Contract** - Customer contract requiring revenue recognition
- **RecognitionSchedule** - Individual monthly recognition entries

### Roles & Permissions

| Permission | Owner | Admin | Member |
|-----------|-------|-------|--------|
| Manage account settings | ✅ | ❌ | ❌ |
| Manage billing | ✅ | ❌ | ❌ |
| Invite/remove team | ✅ | ✅ | ❌ |
| Add/remove organizations | ✅ | ✅ | ❌ |
| Manage contracts | ✅ | ✅ | ✅ |
| Post to QuickBooks | ✅ | ✅ | ✅ |
| Connect QuickBooks | ✅ | ✅ | ❌ |

### Revenue Recognition Formula

**Straight-Line Recognition:**
```
monthly_recognition = contract_amount ÷ term_months
```

**Always use Decimal.js for financial calculations to avoid floating-point errors.**

### Common Workflows

**New Feature Development:**
1. Use planning mode or strategic-plan-architect agent
2. Review plan thoroughly
3. Create dev docs (`-plan.md`, `-context.md`, `-tasks.md`)
4. Implement incrementally
5. Review code with code-architecture-reviewer agent

**Contract Import Flow:**
1. User uploads CSV/Excel
2. Parse and validate rows
3. Show preview (valid + errors)
4. User confirms
5. Create contracts + schedules in database
6. Log import audit trail

**QuickBooks Posting Flow:**
1. User clicks "Post to QuickBooks"
2. Fetch unposted schedules for month
3. Calculate total recognition amount
4. Create journal entry via QB API
5. Mark schedules as posted
6. Record audit trail (who, when)

## Development Guidelines

**Always:**
- Plan before implementing
- Use TypeScript strict mode
- Validate inputs with Zod
- Use Decimal.js for financial math
- Check permissions before operations
- Enforce RLS policies
- Document as you go

**Never:**
- Skip planning on large tasks
- Use floating-point math for money
- Bypass RLS policies
- Allow editing posted schedules
- Commit sensitive data (tokens, keys)

## Success Metrics for MVP

**Functionality:**
- Solo company can signup → import → post in < 10 minutes
- Accounting firm can manage 10+ clients
- QuickBooks integration works reliably
- Calculations accurate to 2 decimals
- Zero data loss or corruption

**Performance:**
- Page loads < 2 seconds
- Import 100 contracts < 5 seconds
- Waterfall renders 100 contracts < 1 second
- QuickBooks post < 5 seconds

## Next Steps

Based on what you're working on, invoke the appropriate specialized skill:

- Database/Schema work → Use `waterfall-data-model`
- Auth/Permissions → Use `waterfall-auth`
- Business logic/Calculations → Use `waterfall-business-logic`
- UI/Components → Use `waterfall-ui-patterns`
- Creating new skills → Use `skill-developer`

Each specialized skill contains detailed patterns, code examples, and resource files for deep dives.
