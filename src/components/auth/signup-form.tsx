'use client'

/**
 * Signup Form Component
 *
 * Handles new user registration.
 * Creates user, account, organization, and account membership.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export function SignupForm() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    companyName: '',
    accountType: 'company' as 'company' | 'firm',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      // Call signup API route
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create account')
        setLoading(false)
        return
      }

      // Sign in the newly created user
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (signInError) {
        setError('Account created but failed to sign in. Please try logging in.')
        setLoading(false)
        return
      }

      // Redirect based on account type
      if (formData.accountType === 'company') {
        // Company users go to QuickBooks connection
        router.push(`/${data.organization.id}/quickbooks/connect`)
      } else {
        // Firm users go to organizations list
        router.push('/account/organizations')
      }
      router.refresh()
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
      console.error('Signup error:', err)
    }
  }

  function updateFormData(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Your Name
        </label>
        <input
          id="name"
          type="text"
          required
          value={formData.name}
          onChange={(e) => updateFormData('name', e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          placeholder="John Doe"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          value={formData.email}
          onChange={(e) => updateFormData('email', e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          placeholder="you@example.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-700">
          Password
        </label>
        <input
          id="password"
          type="password"
          required
          minLength={6}
          value={formData.password}
          onChange={(e) => updateFormData('password', e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          placeholder="••••••••"
        />
        <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters</p>
      </div>

      <div>
        <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
          Company Name
        </label>
        <input
          id="companyName"
          type="text"
          required
          value={formData.companyName}
          onChange={(e) => updateFormData('companyName', e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          placeholder="Acme Corp"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">Account Type</label>
        <div className="mt-2 space-y-2">
          <label className="flex items-center">
            <input
              type="radio"
              name="accountType"
              value="company"
              checked={formData.accountType === 'company'}
              onChange={(e) => updateFormData('accountType', e.target.value)}
              className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              My Company
              <span className="ml-1 text-xs text-gray-500">
                (I manage my own organization)
              </span>
            </span>
          </label>
          <label className="flex items-center">
            <input
              type="radio"
              name="accountType"
              value="firm"
              checked={formData.accountType === 'firm'}
              onChange={(e) => updateFormData('accountType', e.target.value)}
              className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-700">
              Accounting Firm
              <span className="ml-1 text-xs text-gray-500">
                (I manage multiple client organizations)
              </span>
            </span>
          </label>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Creating account...' : 'Create account'}
      </button>
    </form>
  )
}
