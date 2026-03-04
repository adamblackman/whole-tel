# Phase 3: Owner Dashboard - Research

**Researched:** 2026-03-03
**Domain:** Next.js 16 App Router — Server Actions, CRUD forms, Supabase Storage signed URL uploads, owner-scoped data isolation
**Confidence:** HIGH

---

## Summary

Phase 3 builds the owner-facing dashboard that lets property owners create, edit, and delete villas; upload photos; manage per-property add-on experiences; and view bookings. All foundational infrastructure is already in place: the Supabase schema (`properties`, `property_photos`, `add_ons`, `bookings`) with complete RLS policies, the `requireOwner()` DAL guard protecting `/dashboard` routes, and placeholder data is seeded. The dashboard shell exists at `src/app/(owner)/dashboard/layout.tsx` and `page.tsx`.

The primary technical work is wiring Next.js 16 Server Actions to Supabase for CRUD mutations, implementing the two-step photo upload flow (server generates signed URL → client uploads directly to Supabase Storage), and building the UI screens with shadcn/ui form components. Data isolation (OWNER-08) is already enforced at the database layer by the `owner_id` RLS policies established in Phase 1 — Phase 3 must also enforce it at the UI layer by filtering all queries by `auth.uid()`.

Photo uploads are the most architecturally important piece to get right: Next.js Server Actions have a 1 MB body limit, so photos must never route through the server. The established pattern is: Server Action generates a signed upload URL → client-side `createBrowserClient()` calls `uploadToSignedUrl()` directly to Supabase. Once uploaded, the `storage_path` is saved to `property_photos` via a second Server Action.

**Primary recommendation:** Use `useActionState` (React 19 built-in) for all CRUD forms — it surfaces server-side validation errors without page reload and exposes a `pending` boolean for disabled states. Keep the upload flow as two steps (signed URL generation server-side, actual upload client-side).

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| OWNER-01 | Owner can create a new property listing with all details | Server Action `createProperty()` → Supabase INSERT into `properties`, `owner_id = auth.uid()` enforced by RLS `WITH CHECK`. Zod schema validates required fields. |
| OWNER-02 | Owner can edit existing property listings | Server Action `updateProperty(id, formData)` — pass `propertyId` via `action.bind(null, id)`. RLS `USING (owner_id = auth.uid())` on UPDATE blocks cross-owner edits at DB layer. |
| OWNER-03 | Owner can delete their property listings | Server Action `deleteProperty(id)` — RLS DELETE policy already blocks deleting others' properties. UI confirms before action. |
| OWNER-04 | Owner can upload and manage property photos | Two-step signed URL flow: `getSignedUploadUrl(propertyId)` Server Action → client `uploadToSignedUrl()` → `savePhotoRecord(propertyId, path)` Server Action. `property-photos` bucket is public (set in Phase 1). |
| OWNER-05 | Owner can create, edit, and delete add-on experiences per property | Server Actions `createAddOn()`, `updateAddOn()`, `deleteAddOn()` — RLS on `add_ons` uses EXISTS subquery joining to `properties.owner_id`. |
| OWNER-06 | Owner can set add-on pricing (per person or per booking) | `pricing_unit` field: `'per_person' | 'per_booking'` (CHECK constraint already in schema). Zod enum validates client-side; DB constraint is the safety net. |
| OWNER-07 | Owner can view bookings for their properties | Server Component fetches `bookings` with JOIN to `properties WHERE owner_id = auth.uid()`. RLS policy "Owners can view bookings for their properties" already exists in schema. |
| OWNER-08 | Owner can only see and manage their own properties (not other owners') | DB: All 4 DML RLS policies on `properties`, `property_photos`, `add_ons` enforce `owner_id = auth.uid()`. UI: All data-fetch queries must include `.eq('owner_id', user.id)` filter to avoid returning empty vs leaking. |
</phase_requirements>

---

## Standard Stack

### Core (already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App Router, Server Actions, Server Components | Project baseline |
| React | 19.2.3 | `useActionState`, `useFormStatus`, `useOptimistic` | Ships with Next.js 16 |
| @supabase/ssr | ^0.9.0 | `createServerClient` / `createBrowserClient` | Project's auth+DB client |
| @supabase/supabase-js | ^2.98.0 | Storage SDK (`createSignedUploadUrl`, `uploadToSignedUrl`, `getPublicUrl`) | Project baseline |
| react-hook-form | ^7.71.2 | Client-side form state, field-level errors, complex multi-step forms | Already installed |
| @hookform/resolvers | ^5.2.2 | Zod resolver for RHF | Already installed |
| zod | ^4.3.6 | Server-side and client-side schema validation | Already installed |
| shadcn/ui | ^3.8.5 (CLI) | Form, Input, Button, Card, Table, Dialog, Select, Textarea, Badge | Already installed |
| lucide-react | ^0.576.0 | Icons (Upload, Trash, Plus, Pencil, etc.) | Already installed |
| tw-animate-css | ^1.4.0 | CSS animations (NOT tailwindcss-animate) | Already installed |

### No New Installs Required

The existing package.json contains everything needed. No additional npm installs are required for Phase 3.

```bash
# No installs needed — all dependencies are in place
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| useActionState | useState + manual fetch | useActionState is the official React 19 pattern; no reason to diverge |
| Signed URL two-step upload | Route Handler as upload proxy | Route Handler proxy hits 1 MB Server Action limit — signed URLs are the correct solution |
| shadcn/ui Table | TanStack Table | Overkill for an owner viewing their 1-3 properties and bookings; plain table is sufficient |
| .bind() for extra args | Hidden input field | .bind() doesn't expose the ID in rendered HTML; hidden inputs do — use .bind() for security-sensitive IDs |

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   └── (owner)/
│       └── dashboard/
│           ├── layout.tsx              # EXISTING — requireOwner() guard
│           ├── page.tsx                # Properties list (Server Component)
│           ├── properties/
│           │   ├── new/
│           │   │   └── page.tsx        # Create property form (Client Component)
│           │   └── [propertyId]/
│           │       ├── page.tsx        # Property detail + photo/addon management
│           │       ├── edit/
│           │       │   └── page.tsx    # Edit property form
│           │       └── bookings/
│           │           └── page.tsx    # Bookings for this property
│           └── bookings/
│               └── page.tsx            # All bookings across all properties
├── lib/
│   └── actions/
│       ├── auth.ts                     # EXISTING
│       ├── properties.ts               # NEW — createProperty, updateProperty, deleteProperty
│       ├── photos.ts                   # NEW — getSignedUploadUrl, savePhotoRecord, deletePhoto
│       └── add-ons.ts                  # NEW — createAddOn, updateAddOn, deleteAddOn
└── components/
    └── dashboard/
        ├── PropertyForm.tsx            # Create/edit property form (Client Component)
        ├── PhotoUploader.tsx           # Client Component — handles signed URL + upload
        ├── AddOnForm.tsx               # Create/edit add-on form (Client Component)
        └── BookingsTable.tsx           # Bookings display (Server or Client Component)
```

### Pattern 1: Server Action CRUD with useActionState

**What:** Client Component form uses `useActionState` to bind to a Server Action. The action validates with Zod, performs Supabase DML, and either returns `{ errors }` or calls `revalidatePath` + `redirect`.

**When to use:** All CRUD mutations (create property, update property, create add-on, etc.)

```typescript
// Source: https://nextjs.org/docs/app/guides/forms (Next.js 16.1.6 docs)

// src/lib/actions/properties.ts
'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireOwner } from '@/lib/dal'

const PropertySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  location: z.string().min(1, 'Location is required'),
  bedrooms: z.coerce.number().int().min(1),
  bathrooms: z.coerce.number().int().min(1),
  max_guests: z.coerce.number().int().min(1),
  nightly_rate: z.coerce.number().min(1),
  cleaning_fee: z.coerce.number().min(0).default(0),
  description: z.string().optional(),
})

type ActionState = { errors?: Record<string, string[]>; message?: string }

export async function createProperty(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireOwner()
  const parsed = PropertySchema.safeParse(Object.fromEntries(formData))

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors }
  }

  const supabase = await createClient()
  const { error } = await supabase
    .from('properties')
    .insert({ ...parsed.data, owner_id: user.id })

  if (error) return { message: error.message }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
```

```tsx
// src/components/dashboard/PropertyForm.tsx
'use client'

import { useActionState } from 'react'
import { createProperty } from '@/lib/actions/properties'

const initialState = {}

export function PropertyForm() {
  const [state, formAction, pending] = useActionState(createProperty, initialState)

  return (
    <form action={formAction}>
      <input name="name" />
      {state.errors?.name && <p>{state.errors.name[0]}</p>}
      {/* ... other fields */}
      <button disabled={pending} type="submit">
        {pending ? 'Saving...' : 'Create Property'}
      </button>
      {state.message && <p>{state.message}</p>}
    </form>
  )
}
```

### Pattern 2: Extra Arguments via .bind()

**What:** Pass a `propertyId` to a Server Action for update/delete operations without exposing it in rendered HTML.

**When to use:** Edit and delete actions where the record ID must be server-trusted.

```typescript
// Source: https://nextjs.org/docs/app/guides/forms#passing-additional-arguments (Next.js 16.1.6 docs)

// Client Component:
const updatePropertyWithId = updateProperty.bind(null, propertyId)
// <form action={updatePropertyWithId}>

// Server Action signature:
export async function updateProperty(
  propertyId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState>
```

### Pattern 3: Two-Step Photo Upload (Signed URL)

**What:** Server Action generates a signed upload URL (permission-gated). Client Component uploads the file directly to Supabase Storage using `uploadToSignedUrl()`. A second Server Action saves the `storage_path` to `property_photos`.

**When to use:** ALL file uploads — never route a file through a Server Action body (1 MB limit).

```typescript
// Source: https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl
// Source: https://supabase.com/docs/reference/javascript/storage-from-uploadtosignedurl

// Step 1: Server Action — generate signed URL (verifies ownership)
// src/lib/actions/photos.ts
'use server'
export async function getSignedUploadUrl(propertyId: string) {
  const user = await requireOwner()
  // Verify the property belongs to this owner
  const supabase = await createClient()
  const { data: prop } = await supabase
    .from('properties')
    .select('id')
    .eq('id', propertyId)
    .eq('owner_id', user.id)
    .single()
  if (!prop) return { error: 'Property not found or access denied' }

  const path = `${user.id}/${propertyId}/${Date.now()}.jpg`
  const { data, error } = await supabase.storage
    .from('property-photos')
    .createSignedUploadUrl(path)

  if (error) return { error: error.message }
  return { signedUrl: data.signedUrl, token: data.token, path }
}

// Step 2: Client Component — upload directly to Supabase
// src/components/dashboard/PhotoUploader.tsx
'use client'
import { createBrowserClient } from '@supabase/ssr'
import { getSignedUploadUrl, savePhotoRecord } from '@/lib/actions/photos'

async function handleUpload(file: File, propertyId: string) {
  const result = await getSignedUploadUrl(propertyId)
  if ('error' in result) throw new Error(result.error)

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
  const { error } = await supabase.storage
    .from('property-photos')
    .uploadToSignedUrl(result.path, result.token, file)

  if (error) throw error
  await savePhotoRecord(propertyId, result.path)
}
```

```typescript
// Step 3: Server Action — persist the photo record
// src/lib/actions/photos.ts
export async function savePhotoRecord(propertyId: string, storagePath: string) {
  const user = await requireOwner()
  const supabase = await createClient()
  const { error } = await supabase
    .from('property_photos')
    .insert({ property_id: propertyId, storage_path: storagePath })
  if (error) return { error: error.message }
  revalidatePath(`/dashboard/properties/${propertyId}`)
}
```

**Getting the public URL for display:**
```typescript
// Source: https://supabase.com/docs/reference/javascript/storage-from-getpublicurl
// The property-photos bucket is public (set in Phase 1 migration)
const { data } = supabase.storage
  .from('property-photos')
  .getPublicUrl(storagePath)
// data.publicUrl — use this in <Image> src
```

### Pattern 4: Server Component Data Fetching (Owner-Scoped)

**What:** Dashboard pages are Server Components that fetch data filtered by the authenticated owner's `user.id`. This is the UI enforcement of OWNER-08 (RLS is the DB enforcement).

**When to use:** All dashboard list and detail pages.

```typescript
// Source: Established in Phase 1/2 DAL pattern
// src/app/(owner)/dashboard/page.tsx
export default async function DashboardPage() {
  const user = await requireOwner() // redirects if not owner
  const supabase = await createClient()

  const { data: properties } = await supabase
    .from('properties')
    .select('*, property_photos(*), add_ons(*)')
    .eq('owner_id', user.id)         // UI-layer isolation
    .order('created_at', { ascending: false })

  return <PropertyList properties={properties ?? []} />
}
```

### Pattern 5: Delete with Confirmation Dialog

**What:** Wrap delete button in a shadcn/ui `AlertDialog` to confirm before calling the delete Server Action.

**When to use:** Property delete (cascades to photos, add-ons via FK), add-on delete.

```tsx
// Pattern using AlertDialog from shadcn/ui
// <AlertDialog> → <AlertDialogTrigger><Button variant="destructive">Delete</Button></AlertDialogTrigger>
// <AlertDialogContent> → confirm → <form action={deletePropertyWithId}><Button type="submit">Delete</Button></form>
```

### Anti-Patterns to Avoid

- **Routing file uploads through Server Actions:** Body size limit is 1 MB. Always use signed URL pattern.
- **Using `getSession()` in Server Components:** Already documented in project — use `getUser()` via `requireOwner()`.
- **Forgetting `revalidatePath` before `redirect`:** Causes stale UI. Must call `revalidatePath` first.
- **Trusting client-submitted `owner_id`:** Never accept `owner_id` from form data. Always derive from `requireOwner()` return value.
- **Calling `requireOwner()` in every component:** Call once in layout.tsx (already done) — `React.cache()` deduplicates within the request.
- **Directly calling `getPublicUrl` with raw user input paths:** Always construct the path server-side and store in DB; read back from DB for display.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Form validation with field-level errors | Custom validation logic | Zod + `safeParse()` + `flatten().fieldErrors` | Already installed; handles edge cases, nested errors, coercion |
| Pending/loading state on form submit | Manual `useState(isLoading)` | `useActionState` third return value (`pending`) | Built-in, race-condition safe |
| Upload progress UI | Custom XMLHttpRequest | Supabase `uploadToSignedUrl()` with progress callback or just pending state | Supabase SDK handles multipart; progress is optional for MVP |
| Image URL construction | String concatenation | `supabase.storage.from('property-photos').getPublicUrl(path)` | Handles URL encoding, region differences |
| Owner-scoped query filter | Application-level filter loop | `.eq('owner_id', user.id)` + RLS as backup | Two-layer defense; RLS catches bugs in app layer |
| Confirmation before destructive actions | Custom modal state | shadcn/ui `AlertDialog` | Already in shadcn install; handles focus trap, a11y |
| Rich text for description | Heavy WYSIWYG editor | `<Textarea>` from shadcn/ui | Plain text is sufficient for MVP; avoid complexity |

**Key insight:** The Supabase SDK and React 19's `useActionState` together cover 90% of the complexity in a dashboard CRUD interface. Custom implementations introduce bugs without benefit.

---

## Common Pitfalls

### Pitfall 1: Server Action Body Limit on File Upload

**What goes wrong:** Developer passes a file through a form with `enctype="multipart/form-data"` to a Server Action. Uploads > 1 MB fail silently or with cryptic errors.

**Why it happens:** Next.js Server Actions inherit a 1 MB body limit by default. This is a framework constraint, not a Supabase constraint.

**How to avoid:** Never put an `<input type="file">` in a form whose action is a Server Action. Use the two-step signed URL pattern: Server Action generates the URL, client-side code uploads directly.

**Warning signs:** Works in dev with small test images, breaks in production with real photos.

---

### Pitfall 2: Stale UI After Mutation Without revalidatePath

**What goes wrong:** Owner creates or deletes a property. The dashboard still shows the old list. User refreshes manually and sees the correct data.

**Why it happens:** Next.js caches server-rendered pages. Mutations must explicitly invalidate cached routes.

**How to avoid:** Always call `revalidatePath('/dashboard')` (or the relevant path) before `redirect()` in every mutating Server Action.

**Warning signs:** Data changes persist to Supabase but UI doesn't update until hard refresh.

---

### Pitfall 3: Client-Submitted owner_id Trust

**What goes wrong:** Developer includes `owner_id` as a hidden form field. A malicious user modifies it to another owner's UUID and creates a property under that owner.

**Why it happens:** RLS `WITH CHECK ((SELECT auth.uid()) = owner_id)` will catch this at the DB layer, but a bug in the RLS policy or a service role key bypass could allow it.

**How to avoid:** Never read `owner_id` from `formData`. Always use `const user = await requireOwner()` and set `owner_id: user.id` in the Server Action.

**Warning signs:** Code contains `formData.get('owner_id')` anywhere.

---

### Pitfall 4: Photo Storage Path Collision

**What goes wrong:** Two photos uploaded at the same millisecond get the same `storage_path`, causing one to overwrite the other.

**Why it happens:** Using `Date.now()` alone for uniqueness is insufficient under concurrent uploads.

**How to avoid:** Use `crypto.randomUUID()` or combine `Date.now()` with `Math.random()` for paths: `` `${userId}/${propertyId}/${Date.now()}-${crypto.randomUUID()}.jpg` ``

**Warning signs:** Photos randomly disappear after upload; `property_photos` has duplicate storage_paths.

---

### Pitfall 5: Missing revalidatePath After Photo or Add-On Changes

**What goes wrong:** Owner uploads a photo or creates an add-on. The property page still shows the old data because only `/dashboard` was revalidated, not the specific property page.

**Why it happens:** Fine-grained revalidation is easy to miss. Only the revalidated path rebuilds.

**How to avoid:** After photo or add-on mutations, revalidate both the property-specific path and the dashboard:
```typescript
revalidatePath(`/dashboard/properties/${propertyId}`)
revalidatePath('/dashboard')
```

---

### Pitfall 6: useActionState Signature Change When Using with Extra Args

**What goes wrong:** `updateProperty.bind(null, propertyId)` is used. Developer forgets the bound Server Action receives `(propertyId, prevState, formData)` — not `(prevState, formData)`.

**Why it happens:** `.bind()` prepends arguments. The `useActionState` wrapper then injects `prevState` as the second argument, shifting `formData` to third.

**How to avoid:** Server Actions used with `.bind()` AND `useActionState` must have the signature:
```typescript
export async function updateProperty(
  propertyId: string,    // from .bind()
  _prevState: ActionState, // from useActionState
  formData: FormData     // from form submission
)
```

---

## Code Examples

Verified patterns from official sources:

### Property List Server Component (Owner-Scoped)

```typescript
// Source: Next.js 16.1.6 docs + project DAL pattern
// src/app/(owner)/dashboard/page.tsx
export default async function DashboardPage() {
  const user = await requireOwner()
  const supabase = await createClient()

  const { data: properties, error } = await supabase
    .from('properties')
    .select(`
      id, name, location, bedrooms, bathrooms, max_guests, nightly_rate,
      property_photos(id, storage_path, display_order)
    `)
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Your Properties</h1>
        <Button asChild>
          <Link href="/dashboard/properties/new">Add Property</Link>
        </Button>
      </div>
      {properties?.map(p => <PropertyCard key={p.id} property={p} />)}
    </div>
  )
}
```

### Add-On CRUD Server Actions

```typescript
// Source: Supabase RLS schema (Phase 1) + project patterns
// src/lib/actions/add-ons.ts
'use server'

const AddOnSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  price: z.coerce.number().min(0),
  pricing_unit: z.enum(['per_person', 'per_booking']),
  max_quantity: z.coerce.number().int().positive().optional().nullable(),
})

export async function createAddOn(
  propertyId: string,
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireOwner()
  const parsed = AddOnSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { errors: parsed.error.flatten().fieldErrors }

  const supabase = await createClient()
  const { error } = await supabase
    .from('add_ons')
    .insert({ ...parsed.data, property_id: propertyId })

  if (error) return { message: error.message }
  revalidatePath(`/dashboard/properties/${propertyId}`)
  return { message: 'Add-on created' }
}
```

### Bookings View (Owner)

```typescript
// Source: Phase 1 schema — RLS "Owners can view bookings for their properties"
// src/app/(owner)/dashboard/bookings/page.tsx
export default async function BookingsPage() {
  const user = await requireOwner()
  const supabase = await createClient()

  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id, check_in, check_out, guest_count, total, status, created_at,
      properties!inner(id, name, owner_id)
    `)
    .eq('properties.owner_id', user.id)  // UI-layer: RLS already enforces this
    .order('created_at', { ascending: false })

  return <BookingsTable bookings={bookings ?? []} />
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `useFormState` (React 18 experimental) | `useActionState` (React 19 stable) | React 19 GA (late 2024) | `useActionState` is in core `react`, not `react-dom`; identical API shape |
| `useTransition` + custom loading state | Third return value from `useActionState` is `pending` | React 19 | Simpler — no separate `useTransition` needed |
| Manual fetch + API Routes for mutations | Server Actions with `action` prop | Next.js 13+ / stable in 14 | Server Actions are now the standard pattern |
| `getSession()` for server auth | `getUser()` + JWT validation | Supabase SSR guidance (2024) | `getSession()` trusts cookie without server-side JWT check |
| `tailwindcss-animate` | `tw-animate-css` | shadcn/ui update (2024) | `tailwindcss-animate` is deprecated; project already uses `tw-animate-css` |

**Deprecated/outdated:**
- `useFormState` from `react-dom`: Replaced by `useActionState` from `react`. Never use `useFormState` in this project (React 19).
- `next/legacy/image`: Use `next/image`. Already standard.
- Uploading files through Server Actions body: Not a pattern issue but a hard constraint — 1 MB limit makes it non-viable.

---

## Open Questions

1. **Photo display_order management**
   - What we know: `property_photos` has a `display_order: int` field.
   - What's unclear: Should the MVP support drag-and-drop reordering, or is upload order sufficient?
   - Recommendation: Upload order (incrementing by count) is sufficient for MVP. Drag-and-drop adds significant complexity; defer to v2.

2. **Add-on photo_url field**
   - What we know: `add_ons.photo_url text` exists in schema. OWNER-05/06 don't mention photo uploads for add-ons.
   - What's unclear: Is this a Phase 3 or Phase 4 concern?
   - Recommendation: Treat `photo_url` as optional for Phase 3. Text URL input (or leave null) is sufficient. Add-on photo upload is not in the success criteria.

3. **Bookings view depth**
   - What we know: OWNER-07 requires viewing bookings. No success criterion specifies whether this is per-property or a global view.
   - What's unclear: Should the owner see one combined bookings list or per-property?
   - Recommendation: Implement a combined bookings list at `/dashboard/bookings` sorted by date. Per-property bookings can be a drill-down.

4. **Amenities field (JSON) input UX**
   - What we know: `properties.amenities jsonb DEFAULT '[]'` stores a list. OWNER-01 lists "all details" but amenities aren't in the success criteria fields.
   - What's unclear: What UI is appropriate for a JSON array input?
   - Recommendation: Use a multi-select or checkbox group with predefined amenity options (pool, hot tub, BBQ, etc.) and serialize to JSON before insert. Don't expose raw JSON editing to the owner.

---

## Sources

### Primary (HIGH confidence)

- Next.js 16.1.6 official docs (fetched 2026-03-03) — Server Actions, useActionState, forms, revalidatePath, redirect
  - https://nextjs.org/docs/app/guides/forms
  - https://nextjs.org/docs/app/getting-started/updating-data
- Supabase MCP docs search (fetched 2026-03-03) — Storage, createSignedUploadUrl, uploadToSignedUrl
  - https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl
  - https://supabase.com/docs/reference/javascript/storage-from-uploadtosignedurl
  - https://supabase.com/docs/reference/javascript/storage-from-getpublicurl
- Supabase official docs (fetched 2026-03-03) — Storage RLS access control patterns
  - https://supabase.com/docs/guides/storage/security/access-control
- Project source files (read directly, verified 2026-03-03):
  - `/Users/adamblackman/Code/whole-tel/supabase/migrations/20260302000001_schema_rls.sql`
  - `/Users/adamblackman/Code/whole-tel/src/lib/dal.ts`
  - `/Users/adamblackman/Code/whole-tel/src/types/database.ts`
  - `/Users/adamblackman/Code/whole-tel/src/app/(owner)/dashboard/layout.tsx`
  - `/Users/adamblackman/Code/whole-tel/src/lib/actions/auth.ts`

### Secondary (MEDIUM confidence)

- WebSearch: "Next.js 16 Server Actions CRUD form revalidatePath 2025" — confirmed by official docs above
- WebSearch: "Supabase Storage createSignedUploadUrl Next.js client-side upload pattern 2025" — confirmed by official Supabase docs

### Tertiary (LOW confidence)

- None — all key findings verified with official sources.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and verified in package.json
- Architecture patterns: HIGH — verified against Next.js 16.1.6 official docs and project Phase 1/2 patterns
- Photo upload flow: HIGH — confirmed via Supabase docs (MCP + WebFetch) and aligned with CLAUDE.md "Signed URL uploads for property images" rule
- Data isolation (OWNER-08): HIGH — RLS policies verified in schema migration; DAL pattern verified in dal.ts
- Pitfalls: HIGH — verified against official docs and known project decisions in STATE.md

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable ecosystem — Next.js 16 + Supabase SDK changes are unlikely in 30 days)
