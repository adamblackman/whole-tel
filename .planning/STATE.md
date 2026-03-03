# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-02)

**Core value:** Guests can find, customize, and book a party villa with unique local add-on experiences in a single seamless flow.
**Current focus:** Phase 1 - Foundation

## Current Position

Phase: 1 of 7 (Foundation)
Plan: 3 of 3 in current phase (PHASE COMPLETE)
Status: Phase 1 complete — ready for Phase 2
Last activity: 2026-03-03 — 01-03 complete: Seed data migration written (3 properties + 12 add-ons)

Progress: [███░░░░░░░] 14%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: ~12 min (recent plans shorter)
- Total execution time: ~35 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation | 3 | ~35 min | ~12 min |

**Recent Trend:**
- Last 5 plans: 29 min, ~3 min, ~6 min
- Trend: decreasing (simpler plans toward end of phase)

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Init]: Next.js 16.1.6 + Supabase + Stripe Embedded Checkout — confirmed stack, no Prisma, no Stripe Connect for v1
- [Init]: Service role key must never reach browser — two separate Supabase client files are a Phase 1 architectural requirement
- [Init]: PostgreSQL exclusion constraint for double-booking — must be in the initial schema migration, cannot be added later without resolving conflicts
- [Init]: "Processing fee" label (not "credit card surcharge") — surcharges are prohibited in CA, CT, ME, MA and on debit cards under Durbin Amendment
- [Init]: Owner onboarding model TBD — self-register vs admin invite decision needed before Phase 2 owner auth is built
- [01-01]: (SELECT auth.uid()) used in all RLS policies for performance (prevents per-row re-evaluation)
- [01-01]: Exclusion constraint only on status='confirmed' — pending bookings don't block dates
- [01-01]: daterange '[)' half-open bounds allow back-to-back bookings (checkout day = next checkin)
- [01-01]: Migration file committed to repo; requires manual application via Supabase Dashboard SQL Editor (project IPv6-only, no management API access)
- [01-03]: auth.users insert required before profiles insert to satisfy FK constraint (profiles.id REFERENCES auth.users)
- [01-03]: ON CONFLICT DO NOTHING on all seed inserts for idempotent migration re-runs
- [01-03]: Fixed UUID constants for all seed rows — properties and owner use stable UUIDs for referential stability in future migrations
- [01-03]: Seed migration requires manual application via Supabase SQL Editor (same pattern as 01-01)

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 2]: Decide whether owners self-register or are admin-invited before building owner signup flow
- [Phase 6]: Research flag — Stripe Embedded Checkout + ACH bank transfer + CC surcharge implementation has legal and technical nuance; consider /gsd:research-phase before Phase 6 planning
- [Phase 2]: Research flag — Supabase custom access token hook + JWT claims refresh flow has sharp edges; verify current pattern before building owner dashboard
- [01-01 PENDING]: Supabase schema migration must be applied manually via Dashboard SQL Editor. See 01-01-SUMMARY.md User Setup Required section.
- [01-03 PENDING]: Supabase seed data migration must be applied manually via Dashboard SQL Editor. See 01-03-SUMMARY.md User Setup Required section.

## Session Continuity

Last session: 2026-03-03
Stopped at: Completed 01-03-PLAN.md. Phase 1 Foundation complete. Next phase is 02 (Owner Auth) — but both Supabase migrations (01-01 schema + 01-03 seed) must be applied manually first.
Resume file: None
