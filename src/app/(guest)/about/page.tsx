import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const metadata = {
  title: 'About Us',
  description: 'Whole-Tel pairs hand-picked all-inclusive hotels with curated local experiences for unforgettable group trips.',
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
          Whole-Tel started with a question every group trip planner knows too well:
          why is it so hard to book one amazing trip for everyone? You find the
          perfect hotel, then spend weeks coordinating restaurants, activities,
          transportation, and a dozen group chats that never reach consensus.
        </p>
        <p className="text-zinc-600 leading-relaxed">
          We built Whole-Tel to fix that. We hand-pick all-inclusive hotels made
          for groups -- bachelor and bachelorette weekends, corporate retreats,
          family reunions, friend getaways -- and pair each property with curated
          local experiences you can add in a single booking. Private chefs, yacht
          tours, surf lessons, VIP nightlife -- it&apos;s all there. One booking,
          one crew, one unforgettable trip.
        </p>
        <p className="text-zinc-600 leading-relaxed">
          Every Whole-Tel property is vetted for group travel: enough bedrooms for
          the whole crew, kitchens stocked for late-night snacks, pools that
          actually fit your group, and the kind of spaces where memories happen
          naturally. We handle the logistics so you can focus on being there.
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
              Sun-drenched coastline meets world-class dining. Perfect for
              groups who want adventure by day and relaxation by night.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium text-zinc-900">Puerto Vallarta</h3>
            <p className="text-sm text-zinc-600">
              Charming cobblestone streets, jungle excursions, and beachfront
              dining. A laid-back vibe with plenty to explore together.
            </p>
          </div>
          <div className="space-y-2">
            <h3 className="font-medium text-zinc-900">Miami</h3>
            <p className="text-sm text-zinc-600">
              Art Deco glamour, waterfront properties, and rooftop cocktails.
              The ultimate playground for groups who love the city scene.
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
          Browse our hand-picked hotels and start building your perfect group getaway.
        </p>
        <Button asChild className="mt-6 bg-brand-teal text-white hover:bg-brand-teal/90">
          <Link href="/properties">Browse Hotels</Link>
        </Button>
      </section>
    </div>
  )
}
