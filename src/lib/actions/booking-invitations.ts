'use server'

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getResend } from '@/lib/email'
import { BookingInvitationEmail } from '@/emails/booking-invitation'
import {
  sendInvitationSchema,
  acceptInvitationSchema,
  addAttendeeManuallySchema,
} from '@/lib/validations/booking-invitation'
import { calculatePricing } from '@/lib/pricing'

/**
 * Send a booking invitation email to a guest.
 * Only the booking owner (guest_id) can send invitations.
 */
export async function sendInvitation(input: {
  bookingId: string
  email: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await verifySession()

  const parsed = sendInvitationSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()

  // Fetch booking scoped to current user + confirmed status, with property info
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, check_in, check_out, properties(name, location)')
    .eq('id', parsed.data.bookingId)
    .eq('guest_id', user.id)
    .eq('status', 'confirmed')
    .single()

  if (bookingError || !booking) {
    return { success: false, error: 'Booking not found' }
  }

  const property = Array.isArray(booking.properties)
    ? booking.properties[0]
    : booking.properties

  if (!property) {
    return { success: false, error: 'Property not found' }
  }

  // Fetch inviter's display name
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', user.id)
    .single()

  const inviterName = profile?.display_name ?? 'A Whole-Tel guest'

  // Check for existing invitation with same (booking_id, email)
  const admin = createAdminClient()
  const { data: existing } = await admin
    .from('booking_invitations')
    .select('id, status, token')
    .eq('booking_id', parsed.data.bookingId)
    .eq('email', parsed.data.email)
    .single()

  let token: string

  if (existing) {
    if (existing.status === 'accepted') {
      return { success: false, error: 'This person has already accepted the invitation' }
    }

    if (existing.status === 'declined') {
      // Re-invite: update status back to pending
      await admin
        .from('booking_invitations')
        .update({ status: 'pending', updated_at: new Date().toISOString() })
        .eq('id', existing.id)
    }

    // For pending or re-invited, resend the email
    token = existing.token
  } else {
    // Insert new invitation
    const { data: inserted, error: insertError } = await admin
      .from('booking_invitations')
      .insert({
        booking_id: parsed.data.bookingId,
        email: parsed.data.email,
        invited_by: user.id,
        status: 'pending',
      })
      .select('token')
      .single()

    if (insertError || !inserted) {
      return { success: false, error: 'Failed to create invitation' }
    }

    token = inserted.token
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const acceptUrl = `${appUrl}/bookings/invitations/${token}`

  // Send email via Resend
  await getResend().emails.send({
    from: 'Whole-Tel <bookings@whole-tel.com>',
    to: parsed.data.email,
    subject: `${inviterName} invited you to stay at ${property.name}`,
    react: BookingInvitationEmail({
      inviterName,
      propertyName: property.name,
      location: property.location,
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      acceptUrl,
    }),
  })

  revalidatePath('/bookings')

  return { success: true }
}

/**
 * Accept a booking invitation.
 * Requires registration data (full_name + phone). Uses atomic RPC for guest count increment.
 */
export async function acceptInvitation(
  token: string,
  registration: { fullName: string; phone: string }
): Promise<{ success: boolean; bookingId?: string; error?: string }> {
  const user = await verifySession()

  // Validate registration data
  const parsedReg = acceptInvitationSchema.safeParse(registration)
  if (!parsedReg.success) {
    return { success: false, error: parsedReg.error.issues[0]?.message ?? 'Invalid registration data' }
  }

  const supabase = await createClient()

  // Get user's profile email
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return { success: false, error: 'Profile not found' }
  }

  const admin = createAdminClient()

  // Fetch invitation by token
  const { data: invitation, error: invError } = await admin
    .from('booking_invitations')
    .select('id, booking_id, email, status')
    .eq('token', token)
    .single()

  if (invError || !invitation) {
    return { success: false, error: 'Invitation not found' }
  }

  if (invitation.status !== 'pending') {
    return { success: false, error: `This invitation has already been ${invitation.status}` }
  }

  if (invitation.email.toLowerCase() !== profile.email.toLowerCase()) {
    return { success: false, error: 'This invitation was sent to a different email address' }
  }

  // Update invitation status with registration data
  await admin
    .from('booking_invitations')
    .update({
      status: 'accepted',
      accepted_by: user.id,
      full_name: parsedReg.data.fullName.trim(),
      phone: parsedReg.data.phone.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', invitation.id)

  // Atomically increment guest count via RPC (guards max_guests internally)
  const { data: newCount, error: incrementError } = await admin.rpc(
    'increment_booking_guest_count',
    { p_booking_id: invitation.booking_id }
  )
  if (incrementError || newCount == null) {
    return { success: false, error: 'Failed to update guest count — booking may be full' }
  }

  // Fetch booking with property and add-on data for price recalculation
  const { data: booking } = await admin
    .from('bookings')
    .select(`
      *,
      properties(nightly_rate, cleaning_fee, max_guests, guest_threshold, per_person_rate, tax_rate),
      booking_add_ons(*, add_ons(id, name, price, pricing_unit, included_guests, per_person_above))
    `)
    .eq('id', invitation.booking_id)
    .single()

  if (!booking) {
    return { success: false, error: 'Booking not found' }
  }

  const property = Array.isArray(booking.properties)
    ? booking.properties[0]
    : booking.properties

  if (!property) {
    return { success: false, error: 'Property not found' }
  }

  // Calculate nights
  const checkInDate = new Date(booking.check_in)
  const checkOutDate = new Date(booking.check_out)
  const nights = Math.ceil(
    (checkOutDate.getTime() - checkInDate.getTime()) / 86400000
  )

  // Build add-on input
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

  // Recalculate pricing with new guest count (RPC already updated guest_count in DB)
  const breakdown = calculatePricing({
    nightlyRate: Number(property.nightly_rate),
    cleaningFee: Number(property.cleaning_fee),
    nights,
    guestCount: newCount,
    guestThreshold: property.guest_threshold != null ? Number(property.guest_threshold) : null,
    perPersonRate: property.per_person_rate != null ? Number(property.per_person_rate) : null,
    taxRate: property.tax_rate != null ? Number(property.tax_rate) : null,
    selectedAddOns,
  })

  const subtotal = breakdown.accommodationSubtotal + breakdown.perPersonSurcharge
  const addOnsTotal = breakdown.addOnsTotal
  const processingFee = breakdown.processingFee
  const total = breakdown.total

  // Update booking totals only (guest_count already updated by RPC)
  await admin
    .from('bookings')
    .update({
      subtotal,
      add_ons_total: addOnsTotal,
      processing_fee: processingFee,
      total,
      updated_at: new Date().toISOString(),
    })
    .eq('id', invitation.booking_id)

  // Update per-person add-on totals
  for (const item of breakdown.addOnItems) {
    const matchingRow = addOnRows.find(
      (ba: Record<string, unknown>) => ba.add_on_id === item.id
    )
    if (matchingRow) {
      const addOn = (matchingRow as Record<string, unknown>).add_ons as Record<string, unknown> | null
      const pricingUnit = String(addOn?.pricing_unit ?? 'per_booking')
      const hasIncludedGuests = addOn?.included_guests != null

      if (pricingUnit === 'per_person' || hasIncludedGuests) {
        await admin
          .from('booking_add_ons')
          .update({
            quantity: pricingUnit === 'per_person' ? newCount : 1,
            total_price: item.totalCost,
          })
          .eq('id', String((matchingRow as Record<string, unknown>).id))
      }
    }
  }

  revalidatePath('/bookings')

  return { success: true, bookingId: invitation.booking_id }
}

/**
 * Manually add an attendee to a booking (group lead only).
 * Creates an accepted invitation with full registration data and atomically increments guest count.
 */
export async function addAttendeeManually(input: {
  bookingId: string
  fullName: string
  email: string
  phone: string
}): Promise<{ success: boolean; error?: string }> {
  const user = await verifySession()

  // Validate input
  const parsed = addAttendeeManuallySchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const supabase = await createClient()

  // Fetch booking scoped to current user + confirmed status (only booking owner can add)
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id')
    .eq('id', parsed.data.bookingId)
    .eq('guest_id', user.id)
    .eq('status', 'confirmed')
    .single()

  if (bookingError || !booking) {
    return { success: false, error: 'Booking not found' }
  }

  const admin = createAdminClient()

  // Check for existing invitation with same booking + email
  const { data: existing } = await admin
    .from('booking_invitations')
    .select('id, status')
    .eq('booking_id', parsed.data.bookingId)
    .eq('email', parsed.data.email)
    .single()

  if (existing) {
    if (existing.status === 'accepted') {
      return { success: false, error: 'This person has already been added to the booking' }
    }

    // If declined or pending, update to accepted with new registration data
    await admin
      .from('booking_invitations')
      .update({
        status: 'accepted',
        accepted_by: null,
        full_name: parsed.data.fullName.trim(),
        phone: parsed.data.phone.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    // Insert new accepted invitation (no Supabase user — manually entered)
    const { error: insertError } = await admin
      .from('booking_invitations')
      .insert({
        booking_id: parsed.data.bookingId,
        email: parsed.data.email,
        status: 'accepted',
        invited_by: user.id,
        accepted_by: null,
        full_name: parsed.data.fullName.trim(),
        phone: parsed.data.phone.trim(),
      })

    if (insertError) {
      return { success: false, error: 'Failed to add attendee' }
    }
  }

  // Atomically increment guest count
  const { data: newCount, error: incrementError } = await admin.rpc(
    'increment_booking_guest_count',
    { p_booking_id: parsed.data.bookingId }
  )
  if (incrementError || newCount == null) {
    return { success: false, error: 'Failed to update guest count — booking may be full' }
  }

  // Fetch booking with property and add-on data for price recalculation
  const { data: fullBooking } = await admin
    .from('bookings')
    .select(`
      *,
      properties(nightly_rate, cleaning_fee, max_guests, guest_threshold, per_person_rate, tax_rate),
      booking_add_ons(*, add_ons(id, name, price, pricing_unit, included_guests, per_person_above))
    `)
    .eq('id', parsed.data.bookingId)
    .single()

  if (!fullBooking) {
    return { success: false, error: 'Booking not found after update' }
  }

  const property = Array.isArray(fullBooking.properties)
    ? fullBooking.properties[0]
    : fullBooking.properties

  if (!property) {
    return { success: false, error: 'Property not found' }
  }

  // Calculate nights
  const checkInDate = new Date(fullBooking.check_in)
  const checkOutDate = new Date(fullBooking.check_out)
  const nights = Math.ceil(
    (checkOutDate.getTime() - checkInDate.getTime()) / 86400000
  )

  // Build add-on input
  const addOnRows = fullBooking.booking_add_ons ?? []
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
    guestCount: newCount,
    guestThreshold: property.guest_threshold != null ? Number(property.guest_threshold) : null,
    perPersonRate: property.per_person_rate != null ? Number(property.per_person_rate) : null,
    taxRate: property.tax_rate != null ? Number(property.tax_rate) : null,
    selectedAddOns,
  })

  const subtotal = breakdown.accommodationSubtotal + breakdown.perPersonSurcharge
  const addOnsTotal = breakdown.addOnsTotal
  const processingFee = breakdown.processingFee
  const total = breakdown.total

  // Update booking totals (guest_count already updated by RPC)
  await admin
    .from('bookings')
    .update({
      subtotal,
      add_ons_total: addOnsTotal,
      processing_fee: processingFee,
      total,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.data.bookingId)

  // Update per-person add-on totals
  for (const item of breakdown.addOnItems) {
    const matchingRow = addOnRows.find(
      (ba: Record<string, unknown>) => ba.add_on_id === item.id
    )
    if (matchingRow) {
      const addOn = (matchingRow as Record<string, unknown>).add_ons as Record<string, unknown> | null
      const pricingUnit = String(addOn?.pricing_unit ?? 'per_booking')
      const hasIncludedGuests = addOn?.included_guests != null

      if (pricingUnit === 'per_person' || hasIncludedGuests) {
        await admin
          .from('booking_add_ons')
          .update({
            quantity: pricingUnit === 'per_person' ? newCount : 1,
            total_price: item.totalCost,
          })
          .eq('id', String((matchingRow as Record<string, unknown>).id))
      }
    }
  }

  revalidatePath('/bookings')

  return { success: true }
}

/**
 * Decline a booking invitation.
 * Validates email match and updates invitation status.
 */
export async function declineInvitation(
  token: string
): Promise<{ success: boolean; error?: string }> {
  const user = await verifySession()

  const supabase = await createClient()

  // Get user's profile email
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .single()

  if (!profile) {
    return { success: false, error: 'Profile not found' }
  }

  const admin = createAdminClient()

  // Fetch invitation by token
  const { data: invitation, error: invError } = await admin
    .from('booking_invitations')
    .select('id, email, status')
    .eq('token', token)
    .single()

  if (invError || !invitation) {
    return { success: false, error: 'Invitation not found' }
  }

  if (invitation.status !== 'pending') {
    return { success: false, error: `This invitation has already been ${invitation.status}` }
  }

  if (invitation.email.toLowerCase() !== profile.email.toLowerCase()) {
    return { success: false, error: 'This invitation was sent to a different email address' }
  }

  // Update invitation status
  await admin
    .from('booking_invitations')
    .update({
      status: 'declined',
      updated_at: new Date().toISOString(),
    })
    .eq('id', invitation.id)

  revalidatePath('/bookings')

  return { success: true }
}
