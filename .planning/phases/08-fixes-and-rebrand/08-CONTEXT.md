# Phase 8: Fixes and Rebrand - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Clear known bugs (auth flow, formatCurrency) and establish the Whole-Tel all-inclusive hotel brand across the entire site. All user-facing copy, seed data, descriptions, meta tags, hero, about page, and testimonials updated from "party villas" to "Whole-Tel all-inclusive hotels." No functional feature changes — this is copy/brand + bug fixes only.

</domain>

<decisions>
## Implementation Decisions

### Seed Data Renaming
- Rename seed properties to match Adam's real naming style (e.g., "Cabo San Lucas Puesta Del Sol")
- Use location-based hotel names, not "Villa" anything
- Update seed descriptions from party villa voice to all-inclusive hotel voice
- Update add-on descriptions that reference old property names (e.g., "Villa Paraiso" in Airport Transfer description)
- Real owner data (user `9d2398ac`, property "Cabo San Lucas Puesta Del Sol") is already correct — don't touch it
- Seed migration SQL file must be updated, plus a new migration to UPDATE existing DB rows

### Brand Voice
- New tone: all-inclusive group travel with fun/event hints
- Not "party" — more "unforgettable group experiences at hand-picked all-inclusive properties"
- Keep it warm, exciting, group-focused — not corporate or stuffy
- "All-inclusive" implies experiences are included in the property concept

### About Page
- Full content rewrite for the new brand — not just keyword swaps
- New brand story centered on all-inclusive group travel with curated experiences

### Testimonials
- Rewrite all testimonials to reference all-inclusive hotel group experiences
- Keep the testimonials section (don't remove it)

### Hero & Landing Copy
- Main tagline: "Your next unforgettable group trip starts with a Whole-Tel!"
- Subtitle: all-inclusive focus (experiences are inherently included because "all-inclusive")
- Destination cards: keep Cabo, PV, Miami — just update any villa language
- Featured properties: update copy to hotel language

### Auth Bug Fixes
- Full end-to-end audit of all auth flows: guest signup, guest login, guest logout, owner signup, owner login, owner logout
- Fix all broken redirects, error states, and UX issues found
- Supabase email confirmation stays OFF (dev mode) — MCP doesn't have access to toggle it

### formatCurrency Fix
- `bookings/page.tsx:63` divides by 100 when values are stored in dollars — shows $50 instead of $5,000
- Fix: remove the `/100` division

### Rebrand Scope (12 files identified)
Files containing "villa" or "party" references:
1. `src/components/landing/Hero.tsx`
2. `src/app/(guest)/about/page.tsx`
3. `src/components/landing/Testimonials.tsx`
4. `src/components/landing/DestinationCards.tsx`
5. `src/components/landing/FeaturedProperties.tsx`
6. `src/components/landing/BrandStory.tsx`
7. `src/app/(guest)/bookings/page.tsx` (line 169: "Browse villas")
8. `src/app/(guest)/properties/[propertyId]/page.tsx`
9. `src/app/(guest)/properties/page.tsx`
10. `src/app/layout.tsx`
11. `src/app/(owner)/dashboard/page.tsx`
12. `src/components/dashboard/PropertyForm.tsx`
Plus: `supabase/migrations/20260302000002_seed_data.sql`

### Claude's Discretion
- Exact hero subtitle wording
- Testimonial content (realistic, brand-aligned)
- Seed property names for PV and Miami (match Cabo pattern)
- Updated seed descriptions (all-inclusive hotel voice)
- Auth audit scope — test and fix whatever is broken
- Any additional meta tag / SEO updates needed

</decisions>

<specifics>
## Specific Ideas

- Adam's real property naming style: "Cabo San Lucas Puesta Del Sol" — location-first, property name second
- The client's incomplete tagline "Boutique hotels hand picked for..." — use "all-inclusive" not "boutique"
- "All-inclusive" inherently means experiences are included — the subtitle shouldn't redundantly call out experiences
- Brand should feel like fun group travel, not a party service — think bachelor/bachelorette weekends, corporate retreats, family reunions, friend group getaways

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `StatusBadge` component in bookings/page.tsx — no changes needed
- `BookingCard` component — fix formatCurrency, update "Browse villas" text
- All landing components are separate files — clean boundaries for rebrand

### Established Patterns
- Server Components by default — landing sections are Server Components except Hero
- `metadata` exports on page files for SEO — update these for rebrand
- Seed data uses `ON CONFLICT DO NOTHING` — safe for re-runs

### Integration Points
- `src/app/layout.tsx` — site-wide title/description metadata
- All page-level `metadata` exports — need "Whole-Tel" branding
- Seed migration — need UPDATE migration for existing DB rows, plus update SQL file for fresh installs

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-fixes-and-rebrand*
*Context gathered: 2026-03-08*
