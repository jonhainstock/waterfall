'use client'

/**
 * Organization Switcher Component
 *
 * Dropdown to switch between organizations.
 */

import { useParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'

interface Organization {
  id: string
  name: string
}

interface OrganizationSwitcherProps {
  organizations: Organization[]
}

export function OrganizationSwitcher({
  organizations,
}: OrganizationSwitcherProps) {
  const params = useParams()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  const currentOrgId = params?.organizationId as string | undefined
  const currentOrg = organizations.find((org) => org.id === currentOrgId)

  function handleOrgChange(orgId: string) {
    setIsOpen(false)
    router.push(`/${orgId}/dashboard`)
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
      >
        <span className="font-medium">
          {currentOrg?.name || 'Select Organization'}
        </span>
        <svg
          className="h-4 w-4 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute left-0 z-20 mt-2 w-64 rounded-md border border-gray-200 bg-white shadow-lg">
            <div className="py-1">
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleOrgChange(org.id)}
                  className={`block w-full px-4 py-2 text-left text-sm hover:bg-gray-100 ${
                    org.id === currentOrgId
                      ? 'bg-blue-50 text-blue-700'
                      : 'text-gray-700'
                  }`}
                >
                  {org.name}
                  {org.id === currentOrgId && (
                    <svg
                      className="ml-2 inline-block h-4 w-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))}
            </div>

            <div className="border-t border-gray-200">
              <Link
                href="/account/organizations"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setIsOpen(false)}
              >
                Manage Organizations
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
