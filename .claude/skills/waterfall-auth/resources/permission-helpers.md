# Permission Helper Functions

Complete permission checking system for Waterfall.

## Core Permission Functions

```typescript
// lib/auth/permissions.ts
import { prisma } from '@/lib/db'

export type Permission =
  | 'manage_account'
  | 'manage_billing'
  | 'manage_team'
  | 'manage_organizations'
  | 'manage_contracts'
  | 'post_to_quickbooks'
  | 'connect_quickbooks'

export type Role = 'owner' | 'admin' | 'member'

// Get user's role in an account
export async function getUserRole(
  userId: string,
  accountId: string
): Promise<Role | null> {
  const accountUser = await prisma.accountUser.findUnique({
    where: {
      accountId_userId: {
        accountId,
        userId,
      },
    },
    select: {
      role: true,
    },
  })

  return accountUser?.role as Role | null
}

// Check if user can access organization
export async function canAccessOrganization(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const org = await prisma.organization.findFirst({
    where: {
      id: organizationId,
      account: {
        accountUsers: {
          some: {
            userId: userId,
          },
        },
      },
    },
  })

  return !!org
}

// Get user's role for organization
export async function getUserRoleForOrganization(
  userId: string,
  organizationId: string
): Promise<Role | null> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      account: {
        select: {
          accountUsers: {
            where: { userId },
            select: { role: true },
          },
        },
      },
    },
  })

  if (!org || org.account.accountUsers.length === 0) {
    return null
  }

  return org.account.accountUsers[0].role as Role
}

// Check if user has specific permission
export async function hasPermission(
  userId: string,
  organizationId: string,
  permission: Permission
): Promise<boolean> {
  const role = await getUserRoleForOrganization(userId, organizationId)

  if (!role) return false

  return checkRolePermission(role, permission)
}

// Check if role has permission
function checkRolePermission(role: Role, permission: Permission): boolean {
  const rolePermissions: Record<Role, Permission[]> = {
    owner: [
      'manage_account',
      'manage_billing',
      'manage_team',
      'manage_organizations',
      'manage_contracts',
      'post_to_quickbooks',
      'connect_quickbooks',
    ],
    admin: [
      'manage_team',
      'manage_organizations',
      'manage_contracts',
      'post_to_quickbooks',
      'connect_quickbooks',
    ],
    member: [
      'manage_contracts',
      'post_to_quickbooks',
    ],
  }

  return rolePermissions[role].includes(permission)
}

// Require permission (throws if not allowed)
export async function requirePermission(
  userId: string,
  organizationId: string,
  permission: Permission
): Promise<void> {
  const allowed = await hasPermission(userId, organizationId, permission)

  if (!allowed) {
    throw new Error(`Permission denied: ${permission}`)
  }
}

// Get all user's organizations
export async function getUserOrganizations(userId: string) {
  return await prisma.organization.findMany({
    where: {
      account: {
        accountUsers: {
          some: {
            userId: userId,
          },
        },
      },
    },
    include: {
      account: {
        select: {
          name: true,
          accountType: true,
        },
      },
      _count: {
        select: {
          contracts: true,
        },
      },
    },
    orderBy: {
      name: 'asc',
    },
  })
}

// Check if user is owner
export async function isOwner(userId: string, accountId: string): Promise<boolean> {
  const role = await getUserRole(userId, accountId)
  return role === 'owner'
}

// Check if user is admin or owner
export async function isAdminOrOwner(userId: string, accountId: string): Promise<boolean> {
  const role = await getUserRole(userId, accountId)
  return role === 'owner' || role === 'admin'
}
```

## Usage Examples

```typescript
// API Route
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check access
  const hasAccess = await canAccessOrganization(user.id, params.id)
  if (!hasAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Check permission
  const canPost = await hasPermission(user.id, params.id, 'post_to_quickbooks')
  if (!canPost) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Proceed
}

// Or use requirePermission to throw
try {
  await requirePermission(user.id, orgId, 'manage_contracts')
  // Proceed
} catch (error) {
  return NextResponse.json({ error: error.message }, { status: 403 })
}
```
