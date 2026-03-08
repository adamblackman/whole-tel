# Phase 9: Owner Property Tools - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Owners can fully configure their property listing with bed details, street address, and per-person pricing tiers for both properties and experiences. Guests see bed configuration, address, and dynamic pricing on the listing page. No new pages — extends existing PropertyForm, AddOnForm, PricingWidget, and property listing.

</domain>

<decisions>
## Implementation Decisions

### Bed Configuration
- Property-wide bed counts (not per-room assignment) — owner enters total counts per bed type
- 5 fixed bed types: King, Queen, Double, Twin, Bunk — no custom types
- Keep the existing "Bedrooms" number field alongside the new bed config section
- Store as JSONB column (`bed_config`) on properties table, e.g., `{"king": 2, "queen": 1, "bunk": 1}`
- Add bed config inputs to PropertyForm — one number input per bed type, defaulting to 0

### Per-Person Property Surcharge
- Optional — owner can leave blank (no surcharge applied)
- Two new fields on properties table: `guest_threshold` (integer, nullable) and `per_person_rate` (numeric, nullable)
- Owner inputs: "Guest threshold" number field + "Per-person rate above threshold" dollar amount
- When guest count exceeds threshold, surcharge = (guests - threshold) × rate × nights
- Shows as separate line in PricingWidget breakdown: "Per-person surcharge (X guests above Y) — $Z/night"

### Experience Tiered Pricing
- Extend existing add-on model with optional tier fields (don't replace pricing_unit)
- Two new nullable fields on add_ons table: `included_guests` (integer) and `per_person_above` (numeric)
- When `included_guests` is set, `price` becomes the base price for up to X people, then `per_person_above` for each additional guest
- When `included_guests` is null, add-on behaves exactly as before (flat price with per_person/per_booking unit)
- Experience toggle in PricingWidget shows tier info: "Private Chef Dinner — $500 (up to 10 people, $50/person above)"

### Shared Pricing Logic
- Create `lib/pricing.ts` as single source of truth for all pricing calculations
- Used by PricingWidget (client-side preview) and booking Server Action (server-side charge)
- Handles: base nightly rate, per-person surcharge, experience tiers, cleaning fee, processing fee
- Prevents price drift between what guest sees and what gets charged

### Location & Address
- Keep location as curated dropdown (Cabo San Lucas, Puerto Vallarta, Miami)
- Street address remains optional (current behavior preserved)
- Address is visible on the public property listing page (not hidden until booking)

### Claude's Discretion
- Address field format (single text field vs structured) — lean toward simplest approach
- Exact bed config UI layout within the PropertyForm (inline row, grid, etc.)
- AddOnForm UI layout for the new tier fields
- Experience pricing UX for the owner (how tier fields are labeled/grouped)
- How to handle the per-person surcharge input UX (two fields vs sentence builder — lean toward whatever is cleanest)
- Migration naming and column constraints

</decisions>

<specifics>
## Specific Ideas

- Bed display on listing: icon row with counts inline (e.g., 🛏️ 2 King · 🛏️ 1 Queen · 🛋️ 1 Bunk) — Airbnb-style, scannable
- Per-person surcharge: transparent breakdown line in PricingWidget, no surprise charges
- Experience tier info visible on the toggle itself, not hidden until checkout
- Address shows below location name on listing page

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PropertyForm` (`src/components/dashboard/PropertyForm.tsx`): Owner form with two-column grid layout — extend with bed config section and pricing tier fields
- `AddOnForm` (`src/components/dashboard/AddOnForm.tsx`): Add-on creation/edit form — extend with `included_guests` and `per_person_above` fields
- `PricingWidget` (`src/components/property/PricingWidget.tsx`): Client-side pricing calculator — extend with surcharge line and experience tier logic
- `AddOnCard` (`src/components/property/AddOnCard.tsx`): Experience display card — extend to show tier info
- shadcn `Input`, `Label`, `Select` components already used throughout forms

### Established Patterns
- `useActionState` for form submissions with server actions
- Two-column grid layout in PropertyForm for paired fields
- `database.ts` types mirror DB schema — must update with new fields
- Property validation in `lib/validations/property.ts` — extend schema
- Add-on validation in `lib/validations/add-on.ts` — extend schema

### Integration Points
- `src/lib/actions/bookings.ts` — Server action that calculates final prices; must use shared pricing.ts
- `src/app/(guest)/properties/[propertyId]/page.tsx` — Property listing page; add bed display and address
- `src/app/(owner)/dashboard/properties/[propertyId]/page.tsx` — Owner property detail; shows current config
- `supabase/migrations/` — New migration for schema changes (bed_config, guest_threshold, per_person_rate, included_guests, per_person_above)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 09-owner-property-tools*
*Context gathered: 2026-03-08*
