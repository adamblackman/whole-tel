import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'

import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { PlanPageClient } from '@/components/booking/PlanPageClient'
import type { AddOn, ItineraryEvent } from '@/types/database'

export const metadata: Metadata = {
  title: 'Plan Your Trip — Whole-Tel',
}

export default async function PlanPage({
  params,
}: {
  params: Promise<{ bookingId: string }>
}) {
  const { bookingId } = await params
  const user = await verifySession()
  const supabase = await createClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, check_in, check_out, guest_count, status, properties!inner(id, name, timezone, nightly_rate, cleaning_fee, guest_threshold, per_person_rate, tax_rate)')
    .eq('id', bookingId)
    .eq('guest_id', user.id)
    .single()

  if (!booking) {
    notFound()
  }

  if (booking.status === 'confirmed') {
    redirect(`/bookings/${bookingId}/itinerary`)
  }

  if (booking.status !== 'pending') {
    notFound()
  }

  const property = Array.isArray(booking.properties)
    ? booking.properties[0]
    : booking.properties

  if (!property) {
    notFound()
  }

  const { data: addOns } = await supabase
    .from('add_ons')
    .select('*')
    .eq('property_id', property.id)
    .not('duration_min', 'is', null)
    .order('name')

  const { data: allAddOns } = await supabase
    .from('add_ons')
    .select('id, name, price, pricing_unit, included_guests, per_person_above')
    .eq('property_id', property.id)

  const { data: events } = await supabase
    .from('itinerary_events')
    .select('*')
    .eq('booking_id', bookingId)
    .order('event_date')
    .order('start_time')

  const nights = Math.ceil(
    (new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / 86400000
  )

  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/properties/${property.id}`}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to property
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Plan Your Trip</h1>
        <p className="text-lg text-muted-foreground mt-1">{property.name}</p>
        <p className="text-sm text-muted-foreground">
          {formatDate(booking.check_in)} &rarr; {formatDate(booking.check_out)}
        </p>
      </div>

      <p className="text-sm text-muted-foreground">
        Add experiences to your itinerary, then proceed to checkout. Experiences are optional.
      </p>

      <PlanPageClient
        bookingId={bookingId}
        checkIn={booking.check_in}
        checkOut={booking.check_out}
        guestCount={booking.guest_count}
        timezone={property.timezone}
        nights={nights}
        nightlyRate={Number(property.nightly_rate)}
        cleaningFee={Number(property.cleaning_fee)}
        guestThreshold={property.guest_threshold != null ? Number(property.guest_threshold) : null}
        perPersonRate={property.per_person_rate != null ? Number(property.per_person_rate) : null}
        taxRate={property.tax_rate != null ? Number(property.tax_rate) : null}
        initialEvents={(events ?? []) as ItineraryEvent[]}
        activities={(addOns ?? []) as AddOn[]}
        allAddOns={(allAddOns ?? []).map(a => ({
          id: a.id,
          name: a.name,
          price: Number(a.price),
          pricingUnit: a.pricing_unit as 'per_person' | 'per_booking',
          includedGuests: a.included_guests != null ? Number(a.included_guests) : null,
          perPersonAbove: a.per_person_above != null ? Number(a.per_person_above) : null,
        }))}
      />
    </div>
  )
}
