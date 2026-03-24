'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { verifySession } from '@/lib/dal'
import {
  ItineraryEventSchema,
  isDeadlinePassed,
  isEventDateInRange,
  type ItineraryEventInput,
} from '@/lib/validations/itinerary-event'

export async function upsertItineraryEvent(
  bookingId: string,
  payload: ItineraryEventInput & { id?: string }
): Promise<{ error?: string; id?: string }> {
  const user = await verifySession()
  const supabase = await createClient()

  const parsed = ItineraryEventSchema.safeParse(payload)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input.' }
  }

  const { data } = parsed

  // Explicit ownership check (RLS also enforces, but this gives better errors)
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, check_in, check_out, activity_deadline')
    .eq('id', bookingId)
    .eq('guest_id', user.id)
    .single()

  if (!booking) {
    return { error: 'Booking not found.' }
  }

  if (isDeadlinePassed(booking.activity_deadline)) {
    return { error: 'Activity booking deadline has passed.' }
  }

  if (!isEventDateInRange(data.eventDate, booking.check_in, booking.check_out)) {
    return {
      error:
        'Event date must be within booking dates (checkout day excluded — guests depart that day).',
    }
  }

  const eventId = payload.id ?? crypto.randomUUID()

  const { data: upserted, error: upsertError } = await supabase
    .from('itinerary_events')
    .upsert({
      id: eventId,
      booking_id: bookingId,
      activity_id: data.activityId,
      title: data.title,
      event_date: data.eventDate,
      start_time: data.startTime + ':00',
      end_time: data.endTime + ':00',
      notes: data.notes ?? null,
    })
    .select('id')
    .single()

  if (upsertError) {
    return { error: upsertError.message }
  }

  revalidatePath(`/bookings/${bookingId}/itinerary`)
  return { id: upserted.id }
}

export async function deleteItineraryEvent(
  bookingId: string,
  eventId: string
): Promise<{ error?: string }> {
  const user = await verifySession()
  const supabase = await createClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, activity_deadline')
    .eq('id', bookingId)
    .eq('guest_id', user.id)
    .single()

  if (!booking) {
    return { error: 'Booking not found.' }
  }

  if (isDeadlinePassed(booking.activity_deadline)) {
    return { error: 'Activity booking deadline has passed.' }
  }

  const { error: deleteError } = await supabase
    .from('itinerary_events')
    .delete()
    .eq('id', eventId)

  if (deleteError) {
    return { error: deleteError.message }
  }

  revalidatePath(`/bookings/${bookingId}/itinerary`)
  return {}
}
