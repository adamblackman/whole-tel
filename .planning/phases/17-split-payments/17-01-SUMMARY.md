---
phase: 17-split-payments
plan: 01
subsystem: payments
tags: [stripe, split-payments, server-actions, webhooks, tdd]
dependency_graph:
  requires: []
  provides:
    - booking_splits table (migration, manual apply)
    - BookingSplit TypeScript interface
    - saveSplits Server Action
    - generatePaymentLink Server Action
    - webhook split payment routing
  affects:
    - src/app/api/webhooks/stripe/route.ts
tech_stack:
  added: []
  patterns:
    - centsEqual() float-safe comparison via Math.round(x * 100)
    - Stripe Payment Links with metadata for webhook routing
    - Admin client upsert with onConflict for idempotent split saves
key_files:
  created:
    - supabase/migrations/20260324000004_split_payments.sql
    - src/lib/validations/split-payment.ts
    - src/lib/validations/split-payment.test.ts
    - src/lib/actions/split-payments.ts
    - src/lib/actions/split-payments.test.ts
  modified:
    - src/types/database.ts
    - src/app/api/webhooks/stripe/route.ts
decisions:
  - "saveSplits validates sum in cents (Math.round * 100) not floats — handles 0.1+0.2 edge case"
  - "Webhook returns early after split update — prevents re-confirming already-confirmed booking"
  - "Admin client used for generatePaymentLink split fetch — bypasses RLS for server-side link generation"
  - "centsEqual exported as pure helper from validations module (not Server Actions) so tests can import without 'use server' context"
metrics:
  duration_seconds: 293
  completed_date: "2026-03-24"
  tasks_completed: 3
  tasks_total: 3
  files_created: 5
  files_modified: 2
  tests_added: 22
requirements_addressed:
  - PAY-03
  - PAY-04
---

# Phase 17 Plan 01: Split Payments Data Layer Summary

**One-liner:** Booking splits table with RLS, saveSplits/generatePaymentLink Server Actions (cents-exact validation + Stripe Payment Links), webhook routing for split fulfillment.

## What Was Built

Complete backend data layer for group booking split payments:

1. **Database migration** (`20260324000004_split_payments.sql`): `booking_splits` table with `UNIQUE(booking_id, invitation_id)`, `amount > 0` check constraint, `payment_status IN ('unpaid', 'paid')`, and two RLS policies — owner manage-all and attendee view-own.

2. **TypeScript types** (`src/types/database.ts`): `SplitPaymentStatus` union type, `BookingSplit` interface, `booking_splits` entry in `Database.public.Tables` namespace.

3. **Zod schemas** (`src/lib/validations/split-payment.ts`): `splitPaymentSchema`, `saveSplitsSchema`, `generatePaymentLinkSchema`, and exported `centsEqual()` pure helper for float-safe cents comparison.

4. **Server Actions** (`src/lib/actions/split-payments.ts`):
   - `saveSplits`: verifies session, fetches booking scoped to owner + confirmed, validates cents-exact sum, upserts splits with idempotent `onConflict`.
   - `generatePaymentLink`: deactivates stale link if present, creates Stripe Payment Link with `metadata.invitation_id`, persists link id/url.

5. **Webhook extension** (`src/app/api/webhooks/stripe/route.ts`): Checks `metadata.invitation_id` at top of `fulfillCheckout`; routes split payments to `booking_splits` update with idempotent `payment_status='unpaid'` guard; returns early to skip booking status update.

## Test Coverage

- 16 tests: `centsEqual` float edge cases + Zod schema validation/rejection
- 6 tests: `saveSplits` (sum mismatch, not-found, success, float edge case) + `generatePaymentLink` (paid guard, correct `unit_amount` in cents)
- All 45 project tests pass. TypeScript compiles clean.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript mock cast errors in split-payments.test.ts**
- **Found during:** Task 3 (`npx tsc --noEmit` verification)
- **Issue:** `as ReturnType<typeof createClient> extends Promise<infer T> ? T : never` conditional cast pattern rejected by TypeScript — not enough type overlap with full `SupabaseClient` shape
- **Fix:** Introduced `type AnyClient = any` alias and replaced all mock casts with `as AnyClient` — standard pattern for test doubles that don't need full implementation surface
- **Files modified:** `src/lib/actions/split-payments.test.ts`
- **Commit:** f7d4317

## Self-Check: PASSED

Files confirmed present:
- supabase/migrations/20260324000004_split_payments.sql — FOUND
- src/types/database.ts (BookingSplit) — FOUND
- src/lib/validations/split-payment.ts — FOUND
- src/lib/actions/split-payments.ts — FOUND
- src/app/api/webhooks/stripe/route.ts (invitation_id) — FOUND

Commits confirmed:
- 1b92f81 — Task 1: migration, types, schemas
- 3882a3e — Task 2: Server Actions
- f7d4317 — Task 3: webhook + TypeScript fix
