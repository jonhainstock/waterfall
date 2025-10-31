'use client'

/**
 * User Menu Component
 *
 * Dropdown menu with user info and sign out.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface UserMenuProps {
  user: {
    name: string
    email: string
  }
}

export function UserMenu({ user }: UserMenuProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function handleSignOut() {
    setSigningOut(true)
    setIsOpen(false)

    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
      })

      if (response.ok) {
        router.push('/login')
        router.refresh()
      } else {
        console.error('Sign out failed')
        setSigningOut(false)
      }
    } catch (error) {
      console.error('Sign out error:', error)
      setSigningOut(false)
    }
  }

  // Get initials for avatar
  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full hover:opacity-80"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
          {initials}
        </div>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 z-20 mt-2 w-64 rounded-md border border-gray-200 bg-white shadow-lg">
            {/* User Info */}
            <div className="border-b border-gray-200 px-4 py-3">
              <p className="text-sm font-medium text-gray-900">{user.name}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>

            {/* Menu Items */}
            <div className="py-1">
              <Link
                href="/account/organizations"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setIsOpen(false)}
              >
                Organizations
              </Link>
              <Link
                href="/account/settings"
                className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                onClick={() => setIsOpen(false)}
              >
                Account Settings
              </Link>
            </div>

            {/* Sign Out */}
            <div className="border-t border-gray-200">
              <button
                onClick={handleSignOut}
                disabled={signingOut}
                className="block w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-gray-100 disabled:opacity-50"
              >
                {signingOut ? 'Signing out...' : 'Sign out'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
