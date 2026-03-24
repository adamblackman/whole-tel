import Link from 'next/link'
import { Badge } from '@/components/ui/badge'

const activeDestinations = [
  {
    name: 'Cabo San Lucas',
    tagline: 'Desert meets ocean luxury',
    gradient: 'from-brand-teal to-cyan-400',
  },
  {
    name: 'Puerto Vallarta',
    tagline: 'Jungle hideaways & golden sunsets',
    gradient: 'from-brand-amber to-orange-400',
  },
]

const comingSoonDestinations = [
  {
    name: 'Miami',
    tagline: 'Neon nights & beachfront beats',
    gradient: 'from-purple-500 to-blue-500',
  },
  {
    name: 'Palm Springs',
    tagline: 'Desert luxury & poolside living',
    gradient: 'from-rose-400 to-orange-300',
  },
  {
    name: 'Los Angeles',
    tagline: 'City escapes & rooftop everything',
    gradient: 'from-indigo-500 to-purple-400',
  },
  {
    name: 'Las Vegas',
    tagline: 'Bright lights, bigger crew',
    gradient: 'from-yellow-400 to-red-500',
  },
]

export function DestinationCards() {
  return (
    <section className="bg-brand-sand py-16 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-brand-palm sm:text-4xl">
            Choose Your Destination
          </h2>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {activeDestinations.map(({ name, tagline, gradient }) => (
            <Link
              key={name}
              href={`/properties?destination=${encodeURIComponent(name)}`}
              className={`group relative flex min-h-[200px] flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-6 transition-transform hover:scale-105`}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="relative z-10">
                <h3 className="text-xl font-bold text-white">{name}</h3>
                <p className="mt-1 text-sm text-white/80">{tagline}</p>
              </div>
            </Link>
          ))}

          {comingSoonDestinations.map(({ name, tagline, gradient }) => (
            <div
              key={name}
              className={`relative flex min-h-[200px] flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-6 opacity-75`}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <Badge
                variant="secondary"
                className="absolute top-3 right-3 z-10 bg-white/90 text-zinc-700"
              >
                Coming Soon
              </Badge>
              <div className="relative z-10">
                <h3 className="text-xl font-bold text-white">{name}</h3>
                <p className="mt-1 text-sm text-white/80">{tagline}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
