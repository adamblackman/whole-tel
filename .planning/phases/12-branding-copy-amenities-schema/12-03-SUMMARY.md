---
phase: 12-branding-copy-amenities-schema
plan: "03"
subsystem: database
tags: [schema, migration, amenities, tax-rate, rls, supabase]
dependency_graph:
  requires: []
  provides: [amenities-table, property-amenities-join-table, tax-rate-column, property-form-tax-rate-input]
  affects: [Phase 15 amenities UI, Plan 12-04 pricing module]
tech_stack:
  added: []
  patterns: [RLS owner-scoped write via EXISTS subquery, nullable numeric for optional rates, percentage-to-decimal UI conversion]
key_files:
  created:
    - supabase/migrations/20260323000001_amenities_schema.sql
  modified:
    - src/lib/validations/property.ts
    - src/components/dashboard/PropertyForm.tsx
decisions:
  - "tax_rate stored as numeric(5,4) decimal in DB, displayed as percentage (0-100) in PropertyForm — conversion in server action"
  - "RLS on property_amenities uses FOR ALL with both USING and WITH CHECK pointing to EXISTS subquery on properties.owner_id"
  - "31 amenities seeded (7+7+5+6+6 across 5 categories) with Lucide icon names"
metrics:
  duration: "1m 30s"
  completed: "2026-03-24"
  tasks_completed: 2
  tasks_total: 2
  files_created: 1
  files_modified: 2
---

# Phase 12 Plan 03: Amenities Schema & Tax Rate Summary

**One-liner:** Amenities catalog + join table with RLS, 31-row seed data, and nullable tax_rate column on properties with PropertyForm percentage input.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | Create amenities schema migration | dadf0ff | supabase/migrations/20260323000001_amenities_schema.sql |
| 2 | Add tax rate to PropertyForm and validation | c5da394 | src/lib/validations/property.ts, src/components/dashboard/PropertyForm.tsx |

## What Was Built

### Migration (Task 1)

`supabase/migrations/20260323000001_amenities_schema.sql` contains:

- `amenities` table: uuid PK, name (UNIQUE), category (5-value CHECK), icon_name, display_order, created_at
- `property_amenities` join table: composite PK (property_id, amenity_id), CASCADE deletes on both FKs
- RLS on `amenities`: SELECT open to anon + authenticated
- RLS on `property_amenities`: SELECT open to anon + authenticated; FOR ALL scoped to property owner via EXISTS subquery
- `ALTER TABLE properties ADD COLUMN tax_rate numeric(5,4)` — nullable, null means no hotel tax
- 31 amenities seeded: Water (7), Social (7), Work/Event (5), Culinary (6), Wellness (6) with Lucide icon names

### PropertyForm & Validation (Task 2)

- `PropertySchema` in `property.ts`: added `tax_rate` as `z.preprocess(... z.coerce.number().min(0).max(100).nullable().optional())` — accepts 0-100 percentage, preprocesses empty string to null
- `PropertyForm.tsx`: added `tax_rate` to `initialData` interface; added "Hotel Tax Rate (%)" input in pricing section with `step="0.01"`, placeholder "e.g. 12 for 12%", and helper text "Leave blank if hotel submits taxes from gross payment"
- Display value converts decimal DB storage to percentage: `initialData.tax_rate != null ? initialData.tax_rate * 100 : ''`
- Server action (not modified in this plan) should convert back: `tax_rate / 100` before DB write

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] Migration file exists at `supabase/migrations/20260323000001_amenities_schema.sql`
- [x] 2 CREATE TABLE statements (amenities + property_amenities)
- [x] 2 ENABLE ROW LEVEL SECURITY statements
- [x] 1 ALTER TABLE for tax_rate on properties
- [x] 31 INSERT rows across 5 categories
- [x] `npx tsc --noEmit` exits 0
- [x] PropertyForm renders tax rate input
- [x] Commits dadf0ff and c5da394 exist

## Self-Check: PASSED
