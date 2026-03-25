'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { bookingInputSchema } from '@/lib/validations/booking'
import { calculatePricing } from '@/lib/pricing'

/**
 * Computes the activity deadline as the earlier of:
 * - check-in minus 30 days
 * - created_at plus 7 days
 */
function computeActivityDeadline(checkIn: string, createdAt: Date): string {
  const checkInMinus30 = new Date(new Date(checkIn).getTime() - 30 * 24 * 3600 * 1000)
  const createdPlus7 = new Date(createdAt.getTime() + 7 * 24 * 3600 * 1000)
  const deadline = checkInMinus30 < createdPlus7 ? checkInMinus30 : createdPlus7
  return deadline.toISOString()
}

/**
 * Creates a pending booking (no Stripe session).
 * Returns the booking ID for use in the itinerary planner.
 *
 * If a pending booking already exists for this user+property, it is
 * updated instead of creating a duplicate.
 */
export async function createPendingBooking(input: {
  propertyId: string
  checkIn: string
  checkOut: string
  guestCount: number
}): Promise<void> {
  const user = await verifySession()

  const parsed = bookingInputSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid booking input')
  }

  const supabase = await createClient()

  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('id, name, nightly_rate, cleaning_fee, max_guests, guest_threshold, per_person_rate, tax_rate')
    .eq('id', input.propertyId)
    .single()

  if (propError || !property) throw new Error('Property not found')

  if (input.guestCount < 1 || input.guestCount > property.max_guests) {
    throw new Error('Invalid guest count')
  }

  const checkInDate = new Date(input.checkIn)
  const checkOutDate = new Date(input.checkOut)
  const nights = Math.ceil(
    (checkOutDate.getTime() - checkInDate.getTime()) / 86400000
  )
  if (nights < 1) throw new Error('Invalid date range')

  const breakdown = calculatePricing({
    nightlyRate: Number(property.nightly_rate),
    cleaningFee: Number(property.cleaning_fee),
    nights,
    guestCount: input.guestCount,
    guestThreshold: property.guest_threshold != null ? Number(property.guest_threshold) : null,
    perPersonRate: property.per_person_rate != null ? Number(property.per_person_rate) : null,
    taxRate: property.tax_rate != null ? Number(property.tax_rate) : null,
    selectedAddOns: [],
  })

  const subtotal = breakdown.accommodationSubtotal + breakdown.perPersonSurcharge

  // Check for existing pending booking for same property/user — reuse instead of creating duplicates
  const { data: existing } = await supabase
    .from('bookings')
    .select('id')
    .eq('property_id', input.propertyId)
    .eq('guest_id', user.id)
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle()

  if (existing) {
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        check_in: input.checkIn,
        check_out: input.checkOut,
        guest_count: input.guestCount,
        subtotal,
        add_ons_total: 0,
        processing_fee: breakdown.processingFee,
        total: breakdown.total,
      })
      .eq('id', existing.id)
    if (updateError) throw new Error('Failed to update booking')
    redirect(`/bookings/${existing.id}/plan`)
  }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      property_id: input.propertyId,
      guest_id: user.id,
      check_in: input.checkIn,
      check_out: input.checkOut,
      guest_count: input.guestCount,
      subtotal,
      add_ons_total: 0,
      processing_fee: breakdown.processingFee,
      total: breakdown.total,
      status: 'pending',
    })
    .select('id, created_at')
    .single()

  if (bookingError || !booking) throw new Error('Failed to create booking')

  const bookingCreatedAt = new Date(booking.created_at)
  await supabase
    .from('bookings')
    .update({
      payment_deadline: new Date(bookingCreatedAt.getTime() + 36 * 3600 * 1000).toISOString(),
    })
    .eq('id', booking.id)

  redirect(`/bookings/${booking.id}/plan`)
}

/**
 * Fetches a pending booking + its itinerary events, recalculates pricing
 * with experiences included, creates a Stripe Checkout session, and redirects.
 *
 * Security model:
 * - verifySession() validates JWT against Supabase auth server
 * - All prices fetched server-side -- client-submitted prices are never trusted
 * - redirect() called OUTSIDE try/catch -- Next.js redirect throws internally
 * - Uses shared calculatePricing() for exact price parity with PricingWidget
 */
export async function checkoutBooking(bookingId: string): Promise<void> {
  const user = await verifySession()
  const supabase = await createClient()

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, property_id, check_in, check_out, guest_count, status')
    .eq('id', bookingId)
    .eq('guest_id', user.id)
    .eq('status', 'pending')
    .single()

  if (bookingError || !booking) throw new Error('Booking not found or already paid')

  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('id, name, nightly_rate, cleaning_fee, max_guests, guest_threshold, per_person_rate, tax_rate')
    .eq('id', booking.property_id)
    .single()

  if (propError || !property) throw new Error('Property not found')

  const { data: events } = await supabase
    .from('itinerary_events')
    .select('activity_id')
    .eq('booking_id', bookingId)
    .not('activity_id', 'is', null)

  // Per-unique-activity pricing (not per-occurrence)
  const activityIds = [...new Set((events ?? []).map(e => e.activity_id).filter(Boolean))] as string[]

  let selectedAddOns: {
    id: string
    name: string
    price: number
    pricingUnit: 'per_person' | 'per_booking'
    includedGuests: number | null
    perPersonAbove: number | null
  }[] = []

  if (activityIds.length > 0) {
    const { data: addOns } = await supabase
      .from('add_ons')
      .select('id, name, price, pricing_unit, included_guests, per_person_above')
      .in('id', activityIds)

    selectedAddOns = (addOns ?? []).map(a => ({
      id: a.id,
      name: a.name,
      price: Number(a.price),
      pricingUnit: a.pricing_unit as 'per_person' | 'per_booking',
      includedGuests: a.included_guests != null ? Number(a.included_guests) : null,
      perPersonAbove: a.per_person_above != null ? Number(a.per_person_above) : null,
    }))
  }

  const nights = Math.ceil(
    (new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / 86400000
  )

  const breakdown = calculatePricing({
    nightlyRate: Number(property.nightly_rate),
    cleaningFee: Number(property.cleaning_fee),
    nights,
    guestCount: booking.guest_count,
    guestThreshold: property.guest_threshold != null ? Number(property.guest_threshold) : null,
    perPersonRate: property.per_person_rate != null ? Number(property.per_person_rate) : null,
    taxRate: property.tax_rate != null ? Number(property.tax_rate) : null,
    selectedAddOns,
  })

  const subtotal = breakdown.accommodationSubtotal + breakdown.perPersonSurcharge
  const total = breakdown.total

  await supabase
    .from('bookings')
    .update({
      subtotal,
      add_ons_total: breakdown.addOnsTotal,
      processing_fee: breakdown.processingFee,
      total,
    })
    .eq('id', bookingId)

  const lineItems = [
    {
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(breakdown.accommodationSubtotal * 100),
        product_data: {
          name: `${property.name} -- ${nights} night${nights !== 1 ? 's' : ''}`,
        },
      },
      quantity: 1,
    },
    ...(breakdown.perPersonSurcharge > 0
      ? [{
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(breakdown.perPersonSurcharge * 100),
            product_data: {
              name: `Per-person surcharge (${breakdown.surchargeDetail!.extraGuests} extra guest${breakdown.surchargeDetail!.extraGuests !== 1 ? 's' : ''})`,
            },
          },
          quantity: 1,
        }]
      : []),
    {
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(breakdown.cleaningFee * 100),
        product_data: { name: 'Cleaning fee' },
      },
      quantity: 1,
    },
    ...breakdown.addOnItems.map(item => ({
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(item.totalCost * 100),
        product_data: { name: item.name },
      },
      quantity: 1,
    })),
    ...(breakdown.hotelTax > 0
      ? [{
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(breakdown.hotelTax * 100),
            product_data: {
              name: `Hotel Tax (${((breakdown.taxRate ?? 0) * 100).toFixed(0)}%)`,
            },
          },
          quantity: 1,
        }]
      : []),
    {
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(breakdown.processingFee * 100),
        product_data: { name: 'Processing fee' },
      },
      quantity: 1,
    },
  ]

  const headerStore = await headers()
  const origin =
    headerStore.get('origin') ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'

  let stripeUrl: string

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card', 'us_bank_account'],
      line_items: lineItems,
      client_reference_id: bookingId,
      metadata: { booking_id: bookingId },
      customer_email: user.email ?? undefined,
      success_url: `${origin}/bookings?success=true`,
      cancel_url: `${origin}/bookings/${bookingId}/plan`,
    })

    stripeUrl = session.url!

    const { data: bk } = await supabase
      .from('bookings')
      .select('created_at')
      .eq('id', bookingId)
      .single()
    const createdAt = new Date(bk?.created_at ?? new Date())

    await supabase
      .from('bookings')
      .update({
        stripe_checkout_url: session.url,
        activity_deadline: computeActivityDeadline(booking.check_in, createdAt),
      })
      .eq('id', bookingId)
  } catch (err) {
    console.error('Checkout failed:', err)
    throw new Error('Failed to create checkout session. Please try again.')
  }

  redirect(stripeUrl)
}
