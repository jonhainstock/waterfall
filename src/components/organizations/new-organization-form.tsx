'use client'

/**
 * New Organization Form Component
 *
 * Handles creation of a new organization.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Account {
  id: string
  name: string
  subscriptionTier: string
}

interface NewOrganizationFormProps {
  accounts: Account[]
}

export function NewOrganizationForm({ accounts }: NewOrganizationFormProps) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [accountId, setAccountId] = useState(accounts[0]?.id || '')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name, accountId }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create organization')
        setLoading(false)
        return
      }

      // Success - redirect to the new organization's dashboard
      router.push(`/${data.id}/dashboard`)
      router.refresh()
    } catch (err) {
      setError('An unexpected error occurred')
      setLoading(false)
      console.error('Create organization error:', err)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Organization Name
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          placeholder="Acme Corp"
        />
        <p className="mt-1 text-xs text-gray-500">
          The name of the client organization
        </p>
      </div>

      {accounts.length > 1 && (
        <div>
          <label htmlFor="accountId" className="block text-sm font-medium text-gray-700">
            Account
          </label>
          <select
            id="accountId"
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            Select which account this organization belongs to
          </p>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Creating...' : 'Create Organization'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-gray-300 bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Cancel
        </button>
      </div>
    </form>
  )
}
