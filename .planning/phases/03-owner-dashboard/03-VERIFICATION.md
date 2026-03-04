---
phase: 03-owner-dashboard
verified: 2026-03-04T00:00:00Z
status: human_needed
score: 8/9 must-haves verified
re_verification: false
human_verification:
  - test: "Photo upload signed URL flow (OWNER-04) — upload a file > 1 MB to a property"
    expected: "File uploads directly to Supabase Storage via signed URL without hitting the Server Action body; photo appears in the grid and persists after reload"
    why_human: "Two-step upload logic (signed URL -> browser direct upload -> record save) cannot be verified programmatically against a live Supabase project without running the app"
  - test: "Data isolation (OWNER-08) — log in as two separate owner accounts"
    expected: "Each owner sees only their own properties at /dashboard and /dashboard/bookings; navigating directly to the other owner's property URL returns a 404"
    why_human: "Owner isolation depends on both RLS policies and application-layer .eq('owner_id') — requires a live Supabase connection with two real owner accounts to confirm"
  - test: "Add-on inline edit auto-close (OWNER-05) — edit an add-on and save"
    expected: "After saving, the edit form closes and the list item view is restored with updated values"
    why_human: "useEffect watching state.message for 'successfully' substring to trigger onCancel() is behavioral and cannot be confirmed by static code inspection alone"
  - test: "Form validation UX (OWNER-01 through OWNER-06) — submit forms with blank required fields"
    expected: "Field-level error messages appear under the invalid fields; form does not submit; pending/loading states render during submission"
    why_human: "useActionState error propagation and pending state rendering require browser interaction to verify"
---

# Phase 3: Owner Dashboard Verification Report

**Phase Goal:** An owner can create, manage, and populate villa listings with all details and per-property add-on experiences from their dashboard

**Verified:** 2026-03-04
**Status:** human_needed (8/9 automated truths verified; 4 items require human testing)
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Server Actions createProperty, updateProperty, deleteProperty exist with 'use server' and call requireOwner() before any DB operation | VERIFIED | `src/lib/actions/properties.ts` lines 1, 17, 57, 94 — all three functions call requireOwner() as first operation |
| 2 | Server Actions createAddOn, updateAddOn, deleteAddOn exist and use propertyId bound as first argument | VERIFIED | `src/lib/actions/add-ons.ts` — all three exported; propertyId is first param in createAddOn (line 14), addOnId+propertyId bound in updateAddOn (line 44) |
| 3 | owner_id is always derived from requireOwner() return value, never from formData | VERIFIED | Grep for `formData.get.*owner` returned nothing. createProperty sets `owner_id: user.id` at line 37 from requireOwner() result |
| 4 | Zod schemas validate all required fields with coerce for numeric FormData inputs | VERIFIED | `src/lib/validations/property.ts` uses `z.coerce.number()` for bedrooms, bathrooms, max_guests, nightly_rate, cleaning_fee. `src/lib/validations/add-on.ts` uses coerce for price, max_quantity |
| 5 | updateProperty and deleteProperty enforce .eq('owner_id', user.id) at application layer | VERIFIED | `src/lib/actions/properties.ts` lines 77-78 and 101 — both include `.eq('owner_id', user.id)` |
| 6 | Photo upload uses signed URL pattern — file never routes through Server Action body | VERIFIED | `PhotoUploader.tsx` has `<input type="file">` outside any `<form>` (line 93); upload flow calls `uploadToSignedUrl` directly from browser (lines 59-61); file bytes never sent to Server Action |
| 7 | Dashboard pages scope all data fetches to the authenticated owner via .eq('owner_id', user.id) | VERIFIED | dashboard/page.tsx line 18, detail page.tsx line 30, edit page.tsx line 23, bookings page.tsx line 16 — all include owner filter |
| 8 | Owner bookings page shows bookings via properties!inner JOIN scoped to owner | VERIFIED | `src/app/(owner)/dashboard/bookings/page.tsx` uses `properties!inner(id, name, owner_id)` and `.eq('properties.owner_id', user.id)` with runtime normalization |
| 9 | Photo upload and data isolation work correctly at runtime with live Supabase | UNCERTAIN | Requires human verification — see human_verification section |

**Score:** 8/9 truths verified automatically (9th truth is composite runtime behavior)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `src/lib/actions/properties.ts` | Server Actions for property CRUD | VERIFIED | Exists, substantive (110 lines), imports from `@/lib/dal` and `@/lib/supabase/server`, exports createProperty, updateProperty, deleteProperty |
| `src/lib/actions/add-ons.ts` | Server Actions for add-on CRUD | VERIFIED | Exists, substantive (92 lines), imports from `@/lib/dal`, exports createAddOn, updateAddOn, deleteAddOn |
| `src/lib/validations/property.ts` | Zod property schema + ActionState type | VERIFIED | Exports PropertySchema and ActionState type; uses z.coerce.number() for all numeric fields |
| `src/lib/validations/add-on.ts` | Zod add-on schema | VERIFIED | Exports AddOnSchema with pricing_unit enum using Zod v4 `error` callback (not v3 errorMap) |
| `src/lib/actions/photos.ts` | Server Actions for photo management | VERIFIED | Exists (108 lines), exports getSignedUploadUrl (ownership-gated), savePhotoRecord, deletePhoto; all call requireOwner() |
| `src/components/dashboard/PhotoUploader.tsx` | Client Component for photo upload/display/delete | VERIFIED | Exists (153 lines), 'use client', implements two-step signed URL upload; file input NOT inside a form |
| `src/components/dashboard/PropertyCard.tsx` | Property summary card with photo thumbnail | VERIFIED | Exists, Server-compatible (no 'use client'), constructs Supabase URL directly from env var |
| `src/components/dashboard/PropertyForm.tsx` | Shared form for create/edit property | VERIFIED | Exists (301 lines), 'use client', uses useActionState, amenities checkbox group with hidden input serialization, location Select |
| `src/components/dashboard/AddOnForm.tsx` | Add-on create/edit form | VERIFIED | Exists (141 lines), 'use client', uses useActionState, pricing_unit Select, auto-close on success via useEffect |
| `src/components/dashboard/AddOnList.tsx` | Add-on list with inline edit/delete | VERIFIED | Exists (122 lines), 'use client', editingId state for inline edit, confirm() before delete |
| `src/app/(owner)/dashboard/page.tsx` | Dashboard home — property grid with empty state | VERIFIED | Exists, Server Component, calls requireOwner(), fetches owner-scoped properties, renders PropertyCard grid or empty state |
| `src/app/(owner)/dashboard/properties/new/page.tsx` | Create property page | VERIFIED | Exists, renders PropertyForm with createProperty action |
| `src/app/(owner)/dashboard/properties/[propertyId]/page.tsx` | Property detail with photos, add-ons, danger zone | VERIFIED | Exists (168 lines), awaits params, includes PhotoUploader, AddOnList, DeletePropertyButton in Danger Zone |
| `src/app/(owner)/dashboard/properties/[propertyId]/edit/page.tsx` | Edit property page with pre-filled form | VERIFIED | Exists, calls updateProperty.bind(null, propertyId), passes initialData with amenities array |
| `src/components/dashboard/BookingsTable.tsx` | Bookings table with status badges | VERIFIED | Exists (91 lines), exports BookingRow type, renders Table with Confirmed/Pending/Cancelled badges, empty state |
| `src/components/dashboard/DeletePropertyButton.tsx` | Delete property with AlertDialog confirmation | VERIFIED | Exists (71 lines), 'use client', AlertDialog wraps destructive button, useTransition for pending state |
| `src/app/(owner)/dashboard/bookings/page.tsx` | Owner bookings view | VERIFIED | Exists, Server Component, uses properties!inner JOIN with owner_id filter, normalizes Supabase array type |
| `src/app/(owner)/dashboard/layout.tsx` | Dashboard layout with nav links | VERIFIED | Exists, calls requireOwner() as security boundary, renders Properties and Bookings nav links |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `src/lib/actions/properties.ts` | `src/lib/supabase/server.ts` | `createClient()` import | WIRED | Line 5: `import { createClient } from '@/lib/supabase/server'` |
| `src/lib/actions/properties.ts` | `src/lib/dal.ts` | `requireOwner()` import | WIRED | Line 6: `import { requireOwner } from '@/lib/dal'` — called at lines 17, 57, 94 |
| `src/lib/actions/add-ons.ts` | `src/lib/dal.ts` | `requireOwner()` import | WIRED | Line 5: `import { requireOwner } from '@/lib/dal'` — called at lines 19, 50, 80 |
| `src/lib/actions/photos.ts` | `src/lib/dal.ts` | `requireOwner()` import | WIRED | Line 5: `import { requireOwner } from '@/lib/dal'` — called at lines 18, 52, 84 |
| `src/components/dashboard/PhotoUploader.tsx` | `src/lib/supabase/browser.ts` | `createClient()` for direct Storage upload | WIRED | Line 7: `import { createClient } from '@/lib/supabase/browser'` — used in handleUpload and getPublicUrl |
| `src/components/dashboard/PhotoUploader.tsx` | `src/lib/actions/photos.ts` | `getSignedUploadUrl`, `savePhotoRecord`, `deletePhoto` calls | WIRED | Lines 9-12: imports all three; called in handleUpload (lines 54, 65) and handleDelete (line 79) |
| `src/components/dashboard/PropertyForm.tsx` | `src/lib/actions/properties.ts` | `action` prop wired from pages | WIRED | new/page.tsx passes `createProperty` directly; edit/page.tsx passes `updateProperty.bind(null, propertyId)` |
| `src/components/dashboard/AddOnList.tsx` | `src/lib/actions/add-ons.ts` | `createAddOn`, `updateAddOn`, `deleteAddOn` calls | WIRED | Line 8: imports all three; used at lines 31, 46, 28 |
| `src/app/(owner)/dashboard/properties/[propertyId]/page.tsx` | `src/components/dashboard/PhotoUploader.tsx` | PhotoUploader embed | WIRED | Line 4: `import PhotoUploader from '...'` (default import); rendered at lines 139-142 |

---

### Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|---------------|-------------|--------|---------|
| OWNER-01 | 03-01, 03-03 | Owner can create a new property listing with all details | SATISFIED | createProperty Server Action exists and is wired to PropertyForm on /dashboard/properties/new |
| OWNER-02 | 03-01, 03-03 | Owner can edit existing property listings | SATISFIED | updateProperty with .bind(null, propertyId) in edit/page.tsx; PropertyForm pre-fills initialData |
| OWNER-03 | 03-01, 03-04 | Owner can delete their property listings | SATISFIED | deleteProperty with .eq('owner_id') defense; DeletePropertyButton uses AlertDialog confirmation; Danger Zone section on detail page |
| OWNER-04 | 03-02, 03-03 | Owner can upload and manage property photos | SATISFIED (automated) / HUMAN NEEDED (runtime) | PhotoUploader implements two-step signed URL flow; runtime verification with Supabase required |
| OWNER-05 | 03-01, 03-03 | Owner can create, edit, and delete add-on experiences per property | SATISFIED (automated) / HUMAN NEEDED (UX) | AddOnList + AddOnForm implement full CRUD; auto-close on success requires browser verification |
| OWNER-06 | 03-01, 03-03 | Owner can set add-on pricing (per person or per booking) | SATISFIED | AddOnSchema uses `z.enum(['per_person', 'per_booking'])` with Zod v4 error callback; AddOnForm Select has both options |
| OWNER-07 | 03-04 | Owner can view bookings for their properties | SATISFIED | /dashboard/bookings with BookingsTable; empty state message when no bookings; status badges |
| OWNER-08 | 03-01 through 03-04 | Owner can only see and manage their own properties | SATISFIED (automated) / HUMAN NEEDED (runtime RLS) | All DB queries filter by owner_id; all Server Actions call requireOwner(); RLS policies from Phase 1 provide DB-layer enforcement — requires two-account runtime test to confirm |

**All 8 OWNER requirements have implementation evidence. No orphaned requirements found.**

---

### Anti-Patterns Found

| File | Pattern | Severity | Impact |
|------|---------|---------|--------|
| `src/lib/actions/photos.ts:71,106` | `return {}` | INFO | Intentional — these are success returns for void-like operations (savePhotoRecord, deletePhoto). Not a stub — each return is preceded by actual DB operations and revalidatePath calls |
| Multiple `*.tsx` files | `placeholder="..."` strings | INFO | HTML input placeholder attributes for UX guidance — not stub implementations |

No blockers or warnings found. The `return {}` pattern in photos.ts is correct — it signals success with no error payload.

---

### Human Verification Required

#### 1. Photo Upload — Signed URL Flow (OWNER-04)

**Test:** Navigate to a property detail page, click "Upload Photo", select an image file larger than 1 MB.
**Expected:** Upload completes, photo appears in grid, photo persists after page reload. Confirm network tab shows the file going directly to Supabase Storage (not to Next.js server).
**Why human:** The two-step signed URL flow (Server Action generates URL -> browser uploads directly to Supabase Storage via `uploadToSignedUrl`) requires a live Supabase project. The code pattern is correct but the actual Supabase bucket existence, RLS policy on storage.objects, and signed URL generation cannot be verified statically.

#### 2. Owner Data Isolation — Two Account Test (OWNER-08)

**Test:** Create two owner accounts. Log in as Owner A, create a property. Log out. Log in as Owner B. Navigate to /dashboard.
**Expected:** Owner B sees zero properties. Owner B cannot view Owner A's property even via direct URL (should receive 404). Both /dashboard and /dashboard/bookings are isolated.
**Why human:** Application-layer isolation is verified in code (all queries use `.eq('owner_id', user.id)`), but the Supabase RLS policies (DB-layer defense) were set up in Phase 1 and cannot be confirmed without a live DB connection with two sessions.

#### 3. Add-On Edit Auto-Close (OWNER-05)

**Test:** On a property detail page, click Edit on an existing add-on, change the name, click "Save Changes".
**Expected:** The edit form closes automatically, the list item view shows the updated name. The `useEffect` in AddOnForm that checks `state.message?.includes('successfully')` and calls `onCancel()` should trigger.
**Why human:** The useEffect auto-close pattern depends on React state and effect timing during a Server Action round-trip. Cannot be confirmed by static code inspection.

#### 4. Form Validation UX (OWNER-01 through OWNER-06)

**Test:** On /dashboard/properties/new, submit with the Property Name field blank. Also try setting Bedrooms to 0.
**Expected:** Field-level error messages appear under the invalid inputs. The submit button shows "Saving..." during submission. No redirect occurs on validation failure.
**Why human:** useActionState error propagation and pending states require a browser interaction to observe. Zod validation is implemented correctly in code but the visual rendering of errors needs confirmation.

---

## Gaps Summary

No automated gaps found. All 8 OWNER requirements have substantive implementation in the codebase. All key links are wired. No stubs, no orphaned components, no TODO/FIXME blockers.

The 4 human verification items are runtime/behavioral checks that cannot be confirmed statically. They do not block goal achievement if the underlying Supabase infrastructure (storage bucket, RLS policies from Phase 1) is intact.

**Phase goal status:** Implementation is complete. The goal "An owner can create, manage, and populate villa listings with all details and per-property add-on experiences from their dashboard" is achieved in code. Human verification confirms correct runtime behavior.

---

*Verified: 2026-03-04*
*Verifier: Claude (gsd-verifier)*
