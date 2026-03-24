---
phase: 13-guest-registration-payment-deadlines
verified: 2026-03-24T05:00:00Z
status: passed
score: 12/12 must-haves verified
re_verification: false
---

# Phase 13: Guest Registration & Payment Deadlines Verification Report

**Phase Goal:** All booking attendees have name, email, and phone on record; the 36-hour first-payment deadline is enforced with automated expiry; per-person cost shows on confirmation
**Verified:** 2026-03-24T05:00:00Z
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | bookings table accepts 'expired' as a valid status value | VERIFIED | Migration adds `CHECK (status IN ('pending','confirmed','cancelled','expired'))` — `20260324000001_guest_registration_deadlines.sql` line 10 |
| 2  | bookings table has payment_deadline, activity_deadline, and stripe_checkout_url columns | VERIFIED | Migration lines 15-18 add all three columns with correct types |
| 3  | booking_invitations table has full_name and phone columns | VERIFIED | Migration lines 35-37 add both columns |
| 4  | increment_booking_guest_count RPC function exists and atomically increments guest_count | VERIFIED | Migration lines 42-58: `LANGUAGE sql SECURITY DEFINER`, guards `max_guests` via subquery, returns new count |
| 5  | TypeScript types reflect all new columns and the 'expired' status | VERIFIED | `database.ts` line 9: `BookingStatus` includes `'expired'`; Booking interface lines 101-103 has all three new fields; BookingInvitation lines 126-127 has `full_name` and `phone` |
| 6  | acceptInvitation requires full_name and phone before completing acceptance | VERIFIED | `booking-invitations.ts` line 136: signature `(token, registration: {fullName, phone})`; validated with `acceptInvitationSchema` line 143; fields stored at line 188-189 |
| 7  | acceptInvitation uses atomic RPC to increment guest_count (no read-then-write) | VERIFIED | Lines 195-200: `admin.rpc('increment_booking_guest_count', ...)` — manual `booking.guest_count + 1` removed; null return checked |
| 8  | Group lead can add attendees manually with name, email, and phone | VERIFIED | `addAttendeeManually` exported at line 307; uses `addAttendeeManuallySchema` (uuid, name ≥2, valid email, phone ≥7); upserts accepted invitation with full registration data; calls atomic RPC |
| 9  | createBookingAndCheckout stores stripe_checkout_url and sets payment_deadline + activity_deadline before redirect | VERIFIED | `bookings.ts` lines 251-260: update runs inside `try` block before `redirect(stripeUrl)` at line 267; uses `booking.created_at` from DB for accurate deadline computation |
| 10 | Booking detail page shows payment deadline countdown for pending bookings with Complete Payment CTA | VERIFIED | `BookingDetails.tsx` lines 107-120: renders `<PaymentDeadlineCountdown>` and amber `<a>` CTA when `status === 'pending' && paymentDeadline`; `PaymentDeadlineCountdown` is a 46-line `'use client'` component with 1s interval, Clock icon, amber styling |
| 11 | Guest list displays full_name and phone for accepted attendees | VERIFIED | `GuestList.tsx` lines 66-74: accepted invitations render `full_name` bold, then email + phone below in muted text; falls back to email-only for non-accepted |
| 12 | Cron endpoint expires pending bookings past payment_deadline every 15 minutes | VERIFIED | `expire-bookings/route.ts`: GET handler with `Bearer CRON_SECRET` auth, bulk update `status='expired'` where `status='pending' AND payment_deadline < now()`; `vercel.json` schedule `*/15 * * * *` |

**Score:** 12/12 truths verified

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260324000001_guest_registration_deadlines.sql` | Schema migration: status constraint, deadline columns, invitation columns, RPC | VERIFIED | 59 lines; all 5 sections present; `expired` in constraint |
| `src/types/database.ts` | Updated BookingStatus, Booking, BookingInvitation types | VERIFIED | `BookingStatus` includes `'expired'`; Booking has `payment_deadline/activity_deadline/stripe_checkout_url`; BookingInvitation has `full_name/phone` |
| `src/lib/actions/booking-invitations.ts` | Extended acceptInvitation + addAttendeeManually | VERIFIED | 546 lines; exports `sendInvitation`, `acceptInvitation`, `addAttendeeManually`, `declineInvitation`; all fully implemented |
| `src/lib/actions/bookings.ts` | Updated createBookingAndCheckout with deadline storage | VERIFIED | `computeActivityDeadline` helper at line 16; deadline update block at lines 251-260 before redirect |
| `src/lib/validations/booking-invitation.ts` | acceptInvitationSchema and addAttendeeManuallySchema | VERIFIED | Both schemas present at lines 13-23 with correct constraints |
| `src/components/booking/PaymentDeadlineCountdown.tsx` | Client-side countdown timer | VERIFIED | 46 lines; `'use client'`; `setInterval(1000)` with cleanup; Clock icon; amber/destructive styling |
| `src/components/booking/ManualAttendeeForm.tsx` | Inline form for manual attendee entry | VERIFIED | 106 lines; `'use client'`; 3 fields (name/email/phone); client validation; calls `addAttendeeManually`; loading state and error display |
| `src/components/booking/BookingDetails.tsx` | Extended with deadline display and expired state | VERIFIED | Imports PaymentDeadlineCountdown and ManualAttendeeForm; pending countdown section; activity deadline; amber expired banner; ManualAttendeeForm for confirmed bookings |
| `src/components/booking/GuestList.tsx` | Extended with full_name, phone display | VERIFIED | Props include `full_name: string | null` and `phone: string | null`; accepted invitations render registration data |
| `src/app/api/cron/expire-bookings/route.ts` | Vercel Cron handler for booking expiry | VERIFIED | 27 lines; exports `GET`; Bearer auth; bulk update; returns count |
| `vercel.json` | Cron schedule configuration | VERIFIED | `*/15 * * * *` schedule for `/api/cron/expire-bookings` |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/types/database.ts` | Migration schema | TypeScript mirrors DB columns | VERIFIED | `Booking` has `payment_deadline`, `activity_deadline`, `stripe_checkout_url`; `BookingInvitation` has `full_name`, `phone` |
| `booking-invitations.ts` | `increment_booking_guest_count` RPC | `admin.rpc()` call | VERIFIED | Lines 195-198 in `acceptInvitation`; lines 382-384 in `addAttendeeManually` |
| `bookings.ts` | `bookings.stripe_checkout_url` | Update after Stripe session creation | VERIFIED | Lines 255-260: `stripe_checkout_url: session.url` stored alongside both deadline columns |
| `BookingDetails.tsx` | `PaymentDeadlineCountdown.tsx` | Component import and render | VERIFIED | Imported at line 10; rendered at line 109 inside `status === 'pending' && paymentDeadline` guard |
| `BookingDetails.tsx` | `ManualAttendeeForm.tsx` | Component import for manual attendee entry | VERIFIED | Imported at line 11; rendered at lines 224-227 inside confirmed-booking section |
| `expire-bookings/route.ts` | `bookings` table | `createAdminClient()` update query | VERIFIED | Lines 12-18: `.update({status:'expired'}).eq('status','pending').lt('payment_deadline', now())` |
| `bookings/page.tsx` | `BookingCardClient` | Props threaded through to BookingDetails | VERIFIED | Query selects `payment_deadline`, `activity_deadline`, `stripe_checkout_url`, `full_name`, `phone`; all passed to `BookingCardClient` at lines 117-119 |
| `BookingCardClient.tsx` | `BookingDetails.tsx` | Props forwarded | VERIFIED | All three deadline props passed through at lines 102-104 |
| `InvitationActions.tsx` | `acceptInvitation` (registration signature) | Form collecting fullName + phone | VERIFIED | Lines 89-107: two Input fields; Accept button disabled until `fullName.trim().length >= 2 && phone.trim().length >= 7`; calls `acceptInvitation(token, {fullName, phone})` at line 27 |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PAY-01 | 13-01, 13-02, 13-03 | Guest registration requires full name, email, and phone for all attendees | SATISFIED | `booking_invitations` has `full_name`/`phone` columns; `acceptInvitation` gates on both; `InvitationActions.tsx` collects them before Accept button enables; `GuestList` displays them |
| PAY-02 | 13-02, 13-03 | Group lead can add attendees via email/username or enter details manually | SATISFIED | `addAttendeeManually` action + `ManualAttendeeForm` component; "Add manually" button in confirmed booking view |
| PAY-05 | 13-01, 13-02, 13-03 | First property payment due within 36 hours of booking | SATISFIED | `payment_deadline = created_at + 36h` set in `createBookingAndCheckout`; countdown displayed on pending bookings; "Complete Payment" CTA links to stored `stripe_checkout_url` |
| PAY-06 | 13-01, 13-03 | Activity/itinerary booking deadline: 30 days before check-in OR 7 days after booking (whichever comes first) | SATISFIED | `computeActivityDeadline` helper computes `LEAST(checkIn-30d, createdAt+7d)`; stored as `activity_deadline`; displayed with Calendar icon in BookingDetails for all booking statuses |
| PAY-08 | 13-01, 13-03 | Payment deadline enforcement (expired unpaid bookings auto-cancel) | SATISFIED | `bookings_status_check` constraint allows `'expired'`; cron route bulk-updates `pending→expired` where `payment_deadline < now()`; `vercel.json` schedules every 15 min; expired banner in BookingDetails; amber status badge in bookings page |

No orphaned requirements — all five IDs declared in plans map directly to implemented artifacts.

---

## Per-Person Cost on Confirmation

PAY-01 includes "per-person cost shows on confirmation" in the phase goal. Verified at `bookings/page.tsx` line 165-168:

```tsx
{booking.guest_count > 1 && (
  <p className="text-xs text-muted-foreground">
    Per person: {formatCurrency(booking.total / booking.guest_count)}
  </p>
)}
```

This is displayed on the booking card header (the confirmation view) for multi-guest bookings, satisfying the per-person display goal.

---

## Anti-Patterns Found

No anti-patterns found across all 9 modified/created files. No TODO/FIXME/placeholder comments, no stub implementations, no empty handlers.

---

## Human Verification Required

### 1. Payment Countdown Accuracy

**Test:** Create a test booking and observe the countdown on `/bookings`. Wait 5 seconds.
**Expected:** Timer decrements in real time, displaying `{h}h {mm}m {ss}s remaining` with Clock icon in amber.
**Why human:** Cannot verify browser-side `setInterval` behavior programmatically from source.

### 2. Complete Payment CTA Navigation

**Test:** On a pending booking with a stored `stripe_checkout_url`, click "Complete Payment".
**Expected:** Browser navigates to the Stripe Checkout session URL (external, not a Next.js route).
**Why human:** Link is a plain `<a>` tag pointing to an external Stripe URL; can only be verified with real Stripe session.

### 3. Invitation Acceptance Registration Gate

**Test:** Open an invitation link while logged in as the invited email. Leave name or phone blank.
**Expected:** Accept button is disabled. Both fields must be filled (name ≥ 2 chars, phone ≥ 7 chars) before the button enables.
**Why human:** UI interactivity state requires browser rendering.

### 4. Cron Endpoint with CRON_SECRET

**Test:** `curl -H "Authorization: Bearer <CRON_SECRET>" /api/cron/expire-bookings`
**Expected:** Returns `{"expired": N}` where N is the count of bookings expired. Without the header, returns 401.
**Why human:** Requires `CRON_SECRET` env var set in `.env.local` and a real or seeded booking past its `payment_deadline`.

---

## Gaps Summary

No gaps. All 12 observable truths verified, all 11 artifacts pass levels 1–3 (exists, substantive, wired), all 9 key links confirmed, and all 5 requirements satisfied with direct code evidence. Seven documented commits all exist in the repository at the expected hashes.

---

_Verified: 2026-03-24T05:00:00Z_
_Verifier: Claude (gsd-verifier)_
