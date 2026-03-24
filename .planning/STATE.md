---
gsd_state_version: 1.0
milestone: v1.2
milestone_name: Amenities, Calendar & Client Refinements
status: planning
stopped_at: Phase 12 context gathered
last_updated: "2026-03-24T02:44:06.091Z"
last_activity: 2026-03-23 — v1.2 roadmap created, 6 phases mapped to 33 requirements
progress:
  total_phases: 6
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-23)

**Core value:** Groups can find, customize, and book a Whole-Tel with unique local add-on experiences and seamless group coordination in a single flow.
**Current focus:** Phase 12 — Branding, Copy & Amenities Schema

## Current Position

Phase: 12 of 17 (Branding, Copy & Amenities Schema)
Plan: — (not yet planned)
Status: Ready to plan
Last activity: 2026-03-23 — v1.2 roadmap created, 6 phases mapped to 33 requirements

Progress: [░░░░░░░░░░] 0%

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

### Blockers/Concerns

- Phase 13 (deadline enforcement): Confirm Supabase plan tier supports pg_cron before designing cron approach; if not, use Vercel Cron
- Phase 15 (amenities): Read AmenityList.tsx before any schema migration — existing JSONB shape is unconfirmed and may need live data migration

## Session Continuity

Last session: 2026-03-24T02:44:06.061Z
Stopped at: Phase 12 context gathered
Resume file: .planning/phases/12-branding-copy-amenities-schema/12-CONTEXT.md
