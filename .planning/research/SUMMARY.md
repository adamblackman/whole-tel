# Project Research Summary

**Project:** Whole-Tel v1.2 — Amenities, Calendar & Client Refinements
**Domain:** Group villa/boutique hotel booking platform — itinerary coordination, split payments, partner application, amenities
**Researched:** 2026-03-23
**Confidence:** HIGH

## Executive Summary

Whole-Tel v1.2 adds four feature clusters to an existing Next.js 16 + Supabase + Stripe foundation: an amenities management system, a calendar-based itinerary builder, a partner application workflow, and guest registration with split payment display. The platform already has a solid base (v1.1 shipped tiered pricing, photo management, add-ons, booking invitations), so v1.2 extends existing patterns rather than introducing new architectural paradigms. The highest-priority items are low-complexity wins — frontend copy overhaul, amenities display, guest registration fields, and partner application form — all of which are client-blocking and can be shipped before the complex itinerary builder.

The primary technical risk in v1.2 is data model fragmentation. Guest registration could inadvertently create a third identity layer on top of existing `profiles` and `booking_invitations` tables. Split payment ledger amounts could drift from the canonical `calculatePricing()` output if calculated client-side. Amenities stored as JSONB could conflict with the existing `AmenityList.tsx` component's expected shape. Each of these is a design decision that must be made before writing any code — the prevention is correct schema design upfront, not clever recovery afterward. The existing `pricing.ts` module and `booking_invitations` table are the two surfaces most at risk of being bypassed by new feature code.

The one genuine new npm dependency is `@fullcalendar/react@6.1.20` for the itinerary builder — a justified addition because building a time-slotted drag-drop calendar on raw DnD primitives would require weeks of custom engine work. Everything else (split payment display, amenities, partner application, guest registration) builds entirely on the already-installed stack: `react-hook-form`, `zod`, `date-fns`, `lucide-react`, and Supabase. No new Stripe packages, no real-time infrastructure, no AI integrations are needed.

## Key Findings

### Recommended Stack

See `.planning/research/STACK.md` for full rationale and installation commands.

The v1.2 stack is deliberately minimal. One confirmed new npm dependency: `@fullcalendar/react` + `@fullcalendar/core` + `@fullcalendar/timegrid` + `@fullcalendar/interaction` + `@fullcalendar/daygrid` (all v6.1.20, explicit React 19 peer dep support confirmed via `npm info`). One optional addition: `react-dropzone@15.0.0` for partner application file uploads only if UX requires drag-drop zone over a standard file picker. Two shadcn/ui components to add via CLI: `Checkbox` (amenity selector) and `Progress` (multi-step form indicator).

**New dependencies:**
- `@fullcalendar/react@6.1.20`: Itinerary builder — week/day timeline with time-slot snapping, drag-drop events, CSS bundled in JS (no separate import), explicit React 19 `^19` peer dep since v6.1.14
- `react-dropzone@15.0.0` (optional): Partner application drag-drop file zone — peer dep metadata gap for React 19 but confirmed working; use `--legacy-peer-deps` only if npm blocks install

**Explicitly rejected for v1.2:**
- Stripe Connect: All payments remain on one Whole-Tel account; Connect is for marketplace payouts
- Stripe Payment Intents per guest: Individual payment splitting is explicitly out of scope per PROJECT.md
- `@dnd-kit` calendar grid: DnD primitives don't provide calendar time-grid UX; use FullCalendar instead
- Supabase Realtime: No live collaboration features in v1.2 scope

### Expected Features

See `.planning/research/FEATURES.md` for full analysis with dependency graph and competitor benchmarks.

**Must have (table stakes — v1.2 core):**
- Frontend copy and branding overhaul — client-blocking, zero technical dependency, ship first
- Amenities system: DB schema, owner management UI (checkbox grid by 5 categories), guest display with "See all" modal
- Partner property application form — replaces open owner self-signup entirely
- Guest registration fields (name, email, phone) on booking and invite accept flow
- Payment deadline display (36hr window) on booking confirmation and detail view
- Hotel tax declaration copy in price breakdown
- Coming Soon city cards on browse/landing page

**Should have (v1.2 extensions, add once core is stable):**
- Interactive calendar-based itinerary builder — high value, high complexity; validate Phase 1-3 are stable first
- Amenity-based browse filtering — needs real amenity data on live properties before filters are useful
- Partner application status tracking with email notification

**Defer (v2+):**
- Individual per-guest Stripe Checkout (true split payments) — requires Stripe Connect, explicitly deferred in PROJECT.md
- Installment payment plans — Stripe SetupIntent + saved card + scheduled charge complexity
- Real-time collaborative itinerary editing
- In-app messaging / chat

### Architecture Approach

See `.planning/research/ARCHITECTURE.md` for the full existing schema and component boundaries established in v1.1.

v1.2 extends the existing Server Component + Server Action architecture without introducing new patterns. The `lib/pricing.ts` module is the central extension point for tax and split amount calculations — all pricing changes must flow through it. Guest registration must extend `booking_invitations` (add `name` and `phone` columns) rather than creating a separate table. Amenities must be stored as structured IDs via an `amenities` seed table and `property_amenities` join table rather than extending the existing untyped JSONB column. The itinerary builder stores state as a JSONB column on `bookings` with debounced Server Action auto-save. Partner application uses a PostgreSQL ENUM state machine with a single `updateApplicationStatus` Server Action as the only mutation path.

**Major components for v1.2:**
1. `AmenitySelector` (Client, owner dashboard) — checkbox grid grouped by 5 categories (Water, Social, Work/Event, Culinary, Wellness); saves to `property_amenities` join table
2. `AmenityDisplay` + `AmenityModal` (Server/Client, property detail) — extends existing `AmenityList.tsx`; top 6-8 inline, full 30-35 amenities in modal
3. `PartnerApplicationForm` (Client) — multi-step with react-hook-form; `partner_applications` table with ENUM status; replaces open owner signup
4. `GuestRegistrationForm` (Client) — extends `booking_invitations` with name/phone columns; reuses existing `acceptInvitation` action with atomic guest_count increment
5. `ItineraryCalendar` (Client, 'use client' boundary) — FullCalendar with timegrid + interaction plugins; auto-saves to `bookings.itinerary` JSONB
6. `PaymentDeadlineDisplay` (Server) — purely presentational; reads `payment_due_at` from booking row

### Critical Pitfalls

See `.planning/research/PITFALLS.md` for all 10 pitfalls with codebase-confirmed detection patterns and prevention checklists.

1. **Guest registration creates orphaned identity layer** — Do NOT create a `booking_attendees` table. Extend `booking_invitations` with `name` and `phone` columns. One source of truth prevents duplicate emails, guest_count drift, and impossible deduplication.

2. **Amenities JSONB schema change breaks existing `AmenityList.tsx`** — Read `AmenityList.tsx` before touching any schema. The `amenities: Json` column confirmed at line 52 of `database.ts` has an unconfirmed shape. Understand current format before designing migration.

3. **Payment deadlines without a cron job** — A deadline displayed in UI but never enforced blocks property dates indefinitely. Implement at minimum a Vercel Cron job calling `/api/cron/expire-bookings`. `pg_cron` on Supabase paid tier is the robust solution.

4. **`calculatePricing()` bypassed for split amounts or hotel tax** — Both hotel tax and split amount calculation must flow through `pricing.ts`. Add `taxAmount` to `PricingInput`. Add a `splitAmounts()` helper. Validate that `SUM(split_amounts) + processingFee == booking.total` server-side before saving.

5. **Itinerary time slots stored as browser-local TIMESTAMPTZ** — Store itinerary times as `TIME` (HH:MM, no timezone). Add a `timezone` field to `properties`. Display all times using `Intl.DateTimeFormat` with `timeZone: property.timezone`. Never use `new Date()` without explicit timezone handling.

6. **Partner application status as freetext column** — Use a PostgreSQL ENUM (`submitted`, `under_review`, `approved`, `rejected`, `onboarded`). All status updates via a single `updateApplicationStatus` Server Action that validates the current status before transitioning.

## Implications for Roadmap

Based on research, suggested phase structure ordered by dependency chain and risk:

### Phase 1: Foundation + Quick Wins
**Rationale:** Client-blocking items with zero or minimal technical dependency. Establish the correct amenities data model before any feature builds on top of it. Parallelizes copy/branding work (zero tech risk) with schema groundwork.
**Delivers:** Visible product changes that unblock client sign-off; hotel tax in `pricing.ts`; amenities schema migration that enables filtering later; Coming Soon city cards
**Addresses:** Frontend copy/branding overhaul, hotel tax declaration copy, Coming Soon city cards, amenities DB schema + migration from current JSONB shape
**Avoids:** Amenities JSONB conflict (Pitfall 7) — read `AmenityList.tsx` first and understand current shape before schema migration

### Phase 2: Guest Registration + Payment Deadlines
**Rationale:** Guest registration must use the correct data model (extending `booking_invitations`) before any downstream feature depends on attendee data. Payment deadline enforcement must exist before the split payment display makes deadlines meaningful to users. The atomic guest_count fix belongs here since it touches the same `acceptInvitation` action.
**Delivers:** Booking attendee roster (name, email, phone), per-person cost display, 36hr deadline enforcement, cron-based booking expiry
**Addresses:** Guest registration fields, payment deadline display, per-person cost on confirmation
**Avoids:** Orphaned identity layer (Pitfall 5), silent booking expiry (Pitfall 3), max guest race condition (Pitfall 10)

### Phase 3: Partner Application Workflow
**Rationale:** Independent of guest registration and itinerary; can be parallelized with Phase 2 if bandwidth allows. Replacing open owner self-signup is a business requirement, not a technical dependency on other v1.2 features.
**Delivers:** Curated marketplace entry point; replaces open owner self-signup; admin review workflow with ENUM state machine
**Addresses:** Partner application form, application status tracking, approval-triggered account creation
**Avoids:** Partner application state machine inconsistency (Pitfall 6) — ENUM and single Server Action mutation before any admin UI is built

### Phase 4: Amenities Owner UI + Guest Display
**Rationale:** Depends on Phase 1 schema migration. Owner UI and guest display are tightly co-dependent; build and ship together. Amenity-based filtering is deferred until real data exists on live properties.
**Delivers:** Owner can manage amenities per property (checkbox grid, 5 categories); guests see categorized amenities with "See all" modal; `AmenityList.tsx` updated to new structured format
**Addresses:** Amenities owner management UI, amenities guest display (30-35 curated amenities)
**Avoids:** Amenities JSONB shape conflict (Pitfall 7) — migration and component update must be validated together before UI ships

### Phase 5: Itinerary Builder
**Rationale:** Highest complexity, highest value differentiator. Depends on Phase 2 (guest registration) for attendee read-only access model. All lower-risk phases should be stable before introducing FullCalendar. Installing a new dependency last reduces risk surface during earlier phases.
**Delivers:** Per-booking calendar, day-by-day activity cards, drag-to-reorder within a day, owner activity templates, auto-save to `bookings.itinerary` JSONB
**Addresses:** Interactive calendar-based itinerary builder (P2 priority from FEATURES.md)
**Uses:** `@fullcalendar/react@6.1.20` (new install), `date-fns` (existing), JSONB on `bookings`
**Avoids:** Timezone storage bug (Pitfall 4), itinerary unsaved state on navigation (Pitfall 9)

### Phase 6: Amenity Filtering (Post-Launch)
**Rationale:** Requires real amenity data on live properties to be useful. Ship after Phase 4 has been live for at least one release cycle with real property data populated.
**Delivers:** Amenity-based browse filtering on property list page
**Addresses:** Amenity-based property filtering (P2 competitive differentiator from FEATURES.md)
**Avoids:** Building filters before structured amenity IDs exist in the database

### Phase Ordering Rationale

- Phase 1 before Phase 4: Amenities schema migration must precede amenity UI to avoid breaking `AmenityList.tsx` mid-development
- Phase 1 before Phase 2: Hotel tax addition to `pricing.ts` should land before the split amount calculator extends the same module — reduces the number of simultaneous changes to a critical shared file
- Phase 2 before Phase 5: Attendee model (`booking_invitations` with name/phone) must exist before itinerary read-only access is implemented for registered guests
- Phase 3 is independent and can run in parallel with Phase 2 if bandwidth allows
- Phase 5 last among core work: New npm dependency + highest complexity; all prior infrastructure should be stable first
- Phase 6 is data-dependent and has no value until properties have amenities populated by real owners

### Research Flags

Phases needing deeper research during planning:
- **Phase 2 (deadline enforcement):** Confirm whether the current Supabase plan tier has `pg_cron` available before designing deadline enforcement. If not, design the Vercel Cron approach upfront — do not defer this to after the deadline display UI is built.

Phases with standard, well-documented patterns (skip research-phase):
- **Phase 1:** Next.js copy changes, Supabase schema migrations, Tailwind — no novel patterns
- **Phase 3:** react-hook-form multi-step + PostgreSQL ENUM state machine — fully documented
- **Phase 4:** shadcn Checkbox grid + modal pattern — Holidu case study provides exact UX benchmark
- **Phase 5:** FullCalendar React docs are comprehensive; 'use client' + JSONB auto-save pattern is established

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All new deps verified against live `package.json`; FullCalendar React 19 peer dep confirmed via `npm info`; all existing libraries confirmed in production |
| Features | MEDIUM | Based on WebSearch + platform analysis (YouLi, Holidu, Plum Guide); no Context7 applicable for travel domain; core prioritization aligns with PROJECT.md explicit scoping |
| Architecture | HIGH | Based on actual codebase analysis of existing files; integration points identified; existing `pricing.ts`, `booking-invitations.ts`, `database.ts`, and webhook handler all read and confirmed |
| Pitfalls | HIGH | Majority derived from direct codebase analysis — real code, not theoretical risks; `calculatePricing()` signature confirmed, non-atomic `guest_count` increment confirmed at exact line numbers |

**Overall confidence:** HIGH

### Gaps to Address

- **Supabase plan tier for `pg_cron`:** Confirm at the start of Phase 2 whether `pg_cron` is available. Design deadline enforcement accordingly — do not assume it is.
- **`AmenityList.tsx` current JSONB shape:** Must be read at the start of Phase 1/4 amenities work. The existing data format is unconfirmed and may require a non-trivial migration of live property data.
- **`react-dropzone` React 19 peer dep gap:** If partner application requires drag-drop file upload, verify `react-dropzone@15.0.0` installs cleanly on pnpm with React 19. Use `--legacy-peer-deps` only if blocked.
- **Itinerary builder scope — FullCalendar confirmed over @dnd-kit:** FEATURES.md initially mentioned `@dnd-kit` but STACK.md provides a detailed override justification for FullCalendar. FullCalendar is the correct choice per research. Confirm with stakeholders before installing as it is a substantive new dependency.

## Sources

### Primary (HIGH confidence)
- `src/lib/pricing.ts` — `calculatePricing()` signature confirmed; `taxAmount` absence confirmed
- `src/app/api/webhooks/stripe/route.ts` — single fulfillment path confirmed; no payment-type discrimination
- `src/lib/actions/booking-invitations.ts` lines 204-208 — non-atomic `guest_count` read-modify-write confirmed
- `src/types/database.ts` line 52 — `amenities: Json` column confirmed on `properties` table
- `npm info @fullcalendar/react@6.1.20 peerDependencies` — React 19 `^19` peer dep verified directly
- [FullCalendar React docs](https://fullcalendar.io/docs/react) — 'use client' pattern, CSS bundled in JS (v6)
- [FullCalendar v6 Upgrade Guide](https://fullcalendar.io/docs/upgrading-from-v5) — CSS now bundled in JS
- [WeTravel Payment Plans](https://help.wetravel.com/en/articles/1270486-payment-plans-how-they-work-setup) — installment payment patterns
- [Holidu Amenities Redesign Case Study](https://holidu.design/how-we-took-our-amenities-to-the-next-level/) — modal UX pattern, category grouping, 400-600px page length savings

### Secondary (MEDIUM confidence)
- [YouLi Group Travel Platform](https://go.youli.io/) — itinerary builder feature reference
- [SquadTrip Group Trip Planning](https://squadtrip.com/) — competitive feature analysis
- [Plum Guide Host Vetting](https://hospitable.com/plum-guide-rentals) — partner application form fields and manual review model
- [Supabase Concurrent Writes Guide](https://bootstrapped.app/guide/how-to-handle-concurrent-writes-in-supabase) — atomic UPDATE patterns for race condition prevention
- [AllFly Split Payment](https://allfly.io/post/allflys-game-changing-split-payment-feature) — split payment UX patterns
- [GroupCollect Group Travel Registration](https://groupcollect.com/) — guest registration field requirements

### Tertiary (LOW confidence)
- react-calendar Issue #511 — UTC/local time ambiguity in calendar libraries (validates timezone storage approach for itinerary builder)

---
*Research completed: 2026-03-23*
*Ready for roadmap: yes*
