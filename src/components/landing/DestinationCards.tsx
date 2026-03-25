import Link from 'next/link'
import Image from 'next/image'
import { Badge } from '@/components/ui/badge'

const activeDestinations = [
  {
    name: 'Cabo San Lucas',
    tagline: 'Desert meets ocean luxury',
    image: '/images/destinations/cabo-san-lucas.jpg',
  },
  {
    name: 'Puerto Vallarta',
    tagline: 'Jungle hideaways & golden sunsets',
    image: '/images/destinations/puerto-vallarta.jpg',
  },
]

const comingSoonDestinations = [
  {
    name: 'Miami',
    tagline: 'Neon nights & beachfront beats',
    image: '/images/destinations/miami.jpg',
  },
  {
    name: 'Palm Springs',
    tagline: 'Desert luxury & poolside living',
    image: '/images/destinations/palm-springs.jpg',
  },
  {
    name: 'Los Angeles',
    tagline: 'City escapes & rooftop everything',
    image: '/images/destinations/los-angeles.jpg',
  },
  {
    name: 'Las Vegas',
    tagline: 'Bright lights, bigger crew',
    image: '/images/destinations/las-vegas.jpg',
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
          {activeDestinations.map(({ name, tagline, image }) => (
            <Link
              key={name}
              href={`/properties?destination=${encodeURIComponent(name)}`}
              className="group relative flex min-h-[200px] flex-col justify-end overflow-hidden rounded-2xl p-6 transition-transform hover:scale-105"
            >
              <Image
                src={image}
                alt={name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              <div className="relative z-10">
                <h3 className="text-xl font-bold text-white">{name}</h3>
                <p className="mt-1 text-sm text-white/80">{tagline}</p>
              </div>
            </Link>
          ))}

          {comingSoonDestinations.map(({ name, tagline, image }) => (
            <div
              key={name}
              className="relative flex min-h-[200px] flex-col justify-end overflow-hidden rounded-2xl p-6"
            >
              <Image
                src={image}
                alt={name}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover brightness-75"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
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
