---
phase: 06-payments
plan: 01
subsystem: payments
tags: [stripe, webhook, ach, supabase, idempotent]

requires:
  - phase: 05-booking-flow
    provides: "createBookingAndCheckout Server Action with Stripe Checkout session creation and pending booking insert"
  - phase: 01-foundation
    provides: "Supabase client pattern (server.ts) and bookings table schema"
provides:
  - "Stripe webhook endpoint at /api/webhooks/stripe for booking confirmation"
  - "Service role admin Supabase client for server-side operations bypassing RLS"
  - "ACH bank transfer payment method in Stripe Checkout"
affects: [06-02-confirmation-email, payments, bookings]

tech-stack:
  added: []
  patterns: [webhook-signature-verification, idempotent-fulfillment, admin-client-pattern]

key-files:
  created:
    - src/lib/supabase/admin.ts
    - src/app/api/webhooks/stripe/route.ts
  modified:
    - src/lib/actions/bookings.ts

key-decisions:
  - "fulfillCheckout guards on payment_status !== 'unpaid' to handle ACH processing delay"
  - "Idempotent update via .eq('status', 'pending') prevents duplicate confirmations"
  - "Always return 200 to Stripe after signature verification to prevent retries"

patterns-established:
  - "Admin client pattern: createAdminClient() in src/lib/supabase/admin.ts for webhook/server-only contexts"
  - "Webhook handler pattern: raw body via request.text(), constructEvent for signature, switch on event.type"

requirements-completed: [PAY-01, PAY-02, PAY-03, PAY-05]

duration: 2min
completed: 2026-03-06
---

# Phase 6 Plan 01: Stripe Webhook + ACH Summary

**Stripe webhook handler with idempotent booking confirmation for card and ACH payments, plus service role admin client**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-06T04:19:18Z
- **Completed:** 2026-03-06T04:21:01Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Webhook route at /api/webhooks/stripe handles checkout.session.completed and async_payment_succeeded events
- Service role admin client bypasses RLS for webhook-driven booking updates
- ACH bank transfer (us_bank_account) added as payment option alongside credit cards
- Idempotent fulfillment ensures duplicate webhook deliveries are safe no-ops

## Task Commits

Each task was committed atomically:

1. **Task 1: Create admin Supabase client and Stripe webhook route handler** - `f511ffa` (feat)
2. **Task 2: Add ACH bank transfer to Stripe Checkout session creation** - `469bdb4` (feat)

## Files Created/Modified
- `src/lib/supabase/admin.ts` - Service role Supabase client for webhook handlers (never imported in client code)
- `src/app/api/webhooks/stripe/route.ts` - Stripe webhook POST handler with signature verification and idempotent fulfillment
- `src/lib/actions/bookings.ts` - Added payment_method_types: ['card', 'us_bank_account'] to Stripe Checkout session

## Decisions Made
- fulfillCheckout returns early when payment_status is 'unpaid' (ACH still processing) -- waits for async_payment_succeeded
- Always return 200 to Stripe after valid signature to prevent retry storms, even if fulfillment encounters non-critical issues
- Admin client uses @supabase/supabase-js createClient (not @supabase/ssr) since webhooks have no cookie context

## Deviations from Plan

None - plan executed exactly as written.

## User Setup Required

**Environment variables to add to `.env.local`:**
- `STRIPE_WEBHOOK_SECRET` - For local dev: run `stripe listen --forward-to localhost:3000/api/webhooks/stripe` and copy the `whsec_...` secret

**Stripe Dashboard configuration (production):**
- Developers -> Webhooks -> Add endpoint
- URL: `https://yourdomain.com/api/webhooks/stripe`
- Events: `checkout.session.completed`, `checkout.session.async_payment_succeeded`

## Next Phase Readiness
- Webhook handler ready for Plan 02 (confirmation email) to hook into fulfillCheckout
- select('id, guest_id') in fulfillment provides data needed for email sending

---
*Phase: 06-payments*
*Completed: 2026-03-06*
