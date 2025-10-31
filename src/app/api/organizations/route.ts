/**
 * Organizations API Routes
 *
 * GET  /api/organizations - List user's accessible organizations
 * POST /api/organizations - Create new organization
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * GET /api/organizations
 *
 * Returns all organizations that the current user can access.
 * Uses RLS to automatically filter to user's account.
 */
export async function GET() {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get organizations (RLS automatically filters to user's account)
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        slug,
        is_active,
        created_at,
        account:accounts(
          id,
          name,
          account_type
        )
      `)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (orgError) {
      console.error('Organizations query error:', orgError)
      return NextResponse.json(
        { error: 'Failed to fetch organizations' },
        { status: 500 }
      )
    }

    return NextResponse.json(organizations)
  } catch (error) {
    console.error('Organizations GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/organizations
 *
 * Creates a new organization.
 * User must be owner or admin of the account.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, accountId } = body

    if (!name || !accountId) {
      return NextResponse.json(
        { error: 'Name and accountId are required' },
        { status: 400 }
      )
    }

    // Check user has permission (owner or admin role)
    const membershipResult = await supabase
      .from('account_users')
      .select('role')
      .eq('account_id', accountId)
      .eq('user_id', user.id)
      .single()

    if (membershipResult.error || !membershipResult.data) {
      return NextResponse.json(
        { error: 'Not a member of this account' },
        { status: 403 }
      )
    }

    const membership = membershipResult.data

    if (membership.role !== 'owner' && membership.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only owners and admins can create organizations' },
        { status: 403 }
      )
    }

    // TODO: Re-enable subscription limits for production
    // Check subscription limits
    // const { data: account, error: accountError } = await supabase
    //   .from('accounts')
    //   .select('subscription_tier')
    //   .eq('id', accountId)
    //   .single()

    // if (accountError || !account) {
    //   return NextResponse.json(
    //     { error: 'Account not found' },
    //     { status: 404 }
    //   )
    // }

    // const { count: orgCount, error: countError } = await supabase
    //   .from('organizations')
    //   .select('*', { count: 'exact', head: true })
    //   .eq('account_id', accountId)
    //   .eq('is_active', true)

    // if (countError) {
    //   console.error('Organization count error:', countError)
    //   return NextResponse.json(
    //     { error: 'Failed to check organization limit' },
    //     { status: 500 }
    //   )
    // }

    // // Check limits based on subscription tier
    // const limits: Record<string, number> = {
    //   free: 1,
    //   starter: 5,
    //   pro: 50,
    // }

    // const limit = limits[account.subscription_tier] || 1

    // if (orgCount !== null && orgCount >= limit) {
    //   return NextResponse.json(
    //     {
    //       error: `Organization limit reached. ${account.subscription_tier} plan allows ${limit} organization(s).`,
    //     },
    //     { status: 403 }
    //   )
    // }

    // Create organization
    const { data: organization, error: createError } = await supabase
      .from('organizations')
      .insert({
        account_id: accountId,
        name,
        is_active: true,
      })
      .select()
      .single()

    if (createError) {
      console.error('Organization creation error:', createError)
      return NextResponse.json(
        { error: 'Failed to create organization' },
        { status: 500 }
      )
    }

    return NextResponse.json(organization, { status: 201 })
  } catch (error) {
    console.error('Organizations POST error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
