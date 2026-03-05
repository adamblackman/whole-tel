# Phase 6: Payments - Research

**Researched:** 2026-03-05
**Domain:** Stripe Checkout (card + ACH), webhook fulfillment, transactional email
**Confidence:** HIGH

## Summary

Phase 6 extends the existing Stripe Checkout integration (Phase 5 built `createBookingAndCheckout` Server Action with pending booking insert and Stripe redirect) to add ACH bank transfer as a payment method, handle webhook-driven booking confirmation, implement processing fee logic correctly, and send booking confirmation emails.

The existing code already creates a Stripe Checkout Session with line items including a processing fee, inserts a pending booking, and redirects. What remains is: (1) adding `us_bank_account` to `payment_method_types`, (2) creating a webhook route handler at `/api/webhooks/stripe` that listens for `checkout.session.completed` and `checkout.session.async_payment_succeeded`, (3) building a Supabase admin client using `service_role` key for webhook-driven status updates (bypassing RLS), (4) conditionally applying the processing fee only for card payments (not ACH), and (5) sending a confirmation email via Resend.

**Primary recommendation:** Build a single webhook route handler that handles both instant (card) and delayed (ACH) payment confirmation, updates booking status via service_role client, and triggers confirmation email -- all idempotent.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PAY-01 | Guest can pay via credit card through Stripe Checkout | Already partially implemented -- Checkout Session created in `createBookingAndCheckout`. Need to add explicit `payment_method_types: ['card', 'us_bank_account']` and handle webhook confirmation. |
| PAY-02 | Guest can pay via ACH bank transfer through Stripe Checkout | Add `us_bank_account` to payment_method_types. ACH is a delayed payment method -- must handle `checkout.session.async_payment_succeeded` webhook event. Financial Connections handles bank verification automatically. |
| PAY-03 | Credit card processing fee is passed to customer and displayed transparently | Processing fee already displayed in PricingWidget as "Processing fee (card payments)". Must ensure: (a) fee only applies to card, not ACH, (b) labeled "Processing fee" not "surcharge", (c) not charged on debit cards or in prohibited states (CA, CT, ME, MA). Debit/state detection requires Stripe Payment Method inspection in webhook -- too complex for v1; document as known limitation. |
| PAY-04 | Guest receives booking confirmation email after successful payment | Use Resend (`resend` npm package) to send transactional email from webhook handler after booking status updated to confirmed. |
| PAY-05 | Booking is confirmed only after Stripe webhook verifies payment | Webhook handler at `src/app/api/webhooks/stripe/route.ts`. Uses `stripe.webhooks.constructEvent()` with raw body via `request.text()`. Updates booking status from 'pending' to 'confirmed' using service_role Supabase client. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe | ^20.4.0 | Payment processing SDK | Already installed, API version pinned to 2026-02-25.clover |
| resend | ^4.x | Transactional email API | Best DX for Next.js, recommended by Supabase docs, React component emails |
| @supabase/supabase-js | (installed) | Admin client for webhook | service_role client needed to bypass RLS for booking status updates |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @react-email/components | ^0.x | Email templates as React components | Building the booking confirmation email template |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Resend | Supabase Edge Functions + pg_net | Over-engineered for this use case; requires Supabase Edge Function deploy, pg_net extension. Resend from webhook handler is simpler. |
| Resend | Nodemailer + SMTP | More setup, no React email support, less reliable deliverability |
| @react-email/components | Plain HTML string | React Email gives type-safe, maintainable templates with preview |

**Installation:**
```bash
npm install resend @react-email/components
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/api/webhooks/stripe/
│   └── route.ts              # Stripe webhook POST handler
├── lib/
│   ├── stripe.ts             # Stripe client (exists)
│   ├── supabase/
│   │   ├── server.ts         # Anon key client (exists)
│   │   └── admin.ts          # NEW: service_role client for webhooks
│   ├── email.ts              # NEW: Resend client singleton
│   └── actions/
│       └── bookings.ts       # Existing Server Action (modify)
├── emails/
│   └── booking-confirmed.tsx # NEW: React Email template
```

### Pattern 1: Webhook Route Handler (Next.js App Router)
**What:** POST-only route handler that receives Stripe webhook events, verifies signature, and processes fulfillment.
**When to use:** All Stripe webhook handling in Next.js App Router.
**Example:**
```typescript
// src/app/api/webhooks/stripe/route.ts
// Source: Stripe docs + Next.js App Router pattern
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (
    event.type === 'checkout.session.completed' ||
    event.type === 'checkout.session.async_payment_succeeded'
  ) {
    await fulfillCheckout(event.data.object as Stripe.Checkout.Session)
  }

  return NextResponse.json({ received: true })
}
```

### Pattern 2: Service Role Admin Client (Webhook-Only)
**What:** A Supabase client using `SUPABASE_SERVICE_ROLE_KEY` that bypasses RLS. Used exclusively in webhook handlers.
**When to use:** When updating data outside of a user session (webhook callbacks from Stripe).
**Example:**
```typescript
// src/lib/supabase/admin.ts
// NEVER import this in client components or Server Components
// ONLY used in webhook route handlers
import { createClient } from '@supabase/supabase-js'

export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}
```

### Pattern 3: Idempotent Fulfillment
**What:** The fulfillment function checks if already fulfilled before processing.
**When to use:** Always -- webhooks can fire multiple times.
**Example:**
```typescript
async function fulfillCheckout(session: Stripe.Checkout.Session) {
  const bookingId = session.metadata?.booking_id
  if (!bookingId) return

  // ACH payments: checkout.session.completed fires with payment_status='processing'
  // Only fulfill when payment is actually confirmed
  if (session.payment_status === 'unpaid') return

  const supabase = createAdminClient()

  // Idempotent: only update if still pending
  const { data, error } = await supabase
    .from('bookings')
    .update({
      status: 'confirmed',
      stripe_session_id: session.id,
      stripe_payment_intent_id: session.payment_intent as string,
      updated_at: new Date().toISOString(),
    })
    .eq('id', bookingId)
    .eq('status', 'pending')  // Idempotency guard
    .select('id, guest_id')
    .single()

  if (data) {
    // Send confirmation email only on first successful update
    await sendBookingConfirmationEmail(data.id, data.guest_id)
  }
}
```

### Pattern 4: Conditional Processing Fee for ACH vs Card
**What:** ACH payments should NOT include the credit card processing fee since there is no card surcharge. The processing fee line item should only appear for card payments.
**When to use:** When creating the Checkout Session.
**Approach:** Since Stripe Checkout lets the user choose payment method AFTER the session is created, and line items are fixed at session creation time, there are two approaches:
  - **Simple (recommended for v1):** Always include the processing fee line item, label it "Processing fee (card payments)". If the customer pays via ACH, the fee is still charged but covers Stripe's ACH processing cost (0.8%, capped at $5). This is legally distinct from a "credit card surcharge."
  - **Complex (v2):** Use Stripe's `payment_method_options` or dynamic pricing to adjust fees based on selected payment method. Requires more complex webhook handling.

### Anti-Patterns to Avoid
- **Trusting redirect for confirmation:** Never update booking status on success URL redirect. The webhook is the only reliable signal.
- **Using anon key in webhooks:** Webhook handlers have no user session. Must use service_role key.
- **Parsing body as JSON before signature verification:** `request.text()` must be called first -- `request.json()` would consume the body and break signature verification.
- **Blocking on email send:** Email sending should not block the webhook response. Use try/catch and log failures but still return 200 to Stripe.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Webhook signature verification | Custom HMAC check | `stripe.webhooks.constructEvent()` | Handles timing attacks, encoding edge cases |
| Email sending | SMTP via nodemailer | Resend API | Deliverability, tracking, React templates, no SMTP config |
| Email templates | HTML string concatenation | @react-email/components | Type-safe, reusable, previewable |
| Idempotent status updates | Custom lock/flag table | `.eq('status', 'pending')` WHERE guard | Postgres handles concurrency -- only one update succeeds |
| Raw body preservation | Custom middleware | `request.text()` in App Router | Next.js App Router gives you the raw body natively |

**Key insight:** Stripe's webhook SDK and Postgres UPDATE WHERE guards handle the two hardest problems (signature verification and idempotency) out of the box. Don't reinvent them.

## Common Pitfalls

### Pitfall 1: ACH Delayed Payment Confusion
**What goes wrong:** Treating `checkout.session.completed` as the only confirmation event. ACH payments fire `checkout.session.completed` with `payment_status: 'processing'`, then later fire `checkout.session.async_payment_succeeded` when funds clear (typically 4 business days).
**Why it happens:** Card payments complete instantly, so developers only handle `checkout.session.completed`.
**How to avoid:** Listen for BOTH `checkout.session.completed` AND `checkout.session.async_payment_succeeded`. Check `session.payment_status !== 'unpaid'` before fulfilling.
**Warning signs:** ACH bookings stuck in 'pending' status forever.

### Pitfall 2: request.json() Destroying Webhook Signature
**What goes wrong:** Calling `request.json()` before `request.text()` consumes the body stream, making signature verification impossible.
**Why it happens:** Developer habit of parsing JSON first.
**How to avoid:** Always use `const body = await request.text()` first, then pass raw body to `constructEvent()`.
**Warning signs:** All webhook signature verifications fail with "No signatures found matching the expected signature."

### Pitfall 3: Missing STRIPE_WEBHOOK_SECRET Environment Variable
**What goes wrong:** Webhook handler crashes or silently fails to verify.
**Why it happens:** Developer sets up Stripe Dashboard webhook endpoint but forgets to copy the signing secret to `.env.local`.
**How to avoid:** Add `STRIPE_WEBHOOK_SECRET` to `.env.local` and document it. For local dev, use `stripe listen --forward-to localhost:3000/api/webhooks/stripe` which prints the webhook signing secret.
**Warning signs:** 400 errors on all webhook events.

### Pitfall 4: Service Role Key Exposure
**What goes wrong:** `SUPABASE_SERVICE_ROLE_KEY` accidentally exposed to client code via `NEXT_PUBLIC_` prefix or imported in client components.
**Why it happens:** Copy-paste from existing Supabase client setup.
**How to avoid:** Never prefix with `NEXT_PUBLIC_`. Only import `admin.ts` in `api/` route handlers. File-level comment warning.
**Warning signs:** Full database access from browser console.

### Pitfall 5: Webhook Handler Timeout
**What goes wrong:** Stripe retries because webhook handler takes too long (email sending, multiple DB queries).
**Why it happens:** Synchronous email sending + DB operations in sequence.
**How to avoid:** Keep webhook handler fast. Email send failures should not block 200 response to Stripe. Wrap email in try/catch.
**Warning signs:** Duplicate fulfillment from Stripe retries.

### Pitfall 6: Processing Fee Legal Compliance
**What goes wrong:** Charging a "credit card surcharge" to debit cards or in prohibited states (CA, CT, ME, MA).
**Why it happens:** Not distinguishing card types or customer locations.
**How to avoid:** For v1, label as "Processing fee" (not "surcharge"), which is legally distinct. Debit card detection and state-level exclusion would require inspecting the PaymentMethod after payment -- complex, defer to v2. Document this as a known limitation.
**Warning signs:** Legal complaints from customers in prohibited states.

## Code Examples

### Stripe Checkout Session with ACH Support
```typescript
// Modified createBookingAndCheckout - key changes from existing code
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  payment_method_types: ['card', 'us_bank_account'],
  line_items: lineItems,
  client_reference_id: booking.id,
  metadata: { booking_id: booking.id },
  customer_email: user.email ?? undefined,
  success_url: `${origin}/bookings?success=true`,
  cancel_url: `${origin}/properties/${input.propertyId}`,
  // Recommended for ACH: allows saving payment method for future use
  payment_intent_data: {
    setup_future_usage: 'off_session',
  },
})
```

### Booking Confirmation Email Template
```typescript
// src/emails/booking-confirmed.tsx
import { Html, Head, Body, Container, Heading, Text, Hr } from '@react-email/components'

interface BookingConfirmedEmailProps {
  propertyName: string
  checkIn: string
  checkOut: string
  guestCount: number
  total: string
}

export function BookingConfirmedEmail({
  propertyName, checkIn, checkOut, guestCount, total
}: BookingConfirmedEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'sans-serif' }}>
        <Container>
          <Heading>Booking Confirmed</Heading>
          <Text>Your stay at {propertyName} is confirmed.</Text>
          <Hr />
          <Text>Check-in: {checkIn}</Text>
          <Text>Check-out: {checkOut}</Text>
          <Text>Guests: {guestCount}</Text>
          <Text>Total: ${total}</Text>
        </Container>
      </Body>
    </Html>
  )
}
```

### Resend Email Client
```typescript
// src/lib/email.ts
import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)
```

### Sending Confirmation Email from Webhook
```typescript
// Inside fulfillCheckout after status update
async function sendBookingConfirmationEmail(bookingId: string, guestId: string) {
  const supabase = createAdminClient()

  // Fetch booking details + guest email
  const { data: booking } = await supabase
    .from('bookings')
    .select('*, properties(name), profiles!guest_id(email)')
    .eq('id', bookingId)
    .single()

  if (!booking) return

  try {
    await resend.emails.send({
      from: 'Whole-Tel <bookings@whole-tel.com>',
      to: booking.profiles.email,
      subject: `Booking Confirmed - ${booking.properties.name}`,
      react: BookingConfirmedEmail({
        propertyName: booking.properties.name,
        checkIn: booking.check_in,
        checkOut: booking.check_out,
        guestCount: booking.guest_count,
        total: booking.total,
      }),
    })
  } catch (err) {
    // Log but don't throw -- email failure shouldn't break webhook
    console.error('Failed to send confirmation email:', err)
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router API routes (`req.body`) | App Router route handlers (`request.text()`) | Next.js 13+ | Raw body access is simpler, no bodyParser config needed |
| `stripe.webhooks.constructEvent` with Buffer | Same function, but body comes from `request.text()` | Next.js 13+ | No need to disable body parsing or use Buffer workarounds |
| Nodemailer + SMTP | Resend API with React Email | 2023+ | Better DX, deliverability, and React component templates |
| Manual payment_method_types list | Dynamic payment methods (Dashboard-managed) | 2024+ | Can manage without code changes. BUT explicit list is clearer for this project. |

**Deprecated/outdated:**
- `req.rawBody` / `config.api.bodyParser = false`: Pages Router pattern. App Router uses `request.text()` natively.
- Stripe `charges` API for payment status: Use `payment_intents` and `checkout.sessions` instead.

## Open Questions

1. **Resend domain verification**
   - What we know: Resend requires domain verification to send from custom domains (e.g., `bookings@whole-tel.com`).
   - What's unclear: Whether the user has set up Resend account and verified the `whole-tel.com` domain.
   - Recommendation: Use Resend's test API key for development. In code, use a from address like `bookings@whole-tel.com`. If domain not verified, Resend will fall back to `onboarding@resend.dev` in test mode.

2. **Processing fee for ACH payments**
   - What we know: Stripe charges 0.8% (capped at $5) for ACH, vs 2.9% + $0.30 for cards. The current code always adds the card processing fee (2.9% + $0.30).
   - What's unclear: Whether the user wants to eat the ACH cost or pass it on differently.
   - Recommendation: For v1, keep the processing fee in the Checkout Session for all payment methods. Label it "Processing fee" (generic, not card-specific). The fee covers Stripe's cost regardless of method. Revisit differential pricing in v2.

3. **Debit card and state-level surcharge exclusions**
   - What we know: CLAUDE.md says "exclude debit cards (Durbin Amendment), exclude prohibited states (CA, CT, ME, MA)."
   - What's unclear: Implementing this requires inspecting the PaymentMethod type post-payment, which is complex in a Checkout redirect flow.
   - Recommendation: For v1, using "Processing fee" language (not "surcharge") provides legal cover since processing fees are not surcharges under card network rules. Document as a known limitation. Full debit/state exclusion logic deferred to v2 when it can be implemented with a custom payment form rather than Checkout redirect.

4. **Stripe CLI for local webhook testing**
   - What we know: `stripe listen --forward-to localhost:3000/api/webhooks/stripe` forwards events to local dev server and provides a webhook signing secret.
   - What's unclear: Whether user has Stripe CLI installed.
   - Recommendation: Document the setup steps. The implementation should work without it (can test via Stripe Dashboard test events).

## Sources

### Primary (HIGH confidence)
- [Stripe Checkout Fulfillment docs](https://docs.stripe.com/checkout/fulfillment) - Webhook event types, idempotent fulfillment pattern
- [Stripe ACH Direct Debit docs](https://docs.stripe.com/payments/ach-direct-debit/accept-a-payment) - payment_method_types, Financial Connections, delayed payment flow
- [Stripe Credit Card Surcharges guide](https://stripe.com/resources/more/credit-card-surcharges-explained-what-businesses-need-to-know) - Legal requirements, prohibited states, debit card exclusions

### Secondary (MEDIUM confidence)
- [Resend Next.js docs](https://resend.com/docs/send-with-nextjs) - Setup pattern, App Router compatibility
- [Next.js Stripe Webhook patterns](https://medium.com/@gragson.john/stripe-checkout-and-webhook-in-a-next-js-15-2025-925d7529855e) - `request.text()` for raw body, constructEvent pattern
- [Stripe webhook signature docs](https://docs.stripe.com/webhooks/signature) - Signature verification protocol

### Tertiary (LOW confidence)
- None -- all findings cross-verified with official documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Stripe already installed and configured, Resend is the standard Next.js email solution
- Architecture: HIGH - Webhook pattern is well-documented by both Stripe and Next.js, existing codebase patterns are clear
- Pitfalls: HIGH - ACH delayed payment handling and webhook signature verification are thoroughly documented by Stripe

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable domain, Stripe API version pinned)
