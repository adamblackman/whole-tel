# Phase 13: Guest Registration & Payment Deadlines - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend booking invitations with attendee registration (name, phone), enforce 36-hour first-payment deadline with auto-cancel, display activity booking deadline, fix non-atomic guest_count increment. No itinerary builder (Phase 16), no payment splitting (Phase 17).

</domain>

<decisions>
## Implementation Decisions

### Attendee Registration (PAY-01)
- Extend `booking_invitations` table with `full_name text` and `phone text` columns (decided in STATE.md — no new table)
- On invitation acceptance, require full_name and phone before completing acceptance
- Group lead sees attendee details in the guest list on booking detail page
- "18+" age requirement is honor-system — no date-of-birth collection

### Adding Attendees (PAY-02)
- Group lead can add attendees two ways:
  1. By email — sends invitation email with token link (existing flow, extended with name/phone collection on accept)
  2. Manual entry — group lead fills in full_name, email, phone directly, creates invitation with status='accepted' (no email sent)
- No username lookup — current schema has `display_name` but no unique username field
- Manual entry is for situations where attendees won't have accounts (e.g., entering spouse/partner details)

### First Payment Deadline (PAY-05)
- 36-hour deadline starts at `bookings.created_at` (when pending row is inserted)
- Add `payment_deadline timestamptz` column to bookings, computed as `created_at + interval '36 hours'` on insert
- Booking detail page shows countdown timer for pending bookings with "Complete Payment" CTA linking to Stripe Checkout
- Store Stripe Checkout session URL in bookings table for re-access (`stripe_checkout_url text`)

### Activity Booking Deadline (PAY-06)
- Add `activity_deadline timestamptz` column to bookings, computed as `LEAST(check_in - interval '30 days', created_at + interval '7 days')`
- Display-only for now — enforcement comes with itinerary builder in Phase 16
- Show on booking detail page: "Activity booking deadline: {date}"

### Deadline Enforcement (PAY-08)
- Use Vercel Cron (safest choice — no Supabase tier dependency, project already on Vercel)
- Cron route: `/api/cron/expire-bookings` runs every 15 minutes
- Logic: find all bookings where `status = 'pending'` AND `payment_deadline < now()`, set `status = 'expired'`
- Expired bookings release the date range (GiST exclusion only applies to non-expired bookings via partial index or status check)
- Secure cron route with `CRON_SECRET` env var (Vercel sends this header)

### Fix: Non-Atomic guest_count (from STATE.md)
- Current `acceptInvitation` does a read-then-write on guest_count — race condition
- Fix with atomic SQL: `UPDATE bookings SET guest_count = guest_count + 1 WHERE id = $1`
- Recalculate pricing after atomic increment

### Claude's Discretion
- Exact countdown timer component design
- Cron frequency (suggested 15 min)
- Migration ordering and naming
- Error states for expired booking display
- Whether to add an "expired" badge variant or reuse existing patterns

</decisions>

<specifics>
## Specific Ideas

- Payment deadline countdown should feel urgent but not alarming — amber/yellow styling, not red
- Manual attendee entry should be inline in the guest list, not a separate page
- Expired bookings should remain visible to the user with clear "expired" status, not deleted

</specifics>

<deferred>
## Deferred Ideas

- Payment splitting between attendees (Phase 17: PAY-03, PAY-04)
- Email notifications for approaching deadlines (Future: NOTF-02)
- Itinerary/activity booking enforcement against deadline (Phase 16)

</deferred>

---

*Phase: 13-guest-registration-payment-deadlines*
*Context gathered: 2026-03-23 from prior STATE.md decisions*
