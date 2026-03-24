# Phase 15: Amenities Owner UI & Guest Display - Research

**Researched:** 2026-03-24
**Domain:** Supabase join table reads/writes, shadcn/ui checkbox patterns, Radix Dialog, Lucide icon dynamic lookup, Next.js Server Component data fetching
**Confidence:** HIGH

---

## Summary

Phase 15 replaces the legacy freetext amenity system with the structured join table introduced in Phase 12 (AMEN-01). The amenities catalog (`amenities` table, 30 rows, 5 categories) and the `property_amenities` join table are already in the database with correct RLS. The only work is UI and data-flow: replace checkbox freetext in `PropertyForm`, replace `AmenityList` string-array rendering with structured ID-based rendering, and surface key amenity badges on `PropertyListingCard`.

The core technical pattern is a **replace-and-sync** on save: when the owner saves amenities, delete all existing `property_amenities` rows for that property and insert the newly selected set. This is simpler than a diff-and-patch approach and is safe because the operation happens server-side inside a Server Action with `requireOwner()` + RLS double protection. The "See all" modal on the property detail page requires a Dialog component from Radix UI, which is available via `radix-ui` package (already installed) but has not yet been added as a shadcn component — it must be scaffolded.

The existing `properties.amenities` JSONB column is still present in the schema and must be left in place (no DROP COLUMN) to avoid a migration. The column can remain populated with stale data; the guest display will now query `property_amenities` instead. The `PropertyForm` action currently writes to `properties.amenities` — that write can simply be removed (set to empty array or omit the field) while the new Server Action writes to `property_amenities`.

**Primary recommendation:** Build a dedicated `AmenitiesEditor` Client Component for the owner form (fetches catalog on mount, manages checkbox state, saves via a separate Server Action), a rewritten `AmenityList` that accepts structured rows, and a new `AmenitiesModal` using a scaffolded shadcn Dialog for the "See all" UX. Keep property cards simple: extend the Supabase select query to include `property_amenities(amenity_id, amenities(name, icon_name))` and render a 3-item badge row.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AMEN-02 | Owner can select/deselect amenities for their property via checkbox grid grouped by category | Catalog fetched from `amenities` table (public read, no auth required); owner writes via `upsertPropertyAmenities` Server Action (requireOwner + RLS); PropertyForm extended with AmenitiesEditor Client Component |
| AMEN-03 | Guest-facing amenity display on property detail page with top amenities inline and "See all" modal | Property detail page fetches `property_amenities` via join; top N shown inline in rewritten AmenityList; Dialog component (Radix via radix-ui package) for full categorized modal |
| AMEN-04 | Property cards show key amenities (pool, hot tub, etc.) sourced from structured amenity IDs | Browse page query extended with nested select on property_amenities; PropertyListingCard receives structured amenity rows; renders icon + name badges for priority items |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `radix-ui` | ^1.4.3 (installed) | Dialog primitive for "See all" modal | Already installed; this project uses `radix-ui` unified package (see alert-dialog.tsx import pattern) |
| `lucide-react` | ^0.576.0 (installed) | Icons for amenity display (icon_name maps to Lucide component names) | Project standard; already used in AmenityList.tsx |
| `@supabase/ssr` | ^0.9.0 (installed) | Server-side Supabase client for Server Actions | Project standard |
| `zod` | ^4.3.6 (installed) | Input validation in Server Action | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | ^4.0.18 (devDep) | Unit testing utility functions | If any amenity helper functions warrant unit tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Delete-and-reinsert on save | Diff patch (DELETE removed, INSERT new) | Diff is more complex, not needed at 30-row scale |
| Radix Dialog | Browser `<dialog>` element | Radix provides accessible focus trap, animations, Portal — needed for production quality |
| Dynamic Lucide import | Static icon map | Dynamic import from lucide-react is unreliable (tree-shaking); static map with `as LucideIcon` cast is the established pattern already used in AmenityList.tsx |

**Installation:**
```bash
# Dialog component — scaffold via shadcn CLI (adds src/components/ui/dialog.tsx)
npx shadcn add dialog
# Checkbox component — scaffold via shadcn CLI (adds src/components/ui/checkbox.tsx)
npx shadcn add checkbox
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── dashboard/
│   │   ├── AmenitiesEditor.tsx      # 'use client' — checkbox grid, saves via Server Action
│   │   └── PropertyForm.tsx         # existing — remove AMENITY_OPTIONS, add AmenitiesEditor
│   ├── property/
│   │   ├── AmenityList.tsx          # rewrite — accepts structured rows, shows top N + "See all"
│   │   └── AmenitiesModal.tsx       # new — 'use client' Dialog with full categorized list
│   └── browse/
│       └── PropertyListingCard.tsx  # extend — render amenity badge row
├── lib/
│   └── actions/
│       └── amenities.ts             # new Server Action — upsertPropertyAmenities
└── types/
    └── database.ts                  # add Amenity and PropertyAmenity interfaces
```

### Pattern 1: Fetching the Amenities Catalog (Server Component)

**What:** Owner edit page fetches the full catalog and current selections server-side, passes both as props to `AmenitiesEditor`.

**When to use:** Edit property page — catalog is public-read, no auth overhead.

```typescript
// In /dashboard/properties/[propertyId]/edit/page.tsx
const [catalogResult, selectedResult] = await Promise.all([
  supabase.from('amenities').select('id, name, category, icon_name, display_order').order('display_order'),
  supabase.from('property_amenities').select('amenity_id').eq('property_id', propertyId),
])
const catalog = catalogResult.data ?? []
const selectedIds = (selectedResult.data ?? []).map((r) => r.amenity_id)
// Pass to <AmenitiesEditor catalog={catalog} selectedIds={selectedIds} propertyId={propertyId} />
```

**Confidence:** HIGH — follows existing pattern used for add-ons and photos on the same page.

### Pattern 2: AmenitiesEditor Client Component

**What:** Checkbox grid grouped by category. User checks/unchecks; on a dedicated "Save Amenities" button (or parent form submit), calls a Server Action with the full selected ID array.

**When to use:** Owner dashboard only.

```typescript
// src/components/dashboard/AmenitiesEditor.tsx
'use client'

import { useTransition, useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { upsertPropertyAmenities } from '@/lib/actions/amenities'

const CATEGORIES = ['Water', 'Social', 'Work/Event', 'Culinary', 'Wellness'] as const

interface AmenityCatalogRow {
  id: string
  name: string
  category: string
  icon_name: string
  display_order: number
}

interface AmenitiesEditorProps {
  catalog: AmenityCatalogRow[]
  selectedIds: string[]
  propertyId: string
}

export function AmenitiesEditor({ catalog, selectedIds: initial, propertyId }: AmenitiesEditorProps) {
  const [selected, setSelected] = useState<Set<string>>(new Set(initial))
  const [isPending, startTransition] = useTransition()

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function handleSave() {
    startTransition(async () => {
      await upsertPropertyAmenities(propertyId, [...selected])
    })
  }

  return (
    <div className="space-y-4">
      {CATEGORIES.map((cat) => {
        const items = catalog.filter((a) => a.category === cat)
        if (!items.length) return null
        return (
          <div key={cat}>
            <h4 className="text-sm font-medium text-muted-foreground mb-2">{cat}</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {items.map((amenity) => (
                <label key={amenity.id} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={selected.has(amenity.id)}
                    onCheckedChange={() => toggle(amenity.id)}
                  />
                  {amenity.name}
                </label>
              ))}
            </div>
          </div>
        )
      })}
      <button onClick={handleSave} disabled={isPending} className="...">
        {isPending ? 'Saving...' : 'Save Amenities'}
      </button>
    </div>
  )
}
```

**Confidence:** HIGH — mirrors ApplicationForm.tsx step pattern; useState + useTransition is standard for non-form-action mutations in this codebase.

### Pattern 3: Server Action — upsertPropertyAmenities

**What:** Delete all existing rows for the property, then bulk insert selected amenity IDs. Wrapped in `requireOwner()` + propertyId ownership check.

```typescript
// src/lib/actions/amenities.ts
'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireOwner } from '@/lib/dal'

export async function upsertPropertyAmenities(
  propertyId: string,
  amenityIds: string[]
): Promise<{ error?: string }> {
  const user = await requireOwner()
  const supabase = await createClient()

  // Verify property ownership (defense-in-depth; RLS also enforces this)
  const { data: property } = await supabase
    .from('properties')
    .select('id')
    .eq('id', propertyId)
    .eq('owner_id', user.id)
    .single()

  if (!property) return { error: 'Property not found or access denied' }

  // Delete existing selections
  const { error: deleteError } = await supabase
    .from('property_amenities')
    .delete()
    .eq('property_id', propertyId)

  if (deleteError) return { error: deleteError.message }

  // Insert new selections (empty array = no inserts = all deselected)
  if (amenityIds.length > 0) {
    const { error: insertError } = await supabase
      .from('property_amenities')
      .insert(amenityIds.map((amenity_id) => ({ property_id: propertyId, amenity_id })))

    if (insertError) return { error: insertError.message }
  }

  revalidatePath(`/dashboard/properties/${propertyId}`)
  revalidatePath(`/properties/${propertyId}`)
  return {}
}
```

**Confidence:** HIGH — delete-then-insert is idiomatic for small join tables; RLS enforces `owner_id` match at DB layer as backup.

### Pattern 4: Property Detail Page — Structured Amenity Data

**What:** Add a nested select for `property_amenities` when fetching the property. Pass structured rows to the rewritten `AmenityList`.

```typescript
// In /properties/[propertyId]/page.tsx — extend the existing select string:
supabase
  .from('properties')
  .select(
    `*, tax_rate,
     property_photos(id, storage_path, display_order, section),
     add_ons(id, name, description, price, pricing_unit, included_guests, per_person_above, photo_url),
     property_amenities(amenity_id, amenities(id, name, category, icon_name, display_order))`
  )
  .eq('id', propertyId)
  .single()
```

**Confidence:** HIGH — Supabase supports nested selects on FK relationships; this is the same pattern used for `add_ons`.

### Pattern 5: Rewritten AmenityList + AmenitiesModal

**What:** `AmenityList` becomes a Server Component that shows a 2-column grid of top amenities (up to 8) plus a "See all X amenities" button. The button opens `AmenitiesModal` (Client Component, uses Dialog).

```typescript
// src/components/property/AmenityList.tsx — Server Component
import * as LucideIcons from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AmenitiesModal } from './AmenitiesModal'

// Known-safe icon map (avoids dynamic import tree-shaking issues)
const ICON_MAP: Record<string, LucideIcon> = {
  Waves: LucideIcons.Waves,
  Thermometer: LucideIcons.Thermometer,
  // ... all icon_name values from seed data
}

interface AmenityRow {
  amenity_id: string
  amenities: { id: string; name: string; category: string; icon_name: string; display_order: number }
}

export function AmenityList({ amenityRows }: { amenityRows: AmenityRow[] }) {
  const TOP_N = 8
  const sorted = [...amenityRows].sort(
    (a, b) => a.amenities.display_order - b.amenities.display_order
  )
  const topItems = sorted.slice(0, TOP_N)

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {topItems.map(({ amenity_id, amenities: a }) => {
          const Icon = ICON_MAP[a.icon_name] ?? LucideIcons.Check
          return (
            <div key={amenity_id} className="flex items-center gap-2">
              <Icon className="h-5 w-5 text-brand-teal shrink-0" />
              <span className="text-sm">{a.name}</span>
            </div>
          )
        })}
      </div>
      {amenityRows.length > TOP_N && (
        <AmenitiesModal amenityRows={sorted} totalCount={amenityRows.length} />
      )}
    </div>
  )
}
```

**Confidence:** HIGH — static icon map is the same pattern used in existing AmenityList.tsx; avoids dynamic import pitfalls.

### Pattern 6: PropertyListingCard — Amenity Badges

**What:** Browse page query includes `property_amenities(amenity_id, amenities(name, icon_name))`. Card renders a compact badge row for priority amenities (pool, hot tub, rooftop, etc.).

```typescript
// In /properties/page.tsx — extend select:
'id, name, location, bedrooms, bathrooms, max_guests, nightly_rate, bed_config,
 property_photos(id, storage_path, display_order),
 property_amenities(amenity_id, amenities(name, icon_name))'

// In PropertyListingCard — after existing stats row:
const HIGHLIGHT_NAMES = ['Private Pool', 'Infinity Pool', 'Hot Tub', 'Rooftop Terrace', 'Private Beach', 'Jacuzzi']
const highlights = property.property_amenities
  ?.filter((pa) => HIGHLIGHT_NAMES.includes(pa.amenities.name))
  .slice(0, 3) ?? []
```

**Confidence:** HIGH — extends existing pattern; filtering by `name` (not ID) is safe because names have a UNIQUE constraint in the amenities table.

### Anti-Patterns to Avoid

- **Writing amenities through the PropertyForm action:** The existing `createProperty`/`updateProperty` actions write to `properties.amenities` (JSONB). Do NOT route new amenity IDs through those actions. Instead, `AmenitiesEditor` uses its own dedicated Server Action. This keeps the old form action untouched (less blast radius) and separates concerns cleanly.
- **Dynamic Lucide imports:** `import(lucide-react)[iconName]` is not reliable with Next.js tree-shaking. Always use a static `Record<string, LucideIcon>` map.
- **Storing amenity IDs in the `properties.amenities` JSONB column:** Leave that column alone. All new reads/writes go through `property_amenities`.
- **Re-fetching catalog in AmenitiesEditor via useEffect:** Fetch catalog server-side in the page component and pass as props. Avoids client-side loading states and extra round trips.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accessible modal/dialog | Custom overlay + focus trap | shadcn Dialog (Radix `Dialog` primitive via `radix-ui`) | Focus trap, Escape key, Portal, animations — 100+ accessibility edge cases |
| Checkbox component | `<input type="checkbox">` styled manually | shadcn Checkbox (Radix `Checkbox` primitive) | Consistent with rest of form UI; handles indeterminate state, keyboard nav |
| Bulk upsert of join rows | Custom diff algorithm | Delete-then-insert pattern | At 30 amenities max, atomic delete+insert is simpler and equally correct |

**Key insight:** The modal and checkbox UX problems are fully solved by Radix primitives already available in the `radix-ui` package. The only gap is the shadcn wrapper components, which require a one-line `npx shadcn add` command.

---

## Common Pitfalls

### Pitfall 1: `radix-ui` import path differs from `@radix-ui/*` pattern
**What goes wrong:** Developer imports `import { Dialog } from '@radix-ui/react-dialog'` — this package is NOT installed. The project uses the unified `radix-ui` barrel package.
**Why it happens:** Most shadcn docs show `@radix-ui/react-*` imports; this project uses `radix-ui` unified package (confirmed in alert-dialog.tsx: `import { AlertDialog as AlertDialogPrimitive } from "radix-ui"`).
**How to avoid:** Use `npx shadcn add dialog` which auto-generates the correct wrapper using whatever Radix import the project resolves. Check `alert-dialog.tsx` as the reference import pattern.
**Warning signs:** TypeScript error `Cannot find module '@radix-ui/react-dialog'`.

### Pitfall 2: Supabase nested select returns null for properties with no amenities
**What goes wrong:** `property.property_amenities` is `null` instead of `[]` when a property has no amenity selections, causing `.map()` to throw.
**Why it happens:** Supabase returns `null` for empty one-to-many results in some query shapes.
**How to avoid:** Always default: `const amenityRows = property.property_amenities ?? []`.
**Warning signs:** Runtime error "Cannot read property 'map' of null".

### Pitfall 3: PropertyForm action still writing stale amenities to JSONB column
**What goes wrong:** Owner saves the property form; the `createProperty`/`updateProperty` action writes `amenities: []` (empty, since `AmenitiesEditor` is now separate), wiping any JSONB data. Guest page reads from JSONB and shows nothing.
**Why it happens:** The property detail page currently reads `property.amenities` (JSONB) — line 93 of the page file.
**How to avoid:** In Phase 15, update the property detail page to read from `property_amenities` (join) instead of `property.amenities` (JSONB). The JSONB column can be left in the DB schema but should stop being read for display.
**Warning signs:** Amenities disappear from guest view after owner saves other property fields.

### Pitfall 4: New property creation path lacks AmenitiesEditor
**What goes wrong:** Owner creates a new property; no property ID exists yet, so `AmenitiesEditor` (which needs `propertyId`) can't save amenities at creation time.
**Why it happens:** Join table writes require a property ID.
**How to avoid:** On the "New Property" form (`/dashboard/properties/new`), omit `AmenitiesEditor` entirely. Instead, redirect to the edit page after creation (`updateProperty` already does `redirect` to `/dashboard/properties/${propertyId}`) where `AmenitiesEditor` is present. Add a banner/note: "Save your property first, then select amenities."
**Warning signs:** `AmenitiesEditor` receives an empty string `propertyId`.

### Pitfall 5: Icon map coverage gaps
**What goes wrong:** A new amenity's `icon_name` value isn't in the static `ICON_MAP` — renders a fallback `Check` icon silently.
**Why it happens:** The seed data has 30 amenities with specific Lucide icon names; if any name is misspelled or a future seed row uses a new name, the map misses it.
**How to avoid:** Build the `ICON_MAP` with all 16 unique icon names from the seed data (`Waves`, `Thermometer`, `Sunset`, `Anchor`, `Wind`, `Droplets`, `Building2`, `Gamepad2`, `Tv`, `Music`, `Wine`, `Flame`, `Circle`, `Wifi`, `Monitor`, `Users`, `Presentation2`, `UtensilsCrossed`, `ChefHat`, `Utensils`, `GlassWater`, `Dumbbell`, `Leaf`, `Heart`, `CloudFog`, `Flower2`). Use `LucideIcons.Check` as safe fallback.
**Warning signs:** Amenity icon shows a generic check mark instead of the expected icon.

---

## Code Examples

Verified patterns from codebase analysis:

### Radix import pattern (from alert-dialog.tsx)
```typescript
// Source: /src/components/ui/alert-dialog.tsx
import { AlertDialog as AlertDialogPrimitive } from "radix-ui"
// Dialog will follow same pattern after `npx shadcn add dialog`:
import { Dialog as DialogPrimitive } from "radix-ui"
```

### Supabase nested select — existing pattern (from add_ons usage)
```typescript
// Source: /src/app/(guest)/properties/[propertyId]/page.tsx line 58
supabase
  .from('properties')
  .select(
    `*, tax_rate, property_photos(id, storage_path, display_order, section),
     add_ons(id, name, description, price, pricing_unit, included_guests, per_person_above, photo_url)`
  )
  .eq('id', propertyId)
  .single()
// Same nested select pattern works for property_amenities(amenity_id, amenities(name, category, icon_name, display_order))
```

### useTransition + Server Action pattern (from ApplicationActions.tsx)
```typescript
// Source: pattern from /src/components/applications/ApplicationActions.tsx
const [isPending, startTransition] = useTransition()
function handleSave() {
  startTransition(async () => {
    const result = await upsertPropertyAmenities(propertyId, [...selected])
    if (result.error) setError(result.error)
  })
}
```

### requireOwner + ownership check (from properties.ts)
```typescript
// Source: /src/lib/actions/properties.ts lines 17, 86-90
const user = await requireOwner()
// ...
supabase.from('properties').update(...).eq('id', propertyId).eq('owner_id', user.id)
```

### Full Lucide icon name set from amenities seed
All 26 unique `icon_name` values from `20260323000001_amenities_schema.sql`:
`Waves`, `Thermometer`, `Sunset`, `Anchor`, `Wind`, `Droplets`, `Building2`, `Gamepad2`, `Tv`, `Music`, `Wine`, `Flame`, `Circle`, `Wifi`, `Monitor`, `Users`, `Presentation2`, `UtensilsCrossed`, `ChefHat`, `Utensils`, `GlassWater`, `Dumbbell`, `Leaf`, `Heart`, `CloudFog`, `Flower2`

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `properties.amenities` JSONB string array | `property_amenities` join table + `amenities` catalog | Phase 12 (AMEN-01) | Enables filtering, structured display, icon mapping |
| Hardcoded 12-option `AMENITY_OPTIONS` in PropertyForm | 30-amenity catalog from DB grouped into 5 categories | Phase 15 | Owners see the full curated set |
| `AmenityList` string-based icon lookup | Structured icon_name from DB row | Phase 15 | No more fuzzy string matching |

**Deprecated/outdated after Phase 15:**
- `AMENITY_OPTIONS` constant in `PropertyForm.tsx`: remove entirely
- `AMENITY_ICONS` constant in `AmenityList.tsx`: replace with static map keyed by Lucide name
- Line 93 in property detail page: `const amenities = Array.isArray(property.amenities)` — replace with `property_amenities` join data
- `initialData.amenities?: string[]` in `PropertyFormProps` — remove or leave unused; AmenitiesEditor is separate

---

## Open Questions

1. **AmenitiesEditor save trigger — separate button or integrated with parent form save?**
   - What we know: Current PropertyForm uses `useActionState` with a single form submit. AmenitiesEditor mutations go to a different table via a different action.
   - What's unclear: Whether owners expect one unified "Save" button or separate amenity saving.
   - Recommendation: Use a separate "Save Amenities" button within AmenitiesEditor to keep actions independent and avoid a multi-step form coordination problem. Add visual confirmation ("Saved" toast or inline status). This is lower complexity and aligns with the "Simplicity First" CLAUDE.md principle.

2. **How many amenities to show inline on property detail before "See all"?**
   - What we know: Airbnb shows ~10 inline with a "Show all X amenities" CTA. The requirement says "top amenities inline."
   - What's unclear: Exact number is unspecified.
   - Recommendation: Show 8 (two rows of 4 on desktop). Adjust based on design review.

3. **Property card amenity badge limit**
   - What we know: AMEN-04 says "key amenities (pool, hot tub, etc.)" — a curated subset.
   - Recommendation: Filter by `HIGHLIGHT_NAMES` list (pool/hot tub/beach/rooftop), show max 3, skip the row entirely if no highlights. Avoids cluttering cards with obscure amenities.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest ^4.0.18 |
| Config file | none — runs via `npx vitest` with default config (finds `*.test.ts` files) |
| Quick run command | `npx vitest run src/lib/amenities.test.ts` (Wave 0 gap) |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AMEN-02 | upsertPropertyAmenities deletes old rows and inserts new ones | unit (Server Action logic) | manual-only — requires live Supabase | N/A — manual-only |
| AMEN-02 | AmenitiesEditor checkbox toggle adds/removes from selected set | unit | `npx vitest run` (if helper extracted) | Wave 0 gap |
| AMEN-03 | AmenityList splits rows into top-N and remainder correctly | unit | `npx vitest run src/lib/amenities.test.ts` | Wave 0 gap |
| AMEN-04 | PropertyListingCard filters highlights by name correctly | unit | `npx vitest run src/lib/amenities.test.ts` | Wave 0 gap |

### Sampling Rate
- **Per task commit:** `npx vitest run` (pricing.test.ts + any new amenity tests)
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green + manual browser verification of owner save/reload + guest modal before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/amenities.test.ts` — unit tests for top-N slicing logic and highlight filter (can be pure functions extracted from components)

*(If no pure utility functions are extracted — e.g., all logic lives inline in components — this gap can be marked N/A. The main testable unit is `upsertPropertyAmenities` which requires a live DB.)*

---

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `/supabase/migrations/20260323000001_amenities_schema.sql` — confirmed schema, RLS, seed data, icon names
- Codebase analysis: `/src/components/property/AmenityList.tsx` — confirmed freetext approach being replaced
- Codebase analysis: `/src/components/dashboard/PropertyForm.tsx` — confirmed AMENITY_OPTIONS freetext; amenities passed as comma-separated string
- Codebase analysis: `/src/lib/actions/properties.ts` — confirmed current JSONB write pattern
- Codebase analysis: `/src/app/(guest)/properties/[propertyId]/page.tsx` — confirmed JSONB read on line 93-95
- Codebase analysis: `/src/components/ui/alert-dialog.tsx` — confirmed `radix-ui` unified package import pattern
- Codebase analysis: `/src/app/(guest)/properties/page.tsx` — confirmed browse query structure for PropertyListingCard extension
- Codebase analysis: `package.json` — confirmed `radix-ui ^1.4.3`, `lucide-react ^0.576.0`, `vitest ^4.0.18` installed

### Secondary (MEDIUM confidence)
- Radix UI Dialog docs (via WebSearch not performed — high confidence from alert-dialog.tsx pattern that Dialog follows same API)
- Supabase nested select pattern — confirmed by existing `add_ons` usage in property detail page

### Tertiary (LOW confidence)
- None — all findings from direct codebase inspection.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed installed via package.json
- Architecture: HIGH — patterns derived from existing codebase code, not speculation
- Pitfalls: HIGH — derived from reading actual code paths that will be affected
- Validation: MEDIUM — no existing amenity unit tests; test gap identified

**Research date:** 2026-03-24
**Valid until:** Stable for this milestone (30 days). Lucide icon API is stable.
