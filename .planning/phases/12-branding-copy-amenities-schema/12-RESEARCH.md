# Phase 12: Branding, Copy & Amenities Schema - Research

**Researched:** 2026-03-23
**Domain:** UI copy updates, Supabase schema migrations, pricing module extension
**Confidence:** HIGH (all findings from direct codebase inspection — no external dependencies needed)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Hero Section (BRAND-01)**
- Replace current headline with: "Your Own Private Resort. No Strangers. No Compromises. Custom-Inclusive, Only Pay For What You Want"
- CTA button changes from "Browse Hotels" to "Browse Whole-Tels™"
- Keep existing gradient background and animation approach

**TM Branding (BRAND-02)**
- All public-facing instances of "Whole-Tel" display with TM symbol
- Apply to: Hero nav, BrandStory, FeaturedProperties, DestinationCards, Testimonials, footer, about page, contact page, property detail, bookings, auth pages
- Use HTML entity `&trade;` or Unicode `\u2122` -- consistent across all files

**"The Whole-Tel™ Experience" Section (BRAND-03)**
- Rename from "The Whole Experience" to "The Whole-Tel™ Experience"
- Update copy to center on Custom-Inclusive model
- Keep the 4 experience icons (Private Chefs, Boat Excursions, VIP Nightlife, Sunset Tours)

**"How a Whole-Tel Takeover Works" Section (BRAND-04)**
- New 3-step section replacing or added near BrandStory
- Step 1: Browse (magnifying glass icon), Step 2: Customize (checklist icon), Step 3: Arrive (gold key icon)
- Clean, horizontal layout on desktop, stacked on mobile

**"Featured Whole-Tels™" Section (BRAND-05)**
- Rename "Featured Hotels" to "Featured Whole-Tels™"
- Update subtitle to: "Hand-picked 'custom-inclusive' properties for your next group trip"

**Coming Soon Cities (BRAND-06)**
- Miami moves FROM active destinations TO Coming Soon
- Active destinations: Cabo San Lucas, Puerto Vallarta only
- Coming Soon cards: Miami, Palm Springs, Los Angeles, Las Vegas
- Coming Soon cards are non-clickable with a visual "Coming Soon" badge/overlay

**Remove "hotel" from Copy (BRAND-07)**
- Replace "Browse Hotels" with "Browse Whole-Tels™" in nav and CTA buttons
- Replace "Featured Hotels" with "Featured Whole-Tels™"
- "hotel" only appears when describing the concept of turning hotels into Whole-Tels (about page context)
- Footer nav link: "Browse Hotels" becomes "Browse Whole-Tels™"

**Bed Count on Property Cards (BRAND-08)**
- Replace generic "N bed" with bed_config breakdown: "King x2, Queen x1" etc.
- Compact inline format, only show types with count > 0
- Query must include bed_config in property select (currently not fetched for cards)

**Amenities DB Schema (AMEN-01)**
- Seed table `amenities` with columns: id, name, category, icon_name, display_order
- Join table `property_amenities` with: property_id, amenity_id
- 5 categories: Water, Social, Work/Event, Culinary, Wellness (~30-35 total amenities)
- RLS policies on both tables
- Schema + seed ONLY — owner UI and guest display are Phase 15

**Hotel Tax in Pricing (PAY-07)**
- Add `tax_rate` column (decimal, nullable) to properties table
- calculatePricing() adds hotel tax: tax = (accommodationSubtotal + perPersonSurcharge) * tax_rate
- Tax displays as "Hotel Tax (X%)" in price breakdown
- If no tax_rate set (null): no tax line item
- PricingBreakdown gains `hotelTax: number` and `taxRate: number | null`
- Processing fee calculated AFTER tax

**Per-Person Cost Display (PAY-09)**
- Show per-person cost on booking confirmation: total / guest_count
- Display line: "Per person: $X" beneath total
- No changes to pricing logic — purely display

### Claude's Discretion
- Exact 3-step section layout and spacing
- Coming Soon card visual design (gradient colors, badge style)
- Amenity icon_name values (Lucide icon names)
- Exact amenity list within each category (targeting ~30-35 total)
- Tax rate field placement in PropertyForm
- Testimonial copy updates to remove "hotel" references

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BRAND-01 | Hero section displays new "Custom-Inclusive" headline with "Browse Whole-Tels™" CTA | Hero.tsx identified — 3 text changes needed (h1, subtitle, CTA link x2) |
| BRAND-02 | All instances of "Whole-Tel" display with ™ symbol | 24 instances across 11 files identified via grep |
| BRAND-03 | "The Whole Experience" renamed to "The Whole-Tel™ Experience" with updated Custom-Inclusive copy | BrandStory.tsx identified — heading + paragraph update |
| BRAND-04 | "How a Whole-Tel Takeover Works" 3-step about section | New component needed — can be added to BrandStory.tsx or as separate TakeoverSteps.tsx |
| BRAND-05 | "Featured Whole-Tels™" section with updated subtitle | FeaturedProperties.tsx — 2 text changes |
| BRAND-06 | Coming Soon cards for Miami, Palm Springs, Los Angeles, Las Vegas | DestinationCards.tsx — restructure into active + coming-soon arrays; remove Miami from VALID_DESTINATIONS in properties/page.tsx and DestinationFilter |
| BRAND-07 | All copy removes "hotel" except conceptual about-page usage | 20+ instances across 8+ files identified via grep — see Full File Inventory section |
| BRAND-08 | Property cards display bed count by type | PropertyListingCard.tsx + FeaturedProperties.tsx interface + page.tsx query update — bed_config JSONB already exists |
| AMEN-01 | DB schema for amenities (5 categories, ~30-35 options) | New migration file; two tables + RLS; icon_name maps to existing Lucide icons in AmenityList.tsx |
| PAY-07 | Hotel tax as line item in calculatePricing() | pricing.ts PricingInput/PricingBreakdown interface extension + bookings.ts property query + PricingWidget display |
| PAY-09 | Per-person cost on booking confirmation | PricingWidget already has perPerson calc — need to verify this shows on confirmation page too |
</phase_requirements>

---

## Summary

Phase 12 is a pure code-level phase — no new frameworks, no new NPM packages, no API integrations. All work is text replacement, component restructuring, schema migration, and pure-function extension to an established pricing module.

The codebase is well-structured for these changes. Landing sections are isolated Server Components in `src/components/landing/`. The pricing module (`src/lib/pricing.ts`) is a framework-agnostic pure function. Supabase schema migrations follow a consistent pattern already seen in 6 prior migrations. The bed_config JSONB column already exists on `properties` — it just needs to surface on listing cards.

The single highest-risk item is the `calculatePricing()` extension for hotel tax. Tax must be included in the base on which the Stripe processing fee is computed (per CONTEXT.md: "processing fee calculated AFTER tax"). The existing function and all its callers (PricingWidget.tsx, bookings.ts) need coordinated updates.

**Primary recommendation:** Execute in 3 waves — (1) copy/branding/UI, (2) schema migration, (3) pricing module + consumers. Each wave is independently deployable.

---

## Standard Stack

This phase uses zero new libraries. All work is within the established stack:

| Tool | Version | Purpose |
|------|---------|---------|
| Next.js App Router | 16 | Server Components for landing sections |
| Supabase | current | Schema migration + RLS policies |
| Lucide React | current | Icons for 3-step section + amenity icon_name values |
| shadcn/ui Badge | current | Coming Soon overlay badge |
| TypeScript | current | Interface extensions for PricingInput/PricingBreakdown |
| Zod | current | PropertySchema extension for tax_rate field |

**No new packages needed.**

---

## Architecture Patterns

### Recommended Execution Order

Work naturally groups into waves that avoid circular dependencies:

**Wave 1 — Copy & Branding (no data dependencies)**
- Hero.tsx, BrandStory.tsx, FeaturedProperties.tsx, DestinationCards.tsx, Testimonials.tsx
- Footer in page.tsx
- GuestNav.tsx, layout.tsx metadata
- About page, contact page, bookings page, auth pages
- New TakeoverSteps component

**Wave 2 — Schema Migration (no app code dependencies)**
- New migration: `amenities` table + `property_amenities` join table + `tax_rate` column on properties
- Seed data for ~30-35 amenities across 5 categories

**Wave 3 — Pricing + Cards (depends on Wave 2 schema)**
- `calculatePricing()` extension
- `PricingWidget.tsx` display update
- `bookings.ts` property query + tax pass-through
- `PropertyListingCard.tsx` bed_config display
- All queries that feed `PropertyListingCard`

### Project Structure (landing sections)

```
src/components/landing/
├── Hero.tsx              # Server Component — auth check, nav, headline, CTA
├── BrandStory.tsx        # "The Whole-Tel™ Experience" + TakeoverSteps (or split)
├── FeaturedProperties.tsx # "Featured Whole-Tels™" grid
├── DestinationCards.tsx  # Active destinations + Coming Soon section
└── Testimonials.tsx      # Quote cards (hotel -> Whole-Tel copy update)
```

The `TakeoverSteps` section (BRAND-04) can be: (a) added to the bottom of BrandStory.tsx as a second `<section>` block, or (b) a new `TakeoverSteps.tsx` component imported in `page.tsx`. Either works — option (b) is cleaner for future editing.

### Pattern 1: TM Symbol Application

The locked decision is `&trade;` HTML entity or `\u2122` Unicode. `&trade;` is correct for JSX since JSX transpiles HTML entities. Use it consistently.

```tsx
// Correct — HTML entity in JSX
<h2>Featured Whole-Tels&trade;</h2>

// Also correct — superscript element for styling control
<h2>Featured Whole-Tels<sup className="text-xs align-super">™</sup></h2>
```

The `&trade;` entity approach is simpler and consistent with other HTML entities already in the codebase (`&apos;`, `&mdash;`, `&copy;`, `&ldquo;`, `&rdquo;`).

### Pattern 2: Coming Soon Cards

DestinationCards.tsx currently has a flat `destinations` array with all cards as `<Link>` elements. Restructure to separate arrays:

```tsx
const activeDestinations = [
  { name: 'Cabo San Lucas', tagline: '...', gradient: '...' },
  { name: 'Puerto Vallarta', tagline: '...', gradient: '...' },
]

const comingSoonDestinations = [
  { name: 'Miami', tagline: '...', gradient: '...' },
  { name: 'Palm Springs', tagline: '...', gradient: '...' },
  { name: 'Los Angeles', tagline: '...', gradient: '...' },
  { name: 'Las Vegas', tagline: '...', gradient: '...' },
]
```

Active cards remain `<Link>` elements. Coming Soon cards become `<div>` (non-clickable) with a `<Badge>` overlay ("Coming Soon"). The grid should accommodate 6 total cards — consider `sm:grid-cols-2 lg:grid-cols-3` layout to show active + coming-soon in the same grid with visual differentiation.

### Pattern 3: Bed Config on Property Cards

`bed_config` is a JSONB column already in the schema (added in migration `20260308000002`). Default value: `{"king":0,"queen":0,"double":0,"twin":0,"bunk":0}`.

Three touch points needed:
1. `PropertyListingCard.tsx` — accept `bed_config` in prop type, replace "N bed" with formatted breakdown
2. `FeaturedProperties.tsx` — add `bed_config` to the properties interface it accepts
3. `src/app/page.tsx` — query already uses `*` so `bed_config` is included automatically
4. `src/app/(guest)/properties/page.tsx` — query uses explicit column list — must add `bed_config` to `.select()`

Formatting logic (only show types with count > 0):
```tsx
// BED_TYPE_LABELS already exists in [propertyId]/page.tsx — extract to shared util or re-declare
const BED_LABELS: Record<string, string> = { king: 'King', queen: 'Queen', double: 'Double', twin: 'Twin', bunk: 'Bunk' }

function formatBedConfig(bedConfig: Record<string, number>): string {
  return Object.entries(bedConfig)
    .filter(([, count]) => count > 0)
    .map(([type, count]) => `${BED_LABELS[type] ?? type} x${count}`)
    .join(', ')
}
// e.g. "King x2, Queen x1"
```

### Pattern 4: Hotel Tax in calculatePricing()

The existing flow: `accommodationSubtotal + perPersonSurcharge + addOns + cleaningFee → processingFee (2.9% + $0.30) → total`.

New flow per CONTEXT.md: `accommodationSubtotal + perPersonSurcharge → hotelTax → processingFee (on everything including tax) → total`.

**PricingInput changes:**
```typescript
export interface PricingInput {
  // ... existing fields ...
  taxRate: number | null  // decimal e.g. 0.12 for 12%
}
```

**PricingBreakdown changes:**
```typescript
export interface PricingBreakdown {
  // ... existing fields ...
  hotelTax: number
  taxRate: number | null
}
```

**calculatePricing() logic addition (insert before processingFee calculation):**
```typescript
// Hotel tax: applies to accommodation + surcharge only
const hotelTax = taxRate != null
  ? round2((accommodationSubtotal + perPersonSurcharge) * taxRate)
  : 0

// Processing fee: on the full pre-fee subtotal INCLUDING tax
const processingFee = round2(
  (accommodationSubtotal + perPersonSurcharge + cleaningFee + addOnsTotal + hotelTax) * 0.029 + 0.3
)

const total = round2(
  accommodationSubtotal + perPersonSurcharge + cleaningFee + addOnsTotal + hotelTax + processingFee
)
```

**Callers that must be updated:**
1. `bookings.ts` — add `tax_rate` to property SELECT, pass to calculatePricing()
2. `PricingWidget.tsx` — add `taxRate` prop, display "Hotel Tax (X%)" line item
3. `src/app/(guest)/properties/[propertyId]/page.tsx` — add `tax_rate` to property select, pass to PricingWidget

### Pattern 5: Amenities Migration

Migration naming convention: `20260323000001_amenities_schema.sql` (date-prefixed like all existing migrations).

```sql
CREATE TABLE amenities (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL UNIQUE,
  category      text NOT NULL CHECK (category IN ('Water', 'Social', 'Work/Event', 'Culinary', 'Wellness')),
  icon_name     text NOT NULL,  -- Lucide icon name e.g. 'Waves', 'Flame', 'Wifi'
  display_order int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE property_amenities (
  property_id   uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  amenity_id    uuid NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
  PRIMARY KEY (property_id, amenity_id)
);
```

RLS follows the established pattern in this codebase:
- `amenities`: SELECT open to anon + authenticated (read-only catalog)
- `property_amenities`: SELECT open to anon + authenticated; INSERT/DELETE scoped to property owner via EXISTS subquery

### Anti-Patterns to Avoid

- **Do not update the DestinationFilter DESTINATIONS array without also updating VALID_DESTINATIONS in properties/page.tsx.** Miami must be removed from both. These are currently duplicated constants that need to stay in sync.
- **Do not add taxRate to PricingWidget as a hardcoded value.** It must flow from the property record (server-side) to PricingWidget as a prop, so the display matches server-calculated pricing.
- **Do not apply ™ to "Whole-Tel" in email templates or non-public-facing strings** (e.g., metadata `title` template `"%s | Whole-Tel"`, email footer "Thanks for booking with Whole-Tel!" — these are functional not marketing copy). The locked decision says "all public-facing instances" — be precise about what's public-facing vs. functional.
- **Do not use `<sup>` tags for ™ unless consistent.** Pick `&trade;` or `<sup>` and apply it everywhere — mixing is confusing. `&trade;` is simpler.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| Icon mapping for amenities | Custom SVG icons | Lucide React (already used in AmenityList.tsx — `Waves`, `Flame`, `Wifi`, etc.) |
| Percentage formatting for tax rate | Custom formatter | `(taxRate * 100).toFixed(0) + '%'` — trivial, no library needed |
| "Coming Soon" badge | Custom overlay CSS | shadcn/ui `Badge` component (already used on PropertyListingCard) |
| Bed config formatting | Complex utility | Simple `Object.entries` filter+map (5 keys, well-defined) |

---

## Common Pitfalls

### Pitfall 1: Miami Stranded in Filter State
**What goes wrong:** Miami is removed from DestinationCards as a clickable destination, but `VALID_DESTINATIONS` in `properties/page.tsx` and the `DESTINATIONS` array in `DestinationFilter.tsx` still include Miami. Users can bookmark/deeplink to `?destination=Miami` and get results.
**Why it happens:** Three places define the destination list independently.
**How to avoid:** Update all three together: DestinationCards.tsx, `VALID_DESTINATIONS` in properties/page.tsx, and `DESTINATIONS` in DestinationFilter.tsx. Remove Miami from all three in the same task.

### Pitfall 2: bed_config Missing from Browse Query
**What goes wrong:** PropertyListingCard renders `undefined` or crashes when bed_config is absent, because the browse page uses an explicit column SELECT that doesn't include `bed_config`.
**Why it happens:** The homepage uses `*` (gets everything) while `/properties/page.tsx` uses an explicit select string. Easy to update one and forget the other.
**How to avoid:** PropertyListingCard's TypeScript interface should make `bed_config` required (not optional). The type error will surface at build time for any query that doesn't include it. Alternatively, make it optional with a graceful fallback to `bedrooms` count.

### Pitfall 3: Tax Added to Processing Fee Base Twice
**What goes wrong:** If tax is added to total AFTER processingFee is calculated, then the Stripe charge is under-collected (tax is in the display total but not in the charged amount if Stripe line items don't include it).
**Why it happens:** The CONTEXT.md decision is clear (processing fee AFTER tax) but easy to misread the calculation order in pricing.ts.
**How to avoid:** The processingFee calculation must take `hotelTax` as part of its base. Verify: `processingFee base = accommodationSubtotal + perPersonSurcharge + cleaningFee + addOnsTotal + hotelTax`. Also add a hotel tax line item to Stripe checkout in bookings.ts.

### Pitfall 4: PricingWidget Prop Not Threaded to Property Page
**What goes wrong:** `tax_rate` is added to the pricing module and bookings.ts, but `PricingWidget` in the property detail page doesn't receive it because the page query doesn't select `tax_rate` or doesn't pass it as a prop.
**Why it happens:** The property detail page (`[propertyId]/page.tsx`) is a large file that queries and passes many props — easy to add to one layer and miss another.
**How to avoid:** Trace the full chain: property SELECT → prop to PricingWidget → passed to calculatePricing() → returned in breakdown → displayed. Three touch points in one file.

### Pitfall 5: TM Symbol in Non-Public Strings
**What goes wrong:** Applying `™` to metadata title templates, email copy, URL slugs, or code comments creates visual noise and may break certain contexts (e.g., email clients that don't render HTML entities, meta title character limits).
**Why it happens:** A blanket "all Whole-Tel instances" directive is easy to over-apply.
**How to avoid:** Apply TM only to visible rendered UI text in public-facing pages. Do not modify: `layout.tsx` title template string `"%s | Whole-Tel"`, email template text strings, code comments, variable names.

### Pitfall 6: bookings.ts Stripe Line Items Miss Hotel Tax
**What goes wrong:** Hotel tax is calculated server-side and added to `breakdown.total`, but the Stripe line items array doesn't include a hotel tax line. This causes a mismatch between the breakdown total and the sum of Stripe line items.
**Why it happens:** bookings.ts constructs line items manually — if a new breakdown field isn't explicitly added to `lineItems`, it's silently omitted.
**How to avoid:** When adding `hotelTax` to the breakdown, also add a conditional Stripe line item for hotel tax (similar to the perPersonSurcharge pattern already in the file).

---

## Full File Inventory for Copy Changes

Every file that needs modification, with specific changes:

### src/components/landing/Hero.tsx
- Line 27: `Whole-Tel` → `Whole-Tel&trade;` (nav logo)
- Line 35: `Browse Hotels` → `Browse Whole-Tels&trade;` (nav button)
- Line 75: Replace entire h1 text
- Line 78: Update subtitle — remove "all-inclusive group hotels" reference
- Line 85: `Browse Hotels` → `Browse Whole-Tels&trade;` (hero CTA)

### src/components/landing/BrandStory.tsx
- Line 17: `The Whole Experience` → `The Whole-Tel&trade; Experience`
- Line 20-24: Rewrite paragraph for Custom-Inclusive model
- NEW: Add TakeoverSteps section (3-step horizontal layout)

### src/components/landing/FeaturedProperties.tsx
- Line 24: `Featured Hotels` → `Featured Whole-Tels&trade;`
- Line 27: Update subtitle to "Hand-picked 'custom-inclusive' properties for your next group trip"
- Interface: Add `bed_config` to properties type

### src/components/landing/DestinationCards.tsx
- Restructure `destinations` array into `activeDestinations` (Cabo, PV) + `comingSoonDestinations` (Miami, Palm Springs, LA, Las Vegas)
- Active destinations remain `<Link>` with hover effects
- Coming Soon destinations become non-clickable `<div>` with "Coming Soon" `<Badge>`

### src/components/landing/Testimonials.tsx
- Sarah M. quote: "The hotel was gorgeous" → "The property was gorgeous" (or similar)
- Priya K. quote: Remove/update "all-inclusive" reference if needed

### src/components/browse/PropertyListingCard.tsx
- Add `bed_config` to props interface
- Replace "N bed" display with formatted bed type breakdown
- Keep `BedDouble` icon or replace with appropriate icon

### src/components/browse/DestinationFilter.tsx
- Remove Miami from `DESTINATIONS` array (only Cabo + PV remain as filterable active destinations)

### src/components/GuestNav.tsx (if exists)
- Line 35: `Browse Hotels` → `Browse Whole-Tels&trade;`
- Line 31: `Whole-Tel` → `Whole-Tel&trade;` (nav brand)

### src/app/page.tsx (homepage)
- Line 29: `Whole-Tel` → `Whole-Tel&trade;` (footer brand)
- Line 36: `Browse Hotels` → `Browse Whole-Tels&trade;` (footer nav)

### src/app/(guest)/properties/page.tsx
- Metadata title: `'Browse Hotels'` → `'Browse Whole-Tels™'`
- Remove Miami from `VALID_DESTINATIONS`
- Line 48: h1 `Browse Hotels` → `Browse Whole-Tels™`
- Line 49: subtitle — remove "Miami" reference, update copy
- Lines 60, 66: "hotels" → "Whole-Tels"
- Select query: add `bed_config` to explicit column list

### src/app/(guest)/about/page.tsx
- Line 14: `About Whole-Tel` → `About Whole-Tel&trade;`
- Multiple paragraphs: Update to reflect Custom-Inclusive model, remove "all-inclusive hotels" framing
- Destinations section: Remove Miami listing or update to "Coming Soon"
- Line 81: "Browse our hand-picked hotels" → updated copy
- Line 84: `Browse Hotels` → `Browse Whole-Tels&trade;`
- Metadata description: update

### src/app/(guest)/bookings/page.tsx
- Line 211: `Browse Hotels` → `Browse Whole-Tels&trade;`

### src/app/layout.tsx
- Lines 17, 22: `All-Inclusive Group Hotels` → updated brand positioning
- Lines 20, 23: descriptions — update to remove "hotels" language

### src/lib/pricing.ts
- `PricingInput`: add `taxRate: number | null`
- `PricingBreakdown`: add `hotelTax: number`, `taxRate: number | null`
- `calculatePricing()`: add hotelTax calculation, update processingFee base, update total

### src/components/property/PricingWidget.tsx
- Add `taxRate: number | null` prop
- Add "Hotel Tax (X%)" line item in price breakdown display

### src/app/(guest)/properties/[propertyId]/page.tsx
- Add `tax_rate` to property SELECT
- Pass `taxRate` prop to PricingWidget

### src/lib/actions/bookings.ts
- Add `tax_rate` to property SELECT (line 42)
- Pass `taxRate` to `calculatePricing()`
- Add conditional Stripe line item for `hotelTax`

### src/lib/validations/property.ts
- Add `tax_rate` field to `PropertySchema` (nullable decimal, 0–1 range or percentage 0–100)

### src/components/dashboard/PropertyForm.tsx
- Add tax rate input field (optional, numeric, 0–100%)

---

## Code Examples

### Amenities Migration Structure

```sql
-- supabase/migrations/20260323000001_amenities_schema.sql

-- Amenities catalog table (schema + seed)
CREATE TABLE amenities (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL UNIQUE,
  category      text NOT NULL CHECK (category IN ('Water', 'Social', 'Work/Event', 'Culinary', 'Wellness')),
  icon_name     text NOT NULL,
  display_order int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE amenities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Amenities are publicly readable"
  ON amenities FOR SELECT TO anon, authenticated USING (true);

-- Property-amenity join table
CREATE TABLE property_amenities (
  property_id   uuid NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  amenity_id    uuid NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
  PRIMARY KEY (property_id, amenity_id)
);

ALTER TABLE property_amenities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Property amenities are publicly readable"
  ON property_amenities FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Owners can manage amenities for their properties"
  ON property_amenities FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM properties WHERE properties.id = property_id AND properties.owner_id = (SELECT auth.uid()))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM properties WHERE properties.id = property_id AND properties.owner_id = (SELECT auth.uid()))
  );

-- hotel tax column on properties
ALTER TABLE properties ADD COLUMN tax_rate numeric(5,4);
-- numeric(5,4) allows values like 0.1200 (12%), max 9.9999

-- Seed amenities
INSERT INTO amenities (name, category, icon_name, display_order) VALUES
  -- Water
  ('Pool', 'Water', 'Waves', 10),
  ('Infinity Pool', 'Water', 'Waves', 11),
  ('Hot Tub', 'Water', 'Thermometer', 12),
  ('Beach Access', 'Water', 'Sunset', 13),
  ('Waterfront', 'Water', 'Anchor', 14),
  ('Water Slides', 'Water', 'Zap', 15),
  ('Lazy River', 'Water', 'Waves', 16),
  -- Social
  ('Game Room', 'Social', 'Gamepad2', 20),
  ('Movie Theater', 'Social', 'Film', 21),
  ('Fire Pit', 'Social', 'Flame', 22),
  ('Outdoor Lounge', 'Social', 'Armchair', 23),
  ('Bar', 'Social', 'Wine', 24),
  ('Dance Floor', 'Social', 'Music', 25),
  ('DJ Booth', 'Social', 'Radio', 26),
  -- Work/Event
  ('Conference Room', 'Work/Event', 'Monitor', 30),
  ('Event Space', 'Work/Event', 'Building2', 31),
  ('Projector / AV', 'Work/Event', 'Projector', 32),
  ('High-Speed WiFi', 'Work/Event', 'Wifi', 33),
  ('Private Office', 'Work/Event', 'Briefcase', 34),
  -- Culinary
  ('Full Kitchen', 'Culinary', 'Utensils', 40),
  ('Gourmet Kitchen', 'Culinary', 'ChefHat', 41),
  ('BBQ Grill', 'Culinary', 'Flame', 42),
  ('Pizza Oven', 'Culinary', 'Pizza', 43),
  ('Wine Cellar', 'Culinary', 'Wine', 44),
  ('Outdoor Dining', 'Culinary', 'UtensilsCrossed', 45),
  -- Wellness
  ('Spa', 'Wellness', 'Sparkles', 50),
  ('Sauna', 'Wellness', 'Thermometer', 51),
  ('Gym', 'Wellness', 'Dumbbell', 52),
  ('Yoga Studio', 'Wellness', 'Activity', 53),
  ('Meditation Garden', 'Wellness', 'Leaf', 54),
  ('Steam Room', 'Wellness', 'Cloud', 55);
```

### Updated PricingInput and PricingBreakdown interfaces

```typescript
// Source: src/lib/pricing.ts — additions only

export interface PricingInput {
  nightlyRate: number
  cleaningFee: number
  nights: number
  guestCount: number
  guestThreshold: number | null
  perPersonRate: number | null
  taxRate: number | null  // NEW: decimal e.g. 0.12 for 12%
  selectedAddOns: { ... }[]
}

export interface PricingBreakdown {
  accommodationSubtotal: number
  perPersonSurcharge: number
  surchargeDetail: { extraGuests: number; ratePerNight: number } | null
  addOnItems: AddOnLineItem[]
  addOnsTotal: number
  cleaningFee: number
  hotelTax: number         // NEW: 0 if no taxRate
  taxRate: number | null   // NEW: pass-through for display label
  processingFee: number
  total: number
}
```

### Hotel Tax Line Item in PricingWidget

```tsx
{/* Source: PricingWidget.tsx — insert after cleaning fee line, before add-on lines */}
{breakdown.hotelTax > 0 && breakdown.taxRate != null && (
  <div className="flex justify-between text-sm">
    <span>Hotel Tax ({(breakdown.taxRate * 100).toFixed(0)}%)</span>
    <span>${breakdown.hotelTax.toLocaleString()}</span>
  </div>
)}
```

### Hotel Tax Stripe Line Item in bookings.ts

```typescript
// Source: bookings.ts — add to lineItems array after add-ons, before processing fee
...(breakdown.hotelTax > 0
  ? [
      {
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(breakdown.hotelTax * 100),
          product_data: {
            name: `Hotel Tax (${((breakdown.taxRate ?? 0) * 100).toFixed(0)}%)`,
          },
        },
        quantity: 1,
      },
    ]
  : []),
```

### Coming Soon Cards Pattern

```tsx
// Source: DestinationCards.tsx restructure
const comingSoonDestinations = [
  { name: 'Miami', tagline: 'Neon nights & beachfront beats', gradient: 'from-purple-500 to-blue-500' },
  { name: 'Palm Springs', tagline: 'Desert luxury & poolside living', gradient: 'from-orange-400 to-rose-400' },
  { name: 'Los Angeles', tagline: 'City escapes & rooftop everything', gradient: 'from-sky-500 to-indigo-500' },
  { name: 'Las Vegas', tagline: 'Bright lights, bigger crew', gradient: 'from-yellow-400 to-amber-600' },
]

// Coming Soon card (non-clickable)
<div
  key={name}
  className={`relative flex min-h-[200px] flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-6 opacity-75`}
>
  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
  <div className="absolute top-3 right-3 z-10">
    <Badge variant="secondary" className="bg-white/90 text-zinc-700 text-xs font-semibold">
      Coming Soon
    </Badge>
  </div>
  <div className="relative z-10">
    <h3 className="text-xl font-bold text-white">{name}</h3>
    <p className="mt-1 text-sm text-white/80">{tagline}</p>
  </div>
</div>
```

---

## Validation Architecture

### Test Framework

This project has no automated test files detected.

| Property | Value |
|----------|-------|
| Framework | None detected |
| Config file | None |
| Quick run command | None (build check: `npx next build --dry-run` or TypeScript check: `npx tsc --noEmit`) |
| Full suite command | `npx tsc --noEmit` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BRAND-01 | Hero headline + CTA text correct | manual-only | — | N/A |
| BRAND-02 | All "Whole-Tel" instances carry ™ | grep audit | `grep -r "Whole-Tel" src/ --include="*.tsx" \| grep -v "&trade;"` | N/A |
| BRAND-03 | BrandStory heading renamed | manual-only | — | N/A |
| BRAND-04 | 3-step section renders with correct icons | manual-only | — | N/A |
| BRAND-05 | FeaturedProperties heading + subtitle correct | manual-only | — | N/A |
| BRAND-06 | Coming Soon cards non-clickable; active destinations only Cabo + PV | manual-only | — | N/A |
| BRAND-07 | No "hotel" in non-contextual copy | grep audit | `grep -rn "Browse Hotels\|Featured Hotels" src/` | N/A |
| BRAND-08 | Bed config renders on cards | TypeScript build | `npx tsc --noEmit` | ❌ Wave 0 |
| AMEN-01 | amenities + property_amenities tables exist with RLS | manual DB check | Supabase Studio query | N/A |
| PAY-07 | hotelTax in breakdown; processingFee base includes tax | TypeScript build | `npx tsc --noEmit` | ❌ Wave 0 |
| PAY-09 | Per-person line shows on PricingWidget | manual-only | — | N/A |

### Sampling Rate
- **Per task commit:** `npx tsc --noEmit` (catches interface mismatches immediately)
- **Per wave merge:** `npx next build` (full build validation)
- **Phase gate:** Full build green + manual browser check of homepage + pricing widget before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] No test infrastructure — this project has no test framework. TypeScript strict mode and `next build` serve as the primary correctness checks.
- [ ] For PAY-07: after extending `PricingInput`, both `bookings.ts` and `PricingWidget.tsx` callers will generate TypeScript errors until updated — use this as the verification signal.

---

## Open Questions

1. **Tax rate storage: decimal (0.12) vs percentage (12)?**
   - What we know: CONTEXT.md says "percentage-based", PropertyForm would show "12" not "0.12" to owners
   - What's unclear: Should the DB column store the decimal or the percentage? The `calculatePricing()` function uses multiplication so decimal is more natural internally
   - Recommendation: Store as decimal in DB (`numeric(5,4)`, e.g. `0.1200`), display as percentage in UI by multiplying by 100. Label the form field "Hotel Tax Rate (%)" with a note "e.g. enter 12 for 12%", store as `formValue / 100`.

2. **PAY-09 scope: PricingWidget only, or booking confirmation page too?**
   - What we know: CONTEXT.md says "Show per-person cost on booking confirmation: total / guest_count" and "Simple display line: 'Per person: $X' beneath the total". PricingWidget.tsx already has `const perPerson = guestCount > 1 && nights > 0 ? breakdown.total / guestCount : null` and displays it (lines 249-254).
   - What's unclear: "booking confirmation" could mean (a) the PricingWidget booking review state, or (b) the success state on `/bookings` page. The existing PricingWidget code already shows per-person. The bookings page success banner (`success=true` query param) does NOT show per-person.
   - Recommendation: Verify the per-person display in PricingWidget is already working (it appears to be). The bookings list page may not show this. If "booking confirmation" means the post-payment bookings page, add per-person to BookingCard on the bookings list page.

3. **Where to add the TakeoverSteps section in page.tsx?**
   - What we know: CONTEXT.md says "New 3-step about section replacing or added near BrandStory"
   - What's unclear: Should it replace BrandStory entirely or be a separate section below it?
   - Recommendation: Keep BrandStory (renamed "The Whole-Tel™ Experience") as-is with updated copy, and add TakeoverSteps as a separate new section immediately below it. This preserves the 4 experience icons (BRAND-03) while adding the 3 takeover steps (BRAND-04).

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection — all findings from reading actual source files
  - `src/lib/pricing.ts` — full pricing module and interfaces
  - `src/components/landing/*.tsx` — all landing section components
  - `src/components/browse/PropertyListingCard.tsx` — bed display
  - `src/components/property/PricingWidget.tsx` — pricing display
  - `src/lib/actions/bookings.ts` — server-side pricing + Stripe
  - `supabase/migrations/` — all 6 migration files for schema patterns
  - `src/app/page.tsx`, `src/app/(guest)/properties/page.tsx`, `src/app/(guest)/about/page.tsx` — pages

### Secondary (MEDIUM confidence)
- CONTEXT.md decisions — directly from user discussion session

### Tertiary (LOW confidence)
- None — all findings are from direct code inspection

---

## Metadata

**Confidence breakdown:**
- Copy/branding changes: HIGH — all files identified, exact line numbers noted from direct inspection
- Bed config surfacing: HIGH — column confirmed in migration, display pattern clear
- Amenities schema: HIGH — established migration pattern followed exactly
- Hotel tax pricing: HIGH — pricing.ts fully read, all callers identified, math is straightforward
- Coming Soon cards: HIGH — DestinationCards.tsx fully read, restructure pattern clear

**Research date:** 2026-03-23
**Valid until:** Stable — this is all internal codebase knowledge, no external dependencies
