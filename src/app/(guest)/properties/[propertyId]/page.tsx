import { notFound } from 'next/navigation'
import { MapPin, BedDouble, Bath, Users, Clock } from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/server'
import { PhotoGallery } from '@/components/property/PhotoGallery'
import { AmenityList } from '@/components/property/AmenityList'
import { AddOnCard } from '@/components/property/AddOnCard'
import { PricingWidget } from '@/components/property/PricingWidget'
import type { PricingUnit } from '@/types/database'

interface AddOnRow {
  id: string
  name: string
  description: string | null
  price: number
  pricing_unit: PricingUnit
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ propertyId: string }>
}) {
  const { propertyId } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('properties')
    .select('name, location')
    .eq('id', propertyId)
    .single()
  if (!data) return { title: 'Property Not Found' }
  return { title: `${data.name} in ${data.location} — Whole-Tel` }
}

export default async function PropertyListingPage({
  params,
}: {
  params: Promise<{ propertyId: string }>
}) {
  const { propertyId } = await params
  const supabase = await createClient()

  const [propertyResult, bookingsResult] = await Promise.all([
    supabase
      .from('properties')
      .select(
        `*, property_photos(id, storage_path, display_order), add_ons(id, name, description, price, pricing_unit)`
      )
      .eq('id', propertyId)
      .single(),
    supabase
      .from('bookings')
      .select('check_in, check_out')
      .eq('property_id', propertyId)
      .eq('status', 'confirmed'),
  ])

  const { data: property, error } = propertyResult

  if (error || !property) {
    notFound()
  }

  const bookings = bookingsResult.data ?? []
  // Half-open [) interval: checkout day is NOT part of the booked range.
  // Subtract 1 day so back-to-back bookings are allowed.
  const disabledDates = bookings.map((b) => ({
    from: new Date(b.check_in),
    to: new Date(new Date(b.check_out).getTime() - 86400000),
  }))

  const sortedPhotos = [...(property.property_photos ?? [])].sort(
    (a, b) => a.display_order - b.display_order
  )
  const photos = sortedPhotos.map((p, idx) => ({
    id: p.id,
    url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-photos/${p.storage_path}`,
    alt: `${property.name} photo ${idx + 1}`,
  }))

  const amenities = Array.isArray(property.amenities)
    ? (property.amenities as string[])
    : []

  const addOns = (property.add_ons ?? []) as AddOnRow[]

  return (
    <div className="space-y-8">
      {/* Photo Gallery */}
      <PhotoGallery photos={photos} />

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
        {/* Left column: details */}
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-foreground">{property.name}</h1>
            <div className="flex items-center gap-1 mt-2 text-muted-foreground">
              <MapPin className="h-4 w-4 shrink-0" />
              <span className="text-sm">{property.location}</span>
            </div>
            {property.address && (
              <p className="text-sm text-muted-foreground mt-1">{property.address}</p>
            )}
          </div>

          {/* Stats row */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 text-sm">
              <BedDouble className="h-5 w-5 text-brand-teal" />
              <span>{property.bedrooms} bedroom{property.bedrooms !== 1 ? 's' : ''}</span>
            </div>
            <Separator orientation="vertical" className="h-4 hidden sm:block" />
            <div className="flex items-center gap-2 text-sm">
              <Bath className="h-5 w-5 text-brand-teal" />
              <span>{property.bathrooms} bathroom{property.bathrooms !== 1 ? 's' : ''}</span>
            </div>
            <Separator orientation="vertical" className="h-4 hidden sm:block" />
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-5 w-5 text-brand-teal" />
              <span>Up to {property.max_guests} guests</span>
            </div>
          </div>

          <Separator />

          {/* Description */}
          {property.description && (
            <>
              <div>
                <h2 className="text-xl font-semibold mb-3">About this property</h2>
                <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                  {property.description}
                </p>
              </div>
              <Separator />
            </>
          )}

          {/* Amenities */}
          {amenities.length > 0 && (
            <>
              <div>
                <h2 className="text-xl font-semibold mb-4">What this place offers</h2>
                <AmenityList amenities={amenities} />
              </div>
              <Separator />
            </>
          )}

          {/* Check-in / Check-out */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Check-in information</h2>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-5 w-5 text-brand-teal shrink-0" />
                <span className="text-muted-foreground">Check-in:</span>
                <span className="font-medium">{property.check_in_time}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-5 w-5 text-brand-teal shrink-0" />
                <span className="text-muted-foreground">Check-out:</span>
                <span className="font-medium">{property.check_out_time}</span>
              </div>
            </div>
          </div>

          {/* House rules */}
          {property.house_rules && (
            <>
              <Separator />
              <div>
                <h2 className="text-xl font-semibold mb-3">House rules</h2>
                <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                  {property.house_rules}
                </p>
              </div>
            </>
          )}

          {/* Add-ons */}
          {addOns.length > 0 && (
            <>
              <Separator />
              <div>
                <h2 className="text-xl font-semibold mb-4">Unique Experiences</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {addOns.map((addOn) => (
                    <AddOnCard key={addOn.id} addOn={addOn} />
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right column: pricing widget */}
        <div className="lg:sticky lg:top-8">
          <PricingWidget
            nightlyRate={Number(property.nightly_rate)}
            cleaningFee={Number(property.cleaning_fee)}
            maxGuests={property.max_guests}
            disabledDates={disabledDates}
            addOns={addOns}
            propertyId={propertyId}
          />
        </div>
      </div>
    </div>
  )
}
