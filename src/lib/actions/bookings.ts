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
 * Creates a pending booking and redirects to Stripe Checkout.
 *
 * Experiences are NOT included at booking time — guests add them
 * post-booking via the itinerary calendar.
 *
 * Security model:
 * - verifySession() validates JWT against Supabase auth server (redirects if no session)
 * - All prices fetched server-side -- client-submitted prices are never trusted
 * - redirect() called OUTSIDE try/catch -- Next.js redirect throws internally
 * - Uses shared calculatePricing() for exact price parity with PricingWidget
 */
export async function createBookingAndCheckout(input: {
  propertyId: string
  checkIn: string
  checkOut: string
  guestCount: number
}): Promise<void> {
  // Step 1: Validate auth -- redirects to /login if no valid session
  const user = await verifySession()

  // Step 2: Parse and validate input with Zod schema
  const parsed = bookingInputSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid booking input')
  }

  const supabase = await createClient()

  // Step 3: Fetch property server-side for authoritative pricing
  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('id, name, nightly_rate, cleaning_fee, max_guests, guest_threshold, per_person_rate, tax_rate')
    .eq('id', input.propertyId)
    .single()

  if (propError || !property) throw new Error('Property not found')

  // Step 4: Validate guest count server-side
  if (input.guestCount < 1 || input.guestCount > property.max_guests) {
    throw new Error('Invalid guest count')
  }

  // Step 5: Validate date range
  const checkInDate = new Date(input.checkIn)
  const checkOutDate = new Date(input.checkOut)
  const nights = Math.ceil(
    (checkOutDate.getTime() - checkInDate.getTime()) / 86400000
  )
  if (nights < 1) throw new Error('Invalid date range')

  // Step 6: Calculate totals (no add-ons at booking time)
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

  // Subtotal = accommodation + surcharge
  const subtotal = breakdown.accommodationSubtotal + breakdown.perPersonSurcharge
  const processingFee = breakdown.processingFee
  const total = breakdown.total

  // Step 7: Insert booking, create Stripe session
  // redirect() MUST be outside try/catch -- it throws internally in Next.js
  let stripeUrl: string

  try {
    // Insert pending booking
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
        processing_fee: processingFee,
        total,
        status: 'pending',
      })
      .select('id, created_at')
      .single()

    if (bookingError || !booking) throw new Error('Failed to create booking')

    // Build Stripe line items
    const lineItems = [
      // Accommodation (nightly rate * nights)
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
      // Per-person surcharge (if applicable)
      ...(breakdown.perPersonSurcharge > 0
        ? [
            {
              price_data: {
                currency: 'usd',
                unit_amount: Math.round(breakdown.perPersonSurcharge * 100),
                product_data: {
                  name: `Per-person surcharge (${breakdown.surchargeDetail!.extraGuests} extra guest${breakdown.surchargeDetail!.extraGuests !== 1 ? 's' : ''})`,
                },
              },
              quantity: 1,
            },
          ]
        : []),
      // Cleaning fee
      {
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(breakdown.cleaningFee * 100),
          product_data: { name: 'Cleaning fee' },
        },
        quantity: 1,
      },
      // Hotel tax (if applicable)
      ...(breakdown.hotelTax > 0
        ? [
            {
              price_data: {
                currency: 'usd',
                unit_amount: Math.round(breakdown.hotelTax * 100),
                product_data: {
                  name: `Hotel Tax (${((breakdown.taxRate ?? 0) * 100).toFixed(0)}%)`,
                },
              },
              quantity: 1,
            },
          ]
        : []),
      // Processing fee
      {
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(processingFee * 100),
          product_data: { name: 'Processing fee' },
        },
        quantity: 1,
      },
    ]

    // Derive origin for success/cancel URLs
    const headerStore = await headers()
    const origin =
      headerStore.get('origin') ||
      process.env.NEXT_PUBLIC_APP_URL ||
      'http://localhost:3000'

    // Create Stripe Checkout Session
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card', 'us_bank_account'],
      line_items: lineItems,
      client_reference_id: booking.id,
      metadata: { booking_id: booking.id },
      customer_email: user.email ?? undefined,
      success_url: `${origin}/bookings?success=true`,
      cancel_url: `${origin}/properties/${input.propertyId}`,
    })

    stripeUrl = session.url!

    // Store Stripe checkout URL and compute deadlines before redirecting
    const bookingCreatedAt = new Date(booking.created_at)
    await supabase
      .from('bookings')
      .update({
        stripe_checkout_url: session.url,
        payment_deadline: new Date(bookingCreatedAt.getTime() + 36 * 3600 * 1000).toISOString(),
        activity_deadline: computeActivityDeadline(input.checkIn, bookingCreatedAt),
      })
      .eq('id', booking.id)
  } catch (err) {
    console.error('Booking creation failed:', err)
    throw new Error('Failed to create booking. Please try again.')
  }

  // redirect() MUST be outside try/catch -- it throws internally
  redirect(stripeUrl)
}
