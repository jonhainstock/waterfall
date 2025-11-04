'use client'

/**
 * Organization Switcher Component
 *
 * Searchable dropdown with recent organizations to switch between orgs.
 * Scales to hundreds of organizations with search and keyboard navigation.
 * Clean text-only interface without decorative icons.
 */

import { useParams, useRouter } from 'next/navigation'
import { useState, useMemo, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'

interface Organization {
  id: string
  name: string
}

interface OrganizationSwitcherProps {
  organizations: Organization[]
}

const RECENT_ORGS_KEY = 'waterfall_recent_orgs'
const MAX_RECENT_ORGS = 5

export function OrganizationSwitcher({
  organizations,
}: OrganizationSwitcherProps) {
  const params = useParams()
  const router = useRouter()

  const currentOrgId = params?.organizationId as string | undefined
  const currentOrg = organizations.find((org) => org.id === currentOrgId)

  const [open, setOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [recentOrgIds, setRecentOrgIds] = useState<string[]>([])

  // Load recent organizations from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(RECENT_ORGS_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        setRecentOrgIds(Array.isArray(parsed) ? parsed : [])
      }
    } catch (error) {
      console.error('Failed to load recent organizations:', error)
    }
  }, [])

  // Get recent organizations that still exist
  const recentOrgs = useMemo(() => {
    return recentOrgIds
      .map((id) => organizations.find((org) => org.id === id))
      .filter((org): org is Organization => org !== undefined)
      .slice(0, MAX_RECENT_ORGS)
  }, [recentOrgIds, organizations])

  // Filter organizations based on search query
  const filteredOrgs = useMemo(() => {
    if (!searchQuery) return organizations

    const query = searchQuery.toLowerCase()
    return organizations.filter((org) =>
      org.name.toLowerCase().includes(query)
    )
  }, [organizations, searchQuery])

  // Update recent organizations in localStorage
  const updateRecentOrgs = (orgId: string) => {
    try {
      // Remove the orgId if it exists, then add it to the front
      const updated = [orgId, ...recentOrgIds.filter((id) => id !== orgId)].slice(
        0,
        MAX_RECENT_ORGS
      )
      setRecentOrgIds(updated)
      localStorage.setItem(RECENT_ORGS_KEY, JSON.stringify(updated))
    } catch (error) {
      console.error('Failed to update recent organizations:', error)
    }
  }

  // Handle organization change
  const handleOrgChange = (orgId: string) => {
    updateRecentOrgs(orgId)
    setOpen(false)
    setSearchQuery('')
    router.push(`/${orgId}`)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-64 justify-between"
        >
          <span className="truncate">
            {currentOrg?.name || 'Select Organization'}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-64 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search organizations..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>No organizations found.</CommandEmpty>

            {/* Recent Organizations - only show if there are more than 5 total orgs */}
            {recentOrgs.length > 0 && !searchQuery && organizations.length > 5 && (
              <>
                <CommandGroup heading="Recent">
                  {recentOrgs.map((org) => (
                    <CommandItem
                      key={org.id}
                      value={org.id}
                      onSelect={() => handleOrgChange(org.id)}
                    >
                      <span className="flex-1 truncate">{org.name}</span>
                      {org.id === currentOrgId && (
                        <Check className="ml-2 h-4 w-4 text-primary" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* All Organizations */}
            <CommandGroup heading={searchQuery ? 'Results' : organizations.length > 5 ? 'All Organizations' : undefined}>
              {filteredOrgs.map((org) => (
                <CommandItem
                  key={org.id}
                  value={org.id}
                  onSelect={() => handleOrgChange(org.id)}
                >
                  <span className="flex-1 truncate">{org.name}</span>
                  {org.id === currentOrgId && (
                    <Check className="ml-2 h-4 w-4 text-primary" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            {/* Manage Organizations Link */}
            <CommandGroup>
              <CommandItem
                onSelect={() => {
                  setOpen(false)
                  router.push('/account/organizations')
                }}
                className="text-sm text-gray-600"
              >
                Manage Organizations
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
