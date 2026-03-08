import { ChefHat, Anchor, Music, Sunset } from 'lucide-react'

const experiences = [
  { icon: ChefHat, label: 'Private Chefs' },
  { icon: Anchor, label: 'Boat Excursions' },
  { icon: Music, label: 'VIP Nightlife' },
  { icon: Sunset, label: 'Sunset Tours' },
]

export function BrandStory() {
  return (
    <section className="bg-brand-sand py-16 px-6">
      <div className="mx-auto max-w-7xl grid gap-12 md:grid-cols-2 md:items-center">
        {/* Text */}
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-brand-palm sm:text-4xl">
            The Whole Experience
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-brand-palm/80">
            Whole-Tel isn&apos;t just a place to stay &mdash; it&apos;s the whole trip. We pair
            hand-picked all-inclusive hotels with curated local experiences: private chefs, boat
            excursions, VIP nightlife, and more. One booking, one crew, one unforgettable trip.
          </p>
        </div>

        {/* Experience icons */}
        <div className="grid grid-cols-2 gap-6">
          {experiences.map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-3 rounded-2xl bg-white/70 p-6 text-center shadow-sm"
            >
              <Icon className="h-8 w-8 text-brand-teal" />
              <span className="text-sm font-medium text-brand-palm">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
