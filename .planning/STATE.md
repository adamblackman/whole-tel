---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-03-05T02:21:21Z"
progress:
  total_phases: 3
  completed_phases: 3
  total_plans: 13
  completed_plans: 13
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-03-02)

**Core value:** Guests can find, customize, and book a party villa with unique local add-on experiences in a single seamless flow.
**Current focus:** Phase 4 - Guest Browsing

## Current Position

Phase: 4 of 7 (Guest Browsing) — IN PROGRESS
Plan: 2 of 5 in Phase 4 — COMPLETE
Status: 04-02 complete — /properties browse page with DestinationFilter tabs and PropertyListingCard grid.
Last activity: 2026-03-05 — 04-02 complete: DestinationFilter client component (URL param tabs), PropertyListingCard server-compatible card (cover photo, icons, price), /properties page with Supabase query + allowlist-validated destination filter + responsive grid.

Progress: [████████░░] 55%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: ~12 min (recent plans shorter)
- Total execution time: ~35 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Foundation | 3 | ~35 min | ~12 min |
| 2. Auth | 4 | ~7 min | ~2 min |
| 3. Owner Dashboard | 4 | ~20 min | ~5 min |

**Recent Trend:**
- Last 5 plans: 29 min, ~3 min, ~6 min, ~2 min, ~2 min
- Trend: stable at ~2 min for focused implementation plans

*Updated after each plan completion*
| Phase 02-auth P04 | 1 | 2 tasks | 0 files |
| Phase 03-owner-dashboard P01 | 2 min | 3 tasks + 1 fix | 4 files |
| Phase 03-owner-dashboard P02 | 2 min | 2 tasks | 3 files |
| Phase 03-owner-dashboard P03 | ~6 min | 3 tasks | 8 files |
| Phase 03-owner-dashboard P04 | 8 min | 2 tasks | 5 files |
| Phase 04-guest-browsing P01 | 2 min | 2 tasks | 7 files |
| Phase 04-guest-browsing P02 | 2 min | 2 tasks | 3 files |

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
- [01-02]: await cookies() required — Next.js 16 made cookies() async; not awaiting returns a Promise, not the cookie store
- [01-02]: getUser() not getSession() in DAL — getSession() trusts cookie without server-side JWT signature validation
- [01-02]: React.cache() wraps verifySession() and requireOwner() — deduplicates auth calls within a single request lifecycle
- [01-03]: auth.users insert required before profiles insert to satisfy FK constraint (profiles.id REFERENCES auth.users)
- [01-03]: ON CONFLICT DO NOTHING on all seed inserts for idempotent migration re-runs
- [01-03]: Fixed UUID constants for all seed rows — properties and owner use stable UUIDs for referential stability in future migrations
- [01-03]: Seed migration requires manual application via Supabase SQL Editor (same pattern as 01-01)
- [02-01]: tw-animate-css must be in runtime dependencies (not devDependencies) — shadcn init places it in dev but it's used in application CSS
- [02-01]: proxy.ts uses named export 'proxy' not 'middleware' — Next.js 16 renamed the hook
- [02-01]: signInAsOwner queries profiles.role post-login to verify owner access; signs out if role mismatch
- [02-01]: signUpOwner is open registration (no secret URL) — v1 decision
- [02-01]: revalidatePath('/', 'layout') must precede redirect in all auth mutations to clear server-component cache
- [02-02]: Login page split into Server Component page shell + Client Component LoginForm — Next.js 16 async searchParams require async function but useTransition is Client Component only
- [02-02]: Signup page is a single Client Component — no async searchParams dependency so no split needed
- [02-03]: React use() hook unwraps async searchParams in Client Components — Next.js 16 pattern (not converting to Server Component)
- [02-03]: Dashboard security boundary in layout.tsx not page.tsx — one requireOwner() call protects all /dashboard/* child routes automatically
- [Phase 02-auth]: Supabase email confirmation must be toggled OFF in Dashboard for dev auth flows to work — login fails with Email not confirmed without this step
- [03-01]: Zod v4 uses 'error' key (not 'errorMap') for custom enum error messages — plan was written against v3 API, auto-fixed
- [03-01]: owner_id always derived from requireOwner() return value, never from formData — enforced in all property/add-on Server Actions
- [03-01]: createAddOn returns success message instead of redirecting — add-ons managed inline on property detail page
- [03-01]: deleteProperty and deleteAddOn use direct call pattern (no useActionState) — invoked from confirmation dialogs
- [03-02]: Storage paths use crypto.randomUUID() — avoids Date.now() collision risk under concurrent uploads
- [03-02]: File input NOT inside a form — prevents accidental Server Action body routing (Next.js 1MB limit)
- [03-02]: Storage deletion in deletePhoto is non-blocking — DB record removal is the authoritative cleanup step
- [03-02]: Supabase Storage hostname added to next.config.ts remotePatterns for next/image CDN optimization
- [03-03]: Server Action .bind(null, propertyId) called in Server Component, result passed as action prop to Client Component — Next.js 16 documented pattern
- [03-03]: Public Supabase URL constructed directly in PropertyCard (no client import) — Server-compatible components cannot use createBrowserClient
- [03-03]: Amenities hidden input with comma-joined values, parsed in action with split/filter — avoids checkbox array name collisions in FormData
- [03-03]: useEffect in AddOnForm closes edit mode when state.message includes 'successfully' — clean UX without extra state
- [03-04]: Supabase !inner JOIN infers properties as array at compile time but returns single object at runtime — normalize with .map() at page level rather than unsafe cast
- [03-04]: AlertDialogAction styled with explicit destructive classes — default shadcn variant does not apply destructive styling to AlertDialogAction
- [03-04]: BookingRow type exported from BookingsTable component for page-level reuse in normalization
- [04-01]: (guest) route group URL is /properties not /guest/properties — route groups with parentheses are layout-only and do not affect URL structure
- [04-01]: GuestNav is a Server Component — no client interactivity needed for link-only navigation header
- [04-01]: Brand oklch tokens defined once in :root as --brand-*, mirrored to @theme inline as --color-brand-* for Tailwind utility class access
- [04-02]: Destination allowlist (VALID_DESTINATIONS) validated before .eq() Supabase query — raw ?destination= value never reaches DB filter
- [04-02]: property_photos normalized with Array.isArray() guard in page component — Supabase join can return object or array depending on join type
- [04-02]: Suspense wraps all useSearchParams-dependent Client Components to prevent Next.js production build failure

### Pending Todos

None yet.

### Blockers/Concerns

- [Phase 6]: Research flag — Stripe Embedded Checkout + ACH bank transfer + CC surcharge implementation has legal and technical nuance; consider /gsd:research-phase before Phase 6 planning
- [Phase 2]: Research flag — Supabase custom access token hook + JWT claims refresh flow has sharp edges; verify current pattern before building owner dashboard
- [01-01 PENDING]: Supabase schema migration must be applied manually via Dashboard SQL Editor. See 01-01-SUMMARY.md User Setup Required section.
- [01-03 PENDING]: Supabase seed data migration must be applied manually via Dashboard SQL Editor. See 01-03-SUMMARY.md User Setup Required section.

## Session Continuity

Last session: 2026-03-05
Stopped at: Completed 04-02-PLAN.md. Phase 4 (Guest Browsing) is in progress. Browse page wave complete: /properties page with DestinationFilter + PropertyListingCard grid. Next: Plan 03 (property detail page).
Resume file: None
