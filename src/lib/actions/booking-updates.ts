'use server'

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { updateGuestCountSchema } from '@/lib/validations/booking-invitation'
import { calculatePricing } from '@/lib/pricing'

/**
 * Updates the guest count on a confirmed booking and recalculates all pricing.
 *
 * Security model:
 * - verifySession() validates JWT (redirects if no session)
 * - Booking scoped to guest_id = user.id AND status = 'confirmed'
 * - All prices recalculated server-side via shared pricing module
 * - Uses admin client for update to bypass RLS (server action, already auth-checked)
 */
export async function updateGuestCount(input: {
  bookingId: string
  guestCount: number
}): Promise<{ success: boolean; newTotal: number }> {
  const user = await verifySession()

  const parsed = updateGuestCountSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid input')
  }

  const supabase = await createClient()

  // Fetch booking with property and add-on data, scoped to this user + confirmed status
  const { data: booking, error } = await supabase
    .from('bookings')
    .select(`
      *,
      properties(nightly_rate, cleaning_fee, max_guests, guest_threshold, per_person_rate, tax_rate),
      booking_add_ons(*, add_ons(id, name, price, pricing_unit, included_guests, per_person_above))
    `)
    .eq('id', parsed.data.bookingId)
    .eq('guest_id', user.id)
    .eq('status', 'confirmed')
    .single()

  if (error || !booking) {
    throw new Error('Booking not found')
  }

  const property = Array.isArray(booking.properties)
    ? booking.properties[0]
    : booking.properties

  if (!property) {
    throw new Error('Property not found')
  }

  const maxGuests = Number(property.max_guests)
  if (parsed.data.guestCount > maxGuests) {
    throw new Error(`Maximum ${maxGuests} guests allowed`)
  }

  // Calculate nights
  const checkInDate = new Date(booking.check_in)
  const checkOutDate = new Date(booking.check_out)
  const nights = Math.ceil(
    (checkOutDate.getTime() - checkInDate.getTime()) / 86400000
  )

  // Build add-on input from booking_add_ons joined with add_ons
  const addOnRows = booking.booking_add_ons ?? []
  const selectedAddOns = addOnRows.map((ba: Record<string, unknown>) => {
    const addOn = ba.add_ons as Record<string, unknown> | null
    return {
      id: String(addOn?.id ?? ba.add_on_id),
      name: String(addOn?.name ?? ''),
      price: Number(addOn?.price ?? 0),
      pricingUnit: String(addOn?.pricing_unit ?? 'per_booking') as 'per_person' | 'per_booking',
      includedGuests: addOn?.included_guests != null ? Number(addOn.included_guests) : null,
      perPersonAbove: addOn?.per_person_above != null ? Number(addOn.per_person_above) : null,
    }
  })

  // Recalculate pricing with new guest count
  const breakdown = calculatePricing({
    nightlyRate: Number(property.nightly_rate),
    cleaningFee: Number(property.cleaning_fee),
    nights,
    guestCount: parsed.data.guestCount,
    guestThreshold: property.guest_threshold != null ? Number(property.guest_threshold) : null,
    perPersonRate: property.per_person_rate != null ? Number(property.per_person_rate) : null,
    taxRate: property.tax_rate != null ? Number(property.tax_rate) : null,
    selectedAddOns,
  })

  const subtotal = breakdown.accommodationSubtotal + breakdown.perPersonSurcharge
  const addOnsTotal = breakdown.addOnsTotal
  const processingFee = breakdown.processingFee
  const total = breakdown.total

  // Use admin client to update (bypasses RLS, already auth-checked above)
  const admin = createAdminClient()

  // Update booking totals
  const { error: updateError } = await admin
    .from('bookings')
    .update({
      guest_count: parsed.data.guestCount,
      subtotal,
      add_ons_total: addOnsTotal,
      processing_fee: processingFee,
      total,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.bookingId)

  if (updateError) {
    throw new Error('Failed to update booking')
  }

  // Update per-person add-on totals
  for (const item of breakdown.addOnItems) {
    const matchingRow = addOnRows.find(
      (ba: Record<string, unknown>) => ba.add_on_id === item.id
    )
    if (matchingRow) {
      const addOn = (matchingRow as Record<string, unknown>).add_ons as Record<string, unknown> | null
      const pricingUnit = String(addOn?.pricing_unit ?? 'per_booking')
      const hasIncludedGuests = addOn?.included_guests != null

      // Update if per_person or has tiered pricing (includedGuests)
      if (pricingUnit === 'per_person' || hasIncludedGuests) {
        await admin
          .from('booking_add_ons')
          .update({
            quantity: pricingUnit === 'per_person' ? parsed.data.guestCount : 1,
            total_price: item.totalCost,
          })
          .eq('id', String((matchingRow as Record<string, unknown>).id))
      }
    }
  }

  revalidatePath('/bookings')

  return { success: true, newTotal: total }
}
