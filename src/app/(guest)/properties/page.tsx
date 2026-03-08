import { Suspense } from 'react'
import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { DestinationFilter } from '@/components/browse/DestinationFilter'
import { PropertyListingCard } from '@/components/browse/PropertyListingCard'

export const metadata: Metadata = {
  title: 'Browse Hotels',
}

const VALID_DESTINATIONS = ['Cabo San Lucas', 'Puerto Vallarta', 'Miami']

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ destination?: string }>
}) {
  const { destination } = await searchParams

  // Validate destination against allowlist — never pass raw user input to .eq()
  const validatedDestination =
    destination && VALID_DESTINATIONS.includes(destination) ? destination : undefined

  const supabase = await createClient()

  let query = supabase
    .from('properties')
    .select(
      'id, name, location, bedrooms, bathrooms, max_guests, nightly_rate, property_photos(id, storage_path, display_order)'
    )
    .order('created_at', { ascending: false })

  if (validatedDestination) {
    query = query.eq('location', validatedDestination)
  }

  const { data: properties, error } = await query

  if (error) {
    console.error('[PropertiesPage] Supabase query error:', error.message)
  }

  const propertyList = properties ?? []

  return (
    <div>
      <h1 className="text-3xl font-bold mb-2">Browse Hotels</h1>
      <p className="text-muted-foreground mb-6">
        Find your perfect getaway in Cabo, Puerto Vallarta, or Miami
      </p>

      <Suspense fallback={null}>
        <DestinationFilter currentDestination={validatedDestination} />
      </Suspense>

      {propertyList.length === 0 ? (
        <div className="mt-12 text-center">
          <p className="text-muted-foreground text-lg mb-4">
            No hotels found for this destination.
          </p>
          <Link
            href="/properties"
            className="text-brand-teal hover:underline font-medium"
          >
            Clear filter and view all hotels
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
          {propertyList.map((property) => (
            <PropertyListingCard
              key={property.id}
              property={{
                ...property,
                property_photos: Array.isArray(property.property_photos)
                  ? property.property_photos
                  : [],
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
