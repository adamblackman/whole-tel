'use server'

import { revalidatePath } from 'next/cache'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getStripe } from '@/lib/stripe'
import {
  saveSplitsSchema,
  generatePaymentLinkSchema,
  centsEqual,
} from '@/lib/validations/split-payment'

/**
 * Save (upsert) the split payment configuration for a confirmed booking.
 * Validates that split amounts sum exactly to the booking total.
 * Only the booking owner can call this action.
 */
export async function saveSplits(input: {
  bookingId: string
  splits: { invitationId: string; amount: number }[]
}): Promise<{ success: boolean; error?: string }> {
  const user = await verifySession()

  const parsed = saveSplitsSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const { bookingId, splits } = parsed.data

  // Fetch booking scoped to current user + confirmed status
  const supabase = await createClient()
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, total, status')
    .eq('id', bookingId)
    .eq('guest_id', user.id)
    .eq('status', 'confirmed')
    .single()

  if (bookingError || !booking) {
    return { success: false, error: 'Booking not found or not confirmed' }
  }

  // Validate that the sum of split amounts equals the booking total (cents comparison)
  const splitSumCents = splits.reduce(
    (sum, s) => sum + Math.round(s.amount * 100),
    0
  )
  const bookingTotalCents = Math.round(Number(booking.total) * 100)

  if (splitSumCents !== bookingTotalCents) {
    return {
      success: false,
      error: 'Split amounts must equal the booking total exactly.',
    }
  }

  // Upsert splits — idempotent on (booking_id, invitation_id)
  const admin = createAdminClient()
  const { error: upsertError } = await admin
    .from('booking_splits')
    .upsert(
      splits.map((s) => ({
        booking_id: bookingId,
        invitation_id: s.invitationId,
        amount: s.amount,
        payment_status: 'unpaid',
      })),
      { onConflict: 'booking_id,invitation_id' }
    )

  if (upsertError) {
    console.error('saveSplits: failed to upsert splits', bookingId, upsertError.message)
    return { success: false, error: 'Failed to save split configuration' }
  }

  revalidatePath('/bookings')

  return { success: true }
}

/**
 * Generate (or regenerate) a Stripe Payment Link for an individual attendee split.
 * If a previous link exists it is deactivated before creating a new one.
 * Guard: returns an error if the split has already been paid.
 */
export async function generatePaymentLink(input: {
  bookingId: string
  invitationId: string
}): Promise<{ success: boolean; url?: string; error?: string }> {
  const user = await verifySession()

  const parsed = generatePaymentLinkSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid input' }
  }

  const { bookingId, invitationId } = parsed.data

  // Fetch booking scoped to current user + confirmed status
  const supabase = await createClient()
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, total, status, properties(name)')
    .eq('id', bookingId)
    .eq('guest_id', user.id)
    .eq('status', 'confirmed')
    .single()

  if (bookingError || !booking) {
    return { success: false, error: 'Booking not found or not confirmed' }
  }

  const property = Array.isArray(booking.properties)
    ? booking.properties[0]
    : booking.properties

  const propertyName = (property as { name: string } | null)?.name ?? 'Villa'

  // Fetch the split row via admin (bypasses RLS for server-side link generation)
  const admin = createAdminClient()
  const { data: split, error: splitError } = await admin
    .from('booking_splits')
    .select('id, amount, payment_status, stripe_payment_link_id')
    .eq('booking_id', bookingId)
    .eq('invitation_id', invitationId)
    .single()

  if (splitError || !split) {
    return { success: false, error: 'Split not found — save the split configuration first' }
  }

  if (split.payment_status === 'paid') {
    return { success: false, error: 'This share has already been paid' }
  }

  // Deactivate old link if one exists (prevents orphaned active links)
  if (split.stripe_payment_link_id) {
    try {
      await getStripe().paymentLinks.update(split.stripe_payment_link_id, { active: false })
    } catch (err) {
      console.error('generatePaymentLink: failed to deactivate old link', err)
      // Non-fatal — proceed to create new link
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // Create Stripe Payment Link for the individual share
  const link = await getStripe().paymentLinks.create({
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(Number(split.amount) * 100),
          product_data: {
            name: `${propertyName} - Your share`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: {
      booking_id: bookingId,
      invitation_id: invitationId,
      split_type: 'group_booking',
    },
    after_completion: {
      type: 'redirect',
      redirect: {
        url: `${appUrl}/bookings?split_paid=true`,
      },
    },
  })

  // Persist the new payment link details
  await admin
    .from('booking_splits')
    .update({
      stripe_payment_link_id: link.id,
      stripe_payment_link_url: link.url,
      updated_at: new Date().toISOString(),
    })
    .eq('booking_id', bookingId)
    .eq('invitation_id', invitationId)

  revalidatePath('/bookings')

  return { success: true, url: link.url }
}
