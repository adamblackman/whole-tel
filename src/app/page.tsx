import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()

  const { data: properties } = await supabase
    .from('properties')
    .select('*, property_photos(storage_path, display_order)')
    .order('nightly_rate', { ascending: true })

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-teal-500 via-cyan-500 to-emerald-400 px-6 py-24 text-center text-white md:py-32">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-5xl font-bold tracking-tight md:text-6xl">
            Whole-Tel
          </h1>
          <p className="mt-4 text-xl text-white/90 md:text-2xl">
            Party villas with curated local experiences
          </p>
          <p className="mt-2 text-lg text-white/70">
            Cabo &middot; Puerto Vallarta &middot; Miami
          </p>
        </div>
      </header>

      {/* Properties */}
      <main className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="mb-8 text-3xl font-semibold tracking-tight text-zinc-900">
          Our Villas
        </h2>

        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {properties?.map((property) => {
            const photos = (property.property_photos as { storage_path: string; display_order: number }[]) || []
            const coverPhoto = photos.sort((a, b) => a.display_order - b.display_order)[0]
            const publicUrl = coverPhoto
              ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-photos/${coverPhoto.storage_path}`
              : null

            return (
              <Link
                key={property.id}
                href={`/properties/${property.id}`}
                className="group overflow-hidden rounded-2xl border border-zinc-200 transition-shadow hover:shadow-lg"
              >
                <div className="relative aspect-[4/3] bg-zinc-100">
                  {publicUrl ? (
                    <Image
                      src={publicUrl}
                      alt={property.name}
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-zinc-400">
                      <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                      </svg>
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-900">{property.name}</h3>
                      <p className="text-sm text-zinc-500">{property.location}</p>
                    </div>
                    <p className="text-right">
                      <span className="text-lg font-semibold text-zinc-900">${Number(property.nightly_rate).toLocaleString()}</span>
                      <span className="text-sm text-zinc-500"> / night</span>
                    </p>
                  </div>
                  <div className="mt-3 flex gap-4 text-sm text-zinc-600">
                    <span>{property.bedrooms} beds</span>
                    <span>{property.bathrooms} baths</span>
                    <span>Up to {property.max_guests} guests</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      </main>
    </div>
  )
}
