/**
 * Permission Helpers
 *
 * Functions for checking user permissions and access control.
 * These work in conjunction with RLS policies at the database level.
 */

import { createClient } from '@/lib/supabase/server'

/**
 * Permission types in the system
 */
export type Permission =
  | 'view_contracts'
  | 'create_contracts'
  | 'edit_contracts'
  | 'delete_contracts'
  | 'import_contracts'
  | 'view_schedule'
  | 'post_to_quickbooks'
  | 'manage_team'
  | 'manage_settings'

/**
 * Role-based permissions mapping
 */
export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  owner: [
    'view_contracts',
    'create_contracts',
    'edit_contracts',
    'delete_contracts',
    'import_contracts',
    'view_schedule',
    'post_to_quickbooks',
    'manage_team',
    'manage_settings',
  ],
  admin: [
    'view_contracts',
    'create_contracts',
    'edit_contracts',
    'delete_contracts',
    'import_contracts',
    'view_schedule',
    'post_to_quickbooks',
    'manage_team',
  ],
  member: ['view_contracts', 'create_contracts', 'edit_contracts', 'view_schedule'],
  viewer: ['view_contracts', 'view_schedule'],
}

/**
 * Check if user has access to an organization
 *
 * @param userId User ID
 * @param organizationId Organization ID
 * @returns True if user has access
 */
export async function canAccessOrganization(
  userId: string,
  organizationId: string
): Promise<boolean> {
  const supabase = await createClient()

  const result = await supabase
    .from('organizations')
    .select('account_id, account:accounts(account_users(user_id))')
    .eq('id', organizationId)
    .single()

  if (result.error || !result.data) {
    return false
  }

  // Check if user is part of the account that owns this organization
  // Type assertion needed for nested Supabase relations
  type AccountWithUsers = {
    account_users: Array<{ user_id: string }>
  }
  const accountUsers = (result.data.account as unknown as AccountWithUsers | null)?.account_users || []
  return accountUsers.some((au) => au.user_id === userId)
}

/**
 * Get user's role in an organization's account
 *
 * @param userId User ID
 * @param organizationId Organization ID
 * @returns User's role or null
 */
export async function getUserRole(
  userId: string,
  organizationId: string
): Promise<string | null> {
  const supabase = await createClient()

  const result = await supabase
    .from('organizations')
    .select('account_id, account:accounts(account_users(user_id, role))')
    .eq('id', organizationId)
    .single()

  if (result.error || !result.data) {
    return null
  }

  // Type assertion needed for nested Supabase relations
  type AccountWithUsersAndRoles = {
    account_users: Array<{ user_id: string; role: string }>
  }
  const accountUsers = (result.data.account as unknown as AccountWithUsersAndRoles | null)?.account_users || []
  const userAccount = accountUsers.find((au) => au.user_id === userId)

  return userAccount?.role || null
}

/**
 * Check if user has a specific permission
 *
 * @param userId User ID
 * @param organizationId Organization ID
 * @param permission Permission to check
 * @returns True if user has permission
 */
export async function hasPermission(
  userId: string,
  organizationId: string,
  permission: Permission
): Promise<boolean> {
  const role = await getUserRole(userId, organizationId)

  if (!role) {
    return false
  }

  const permissions = ROLE_PERMISSIONS[role] || []
  return permissions.includes(permission)
}

/**
 * Check if user has any of the specified permissions
 *
 * @param userId User ID
 * @param organizationId Organization ID
 * @param permissions Array of permissions to check
 * @returns True if user has at least one permission
 */
export async function hasAnyPermission(
  userId: string,
  organizationId: string,
  permissions: Permission[]
): Promise<boolean> {
  const role = await getUserRole(userId, organizationId)

  if (!role) {
    return false
  }

  const userPermissions = ROLE_PERMISSIONS[role] || []
  return permissions.some((p) => userPermissions.includes(p))
}

/**
 * Check if user has all of the specified permissions
 *
 * @param userId User ID
 * @param organizationId Organization ID
 * @param permissions Array of permissions to check
 * @returns True if user has all permissions
 */
export async function hasAllPermissions(
  userId: string,
  organizationId: string,
  permissions: Permission[]
): Promise<boolean> {
  const role = await getUserRole(userId, organizationId)

  if (!role) {
    return false
  }

  const userPermissions = ROLE_PERMISSIONS[role] || []
  return permissions.every((p) => userPermissions.includes(p))
}
