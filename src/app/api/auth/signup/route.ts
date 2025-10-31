/**
 * POST /api/auth/signup
 *
 * Creates a new user account with the following steps:
 * 1. Create Supabase Auth user
 * 2. Create User record in public.users
 * 3. Create Account (tenant)
 * 4. Create first Organization
 * 5. Create AccountUser membership (role: owner)
 *
 * This route uses the admin client to bypass RLS for initial setup.
 */

import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, name, companyName, accountType } = body

    // Validate required fields
    if (!email || !password || !name || !companyName || !accountType) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Validate account type
    if (accountType !== 'company' && accountType !== 'firm') {
      return NextResponse.json(
        { error: 'Account type must be "company" or "firm"' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // 1. Create Supabase Auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    })

    if (authError) {
      console.error('Auth signup error:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: 400 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Failed to create user' },
        { status: 500 }
      )
    }

    const userId = authData.user.id

    // 2. Create User record
    const userResult = await supabase
      .from('users')
      .insert({
        id: userId,
        email,
        name,
      })
      .select()
      .single()

    if (userResult.error) {
      console.error('User record creation error:', userResult.error)
      // Rollback: Delete auth user
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { error: 'Failed to create user record' },
        { status: 500 }
      )
    }

    const user = userResult.data

    // 3. Create Account
    const accountResult = await supabase
      .from('accounts')
      .insert({
        name: companyName,
        account_type: accountType,
        subscription_tier: 'free',
        subscription_status: 'trial',
        trial_ends_at: new Date(
          Date.now() + 14 * 24 * 60 * 60 * 1000
        ).toISOString(), // 14 days from now
      })
      .select()
      .single()

    if (accountResult.error) {
      console.error('Account creation error:', accountResult.error)
      // Rollback: Delete user and auth user
      await supabase.from('users').delete().eq('id', userId)
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { error: 'Failed to create account' },
        { status: 500 }
      )
    }

    const account = accountResult.data

    // 4. Create first Organization
    const organizationName =
      accountType === 'company' ? companyName : 'Example Client'

    const orgResult = await supabase
      .from('organizations')
      .insert({
        account_id: account.id,
        name: organizationName,
        is_active: true,
      })
      .select()
      .single()

    if (orgResult.error) {
      console.error('Organization creation error:', orgResult.error)
      // Rollback: Delete account, user, and auth user
      await supabase.from('accounts').delete().eq('id', account.id)
      await supabase.from('users').delete().eq('id', userId)
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { error: 'Failed to create organization' },
        { status: 500 }
      )
    }

    const organization = orgResult.data

    // 5. Create AccountUser membership (owner role)
    const { error: membershipError } = await supabase
      .from('account_users')
      .insert({
        account_id: account.id,
        user_id: userId,
        role: 'owner',
      })

    if (membershipError) {
      console.error('Account membership creation error:', membershipError)
      // Rollback: Delete organization, account, user, and auth user
      await supabase.from('organizations').delete().eq('id', organization.id)
      await supabase.from('accounts').delete().eq('id', account.id)
      await supabase.from('users').delete().eq('id', userId)
      await supabase.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { error: 'Failed to create account membership' },
        { status: 500 }
      )
    }

    // Success! Return the created user and organization
    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
      account: {
        id: account.id,
        name: account.name,
        accountType: account.account_type,
      },
      organization: {
        id: organization.id,
        name: organization.name,
      },
    })
  } catch (error) {
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
