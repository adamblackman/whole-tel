'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function Hero() {
  return (
    <section className="relative min-h-[70vh] flex flex-col bg-gradient-to-br from-brand-teal via-cyan-500 to-emerald-400">
      {/* Transparent nav overlay */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-4 md:px-10">
        <Link href="/" className="text-2xl font-bold text-white tracking-tight">
          Whole-Tel
        </Link>
        <div className="flex items-center gap-3">
          <Button
            asChild
            variant="outline"
            className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white text-sm md:text-base"
          >
            <Link href="/properties">Browse Villas</Link>
          </Button>
          <Button
            asChild
            className="bg-brand-amber text-brand-palm hover:bg-brand-amber/90 text-sm md:text-base"
          >
            <Link href="/login">Get Started</Link>
          </Button>
        </div>
      </nav>

      {/* Centered content */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center text-white">
        <h1 className="animate-in fade-in duration-700 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          Your Next Party Starts Here
        </h1>
        <p className="animate-in fade-in duration-700 delay-300 mt-4 max-w-2xl text-lg text-white/90 sm:text-xl md:text-2xl">
          Luxury party villas with curated local experiences in Cabo, Puerto Vallarta, and Miami
        </p>
        <Button
          asChild
          size="lg"
          className="animate-in slide-in-from-bottom-4 duration-500 delay-500 mt-8 bg-brand-amber text-brand-palm hover:bg-brand-amber/90 text-lg px-8 py-6"
        >
          <Link href="/properties">Browse Villas</Link>
        </Button>
      </div>
    </section>
  )
}
