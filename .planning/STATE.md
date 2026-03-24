---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Amenities, Calendar & Client Refinements
status: executing
stopped_at: Completed 12-04-PLAN.md
last_updated: "2026-03-24T03:40:14.259Z"
last_activity: "2026-03-23 — 12-01 complete: homepage branding copy overhauled, TakeoverSteps created, DestinationCards split"
progress:
  total_phases: 6
  completed_phases: 1
  total_plans: 4
  completed_plans: 4
  percent: 95
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-23)

**Core value:** Groups can find, customize, and book a Whole-Tel with unique local add-on experiences and seamless group coordination in a single flow.
**Current focus:** Phase 12 — Branding, Copy & Amenities Schema

## Current Position

Phase: 12 of 17 (Branding, Copy & Amenities Schema)
Plan: 01 complete (of 4 planned)
Status: In progress
Last activity: 2026-03-23 — 12-01 complete: homepage branding copy overhauled, TakeoverSteps created, DestinationCards split

Progress: [██████████] 95%

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

### Blockers/Concerns

- Phase 13 (deadline enforcement): Confirm Supabase plan tier supports pg_cron before designing cron approach; if not, use Vercel Cron
- Phase 15 (amenities): Read AmenityList.tsx before any schema migration — existing JSONB shape is unconfirmed and may need live data migration

## Session Continuity

Last session: 2026-03-24T03:36:23.097Z
Stopped at: Completed 12-04-PLAN.md
Resume file: None
