# Deferred Items - Phase 09

## Pre-existing TS Error in PricingWidget

- **File:** src/app/(guest)/properties/[propertyId]/page.tsx (line 204)
- **Error:** `Type 'AddOnRow[]' is not assignable to type 'AddOnItem[]'` -- PricingWidget expects `includedGuests`/`perPersonAbove` (camelCase) but guest page passes raw Supabase data with `included_guests`/`per_person_above`
- **Source:** Uncommitted changes in `src/components/property/PricingWidget.tsx` from Plan 01 or 03
- **Action:** Should be resolved in Plan 09-03 (guest-facing pricing integration) or by committing the PricingWidget changes properly
