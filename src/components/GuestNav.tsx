import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/lib/actions/auth'

/**
 * Auth-aware navigation header for guest-facing pages.
 * Async Server Component — uses getUser() (not verifySession) to avoid redirecting
 * unauthenticated guests who are just browsing.
 */
export async function GuestNav() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <header className="border-b border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-brand-teal font-bold text-xl">
          Whole-Tel
        </Link>
        <nav className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link href="/properties">Browse Hotels</Link>
          </Button>
          {user ? (
            <>
              <Button variant="ghost" asChild>
                <Link href="/bookings">My Bookings</Link>
              </Button>
              <form action={signOut}>
                <Button variant="ghost" type="submit">
                  Log out
                </Button>
              </form>
            </>
          ) : (
            <Button variant="ghost" asChild>
              <Link href="/login">Log in</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  )
}
