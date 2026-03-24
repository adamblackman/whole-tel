---
phase: 17-split-payments
verified: 2026-03-24T12:48:00Z
status: human_needed
score: 9/10 must-haves verified
re_verification: false
human_verification:
  - test: "Navigate to /bookings with a confirmed booking that has at least one accepted attendee, verify Split Payments section renders with per-attendee amount inputs"
    expected: "Section header 'Split Payments' visible, each accepted attendee has an editable amount input, Even split button present for 2+ attendees"
    why_human: "UI rendering requires a browser with real Supabase data; the booking_splits migration has not yet been applied (manual apply per MEMORY.md convention)"
  - test: "Enter amounts that do NOT sum to the total, verify Save Splits button is disabled or errors; then balance to $0.00, verify button enables and saves"
    expected: "Save button disabled when remaining != $0.00; green 'Remaining: $0.00' when balanced; save succeeds and splitsSaved gate enables Generate Link buttons"
    why_human: "Real-time balance tracking and button gate state requires browser interaction"
  - test: "Click Generate Link for an attendee, verify a Stripe Payment Link URL appears and the Copy button copies it to clipboard"
    expected: "URL displayed inline, Regenerate button appears, Copy button shows 'Copied!' feedback; Stripe dashboard shows a payment link with correct unit_amount and metadata.invitation_id"
    why_human: "Stripe Payment Link creation requires live Stripe credentials and DB migration applied"
  - test: "Simulate split payment webhook: POST checkout.session.completed with metadata.invitation_id set — verify booking_splits row payment_status flips to 'paid' and bookings.status is NOT changed"
    expected: "Split row updates to 'paid'; existing booking remains 'confirmed' (not re-triggered); idempotent second call is a no-op"
    why_human: "Webhook behavior requires Stripe test-mode event delivery or stripe CLI forwarding; DB migration must be applied"
---

# Phase 17: Split Payments Verification Report

**Phase Goal:** Group lead can divide the booking total among attendees and each guest receives an individual Stripe payment link for their share; split amounts validate against the canonical pricing total
**Verified:** 2026-03-24T12:48:00Z
**Status:** human_needed (all automated checks pass; 4 items require human/browser verification pending DB migration)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Split amounts server-side validate that the sum equals the canonical booking total | VERIFIED | `saveSplits` reduces `Math.round(s.amount * 100)` per split, compares integer sum to `Math.round(booking.total * 100)`; test suite confirms mismatch returns error, float edge case (0.1+0.2=0.3) succeeds |
| 2 | Stripe Payment Link is generated for an individual attendee share | VERIFIED | `generatePaymentLink` calls `getStripe().paymentLinks.create` with `line_items[0].price_data.unit_amount = Math.round(split.amount * 100)` and `metadata.invitation_id`; test asserts `unit_amount: 25050` for $250.50 |
| 3 | Webhook correctly routes split payments without re-confirming the booking | VERIFIED | `fulfillCheckout` checks `metadata?.invitation_id` before booking confirmation logic; if present, updates `booking_splits` and returns early — the `bookings.status` update is never reached |
| 4 | Only confirmed bookings with accepted attendees can have splits | VERIFIED | `saveSplits` queries `bookings.eq('status', 'confirmed').eq('guest_id', user.id)` (owner-only, confirmed-only); UI in `BookingCardClient` renders `SplitPaymentEditor` only when `status === 'confirmed' && invitations.some(inv => inv.status === 'accepted')` |
| 5 | Group lead can view attendees and assign a payment amount to each person | VERIFIED | `SplitPaymentEditor` renders per-attendee `Input` (type=number, step=0.01) with name/email display; amounts stored as strings to avoid float flicker |
| 6 | UI shows remaining unallocated balance that updates in real-time | VERIFIED | `remaining = Math.round((total - sumEntered) * 100) / 100` recomputed on every amount change; colored green/amber/red via `remainingColor()` |
| 7 | Save button is enabled only when remaining balance reaches $0.00 | VERIFIED | `disabled={!isBalanced || saving}` where `isBalanced = Math.abs(remaining) < 0.005` |
| 8 | Each attendee gets a Generate Link button after splits are saved | VERIFIED | `!isPaid && splitsSaved` gates the Generate Link button; `splitsSaved` set true on successful `saveSplits` response |
| 9 | Generated Stripe Payment Link URL is displayed and copyable | VERIFIED | `linkUrls` state stores URL on success; displayed in truncated `<span>` with `Copy` icon button that calls `navigator.clipboard.writeText` and shows "Copied!" feedback via `copiedId` state |
| 10 | Paid/Unpaid badge shows per attendee based on webhook status | VERIFIED (code) / HUMAN NEEDED (live) | Code: `isPaid` reads `existingSplits[].paymentStatus === 'paid'` to show green "Paid" badge or yellow "Unpaid" badge; live behavior requires applied DB migration and webhook delivery |

**Score:** 9/10 truths verified programmatically (truth 10 partially — code verified, live data requires human)

---

## Required Artifacts

### Plan 01 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260324000004_split_payments.sql` | booking_splits table with RLS policies | VERIFIED | CREATE TABLE, UNIQUE(booking_id, invitation_id), amount > 0 CHECK, payment_status CHECK, two RLS policies (owner manage-all, attendee view-own) — 45 lines, complete |
| `src/types/database.ts` | BookingSplit interface and Database namespace entry | VERIFIED | `SplitPaymentStatus` type at line 11, `BookingSplit` interface at line 170, `booking_splits` in `Database.public.Tables` at line 217 |
| `src/lib/validations/split-payment.ts` | Zod schemas for split input validation | VERIFIED | Exports `splitPaymentSchema`, `saveSplitsSchema`, `generatePaymentLinkSchema`, `centsEqual`; 32 lines, substantive |
| `src/lib/actions/split-payments.ts` | Server Actions for saving splits and generating payment links | VERIFIED | `'use server'`, exports `saveSplits` and `generatePaymentLink`; full business logic — 193 lines |
| `src/app/api/webhooks/stripe/route.ts` | Extended webhook with split payment routing | VERIFIED | `invitation_id` check at lines 34-51, returns early, leaves booking confirmation path intact |

### Plan 02 Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/booking/SplitPaymentEditor.tsx` | Split payment UI (min 80 lines) | VERIFIED | 266 lines; `'use client'`, imports `saveSplits`/`generatePaymentLink`, full per-attendee input/badge/link flow, even-split helper, balance display |
| `src/components/booking/BookingCardClient.tsx` | Updated with SplitPaymentEditor integration | VERIFIED | Imports `SplitPaymentEditor` at line 13; renders at lines 131-145 with confirmed + accepted-attendee guard; `splits: SplitRow[]` prop added |
| `src/app/(guest)/bookings/page.tsx` | Bookings page query includes booking_splits | VERIFIED | `booking_splits(id, invitation_id, amount, payment_status, stripe_payment_link_url)` in select at line 215; `SplitRow` type defined; `splitsForCard` mapping at line 110; `split_paid` banner at lines 241-247 |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `src/lib/actions/split-payments.ts` | `bookings.total` | cents comparison in saveSplits | VERIFIED | `Math.round(Number(booking.total) * 100)` at line 51; integer comparison at line 53 |
| `src/lib/actions/split-payments.ts` | `stripe.paymentLinks.create` | generatePaymentLink Server Action | VERIFIED | `getStripe().paymentLinks.create({...})` at line 152 |
| `src/app/api/webhooks/stripe/route.ts` | `booking_splits` | metadata.invitation_id routing | VERIFIED | `session.metadata?.invitation_id` at line 34; `.from('booking_splits').update(...)` at line 37 |
| `src/components/booking/SplitPaymentEditor.tsx` | `src/lib/actions/split-payments.ts` | import | VERIFIED | `import { saveSplits, generatePaymentLink } from '@/lib/actions/split-payments'` at line 8 |
| `src/app/(guest)/bookings/page.tsx` | `booking_splits` | Supabase select query | VERIFIED | String `booking_splits(...)` present in select at line 215; data flows through `splitsForCard` mapping to `BookingCardClient splits` prop |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| PAY-03 | 17-01, 17-02 | Group lead can divide payment and adjust split amounts per person | SATISFIED | `saveSplits` validates cents-exact sum against `bookings.total`; `SplitPaymentEditor` provides per-attendee inputs; Save button gated on $0.00 balance |
| PAY-04 | 17-01, 17-02 | Each guest receives individual Stripe payment link for their share | SATISFIED (code) | `generatePaymentLink` creates Stripe Payment Link with `metadata.invitation_id` and correct `unit_amount`; URL stored and displayed in UI; webhook marks individual split paid without disturbing booking status |

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/lib/actions/split-payments.ts` | 11 | `centsEqual` imported but never used — direct integer comparison `splitSumCents !== bookingTotalCents` used instead | INFO | No functional impact; integer-to-integer comparison after `Math.round` is safe; ESLint emits a warning (`@typescript-eslint/no-unused-vars`). The logic is correct — this is a dead import left from the implementation drafting |

---

## Human Verification Required

### 1. Split Payments UI renders on confirmed bookings

**Test:** With DB migration applied, log in as a user with a confirmed booking that has at least one accepted attendee. Navigate to `/bookings`, expand the booking card.
**Expected:** "Split Payments" section appears below the itinerary button with per-attendee amount inputs, "Even split" helper, and real-time remaining balance display.
**Why human:** UI rendering requires browser with applied DB migration (`booking_splits` table must exist).

### 2. Save/Balance validation flow

**Test:** Enter amounts that don't sum to the total — verify Save is disabled. Enter even split — verify Remaining shows $0.00 in green and Save enables. Click Save — verify success.
**Expected:** Balance-gated Save button, green $0.00 indicator, successful upsert to `booking_splits`.
**Why human:** Interactive state requires browser; DB migration must be applied.

### 3. Generate Link and Copy flow

**Test:** After saving splits, click "Generate Link" for one attendee. Verify URL appears inline. Click Copy — verify clipboard receives the URL. Open the Stripe link — verify correct amount and property name.
**Expected:** Stripe Payment Link created with correct `unit_amount` in cents, `metadata.invitation_id` set, URL displayed and copyable.
**Why human:** Requires live Stripe credentials and applied DB migration.

### 4. Webhook split payment fulfillment

**Test:** Using `stripe listen --forward-to localhost:3000/api/webhooks/stripe`, trigger a `checkout.session.completed` event with `metadata.invitation_id` set to an existing split's invitation ID.
**Expected:** `booking_splits.payment_status` flips to `'paid'`; `bookings.status` remains `'confirmed'` (not re-triggered); second identical event is a no-op.
**Why human:** Webhook live behavior requires Stripe CLI, test credentials, and applied migration.

---

## Gaps Summary

No automated gaps detected. All code artifacts exist, are substantive (not stubs), and are properly wired. All 22 unit tests pass. TypeScript compiles without errors.

One minor code smell: `centsEqual` is imported in `split-payments.ts` but unused (ESLint warns). The actual cents comparison uses direct integer equality after `Math.round`, which is correct — this is a dead import, not a logic error.

Four items remain for human verification, all gated on the DB migration being applied (per project convention, `booking_splits` migration is applied manually at end of v1.2 milestone).

---

_Verified: 2026-03-24T12:48:00Z_
_Verifier: Claude (gsd-verifier)_
