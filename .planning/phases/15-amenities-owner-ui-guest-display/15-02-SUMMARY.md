---
phase: 15-amenities-owner-ui-guest-display
plan: "02"
subsystem: guest-ui
tags: [amenities, property-detail, browse, modal, lucide-icons]
dependency_graph:
  requires: []
  provides: [structured-amenity-display, amenities-modal, browse-highlight-badges]
  affects: [property-detail-page, browse-page, PropertyListingCard]
tech_stack:
  added: [shadcn-dialog]
  patterns: [icon-map-shared-module, server-component-client-component-boundary]
key_files:
  created:
    - src/components/property/amenity-icons.ts
    - src/components/property/AmenitiesModal.tsx
    - src/components/ui/dialog.tsx
  modified:
    - src/components/property/AmenityList.tsx
    - src/app/(guest)/properties/[propertyId]/page.tsx
    - src/app/(guest)/properties/page.tsx
    - src/components/browse/PropertyListingCard.tsx
decisions:
  - "Shared amenity-icons.ts module solves the Server/Client boundary: ICON_MAP and AmenityRow exported from a plain TS file (no React), importable by both Server and Client Components"
  - "Presentation2 missing from lucide-react — Monitor used as fallback in ICON_MAP"
  - "Supabase nested join types inferred as array; cast via (property as any).property_amenities in browse page to satisfy PropertyListingCard's singular-object type"
metrics:
  duration: ~8 minutes
  completed_date: "2026-03-24"
  tasks_completed: 2
  files_changed: 7
---

# Phase 15 Plan 02: Guest-Facing Amenity Display Summary

Structured amenity display on property detail and browse pages using the property_amenities join table — replaces old JSONB freetext rendering with icon-driven, categorized UI.

## What Was Built

### amenity-icons.ts (shared module)
Exports `ICON_MAP` (26 Lucide icons keyed by seed `icon_name` values), `AmenityRow` type, and `getIcon()` helper. Importable by both Server and Client Components without serialization issues.

### AmenityList.tsx (rewritten)
Server Component. Accepts `amenityRows: AmenityRow[]`. Sorts by `display_order`, renders top 8 in a `grid-cols-2 md:grid-cols-4` grid with `text-brand-teal` icons. Shows `<AmenitiesModal>` trigger when `amenityRows.length > 8`.

### AmenitiesModal.tsx (new)
Client Component Dialog. Groups all amenity rows by `amenities.category` in defined order (Water, Social, Work/Event, Culinary, Wellness). Each category section has a muted heading and icon+name grid.

### Property Detail Page
Extended select string includes `property_amenities(amenity_id, amenities(id, name, category, icon_name, display_order))`. Replaced JSONB `amenities` read with `property.property_amenities ?? []`. Updated render conditional and `<AmenityList>` prop.

### Browse Page + PropertyListingCard
Browse query extended to include `property_amenities(amenity_id, amenities(name, icon_name))`. PropertyListingCard gets optional `property_amenities` prop with `HIGHLIGHT_NAMES` filter rendering up to 3 `variant="outline"` badges (Private Pool, Infinity Pool, Hot Tub, Rooftop Terrace, Private Beach, Jacuzzi).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Supabase nested join type mismatch in browse page**
- **Found during:** Task 2 TypeScript check
- **Issue:** Supabase inferred `property_amenities.amenities` as `{ name: any; icon_name: any; }[]` (array) but `PropertyListingCardProps` expected a single object `{ name: string; icon_name: string }`
- **Fix:** Cast via `(property as any).property_amenities` in browse page spread — matches existing pattern used for `bed_config` in the same file
- **Files modified:** `src/app/(guest)/properties/page.tsx`
- **Commit:** 113307a

**2. [Rule 2 - Missing] Presentation2 icon not in lucide-react**
- **Found during:** Task 1 icon map creation
- **Issue:** `Presentation2` listed in seed data but does not exist in lucide-react exports
- **Fix:** Map `Presentation2` to `Monitor` in ICON_MAP as visual fallback; documented in comment
- **Files modified:** `src/components/property/amenity-icons.ts`

## Self-Check: PASSED
