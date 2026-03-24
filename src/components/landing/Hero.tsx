import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { signOut } from '@/lib/actions/auth'

export async function Hero() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  let isOwner = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    isOwner = profile?.role === 'owner'
  }

  return (
    <section className="relative min-h-[70vh] flex flex-col bg-gradient-to-br from-brand-teal via-cyan-500 to-emerald-400">
      {/* Transparent nav overlay */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 md:px-10">
        <Link href="/" className="text-2xl font-bold text-white tracking-tight">
          Whole-Tel&trade;
        </Link>
        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="outline"
            className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white text-sm md:text-base"
          >
            <Link href="/properties">Browse Whole-Tels&trade;</Link>
          </Button>
          {user ? (
            <div className="flex items-center gap-3">
              {isOwner && (
                <Button
                  asChild
                  variant="outline"
                  className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white text-sm md:text-base"
                >
                  <Link href="/dashboard">Host Dashboard</Link>
                </Button>
              )}
              <span className="text-sm md:text-base text-white/90 truncate max-w-[180px] md:max-w-[240px]" title={user.email ?? undefined}>
                {user.email}
              </span>
              <form action={signOut}>
                <Button
                  type="submit"
                  variant="outline"
                  className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white text-sm md:text-base"
                >
                  Sign out
                </Button>
              </form>
            </div>
          ) : (
            <Button
              asChild
              className="bg-brand-amber text-brand-palm hover:bg-brand-amber/90 text-sm md:text-base"
            >
              <Link href="/login">Get Started</Link>
            </Button>
          )}
        </div>
      </nav>

      {/* Centered content */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-white">
        <h1 className="animate-in fade-in duration-700 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Your Own Private Resort. No Strangers. No Compromises.{' '}
          <span className="text-brand-amber">Custom-Inclusive</span>, Only Pay For What You Want
        </h1>
        <p className="animate-in fade-in duration-700 delay-300 mt-4 max-w-2xl text-lg text-white/90 sm:text-xl md:text-2xl">
          Skip the all-inclusive package deal. Book the whole property, then choose only the experiences your group actually wants.
        </p>
        <Button
          asChild
          size="lg"
          className="animate-in slide-in-from-bottom-4 duration-500 delay-500 mt-8 bg-brand-amber text-brand-palm hover:bg-brand-amber/90 text-lg px-8 py-6"
        >
          <Link href="/properties">Browse Whole-Tels&trade;</Link>
        </Button>
      </div>
    </section>
  )
}
