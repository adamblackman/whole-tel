---
phase: 01-foundation
plan: 02
subsystem: auth
tags: [supabase, typescript, nextjs, ssr, dal, rls]

# Dependency graph
requires:
  - phase: 01-01
    provides: Supabase schema migration defining all 6 tables (profiles, properties, property_photos, add_ons, bookings, booking_add_ons)
provides:
  - src/lib/supabase/server.ts — async createClient() factory for Server Components, Server Actions, Route Handlers
  - src/lib/supabase/browser.ts — sync createClient() factory for Client Components only
  - src/lib/dal.ts — verifySession() and requireOwner() auth guards with React.cache() deduplication
  - src/types/database.ts — TypeScript interfaces for all 6 tables + Database namespace
affects: [02-auth, 03-property, 04-booking, 05-dashboard, 06-payments]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Two-client Supabase split (server.ts vs browser.ts) enforcing service role key isolation
    - DAL pattern with React.cache() for request-level deduplication of auth checks
    - getUser() (not getSession()) for server-side JWT validation against Supabase auth server

key-files:
  created:
    - src/lib/supabase/server.ts
    - src/lib/supabase/browser.ts
    - src/lib/dal.ts
    - src/types/database.ts
  modified: []

key-decisions:
  - "await cookies() required — Next.js 16 made cookies() async; not awaiting returns a Promise, not the cookie store"
  - "getUser() not getSession() in DAL — getSession() trusts cookie without server-side JWT signature validation"
  - "React.cache() wraps both verifySession() and requireOwner() — deduplicates auth calls within a single request lifecycle"

patterns-established:
  - "Pattern 1: Always import from '@/lib/supabase/server' (not browser) in DAL and Server Components"
  - "Pattern 2: verifySession() is the primary auth guard — all protected routes call it before any data access"
  - "Pattern 3: service role key (SUPABASE_SERVICE_ROLE_KEY) must never appear in browser.ts or any NEXT_PUBLIC_ variable"

requirements-completed: [DATA-01]

# Metrics
duration: 6min
completed: 2026-03-02
---

# Phase 1 Plan 2: Supabase Client Factories and DAL Summary

**Two-client Supabase factory split (server.ts/browser.ts) with React.cache()-wrapped DAL guards (verifySession/requireOwner) and full TypeScript database types for all 6 tables**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-03T02:58:35Z
- **Completed:** 2026-03-03T03:04:35Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Created two physically separate Supabase client factories ensuring service role key never reaches browser bundle
- Built DAL with verifySession() and requireOwner() using getUser() (server-validated JWT) and React.cache() deduplication
- Defined TypeScript interfaces for all 6 database tables plus joined types for common query patterns

## Task Commits

Each task was committed atomically:

1. **Task 1: Create server and browser Supabase client factories** - `ffd50ed` (feat)
2. **Task 2: Create DAL and TypeScript database types** - `b73515e` (feat)

**Plan metadata:** see final commit below (docs: complete plan)

## Files Created/Modified
- `src/lib/supabase/server.ts` — Async createClient() using createServerClient + await cookies(), for Server Components/Actions/Route Handlers
- `src/lib/supabase/browser.ts` — Sync createClient() using createBrowserClient, for Client Components only
- `src/lib/dal.ts` — verifySession() redirects to /login on no session; requireOwner() redirects to / for non-owners; both wrapped in React.cache()
- `src/types/database.ts` — TypeScript interfaces for Profile, Property, PropertyPhoto, AddOn, Booking, BookingAddOn; Database namespace; PropertyWithAddOns and BookingWithDetails joined types

## Decisions Made
- `await cookies()` is mandatory — Next.js 16 made cookies() async; omitting await returns a Promise object, not the cookie store, causing subtle runtime failures
- `getUser()` over `getSession()` — getSession() only validates against the local cookie without re-checking the JWT signature with Supabase's auth server, making it unsafe for server-side authorization
- `React.cache()` wraps auth guards — deduplicates repeated calls within a single request, avoiding redundant Supabase round-trips when multiple Server Components call verifySession()

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- The `npx tsc` binary symlink in `node_modules/.bin/` was broken (referenced wrong relative path). Resolved by running TypeScript compiler directly via `node node_modules/typescript/lib/tsc.js` — same result, no errors. Pre-existing environment issue, unrelated to plan files.

## User Setup Required

None - no external service configuration required for this plan. Environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY) were set up in plan 01-01.

## Next Phase Readiness
- Supabase client factories and DAL are ready for immediate use by all subsequent phases
- Phase 2 (auth) can import createClient from server.ts or browser.ts and verifySession/requireOwner from dal.ts
- Blocker from STATE.md still applies: Supabase migration from 01-01 must be applied manually before DAL database queries will work against real data

## Self-Check: PASSED

All created files found on disk:
- FOUND: src/lib/supabase/server.ts
- FOUND: src/lib/supabase/browser.ts
- FOUND: src/lib/dal.ts
- FOUND: src/types/database.ts
- FOUND: .planning/phases/01-foundation/01-02-SUMMARY.md

All commits verified in git log:
- FOUND: ffd50ed (Task 1 - Supabase client factories)
- FOUND: b73515e (Task 2 - DAL and database types)

---
*Phase: 01-foundation*
*Completed: 2026-03-02*
