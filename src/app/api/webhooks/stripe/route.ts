import { NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { getResend } from '@/lib/email'
import { BookingConfirmedEmail } from '@/emails/booking-confirmed'
import { createAdminClient } from '@/lib/supabase/admin'
import type Stripe from 'stripe'

/**
 * Stripe webhook handler for booking confirmation.
 *
 * Handles two event types:
 * - checkout.session.completed: fires for card payments (instant) and ACH (may still be processing)
 * - checkout.session.async_payment_succeeded: fires for ACH when funds clear (~4 business days)
 *
 * Idempotency: fulfillCheckout only updates bookings with status='pending',
 * so duplicate webhook deliveries are safe no-ops.
 */

async function fulfillCheckout(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.booking_id
  if (!bookingId) {
    console.error('Webhook: missing booking_id in session metadata')
    return
  }

  // ACH payments fire checkout.session.completed with payment_status='unpaid'
  // while funds are still processing. Wait for async_payment_succeeded instead.
  if (session.payment_status === 'unpaid') {
    return
  }

  // Split payment from Stripe Payment Link — mark the individual split as paid
  // and return early. Do NOT update bookings.status (booking is already confirmed).
  const invitationId = session.metadata?.invitation_id
  if (invitationId) {
    const supabase = createAdminClient()
    const { error } = await supabase
      .from('booking_splits')
      .update({ payment_status: 'paid', updated_at: new Date().toISOString() })
      .eq('invitation_id', invitationId)
      .eq('booking_id', bookingId)
      .eq('payment_status', 'unpaid') // idempotent guard
    if (error) {
      console.error('Webhook: failed to update split payment', {
        bookingId,
        invitationId,
        error: error.message,
      })
    }
    return
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('bookings')
    .update({
      status: 'confirmed',
      stripe_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent as string,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .eq('status', 'pending')
    .select('id, guest_id')

  if (error) {
    console.error('Webhook: failed to update booking', bookingId, error.message)
  } else if (!data || data.length === 0) {
    // No rows updated — booking already confirmed (idempotent) or not found
    console.log('Webhook: booking already confirmed or not found', bookingId)
  } else if (data[0]) {
    // Booking confirmed — send confirmation email (non-blocking)
    try {
      await sendBookingConfirmationEmail(data[0].id, data[0].guest_id)
    } catch (err) {
      console.error('Failed to send confirmation email:', err)
    }
  }
}

async function sendBookingConfirmationEmail(bookingId: string, guestId: string) {
  const supabase = createAdminClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, check_in, check_out, guest_count, total, properties(name)')
    .eq('id', bookingId)
    .single()

  if (!booking) {
    console.warn('Email: booking not found', bookingId)
    return
  }

  const { data: { user } } = await supabase.auth.admin.getUserById(guestId)

  if (!user?.email) {
    console.warn('Email: guest email not found', guestId)
    return
  }

  const property = booking.properties as unknown as { name: string }
  const total = Number(booking.total).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  await getResend().emails.send({
    from: 'Whole-Tel <bookings@whole-tel.com>',
    to: user.email,
    subject: `Booking Confirmed - ${property.name}`,
    react: BookingConfirmedEmail({
      propertyName: property.name,
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      guestCount: booking.guest_count,
      total,
    }),
  })
}

export async function POST(request: Request) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = getStripe().webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_succeeded': {
      const session = event.data.object as Stripe.Checkout.Session
      await fulfillCheckout(session)
      break
    }
    default:
      // Unhandled event type — acknowledge receipt
      break
  }

  // Always return 200 after signature verification passes.
  // Returning non-200 causes Stripe to retry, which is undesirable
  // when the event was received but fulfillment had a non-critical issue.
  return NextResponse.json({ received: true })
}
