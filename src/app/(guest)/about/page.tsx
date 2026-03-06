import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'About Us | Whole-Tel',
}

export default function AboutPage() {
  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-r from-brand-teal to-cyan-500 text-white py-16 px-6 text-center -mx-4 -mt-8">
        <h1 className="text-4xl font-bold tracking-tight">About Whole-Tel</h1>
        <p className="mt-3 text-lg text-white/90">
          The whole trip, not just a stay.
        </p>
      </section>

      {/* Brand Story */}
      <section className="max-w-3xl mx-auto py-16 px-4 space-y-6">
        <h2 className="text-2xl font-semibold text-brand-palm">Our Story</h2>
        <p className="text-zinc-600 leading-relaxed">
          Whole-Tel was born from a simple idea: why book a villa and then spend
          hours coordinating everything else? Private chefs, boat excursions,
          nightlife packages, local guides — we curate it all so you can focus
          on what matters: the experience.
        </p>
        <p className="text-zinc-600 leading-relaxed">
          Our villas are handpicked for groups who want more than a vacation —
          they want a trip worth talking about. Every property comes with a menu
          of curated local add-ons you won&apos;t find on Airbnb.
        </p>
      </section>

      {/* Destinations */}
      <section className="max-w-3xl mx-auto pb-16 px-4 space-y-6">
        <h2 className="text-2xl font-semibold text-brand-palm">
          Our Destinations
        </h2>
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="space-y-2">
            <h3 className="font-medium text-zinc-900">Cabo San Lucas</h3>
            <p className="text-sm text-zinc-600">
              Sun-drenched coastline meets world-class nightlife. Perfect for
              groups who want adventure by day and energy by night.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium text-zinc-900">Puerto Vallarta</h3>
            <p className="text-sm text-zinc-600">
              Charming cobblestone streets, jungle excursions, and beachfront
              dining. A laid-back vibe with plenty to explore.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium text-zinc-900">Miami</h3>
            <p className="text-sm text-zinc-600">
              Art Deco glamour, boat parties, and rooftop cocktails. The
              ultimate playground for groups who love the city scene.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto pb-16 px-4 text-center">
        <h2 className="text-2xl font-semibold text-brand-palm">
          Ready to plan your trip?
        </h2>
        <p className="mt-2 text-zinc-600">
          Browse our handpicked villas and start building your perfect getaway.
        </p>
        <Button asChild className="mt-6 bg-brand-teal text-white hover:bg-brand-teal/90">
          <Link href="/properties">Browse Properties</Link>
        </Button>
      </section>
    </div>
  )
}
