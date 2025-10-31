/**
 * Organization Layout
 *
 * Layout for organization-scoped pages.
 * Header is rendered by parent (dashboard) layout.
 */

import { ReactNode } from 'react'

export default function OrganizationLayout({
  children,
}: {
  children: ReactNode
}) {
  return <>{children}</>
}
