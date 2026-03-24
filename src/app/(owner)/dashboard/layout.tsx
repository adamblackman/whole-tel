import { requireOwner } from '@/lib/dal'
import { LogoutButton } from '@/components/LogoutButton'
import Link from 'next/link'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Security boundary — redirects to /login if no session, to / if not owner
  await requireOwner()

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="font-semibold text-sm text-brand-teal hover:text-brand-teal/80 transition-colors"
            >
              Whole-Tel
            </Link>
            <span className="text-muted-foreground text-sm">Host Dashboard</span>
            <nav className="flex items-center gap-4 text-sm">
              <Link
                href="/dashboard"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Properties
              </Link>
              <Link
                href="/dashboard/bookings"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Bookings
              </Link>
              <Link
                href="/dashboard/applications"
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                Applications
              </Link>
            </nav>
          </div>
          <LogoutButton />
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        {children}
      </main>
    </div>
  )
}
