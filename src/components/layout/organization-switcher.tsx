'use client'

/**
 * Organization Switcher Component
 *
 * Dropdown to switch between organizations.
 */

import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronDown, Check } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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

  const currentOrgId = params?.organizationId as string | undefined
  const currentOrg = organizations.find((org) => org.id === currentOrgId)

  function handleOrgChange(orgId: string) {
    router.push(`/${orgId}`)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm hover:bg-gray-50">
          <span className="font-medium">
            {currentOrg?.name || 'Select Organization'}
          </span>
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-64">
        {organizations.map((org) => (
          <DropdownMenuItem
            key={org.id}
            onClick={() => handleOrgChange(org.id)}
            className={
              org.id === currentOrgId
                ? 'bg-blue-50 text-blue-700'
                : ''
            }
          >
            {org.name}
            {org.id === currentOrgId && (
              <Check className="ml-auto h-4 w-4" />
            )}
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link href="/account/organizations" className="cursor-pointer">
            Manage Organizations
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
