---
phase: 06-payments
plan: 02
subsystem: payments
tags: [resend, react-email, transactional-email, stripe-webhook]

requires:
  - phase: 06-payments-01
    provides: "Stripe webhook handler with fulfillCheckout and booking status update"
provides:
  - "Resend email client singleton (lazy-initialized)"
  - "BookingConfirmedEmail React Email template"
  - "Confirmation email sent after webhook booking fulfillment"
affects: []

tech-stack:
  added: [resend, "@react-email/components"]
  patterns: [lazy-init-client, non-blocking-email-in-webhook]

key-files:
  created:
    - src/lib/email.ts
    - src/emails/booking-confirmed.tsx
  modified:
    - src/app/api/webhooks/stripe/route.ts

key-decisions:
  - "Lazy-init Resend client via getResend() to avoid build-time error when RESEND_API_KEY is not set"
  - "Email send wrapped in try/catch inside fulfillCheckout — failure logged but never blocks webhook 200 response"
  - "Guest email fetched via auth.admin.getUserById (not profiles table) for authoritative email source"

patterns-established:
  - "Lazy client init: getResend() pattern for clients that throw on missing env vars at module evaluation"
  - "Non-blocking email: try/catch around email send in webhook handlers"

requirements-completed: [PAY-04]

duration: 2min
completed: 2026-03-06
---

# Phase 6 Plan 02: Booking Confirmation Email Summary

**Resend + React Email confirmation email sent after Stripe webhook fulfillment with non-blocking try/catch**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-06T04:23:16Z
- **Completed:** 2026-03-06T04:25:41Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Resend email client with lazy initialization to avoid build errors without API key
- BookingConfirmedEmail React Email template with property name, dates, guest count, and total
- Webhook handler sends confirmation email after successful booking status update (non-blocking)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Resend + React Email, create email client and template** - `9eeda92` (feat)
2. **Task 2: Wire confirmation email into webhook fulfillment** - `3f5e06b` (feat)

## Files Created/Modified
- `src/lib/email.ts` - Resend client singleton with lazy initialization
- `src/emails/booking-confirmed.tsx` - React Email template for booking confirmation
- `src/app/api/webhooks/stripe/route.ts` - Added sendBookingConfirmationEmail after fulfillment
- `package.json` / `package-lock.json` - Added resend and @react-email/components

## Decisions Made
- **Lazy-init Resend client:** Resend constructor throws if API key is missing. Unlike Stripe (which has a key in .env.local), Resend may not be configured yet. Using `getResend()` function defers instantiation to first call.
- **Guest email from auth.users:** Using `auth.admin.getUserById` instead of a profiles table query ensures the email is always the authoritative auth email.
- **Property name via join:** Single Supabase query with `properties(name)` join avoids a second round-trip.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Lazy-initialized Resend client to fix build error**
- **Found during:** Task 2 (build verification)
- **Issue:** `new Resend(process.env.RESEND_API_KEY)` at module level throws during `next build` when RESEND_API_KEY is not set, breaking page data collection for the webhook route
- **Fix:** Changed to `getResend()` function that lazily creates the Resend instance on first call
- **Files modified:** src/lib/email.ts, src/app/api/webhooks/stripe/route.ts
- **Verification:** `npx next build` passes cleanly
- **Committed in:** 3f5e06b (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Essential fix for build correctness. No scope creep.

## Issues Encountered
None beyond the auto-fixed deviation above.

## User Setup Required

The following environment variable must be configured for email delivery:

- **RESEND_API_KEY** - Obtain from [Resend Dashboard](https://resend.com) -> API Keys -> Create API Key
- **Domain verification** (production) - Resend Dashboard -> Domains -> Add `whole-tel.com` -> Add DNS records

Without RESEND_API_KEY, the app builds and runs but email sends will fail (caught by try/catch, logged but non-blocking).

## Next Phase Readiness
- Payment flow is complete end-to-end: Stripe Checkout -> webhook -> booking confirmation -> email
- Phase 6 (Payments) is fully complete
- Ready for Phase 7

---
*Phase: 06-payments*
*Completed: 2026-03-06*
