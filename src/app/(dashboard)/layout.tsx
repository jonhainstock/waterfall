/**
 * Dashboard Layout
 *
 * Wraps all dashboard routes (account and organization pages).
 * Includes header with organization switcher and user menu.
 */

import { Header } from '@/components/layout/header'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main>{children}</main>
    </div>
  )
}
