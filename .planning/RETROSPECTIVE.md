# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.1 — Rebrand & Owner Enhancements

**Shipped:** 2026-03-08
**Phases:** 4 | **Plans:** 11

### What Was Built
- Full site rebrand from "party villas" to "Whole-Tel all-inclusive hotels"
- Owner property tools: bed configuration, street addresses, per-person tiered pricing
- Photo management: batch upload, drag-to-reorder, sections, experience photos, sectioned gallery
- Booking enhancements: expandable details, guest count editing, email invitations with accept/decline

### What Worked
- Shared `calculatePricing()` module created in Phase 9 was reused by Phase 11 (booking updates + invitation acceptance) without modification — single source of truth paid off immediately
- Wave-based parallel execution kept phases independent and clean
- Phase 8 (rebrand + bug fixes) first cleared technical debt before building new features — no rework needed
- YARL lightbox plugin pattern for section tabs was clean and extensible

### What Was Inefficient
- Phase 8 plan checkboxes in ROADMAP.md never got marked `[x]` — cosmetic but indicates state tracking gap
- `formatCurrency` duplicated independently in two files rather than extracted to shared utility
- One-liner extraction from SUMMARY.md frontmatter returned N/A for all plans — frontmatter field may not be populated consistently

### Patterns Established
- `use client` wrapper components for third-party libraries lacking the directive (@dnd-kit/react)
- Admin client pattern: `verifySession()` for auth check, then `createAdminClient()` for cross-user operations
- Nullable pair pattern: two fields that must both be null or both be non-null, enforced by CHECK constraint + Zod `.refine()`
- `z.preprocess` for form number fields: empty string → null (not 0)
- Inline styles for portal-rendered components (YARL lightbox) to avoid Tailwind class purging

### Key Lessons
1. Creating a shared pricing module early (Phase 9) prevented price drift — every consumer (widget, booking action, guest count update, invitation acceptance) uses the same function
2. Experience photo upload only works in edit mode (needs existing addOnId) — plan for this constraint when designing creation flows
3. React Server Component + Client wrapper pattern (BookingCardClient, SignupForm) enables server data fetching with client interactivity cleanly

### Cost Observations
- Model mix: ~20% opus (orchestration), ~80% sonnet (execution + verification)
- All 11 plans executed in single session
- Notable: Wave-based execution with spot-checking kept orchestrator context lean (~15%)

---

## Milestone: v1.0 — MVP

**Shipped:** 2026-03-06
**Phases:** 7 | **Plans:** 24

### What Was Built
- Full booking platform from scratch: schema, auth, dashboard, browsing, booking, payments, landing page
- Supabase backend with RLS policies and GiST index for date exclusion
- Stripe Checkout integration with webhook-based booking confirmation
- Responsive landing page with brand story and property showcase

### What Worked
- Supabase provides auth + database + storage in one — no service sprawl
- Phase ordering (foundation → auth → dashboard → guest → booking → payments → polish) eliminated circular dependencies
- Keeping all payments on single Stripe account simplified v1.0 significantly

### Key Lessons
1. `params` and `cookies()` must be awaited in Next.js 16 — caught early, prevented runtime errors
2. Never trust client-submitted prices — server-side pricing via Stripe metadata is the only safe pattern
3. Webhook is the authoritative booking signal, not success URL redirect

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Phases | Plans | Key Change |
|-----------|--------|-------|------------|
| v1.0 | 7 | 24 | Established foundation patterns |
| v1.1 | 4 | 11 | Shared modules, wave execution, photo management |

### Top Lessons (Verified Across Milestones)

1. Server-side pricing is non-negotiable — shared `calculatePricing()` module is the pattern
2. Foundation phases (schema, types, shared modules) before UI phases eliminates rework
3. React Server Component + Client wrapper pattern is the standard for interactive server-rendered pages
