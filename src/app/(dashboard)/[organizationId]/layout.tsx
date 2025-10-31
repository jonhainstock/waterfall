/**
 * Organization Layout
 *
 * Layout for organization-scoped pages.
 * Includes header with org switcher and optional sidebar navigation (future).
 */

import { ReactNode } from 'react'
import { Header } from '@/components/layout/header'

export default function OrganizationLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>{children}</main>
    </div>
  )
}
