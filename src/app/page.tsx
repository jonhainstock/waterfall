/**
 * Root Route - Application Entry Point
 *
 * This route serves as the entry point for the Waterfall application.
 *
 * Behavior:
 * - Authenticated users: Redirect to /account/organizations
 * - Unauthenticated users: Show login/signup landing page
 *
 * NOTE: This repo is app-only. Marketing site is separate.
 * NO marketing content (hero sections, pricing, etc.) should be added here.
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function RootPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If user is authenticated, redirect to organizations
  if (user) {
    redirect('/account/organizations')
  }

  // Show landing page for unauthenticated users
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-gray-900">Waterfall</h1>
          <p className="text-gray-600 mt-2">
            Automate Revenue Recognition
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-sm text-gray-600">
                Eliminate manual spreadsheet work
              </p>
              <p className="text-xs text-gray-500">
                Post journal entries to QuickBooks with one click
              </p>
            </div>

            <div className="pt-4 space-y-3">
              <Link
                href="/signup"
                className="block w-full rounded-md bg-blue-600 px-4 py-2 text-center text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Get started
              </Link>
              <Link
                href="/login"
                className="block w-full rounded-md border border-gray-300 bg-white px-4 py-2 text-center text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
