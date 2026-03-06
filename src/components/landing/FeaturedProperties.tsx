import { PropertyListingCard } from '@/components/browse/PropertyListingCard'

interface FeaturedPropertiesProps {
  properties: Array<{
    id: string
    name: string
    location: string
    bedrooms: number
    bathrooms: number
    max_guests: number
    nightly_rate: number
    property_photos: Array<{ id: string; storage_path: string; display_order: number }>
  }>
}

export function FeaturedProperties({ properties }: FeaturedPropertiesProps) {
  const featured = properties.slice(0, 3)

  return (
    <section className="py-16 px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-zinc-900 sm:text-4xl">
            Featured Villas
          </h2>
          <p className="mt-2 text-lg text-zinc-500">
            Handpicked party-ready properties
          </p>
        </div>

        {featured.length > 0 ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((property) => (
              <PropertyListingCard key={property.id} property={property} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-300 py-16 text-center">
            <p className="text-zinc-500">
              No properties available yet. Check back soon!
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
