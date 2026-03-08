# Phase 9: Owner Property Tools - Research

**Researched:** 2026-03-08
**Domain:** Property configuration, tiered pricing, database schema extension
**Confidence:** HIGH

## Summary

This phase extends existing owner forms and guest-facing displays with four features: bed configuration (JSONB on properties), per-person property surcharge (two new columns on properties), experience tiered pricing (two new columns on add_ons), and a shared pricing module (`lib/pricing.ts`). All features follow established patterns -- `useActionState` forms, Zod validation, server actions with `requireOwner()`, and Supabase queries with RLS.

The critical deliverable is `lib/pricing.ts` -- a pure function module that both PricingWidget (client-side preview) and `createBookingAndCheckout` (server-side charge) consume. This eliminates the current price drift risk where pricing logic is duplicated between the two locations.

**Primary recommendation:** Build `lib/pricing.ts` first as the foundation, then extend the database schema, then update forms and displays. The pricing module is the single source of truth and every other change depends on or consumes it.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Property-wide bed counts (not per-room assignment) -- owner enters total counts per bed type
- 5 fixed bed types: King, Queen, Double, Twin, Bunk -- no custom types
- Keep the existing "Bedrooms" number field alongside the new bed config section
- Store as JSONB column (`bed_config`) on properties table, e.g., `{"king": 2, "queen": 1, "bunk": 1}`
- Add bed config inputs to PropertyForm -- one number input per bed type, defaulting to 0
- Per-person surcharge is optional -- owner can leave blank (no surcharge applied)
- Two new fields on properties table: `guest_threshold` (integer, nullable) and `per_person_rate` (numeric, nullable)
- Surcharge formula: (guests - threshold) x rate x nights
- Shows as separate line in PricingWidget breakdown: "Per-person surcharge (X guests above Y) -- $Z/night"
- Extend existing add-on model with optional tier fields (don't replace pricing_unit)
- Two new nullable fields on add_ons table: `included_guests` (integer) and `per_person_above` (numeric)
- When `included_guests` is set, `price` becomes the base price for up to X people, then `per_person_above` for each additional guest
- When `included_guests` is null, add-on behaves exactly as before (flat price with per_person/per_booking unit)
- Create `lib/pricing.ts` as single source of truth for all pricing calculations
- Used by PricingWidget (client-side preview) and booking Server Action (server-side charge)
- Handles: base nightly rate, per-person surcharge, experience tiers, cleaning fee, processing fee
- Keep location as curated dropdown (Cabo San Lucas, Puerto Vallarta, Miami)
- Street address remains optional (current behavior preserved)
- Address is visible on the public property listing page (not hidden until booking)

### Claude's Discretion
- Address field format (single text field vs structured) -- lean toward simplest approach
- Exact bed config UI layout within the PropertyForm (inline row, grid, etc.)
- AddOnForm UI layout for the new tier fields
- Experience pricing UX for the owner (how tier fields are labeled/grouped)
- How to handle the per-person surcharge input UX (two fields vs sentence builder)
- Migration naming and column constraints

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROP-09 | Owner can specify bed configuration (King, Queen, Double, Twin, Bunk with counts) | JSONB `bed_config` column on properties, PropertyForm extension with 5 number inputs, bed display on listing page |
| PROP-10 | Owner can enter location name and actual street address | Address field already exists on properties table and PropertyForm -- just ensure it shows on listing page (already does). No schema change needed. |
| PROP-11 | Owner can set additional per-person rate above a guest threshold | Two new nullable columns on properties (`guest_threshold`, `per_person_rate`), PropertyForm extension, PricingWidget surcharge line, pricing.ts calculation |
| EXP-01 | Owner can set tiered experience pricing (base price up to X people, $Y per person above X) | Two new nullable columns on add_ons (`included_guests`, `per_person_above`), AddOnForm extension, PricingWidget tier display, pricing.ts calculation |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16 | App Router, Server Actions, Server Components | Project framework |
| Supabase | Current | Database, RLS, auth | Project database layer |
| Zod | Current | Form validation schemas | Already used for PropertySchema, AddOnSchema |
| shadcn/ui | Current | Input, Label, Select components | Already used in all forms |
| Tailwind v4 | Current | Styling | Project CSS framework |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | Current | Icons (BedDouble, etc.) | Bed config display on listing page |

### Alternatives Considered
No new libraries needed. Everything is an extension of existing patterns.

## Architecture Patterns

### Recommended Project Structure
```
src/
  lib/
    pricing.ts          # NEW: Single source of truth for all pricing math
    validations/
      property.ts       # EXTEND: Add bed_config, guest_threshold, per_person_rate
      add-on.ts         # EXTEND: Add included_guests, per_person_above
    actions/
      properties.ts     # EXTEND: Parse new fields from FormData
      add-ons.ts        # EXTEND: Parse new tier fields from FormData
      bookings.ts       # REFACTOR: Replace inline math with pricing.ts
  components/
    dashboard/
      PropertyForm.tsx  # EXTEND: Add bed config section + surcharge fields
      AddOnForm.tsx     # EXTEND: Add tier pricing fields
    property/
      PricingWidget.tsx # REFACTOR: Use pricing.ts, add surcharge line + tier display
      AddOnCard.tsx     # EXTEND: Show tier info
  types/
    database.ts         # EXTEND: Add new fields to Property, AddOn interfaces
supabase/
  migrations/
    20260308000001_owner_property_tools.sql  # NEW: Schema additions
```

### Pattern 1: Shared Pricing Module (pricing.ts)
**What:** A pure function module with no framework dependencies. Takes property data, add-on data, guest count, and nights as input; returns a structured breakdown object.
**When to use:** Any time you need to calculate prices -- PricingWidget (client), bookings.ts (server), future invoice generation.
**Example:**
```typescript
// src/lib/pricing.ts

export interface PricingInput {
  nightlyRate: number
  cleaningFee: number
  nights: number
  guestCount: number
  guestThreshold: number | null
  perPersonRate: number | null
  selectedAddOns: {
    id: string
    name: string
    price: number
    pricingUnit: 'per_person' | 'per_booking'
    includedGuests: number | null
    perPersonAbove: number | null
  }[]
}

export interface PricingBreakdown {
  accommodationSubtotal: number  // nightlyRate * nights
  perPersonSurcharge: number     // (guests - threshold) * rate * nights, or 0
  surchargeDetail: { extraGuests: number; ratePerNight: number } | null
  addOnItems: {
    id: string
    name: string
    baseCost: number
    tierCost: number
    totalCost: number
    tierDetail: { includedGuests: number; extraGuests: number; perPersonRate: number } | null
  }[]
  addOnsTotal: number
  cleaningFee: number
  processingFee: number
  total: number
}

export function calculatePricing(input: PricingInput): PricingBreakdown {
  // Pure function -- no side effects, no async, no framework deps
  // Usable in both 'use client' and 'use server' contexts
}
```

### Pattern 2: JSONB Column with Typed Interface
**What:** Store bed config as JSONB with a TypeScript interface for type safety.
**When to use:** When data is always read/written as a unit and doesn't need relational queries.
**Example:**
```typescript
// Type for bed_config JSONB
export interface BedConfig {
  king: number
  queen: number
  double: number
  twin: number
  bunk: number
}

// Default empty config
export const DEFAULT_BED_CONFIG: BedConfig = {
  king: 0, queen: 0, double: 0, twin: 0, bunk: 0
}
```

### Pattern 3: Nullable Pair for Optional Feature
**What:** Two nullable columns that are logically paired -- both null (feature off) or both set (feature on).
**When to use:** Per-person surcharge (guest_threshold + per_person_rate), experience tiers (included_guests + per_person_above).
**Example:**
```sql
-- Both null = feature disabled, both set = feature enabled
-- CHECK constraint ensures consistency
ALTER TABLE properties
  ADD COLUMN guest_threshold integer,
  ADD COLUMN per_person_rate numeric(10,2),
  ADD CONSTRAINT check_surcharge_pair
    CHECK (
      (guest_threshold IS NULL AND per_person_rate IS NULL)
      OR (guest_threshold IS NOT NULL AND per_person_rate IS NOT NULL)
    );
```

### Pattern 4: FormData Parsing for JSONB Fields
**What:** Bed config has 5 separate number inputs in the form but gets stored as one JSONB column.
**When to use:** When form inputs map to a single DB column.
**Example:**
```typescript
// In server action, parse individual form fields into JSONB
const bedConfig = {
  king: Number(formData.get('bed_king')) || 0,
  queen: Number(formData.get('bed_queen')) || 0,
  double: Number(formData.get('bed_double')) || 0,
  twin: Number(formData.get('bed_twin')) || 0,
  bunk: Number(formData.get('bed_bunk')) || 0,
}
```

### Anti-Patterns to Avoid
- **Duplicating pricing logic:** The current codebase has pricing math in both PricingWidget.tsx (lines 50-63) and bookings.ts (lines 78-90). This phase MUST consolidate into pricing.ts. Do NOT add surcharge/tier math to both files independently.
- **Trusting client prices:** Per CLAUDE.md security rules, `createBookingAndCheckout` must always fetch prices server-side. The shared pricing.ts module is used for calculation, but inputs come from DB on the server side.
- **Separate bed config table:** User explicitly chose JSONB over a separate table. Don't create a `property_beds` table.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Number formatting | Custom formatCurrency | `toLocaleString()` | Already used throughout codebase; FIX-02 already fixed the divide-by-100 bug |
| Form state management | Custom useState forms | `useActionState` + Server Actions | Established project pattern |
| Validation | Manual checks | Zod schemas | Already used for PropertySchema, AddOnSchema |

**Key insight:** This phase is purely extending existing patterns. No new libraries, no new architectural patterns. The only new concept is the shared pricing module, and that's just extracting duplicated logic into a pure function.

## Common Pitfalls

### Pitfall 1: Price Drift Between Client and Server
**What goes wrong:** PricingWidget shows one total, but createBookingAndCheckout charges a different amount because the surcharge/tier math is implemented slightly differently.
**Why it happens:** Copy-paste of pricing logic with small differences (rounding, order of operations).
**How to avoid:** Create `pricing.ts` FIRST. Import it in both PricingWidget and bookings.ts. Never inline pricing math.
**Warning signs:** Different total shown vs charged; rounding errors in processing fee.

### Pitfall 2: Nullable Column Pair Inconsistency
**What goes wrong:** Owner sets guest_threshold but not per_person_rate (or vice versa), causing divide-by-zero or undefined behavior in pricing calculations.
**Why it happens:** Form allows submitting one field without the other.
**How to avoid:** Database CHECK constraint enforcing both-null-or-both-set. Zod validation with `.refine()` to catch at form level. Pricing function checks both before calculating.
**Warning signs:** NaN in pricing breakdown; null pointer errors.

### Pitfall 3: Breaking Existing Add-On Behavior
**What goes wrong:** Adding tier fields breaks the existing per_person/per_booking pricing for add-ons that don't use tiers.
**Why it happens:** Code path doesn't check `included_guests IS NULL` before applying tier logic.
**How to avoid:** Pricing function explicitly checks: if `includedGuests` is null, fall through to existing per_person/per_booking logic. Tier pricing only activates when `included_guests` is set.
**Warning signs:** Existing add-on prices change after migration.

### Pitfall 4: FormData Coercion for Nullable Numbers
**What goes wrong:** Empty number inputs get coerced to 0 instead of null, accidentally enabling surcharge/tier with a $0 rate.
**Why it happens:** `Number('')` returns 0, not null. Zod `z.coerce.number()` does the same.
**How to avoid:** Use `.transform()` to convert empty string / 0 to null for optional numeric fields. Or use `.optional().nullable()` with custom preprocessing.
**Warning signs:** Properties showing $0 surcharge lines; experiences showing "$0/person above X".

### Pitfall 5: Migration Applied Without Updating Select Queries
**What goes wrong:** New columns exist in DB but aren't included in `.select()` calls, so data is never fetched.
**Why it happens:** Multiple files query the same table with different column lists.
**How to avoid:** Audit every `.from('properties').select(...)` and `.from('add_ons').select(...)` call. Add new columns to each.
**Warning signs:** Form shows default/empty values even after saving; null values in pricing calculations.

## Code Examples

### Migration SQL
```sql
-- 20260308000001_owner_property_tools.sql

-- Bed configuration (JSONB, defaults to empty config)
ALTER TABLE properties
  ADD COLUMN bed_config jsonb NOT NULL DEFAULT '{"king":0,"queen":0,"double":0,"twin":0,"bunk":0}';

-- Per-person surcharge (nullable pair)
ALTER TABLE properties
  ADD COLUMN guest_threshold integer,
  ADD COLUMN per_person_rate numeric(10,2);

ALTER TABLE properties
  ADD CONSTRAINT check_surcharge_pair
    CHECK (
      (guest_threshold IS NULL AND per_person_rate IS NULL)
      OR (guest_threshold IS NOT NULL AND per_person_rate IS NOT NULL)
    );

ALTER TABLE properties
  ADD CONSTRAINT check_guest_threshold_positive
    CHECK (guest_threshold IS NULL OR guest_threshold > 0);

ALTER TABLE properties
  ADD CONSTRAINT check_per_person_rate_positive
    CHECK (per_person_rate IS NULL OR per_person_rate > 0);

-- Experience tiered pricing (nullable pair)
ALTER TABLE add_ons
  ADD COLUMN included_guests integer,
  ADD COLUMN per_person_above numeric(10,2);

ALTER TABLE add_ons
  ADD CONSTRAINT check_tier_pair
    CHECK (
      (included_guests IS NULL AND per_person_above IS NULL)
      OR (included_guests IS NOT NULL AND per_person_above IS NOT NULL)
    );

ALTER TABLE add_ons
  ADD CONSTRAINT check_included_guests_positive
    CHECK (included_guests IS NULL OR included_guests > 0);

ALTER TABLE add_ons
  ADD CONSTRAINT check_per_person_above_positive
    CHECK (per_person_above IS NULL OR per_person_above >= 0);
```

### Zod Schema Extension for PropertySchema
```typescript
// Extended PropertySchema with new fields
export const PropertySchema = z.object({
  // ... existing fields ...
  bed_king: z.coerce.number().int().min(0).default(0),
  bed_queen: z.coerce.number().int().min(0).default(0),
  bed_double: z.coerce.number().int().min(0).default(0),
  bed_twin: z.coerce.number().int().min(0).default(0),
  bed_bunk: z.coerce.number().int().min(0).default(0),
  guest_threshold: z.preprocess(
    (val) => (val === '' || val === undefined ? null : val),
    z.coerce.number().int().positive().nullable()
  ),
  per_person_rate: z.preprocess(
    (val) => (val === '' || val === undefined ? null : val),
    z.coerce.number().positive().nullable()
  ),
}).refine(
  (data) =>
    (data.guest_threshold === null) === (data.per_person_rate === null),
  { message: 'Both guest threshold and per-person rate must be set together', path: ['guest_threshold'] }
)
```

### Bed Config Display on Listing Page
```typescript
// Bed icon row for property listing
const BED_LABELS: Record<string, string> = {
  king: 'King', queen: 'Queen', double: 'Double', twin: 'Twin', bunk: 'Bunk'
}

function BedConfigDisplay({ bedConfig }: { bedConfig: BedConfig }) {
  const beds = Object.entries(bedConfig).filter(([, count]) => count > 0)
  if (beds.length === 0) return null
  return (
    <div className="flex items-center gap-3 flex-wrap text-sm">
      {beds.map(([type, count]) => (
        <span key={type} className="flex items-center gap-1">
          <BedDouble className="h-4 w-4 text-brand-teal" />
          {count} {BED_LABELS[type]}
        </span>
      ))}
    </div>
  )
}
```

### Experience Tier Display in PricingWidget Toggle
```typescript
// Enhanced add-on toggle showing tier info
const tierLabel = addOn.includedGuests
  ? `$${addOn.price.toLocaleString()} (up to ${addOn.includedGuests} people, $${addOn.perPersonAbove}/person above)`
  : addOn.pricingUnit === 'per_person'
    ? `$${addOn.price.toLocaleString()}/person`
    : `$${addOn.price.toLocaleString()}/booking`
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline pricing math in two files | Shared pricing.ts module | This phase | Eliminates price drift risk |
| Simple flat add-on pricing | Optional tiered pricing with backward compatibility | This phase | Supports experiences like "chef dinner for 10, $50/extra" |
| Bedroom count only | Bedroom count + bed config detail | This phase | Guests see exactly what beds are available |

## Files Requiring Modification

This is the complete list of files that need changes, derived from code inspection:

### New Files
1. `src/lib/pricing.ts` -- Shared pricing calculation module
2. `supabase/migrations/20260308000001_owner_property_tools.sql` -- Schema migration

### Modified Files
3. `src/types/database.ts` -- Add `bed_config`, `guest_threshold`, `per_person_rate` to Property; add `included_guests`, `per_person_above` to AddOn
4. `src/lib/validations/property.ts` -- Add bed config fields, surcharge fields with refine
5. `src/lib/validations/add-on.ts` -- Add `included_guests`, `per_person_above` with refine
6. `src/lib/actions/properties.ts` -- Parse bed config from FormData into JSONB, pass surcharge fields
7. `src/lib/actions/add-ons.ts` -- Pass tier fields through to Supabase
8. `src/lib/actions/bookings.ts` -- Replace inline pricing with `calculatePricing()`, fetch new columns
9. `src/components/dashboard/PropertyForm.tsx` -- Add bed config section, surcharge fields, update interface
10. `src/components/dashboard/AddOnForm.tsx` -- Add tier pricing fields, update interface
11. `src/components/property/PricingWidget.tsx` -- Use `calculatePricing()`, add surcharge line, update tier display, update interfaces
12. `src/components/property/AddOnCard.tsx` -- Show tier info when available
13. `src/app/(guest)/properties/[propertyId]/page.tsx` -- Add bed config display, pass new fields to PricingWidget
14. `src/app/(owner)/dashboard/properties/[propertyId]/page.tsx` -- Display bed config and surcharge in detail view
15. `src/app/(owner)/dashboard/properties/[propertyId]/edit/page.tsx` -- Fetch and pass new fields to PropertyForm

### Select Query Audit
These `.select()` calls must be updated to include new columns:

| File | Table | Add Columns |
|------|-------|-------------|
| `bookings.ts` line 40 | properties | `guest_threshold, per_person_rate` |
| `bookings.ts` line 62 | add_ons | `included_guests, per_person_above` |
| Property listing page line 47 | properties (via `*`) | Already covered by `*` |
| Property listing page line 47 | add_ons | `included_guests, per_person_above` |
| Owner detail page line 28 | add_ons | `included_guests, per_person_above` |
| Edit page line 21 | properties | `bed_config, guest_threshold, per_person_rate` |

## Open Questions

1. **Processing fee on surcharge**
   - What we know: Current processing fee = (subtotal + addOnsTotal) * 0.029 + 0.30
   - What's unclear: Should per-person surcharge be included in the processing fee base? Almost certainly yes (it's part of the charge).
   - Recommendation: Include surcharge in processing fee base amount. This matches how Stripe works -- fee is on total charge.

2. **Surcharge threshold vs max_guests validation**
   - What we know: `guest_threshold` should logically be <= `max_guests`
   - What's unclear: Should we enforce this with a DB constraint or just Zod validation?
   - Recommendation: Zod validation only. The constraint is business logic, not data integrity. Owner might change max_guests later.

## Sources

### Primary (HIGH confidence)
- Codebase inspection: All source files listed above read directly
- Supabase schema: `20260302000001_schema_rls.sql` -- full current schema
- CONTEXT.md: User decisions locked and verified against codebase

### Secondary (MEDIUM confidence)
- PostgreSQL CHECK constraints for nullable pairs -- standard pattern, well-documented

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries, pure extension of existing patterns
- Architecture: HIGH - pricing.ts pattern is standard; all other changes follow established form/action patterns
- Pitfalls: HIGH - Derived from direct code inspection of the two pricing implementations that currently diverge

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (stable -- no external dependency changes)
