# Phase 8: Fixes and Rebrand - Research

**Researched:** 2026-03-08
**Domain:** Bug fixes (auth, currency formatting) + brand copy overhaul
**Confidence:** HIGH

## Summary

Phase 8 is a code-fix and copy-replacement phase with no new libraries or architectural changes. The two bugs are well-localized: `formatCurrency` divides by 100 when values are already in dollars (line 63 of bookings/page.tsx), and auth flows need an end-to-end audit across 6 files in `(auth)/`. The rebrand touches ~15 files, replacing "party villas" language with "Whole-Tel all-inclusive hotels" and updating seed data SQL.

The primary risk is missing a stale reference. The grep audit found 30+ occurrences of "villa/party" across 15 files (including `GuestNav.tsx` which was NOT in the CONTEXT.md list of 12 files). A systematic find-and-replace with manual review is the right approach.

**Primary recommendation:** Tackle bugs first (small, verifiable), then rebrand systematically file-by-file with a final grep audit to catch stragglers.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Seed properties renamed to Adam's style (e.g., "Cabo San Lucas Puesta Del Sol") -- location-first, property name second
- Real owner data (user `9d2398ac`, property "Cabo San Lucas Puesta Del Sol") is already correct -- don't touch
- Brand voice: all-inclusive group travel with fun/event hints, NOT "party"
- About page: full content rewrite, not keyword swaps
- Testimonials: rewrite all to reference all-inclusive hotel group experiences
- Main tagline: "Your next unforgettable group trip starts with a Whole-Tel!"
- Subtitle: all-inclusive focus (experiences inherently included)
- Destination cards: keep Cabo, PV, Miami -- just update villa language
- Auth: full end-to-end audit of all flows (guest + owner signup/login/logout)
- Supabase email confirmation stays OFF (dev mode)
- formatCurrency fix: remove the `/100` division
- Seed migration SQL must be updated + new migration to UPDATE existing DB rows

### Claude's Discretion
- Exact hero subtitle wording
- Testimonial content (realistic, brand-aligned)
- Seed property names for PV and Miami (match Cabo pattern)
- Updated seed descriptions (all-inclusive hotel voice)
- Auth audit scope -- test and fix whatever is broken
- Any additional meta tag / SEO updates needed

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| FIX-01 | Auth flow audited and all bugs fixed for smooth login/signup/logout | Auth files identified: 6 files in `(auth)/` + `lib/actions/auth.ts` + middleware. Full audit checklist below. |
| FIX-02 | formatCurrency bug fixed (divides by 100 when values are in dollars) | Bug located at `bookings/page.tsx:63`. Remove `/100` division. |
| BRAND-01 | All user-facing copy updated from "party villas" to "Whole-Tel all-inclusive hotels" | 15+ files identified via grep. Full file list with line numbers below. |
| BRAND-02 | Hero section updated with new tagline | `Hero.tsx` lines 56-59 need tagline + subtitle replacement. |
| BRAND-03 | Meta tags, SEO, and page titles reflect Whole-Tel all-inclusive hotel branding | `layout.tsx` (root metadata), plus page-level metadata in `properties/page.tsx`, `bookings/page.tsx`, `about/page.tsx`. |
</phase_requirements>

## Standard Stack

No new libraries. This phase uses only existing project dependencies:

| Library | Purpose | Notes |
|---------|---------|-------|
| Next.js 16 | App Router, metadata API | Use `export const metadata` for SEO updates |
| Supabase | Auth client, DB queries | Auth audit uses existing `createServerClient` / `createBrowserClient` |
| shadcn/ui | Existing UI components | No new components needed |

## Architecture Patterns

### File Organization (no changes)
Existing structure is correct. No new files needed except one new SQL migration.

### Pattern 1: Next.js Metadata for SEO
**What:** Each page exports `metadata` for title/description/OG tags.
**Where to update:**
- `src/app/layout.tsx` -- root metadata (title template + default description + OG)
- `src/app/(guest)/properties/page.tsx` -- "Browse Villas" -> "Browse Hotels"
- `src/app/(guest)/bookings/page.tsx` -- already says "Whole-Tel" (OK)
- `src/app/(guest)/about/page.tsx` -- already says "Whole-Tel" (OK)

### Pattern 2: Seed Data Migration Strategy
**What:** Two-part approach for seed data:
1. Update the original seed SQL file (`20260302000002_seed_data.sql`) so fresh installs get correct data
2. Create a NEW migration (`20260308000001_rebrand_seed_data.sql`) with UPDATE statements for existing DBs

**Why both:** The original seed uses `ON CONFLICT DO NOTHING`, so re-running it won't update existing rows. The UPDATE migration handles deployed databases.

### Anti-Patterns to Avoid
- **Global find-and-replace without review:** "villa" appears in contexts that need different replacements ("Browse Villas" -> "Browse Hotels", "About this villa" -> "About this property", "Villa Paraiso" placeholder -> "Puesta Del Sol")
- **Forgetting GuestNav.tsx:** Not in the CONTEXT.md file list but contains "Browse Villas" -- must be updated
- **PartyPopper icon:** The Lucide icon `PartyPopper` in `AddOnCard.tsx` is just an icon name, not user-facing text. Leave it alone.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OG meta tags | Manual `<meta>` tags | Next.js `metadata` export with `openGraph` field | Framework handles rendering, deduplication |
| Auth flow testing | Manual curl/fetch testing | Browser-based end-to-end walkthrough | Auth bugs are often redirect/cookie issues that only manifest in browser |

## Common Pitfalls

### Pitfall 1: Missing "villa" References
**What goes wrong:** Ship with stray "villa" or "party" text on a page
**Why it happens:** Grep misses template literals, string concatenation, or dynamic content
**How to avoid:** After all changes, run `grep -ri "villa\|party" src/ --include="*.tsx" --include="*.ts"` and verify every remaining hit is non-user-facing (like icon names)
**Warning signs:** Any grep hit in a JSX return block or metadata export

### Pitfall 2: formatCurrency Used Elsewhere
**What goes wrong:** Fix in bookings but same pattern exists elsewhere
**How to avoid:** Search for other `/100` or `cents` patterns across the codebase. The bug is local to `bookings/page.tsx` (inline function, not shared util), but verify no other pages have the same pattern.

### Pitfall 3: Auth Redirect Loops
**What goes wrong:** Login succeeds but redirects back to login, or logout doesn't clear session
**Why it happens:** Middleware optimistic check + server-side session check disagree, or redirect URL is wrong
**How to avoid:** Test the full matrix: guest signup -> auto-login -> logout -> re-login, owner signup -> auto-login -> logout -> re-login. Check middleware redirect logic.

### Pitfall 4: Seed Migration Ordering
**What goes wrong:** New UPDATE migration references property names that don't match
**How to avoid:** The UPDATE migration should use `id` or another stable identifier, not name matching. Or use broad WHERE clauses that catch all seed data.

## Complete File Inventory (from grep audit)

### Bug Fixes
| File | Issue | Fix |
|------|-------|-----|
| `src/app/(guest)/bookings/page.tsx:63` | `cents / 100` when values are dollars | Remove `/ 100` |
| `src/lib/actions/auth.ts` | Auth flow audit | Test all paths, fix issues found |
| `src/app/(auth)/login/page.tsx` | Auth flow audit | Test redirect after login |
| `src/app/(auth)/login/LoginForm.tsx` | Auth flow audit | Test error states |
| `src/app/(auth)/signup/page.tsx` | Auth flow audit | Test redirect after signup |
| `src/app/(auth)/owner/login/page.tsx` | Auth flow audit | Test owner login flow |
| `src/app/(auth)/owner/signup/page.tsx` | Auth flow audit | Test owner signup flow |

### Rebrand (user-facing copy)
| File | What to Change |
|------|---------------|
| `src/app/layout.tsx` | Root metadata: title, description, OG tags |
| `src/components/landing/Hero.tsx` | Tagline, subtitle, "Browse Villas" buttons |
| `src/components/landing/BrandStory.tsx` | "party villas" copy |
| `src/components/landing/FeaturedProperties.tsx` | "Featured Villas", "party-ready" |
| `src/components/landing/Testimonials.tsx` | All 3 testimonials -- full rewrite |
| `src/components/landing/DestinationCards.tsx` | "Jungle villas & golden sunsets" tagline |
| `src/app/(guest)/about/page.tsx` | Full content rewrite (per user decision) |
| `src/app/(guest)/properties/page.tsx` | Title metadata, h1, empty-state text |
| `src/app/(guest)/properties/[propertyId]/page.tsx` | "About this villa" heading |
| `src/app/(guest)/bookings/page.tsx:169` | "Browse villas" link text |
| `src/app/(owner)/dashboard/page.tsx` | "Add your first villa" empty state |
| `src/components/dashboard/PropertyForm.tsx` | "Villa Paraiso" placeholder, "Describe your villa" |
| `src/components/GuestNav.tsx` | "Browse Villas" nav link (NOT in CONTEXT list -- caught by grep) |
| `src/app/page.tsx:36` | "Browse Villas" text |
| `supabase/migrations/20260302000002_seed_data.sql` | Property names + descriptions |

### Leave Alone
| File | Why |
|------|-----|
| `src/components/property/AddOnCard.tsx` | `PartyPopper` is a Lucide icon import, not user-facing text |

## Replacement Guide

| Old Term | New Term | Context |
|----------|----------|---------|
| "Party Villas" / "party villas" | "All-Inclusive Hotels" / "all-inclusive hotels" | General brand references |
| "Browse Villas" | "Browse Hotels" | Navigation + CTAs |
| "villa" (singular, in descriptions) | "property" or "hotel" | Depends on context |
| "Villa Paraiso" (placeholder) | Location-based name like "Puerto Vallarta Casa del Mar" | Form placeholders |
| "party-ready" | "all-inclusive" or "hand-picked" | Marketing copy |
| "Your Next Party Starts Here" | "Your next unforgettable group trip starts with a Whole-Tel!" | Hero tagline (locked) |

## Seed Property Naming (Claude's Discretion)

Following Adam's pattern "Cabo San Lucas Puesta Del Sol":
- **PV suggestion:** "Puerto Vallarta Casa del Sol" or "Puerto Vallarta Playa Serena"
- **Miami suggestion:** "Miami Beach Ocean Palms" or "Miami South Beach Azure"

Pattern: `[City/Region] [Property Name in local style]`

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Manual browser testing (no automated test suite detected) |
| Config file | none |
| Quick run command | `pnpm dev` + browser walkthrough |
| Full suite command | N/A -- manual validation |

### Phase Requirements -> Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FIX-01 | Auth flows work end-to-end | manual | N/A -- browser test matrix | N/A |
| FIX-02 | Currency displays correctly | manual | `pnpm dev` + check bookings page | N/A |
| BRAND-01 | No "villa/party" in user-facing copy | smoke | `grep -ri "villa\|party" src/ --include="*.tsx"` | N/A |
| BRAND-02 | Hero has new tagline | manual | Visual check on landing page | N/A |
| BRAND-03 | Meta tags updated | manual | View page source / browser dev tools | N/A |

### Sampling Rate
- **Per task commit:** `pnpm build` (catches TypeScript/build errors)
- **Per wave merge:** Full grep audit + visual check of all pages
- **Phase gate:** `grep -ri "villa\|party" src/` returns only non-user-facing hits (icon imports)

### Wave 0 Gaps
None -- no test infrastructure needed. This phase is copy changes + 2 targeted bug fixes. The grep audit serves as the automated validation.

## Open Questions

1. **Auth bugs -- scope unknown until audit**
   - What we know: Auth files exist across 6 pages + 1 actions file + middleware
   - What's unclear: Which specific bugs exist (redirects? error states? session issues?)
   - Recommendation: Plan auth audit as its own task; fix issues found during audit in the same task

## Sources

### Primary (HIGH confidence)
- Direct codebase grep audit -- all "villa/party" references catalogued
- Direct file reads -- bug locations confirmed in source code
- CONTEXT.md -- user decisions locked

### Secondary (MEDIUM confidence)
- Next.js metadata API -- standard pattern, well-documented in project already

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- no new libraries, existing codebase only
- Architecture: HIGH -- no architectural changes, just edits to existing files
- Pitfalls: HIGH -- comprehensive grep audit, bug locations confirmed in source

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable -- no external dependencies changing)
