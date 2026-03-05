'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { bookingInputSchema } from '@/lib/validations/booking'

/**
 * Creates a pending booking and redirects to Stripe Checkout.
 *
 * Security model:
 * - verifySession() validates JWT against Supabase auth server (redirects if no session)
 * - All prices fetched server-side — client-submitted prices are never trusted
 * - Add-ons scoped to the given property_id to prevent cross-property injection
 * - redirect() called OUTSIDE try/catch — Next.js redirect throws internally
 */
export async function createBookingAndCheckout(input: {
  propertyId: string
  checkIn: string
  checkOut: string
  guestCount: number
  selectedAddOnIds: string[]
}): Promise<void> {
  // Step 1: Validate auth — redirects to /login if no valid session
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
    .select('id, name, nightly_rate, cleaning_fee, max_guests')
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

  // Step 6: Fetch selected add-ons server-side, scoped to this property
  // CRITICAL: .eq('property_id', ...) prevents cross-property add-on injection
  const { data: addOns } =
    input.selectedAddOnIds.length > 0
      ? await supabase
          .from('add_ons')
          .select('id, name, price, pricing_unit')
          .in('id', input.selectedAddOnIds)
          .eq('property_id', input.propertyId)
      : {
          data: [] as {
            id: string
            name: string
            price: number
            pricing_unit: string
          }[],
        }

  // Step 7: Calculate totals server-side (NEVER trust client prices)
  const subtotal =
    Number(property.nightly_rate) * nights + Number(property.cleaning_fee)
  const addOnsTotal = (addOns ?? []).reduce((sum, a) => {
    const cost =
      a.pricing_unit === 'per_person'
        ? Number(a.price) * input.guestCount
        : Number(a.price)
    return sum + cost
  }, 0)
  const processingFee = parseFloat(
    ((subtotal + addOnsTotal) * 0.029 + 0.3).toFixed(2)
  )
  const total = subtotal + addOnsTotal + processingFee

  // Step 8: Insert booking + booking_add_ons, create Stripe session
  // redirect() MUST be outside try/catch — it throws internally in Next.js
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
        add_ons_total: addOnsTotal,
        processing_fee: processingFee,
        total,
        status: 'pending',
      })
      .select('id')
      .single()

    if (bookingError || !booking) throw new Error('Failed to create booking')

    // Insert booking_add_ons rows
    if ((addOns ?? []).length > 0) {
      const bookingAddOns = addOns!.map((a) => ({
        booking_id: booking.id,
        add_on_id: a.id,
        quantity: a.pricing_unit === 'per_person' ? input.guestCount : 1,
        unit_price: Number(a.price),
        total_price:
          a.pricing_unit === 'per_person'
            ? Number(a.price) * input.guestCount
            : Number(a.price),
      }))
      await supabase.from('booking_add_ons').insert(bookingAddOns)
    }

    // Build Stripe line items
    const lineItems = [
      {
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(subtotal * 100), // Stripe uses cents
          product_data: {
            name: `${property.name} — ${nights} night${nights !== 1 ? 's' : ''}`,
          },
        },
        quantity: 1,
      },
      ...(addOns ?? []).map((a) => ({
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(
            (a.pricing_unit === 'per_person'
              ? Number(a.price) * input.guestCount
              : Number(a.price)) * 100
          ),
          product_data: { name: a.name },
        },
        quantity: 1,
      })),
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
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      client_reference_id: booking.id,
      metadata: { booking_id: booking.id },
      customer_email: user.email ?? undefined,
      success_url: `${origin}/bookings?success=true`,
      cancel_url: `${origin}/properties/${input.propertyId}`,
    })

    stripeUrl = session.url!
  } catch (err) {
    console.error('Booking creation failed:', err)
    throw new Error('Failed to create booking. Please try again.')
  }

  // redirect() MUST be outside try/catch — it throws internally
  redirect(stripeUrl)
}
