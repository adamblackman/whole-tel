'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { getStripe } from '@/lib/stripe'
import { bookingInputSchema } from '@/lib/validations/booking'
import { calculatePricing } from '@/lib/pricing'

/**
 * Creates a pending booking and redirects to Stripe Checkout.
 *
 * Security model:
 * - verifySession() validates JWT against Supabase auth server (redirects if no session)
 * - All prices fetched server-side -- client-submitted prices are never trusted
 * - Add-ons scoped to the given property_id to prevent cross-property injection
 * - redirect() called OUTSIDE try/catch -- Next.js redirect throws internally
 * - Uses shared calculatePricing() for exact price parity with PricingWidget
 */
export async function createBookingAndCheckout(input: {
  propertyId: string
  checkIn: string
  checkOut: string
  guestCount: number
  selectedAddOnIds: string[]
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
    .select('id, name, nightly_rate, cleaning_fee, max_guests, guest_threshold, per_person_rate')
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
          .select('id, name, price, pricing_unit, included_guests, per_person_above')
          .in('id', input.selectedAddOnIds)
          .eq('property_id', input.propertyId)
      : {
          data: [] as {
            id: string
            name: string
            price: number
            pricing_unit: string
            included_guests: number | null
            per_person_above: number | null
          }[],
        }

  // Step 7: Calculate totals using shared pricing module (NEVER trust client prices)
  const breakdown = calculatePricing({
    nightlyRate: Number(property.nightly_rate),
    cleaningFee: Number(property.cleaning_fee),
    nights,
    guestCount: input.guestCount,
    guestThreshold: property.guest_threshold != null ? Number(property.guest_threshold) : null,
    perPersonRate: property.per_person_rate != null ? Number(property.per_person_rate) : null,
    selectedAddOns: (addOns ?? []).map((a) => ({
      id: a.id,
      name: a.name,
      price: Number(a.price),
      pricingUnit: a.pricing_unit as 'per_person' | 'per_booking',
      includedGuests: a.included_guests != null ? Number(a.included_guests) : null,
      perPersonAbove: a.per_person_above != null ? Number(a.per_person_above) : null,
    })),
  })

  // Subtotal = accommodation + surcharge (no dedicated surcharge column on bookings table)
  const subtotal = breakdown.accommodationSubtotal + breakdown.perPersonSurcharge
  const addOnsTotal = breakdown.addOnsTotal
  const processingFee = breakdown.processingFee
  const total = breakdown.total

  // Step 8: Insert booking + booking_add_ons, create Stripe session
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
        add_ons_total: addOnsTotal,
        processing_fee: processingFee,
        total,
        status: 'pending',
      })
      .select('id')
      .single()

    if (bookingError || !booking) throw new Error('Failed to create booking')

    // Insert booking_add_ons rows using breakdown for correct total_price (includes tier cost)
    if (breakdown.addOnItems.length > 0) {
      const bookingAddOns = breakdown.addOnItems.map((item) => {
        const dbAddOn = (addOns ?? []).find((a) => a.id === item.id)
        return {
          booking_id: booking.id,
          add_on_id: item.id,
          quantity: dbAddOn?.pricing_unit === 'per_person' ? input.guestCount : 1,
          unit_price: Number(dbAddOn?.price ?? 0),
          total_price: item.totalCost,
        }
      })
      await supabase.from('booking_add_ons').insert(bookingAddOns)
    }

    // Build Stripe line items with separate lines for each pricing component
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
      // Add-ons (each with correct tier-inclusive total)
      ...breakdown.addOnItems.map((item) => ({
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(item.totalCost * 100),
          product_data: { name: item.name },
        },
        quantity: 1,
      })),
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
  } catch (err) {
    console.error('Booking creation failed:', err)
    throw new Error('Failed to create booking. Please try again.')
  }

  // redirect() MUST be outside try/catch -- it throws internally
  redirect(stripeUrl)
}
