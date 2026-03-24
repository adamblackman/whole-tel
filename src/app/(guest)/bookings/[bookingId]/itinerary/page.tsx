import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'

import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { isDeadlinePassed } from '@/lib/actions/itinerary'
import { ItineraryCalendar } from '@/components/booking/ItineraryCalendar'
import type { PropertyActivity, ItineraryEvent } from '@/types/database'

export const metadata: Metadata = {
  title: 'Plan Your Trip — Whole-Tel',
}

export default async function ItineraryPage({
  params,
}: {
  params: Promise<{ bookingId: string }>
}) {
  const { bookingId } = await params
  const user = await verifySession()
  const supabase = await createClient()

  // Fetch booking with property join
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, check_in, check_out, activity_deadline, status, properties!inner(id, name, timezone)')
    .eq('id', bookingId)
    .eq('guest_id', user.id)
    .eq('status', 'confirmed')
    .single()

  if (!booking) {
    notFound()
  }

  const property = Array.isArray(booking.properties)
    ? booking.properties[0]
    : booking.properties

  if (!property) {
    notFound()
  }

  // Fetch active property activities
  const { data: activities } = await supabase
    .from('property_activities')
    .select('*')
    .eq('property_id', property.id)
    .eq('is_active', true)
    .order('name')

  // Fetch existing itinerary events
  const { data: events } = await supabase
    .from('itinerary_events')
    .select('*')
    .eq('booking_id', bookingId)
    .order('event_date')
    .order('start_time')

  const isLocked = isDeadlinePassed(booking.activity_deadline)

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
          href="/bookings"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to bookings
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Plan Your Trip</h1>
        <p className="text-lg text-muted-foreground mt-1">{property.name}</p>
        <p className="text-sm text-muted-foreground">
          {formatDate(booking.check_in)} &rarr; {formatDate(booking.check_out)}
        </p>
      </div>

      {isLocked && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
          <p className="text-sm font-medium text-amber-800">
            Activity booking deadline has passed. Your itinerary is locked.
          </p>
        </div>
      )}

      <ItineraryCalendar
        bookingId={bookingId}
        checkIn={booking.check_in}
        checkOut={booking.check_out}
        timezone={property.timezone}
        initialEvents={(events ?? []) as ItineraryEvent[]}
        activities={(activities ?? []) as PropertyActivity[]}
        isLocked={isLocked}
      />
    </div>
  )
}
