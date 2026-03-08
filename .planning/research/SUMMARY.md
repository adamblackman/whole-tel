# Project Research Summary

**Project:** Whole-Tel v1.1 -- Rebrand & Owner Enhancements
**Domain:** Boutique hotel booking platform (group villa rentals with add-on experiences)
**Researched:** 2026-03-07
**Confidence:** HIGH

## Executive Summary

Whole-Tel v1.1 is a feature enhancement release for an existing Next.js 16 + Supabase + Stripe booking platform. The core stack is validated and unchanged. The release adds owner-facing management tools (photo sections, drag-to-reorder, batch upload, bed configuration), tiered per-person pricing for both properties and experiences, a guest invite system for group coordination, and a rebrand from "party villas" to "Whole-Tel boutique hotels." Research confirms only one new npm dependency is needed: `@dnd-kit/react` for drag-and-drop. Everything else builds on existing patterns (Supabase signed URL uploads, Server Actions, shadcn/ui components, Resend email).

The highest-risk change is tiered per-person pricing. It touches the core booking calculation that feeds Stripe Checkout, and pricing logic currently exists in two places (client PricingWidget and server createBookingAndCheckout). The mitigation is clear: extract a shared `lib/pricing.ts` pure function used by both. All schema changes are additive and nullable, ensuring backward compatibility with existing properties and bookings. The guest invite system is the most complex new feature, requiring a new table with RLS policies that correctly scope access to booking creators and invited guests without leaking data.

The recommended approach is a schema-first migration phase followed by four parallel-capable feature phases. Total estimated effort is 10-12 days. The rebrand should be isolated as its own phase to prevent accidental corruption of database values or Stripe metadata during find-and-replace operations. An existing bug was discovered during research: the bookings page divides currency by 100 when values are already stored in dollars, showing $50 instead of $5,000. This should be fixed during the expandable booking detail work.

## Key Findings

### Recommended Stack

The existing stack (Next.js 16, Supabase, Stripe, shadcn/ui, React Bits) requires no changes. One new runtime dependency and six new shadcn/ui component generators cover all v1.1 needs. See [STACK.md](STACK.md) for full rationale.

**New additions:**
- **@dnd-kit/react@0.3.2**: Photo grid drag-to-reorder -- only production-ready React DnD library with React 19 support
- **shadcn/ui components** (Accordion, Collapsible, Tabs, Dialog, Tooltip, Dropdown Menu): UI patterns for expandable bookings, photo sections, bed config, guest invites

**Explicitly rejected:** react-dropzone (unnecessary), @hello-pangea/dnd (no React 19), Framer Motion for drag (overkill), TanStack Query (Server Actions sufficient), Supabase Realtime (not needed until v2).

### Expected Features

See [FEATURES.md](FEATURES.md) for full feature landscape with complexity estimates and dependency graph.

**Must have (table stakes):**
- Batch photo upload -- single-photo upload feels broken to owners
- Photo drag-to-reorder -- owners must control hero/cover image
- Bed configuration -- groups need to plan sleeping arrangements
- Expandable booking detail view -- guests need price breakdown and add-on details

**Should have (differentiators):**
- Photo sections (Rooms, Pool, Common Areas) -- organized photo tours help group decision-making
- Tiered per-person pricing on properties -- core to Whole-Tel's group pricing model
- Tiered experience pricing -- "private chef for up to 10, +$50/person above"
- Experience photos -- visual experiences convert better
- Guest invite system -- turns solo booking into group coordination tool

**Defer (v2+):**
- Payment splitting (Stripe Connect complexity)
- Per-invitee add-on customization
- AI photo categorization
- Real-time collaborative booking editing
- Guest count changes post-payment

### Architecture Approach

All v1.1 features integrate into the existing App Router architecture. Three new database tables (`photo_sections`, `bed_configurations`, `booking_guests`), three altered tables (nullable columns on `properties`, `property_photos`, `add_ons`), and two PostgreSQL functions for atomic batch reordering. The critical new shared utility is `lib/pricing.ts` -- a pure function for booking total calculation used by both client display and server booking action. See [ARCHITECTURE.md](ARCHITECTURE.md) for full component map and data flow.

**Major architectural additions:**
1. **lib/pricing.ts** -- Single source of truth for booking total calculation (property base + extra guest surcharge + tiered add-ons + processing fee)
2. **Photo management subsystem** -- PhotoSectionManager, PhotoSection, modified PhotoUploader with @dnd-kit integration and batch upload
3. **Guest invite subsystem** -- booking_guests table, token-based invite URLs, acceptance flow with Resend email integration
4. **Atomic reorder functions** -- PostgreSQL functions that accept ordered ID arrays for race-condition-free photo/section reordering

### Critical Pitfalls

See [PITFALLS.md](PITFALLS.md) for all 13 pitfalls with detection and prevention strategies.

1. **Photo reorder race condition** -- Concurrent drag operations corrupt display_order. Prevention: send full ordered array in one atomic batch update; debounce client-side.
2. **NULL section column hides existing photos** -- Adding section_id to property_photos makes existing photos invisible if UI groups by section. Prevention: handle NULL section as "General" group; ensure existing gallery works without sections.
3. **Tiered pricing breaks existing bookings** -- New pricing columns must be nullable with safe defaults so properties without tiered pricing calculate identically to current behavior. Prevention: extract shared pricing function; test backward compatibility.
4. **Guest invite RLS nightmare** -- Unscoped subquery in RLS policy either blocks invited guests or exposes all bookings. Prevention: scope EXISTS subquery to specific booking_id; test with 3 user types.
5. **Rebrand corrupts non-copy strings** -- Global find-and-replace hits Stripe metadata, variable names, or database values. Prevention: manual review of all 14 affected files; never touch database values or Stripe metadata.

## Implications for Roadmap

Based on dependency analysis, feature groupings, and pitfall mitigation, the following 6-phase structure is recommended.

### Phase 1: Rebrand
**Rationale:** Independent of all functional changes. Should be its own isolated PR to prevent accidental interference with schema or logic changes. Low risk, high visibility.
**Delivers:** Updated brand identity across all user-facing copy, metadata, and SEO tags.
**Addresses:** Rebrand feature (copy/content changes only across 14 files, 24 occurrences).
**Avoids:** Pitfall 5 (find-and-replace corruption) by isolating from functional work.
**Effort:** 1-2 days.

### Phase 2: Schema Foundation + Shared Pricing
**Rationale:** Every subsequent phase depends on schema changes and the shared pricing utility existing. Migrations are additive (nullable columns, new tables) so they cannot break existing functionality. This phase produces no user-visible changes but unblocks everything.
**Delivers:** All database migrations, RLS policies for new tables, PostgreSQL reorder functions, updated TypeScript types, `lib/pricing.ts` shared function.
**Addresses:** Infrastructure for all features.
**Avoids:** Pitfalls 2 (NULL section), 3 (pricing backward compatibility) by designing safe defaults upfront.
**Effort:** 1-2 days.

### Phase 3: Owner Property Tools (Bed Config + Property Tiered Pricing)
**Rationale:** Standalone owner-facing features with no dependency on photo management or guest invites. Property tiered pricing establishes the pricing pattern that experience tiered pricing reuses in Phase 5.
**Delivers:** Bed configuration editor + guest-facing display, property tiered pricing form fields + PricingWidget update + booking action integration.
**Uses:** lib/pricing.ts from Phase 2.
**Avoids:** Pitfall 3 (pricing drift) by using shared pricing function from day one; Pitfall 9 (unstructured bed JSON) by using structured table or validated JSONB.
**Effort:** 1.5-2 days.

### Phase 4: Photo Management (Batch Upload + Ordering + Sections)
**Rationale:** Independent of pricing work. Medium complexity with the only new npm dependency (@dnd-kit/react). Groups three tightly coupled photo features that share components.
**Delivers:** Multi-file upload, drag-to-reorder photo grid, photo sections with grouped gallery display.
**Uses:** @dnd-kit/react, shadcn Collapsible + Dropdown Menu.
**Avoids:** Pitfall 1 (reorder race condition) with atomic batch updates; Pitfall 6 (batch upload overload) with plural signed URL action and concurrency limits.
**Effort:** 2-3 days.

### Phase 5: Experience Enhancements (Photos + Tiered Pricing)
**Rationale:** Depends on Phase 2 schema and mirrors Phase 3 pricing patterns. Straightforward because property tiered pricing already established the lib/pricing.ts pattern.
**Delivers:** Experience photo uploads, tiered experience pricing in form + display + booking calculation.
**Implements:** Add-on photo upload flow, calculateAddOnCost function in shared pricing utility.
**Avoids:** Pitfall 7 (inconsistent pricing formulas) by reusing shared function; Pitfall 8 (missing ownership verification) with joined ownership query.
**Effort:** 1.5 days.

### Phase 6: Booking Enhancements (Expandable Details + Guest Invites)
**Rationale:** Guest invites are the most complex new feature with the most unknowns (token-based invite flow, signup-during-accept, RLS policies spanning two tables). Expandable booking detail is a prerequisite since invitees need to see booking details. Do last to benefit from all prior work.
**Delivers:** Expandable booking rows with full price breakdown, guest invite system (send invite, accept/decline flow, guest list display).
**Uses:** shadcn Accordion + Dialog, Resend email (already integrated).
**Avoids:** Pitfall 4 (RLS nightmare) by designing policies before UI; Pitfall 10 (data exposure) by fetching all detail data server-side; fixes existing formatCurrency bug (Pitfall 13).
**Effort:** 3-4 days.

### Phase Ordering Rationale

- **Phase 1 (Rebrand) isolated** because it touches copy across the entire app and must not entangle with schema or logic changes
- **Phase 2 (Schema) first among functional work** because all code changes depend on tables, columns, types, and shared utilities existing
- **Phases 3 and 4 can run in parallel** -- property tools and photo management have zero overlap
- **Phases 5 and 6 can run in parallel** -- experience enhancements and booking enhancements are independent
- **Phase 3 before Phase 5** on the critical path because property tiered pricing establishes the shared pricing pattern that experience pricing reuses
- **Phase 6 last** because guest invites have the most unknowns and benefit from all prior infrastructure
- **Critical path:** Phase 1 -> Phase 2 -> (Phase 3 || Phase 4) -> (Phase 5 || Phase 6)

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 4 (Photo Management):** @dnd-kit/react v0.3.2 has an open issue (#1654) about "use client" directive compatibility. May need wrapper patterns. Test early.
- **Phase 6 (Guest Invites):** Token-based invite acceptance with potential signup-during-accept flow has edge cases around auth state. Needs detailed flow mapping.

Phases with standard patterns (skip research-phase):
- **Phase 1 (Rebrand):** Pure copy changes, no technical unknowns.
- **Phase 2 (Schema Foundation):** Standard Supabase migrations, well-documented patterns.
- **Phase 3 (Bed Config + Pricing):** Form fields + shared utility function, straightforward.
- **Phase 5 (Experience Enhancements):** Mirrors Phase 3 patterns exactly.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Only 1 new dependency; alternatives thoroughly evaluated; React 19 compatibility verified |
| Features | HIGH | Feature set derived from codebase analysis + competitor patterns; clear dependency graph |
| Architecture | HIGH | Based on actual codebase file analysis; integration points identified at line-level precision |
| Pitfalls | HIGH | Derived from real code patterns (e.g., count-based ordering, duplicated pricing logic, formatCurrency bug) |

**Overall confidence:** HIGH

### Gaps to Address

- **@dnd-kit/react "use client" issue (#1654):** May need a client wrapper component. Low risk since drag-and-drop is inherently client-side, but verify during Phase 4 implementation.
- **Bed configuration storage decision:** Research suggests both JSONB column and separate table are viable. Architecture doc recommends separate table with UNIQUE constraint; Features doc recommends JSONB for simplicity. Decision should be made during Phase 3 planning -- lean toward separate table for queryability.
- **Guest invite signup-during-accept flow:** If an invited user does not have an account, the flow redirects to signup with a return URL. The exact interaction between Supabase Auth signup, email verification, and invite token acceptance needs careful implementation. Map the full state machine during Phase 6 planning.
- **Existing formatCurrency bug:** Bookings page divides by 100 when values are stored in dollars. Confirm the storage unit by checking actual database values before fixing.

## Sources

### Primary (HIGH confidence)
- Existing codebase analysis -- all files in src/lib/actions/, src/components/, src/types/, src/app/
- [@dnd-kit/react on npm](https://www.npmjs.com/package/@dnd-kit/react) -- v0.3.2, React 19 compatible
- [Supabase documentation](https://supabase.com/docs) -- RLS patterns, Storage signed URLs, RPC functions
- [shadcn/ui component docs](https://ui.shadcn.com/docs) -- Accordion, Collapsible, Tabs, Dialog
- [Airbnb Photo Tour](https://airbnb.com/resources/hosting-homes/a/how-to-organize-listing-photos-into-a-home-tour-456) -- photo section patterns
- [Booking.com Per-Guest Pricing](https://partner.booking.com/en-us/help/channel-manager/availability/understanding-pricing-guest-models) -- tiered pricing model

### Secondary (MEDIUM confidence)
- [dnd-kit "use client" issue #1654](https://github.com/clauderic/dnd-kit/issues/1654) -- React 19 Server Components note
- [Supabase RLS Best Practices](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices) -- multi-tenant patterns
- [Top DnD Libraries for React 2026](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react) -- ecosystem comparison
- [System Design: Inviting Users to a Group](https://medium.com/@itayeylon/system-design-inviting-users-to-a-group-98b1e0967b06) -- invite system patterns
- [dnd-kit Discussion #1522](https://github.com/clauderic/dnd-kit/discussions/1522) -- optimistic update race condition patterns

---
*Research completed: 2026-03-07*
*Ready for roadmap: yes*
