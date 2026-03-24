---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Amenities, Calendar & Client Refinements
status: executing
stopped_at: Completed 15-01-PLAN.md
last_updated: "2026-03-24T14:13:14.868Z"
last_activity: "2026-03-24 — 13-03 complete: PaymentDeadlineCountdown, ManualAttendeeForm, BookingDetails/GuestList extended, Vercel Cron expiry route"
progress:
  total_phases: 6
  completed_phases: 4
  total_plans: 12
  completed_plans: 12
  percent: 98
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-23)

**Core value:** Groups can find, customize, and book a Whole-Tel with unique local add-on experiences and seamless group coordination in a single flow.
**Current focus:** Phase 13 — Guest Registration & Payment Deadlines

## Current Position

Phase: 13 of 17 (Guest Registration & Payment Deadlines)
Plan: 03 complete (of 4 planned)
Status: In progress
Last activity: 2026-03-24 — 13-03 complete: PaymentDeadlineCountdown, ManualAttendeeForm, BookingDetails/GuestList extended, Vercel Cron expiry route

Progress: [██████████] 98%

## Accumulated Context

### Decisions

- v1.0 MVP shipped 2026-03-06 (7 phases, 48 requirements)
- v1.1 Rebrand shipped 2026-03-08 (4 phases, 18 requirements)
- Codebase: 9,259 LOC TypeScript, Next.js 16 + Supabase + Stripe
- Hotel tax must flow through calculatePricing() — not added as external line item
- Guest registration extends booking_invitations (name + phone columns) — no new table
- Amenities use structured IDs via amenities seed table + property_amenities join table — not JSONB freetext
- Itinerary times stored as wall clock TIME (HH:MM) with property.timezone — never raw TIMESTAMPTZ from browser
- Partner application status uses PostgreSQL ENUM state machine — single updateApplicationStatus Server Action
- FullCalendar v6.1.20 confirmed for itinerary builder (React 19 peer dep verified)
- non-atomic guest_count increment in acceptInvitation must be fixed in Phase 13
- [Phase 12]: tax_rate stored as numeric(5,4) decimal in DB, displayed as percentage in PropertyForm — server action converts on write
- [Phase 12]: property_amenities RLS uses FOR ALL with EXISTS subquery on properties.owner_id for owner-scoped write
- [Phase 12-01]: Miami moved to Coming Soon — only Cabo San Lucas and Puerto Vallarta remain active destinations
- [Phase 12-01]: bed_config added proactively to FeaturedProperties local prop type to unblock Plan 02
- [Phase 12-branding-copy-amenities-schema]: Miami removed from VALID_DESTINATIONS and DestinationFilter simultaneously to prevent stranded filter state
- [Phase 12-branding-copy-amenities-schema]: bed_config required (not optional) in PropertyListingCardProps — TypeScript enforces query completeness at compile time
- [Phase 12-branding-copy-amenities-schema]: Hotel tax applies to (accommodationSubtotal + perPersonSurcharge) only, not cleaning fee or add-ons — processingFee base includes hotelTax so Stripe total matches breakdown.total
- [Phase 13]: acceptInvitation signature requires registration — InvitationActions.tsx updated with minimal inline form; Plan 13-03 will replace with polished UI
- [Phase 13]: booking.created_at used for deadline computation instead of new Date() — avoids clock drift between insert and Stripe session creation
- [Phase 13]: PaymentDeadlineCountdown recalculates from deadline timestamp in interval callback to avoid stale closure
- [Phase 13]: Complete Payment CTA uses plain anchor tag (not Next.js Link) — Stripe Checkout is an external URL
- [Phase 14-partner-application-workflow]: No UNIQUE constraint on applicant_email — rejected applicants can reapply
- [Phase 14-partner-application-workflow]: [Phase 14-01]: createOwnerFromApplication does NOT query profiles after creation — handle_new_user trigger is async, not immediately consistent
- [Phase 14-partner-application-workflow]: [Phase 14-01]: Zod v4 uses error option instead of required_error for z.enum params
- [Phase 14-partner-application-workflow]: All 5 form steps co-located in ApplicationForm.tsx as sub-components with initialData props for back-nav preservation
- [Phase 14-partner-application-workflow]: owner/signup page left in place after unlinking — orphaned but not deleted, separate cleanup concern
- [Phase 14-partner-application-workflow]: ApplicationActions is 'use client' while list/detail pages are Server Components — clean separation of read (server) and mutate (client)
- [Phase 14-partner-application-workflow]: saveApplicationNotes Server Action added for notes-only saves without requiring a status transition
- [Phase 15]: Shared amenity-icons.ts module solves Server/Client boundary: ICON_MAP and AmenityRow in plain TS file importable by both component types
- [Phase 15]: Supabase nested join type mismatch in browse page resolved with (property as any) cast — consistent with existing bed_config cast pattern
- [Phase 15-amenities-owner-ui-guest-display]: AmenitiesEditor saves independently from PropertyForm via dedicated Server Action
- [Phase 15-amenities-owner-ui-guest-display]: [Phase 15-01]: Property edit page runs 3 parallel queries (property + catalog + selectedIds) for amenity editor

### Blockers/Concerns

- Phase 15 (amenities): Read AmenityList.tsx before any schema migration — existing JSONB shape is unconfirmed and may need live data migration
- [Phase 13-01]: increment_booking_guest_count uses SECURITY DEFINER SQL RPC for atomic guest_count increment with max_guests guard — fixes STATE.md noted race condition
- [Phase 13-01]: Deadline backfill uses WHERE payment_deadline IS NULL guard — idempotent, safe for existing pending bookings
- [Phase 13-01]: GiST exclusion index unchanged — existing WHERE status='confirmed' partial filter already excludes expired bookings from date-range blocking

### Blockers/Concerns

- Phase 15 (amenities): Read AmenityList.tsx before any schema migration — existing JSONB shape is unconfirmed and may need live data migration

## Session Continuity

Last session: 2026-03-24T14:10:00.729Z
Stopped at: Completed 15-01-PLAN.md
Resume file: None
