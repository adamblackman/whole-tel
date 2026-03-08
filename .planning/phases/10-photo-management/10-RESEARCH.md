# Phase 10: Photo Management - Research

**Researched:** 2026-03-08
**Domain:** Photo upload UX, drag-and-drop reordering, sectioned gallery, Supabase Storage
**Confidence:** HIGH

## Summary

This phase extends the existing photo infrastructure (signed URL upload, PhotoUploader, PhotoGallery, yet-another-react-lightbox) to support batch uploads, section organization, drag-to-reorder, experience photos, and a polished sectioned guest gallery. The existing patterns are solid -- the main new complexities are (1) @dnd-kit/react integration with its "use client" workaround, (2) extending yet-another-react-lightbox with custom section navigation via its plugin/module system, and (3) sequential multi-file upload UX with per-file progress.

The database change is minimal: one nullable `section` text column on `property_photos`. The `photo_url` field already exists on `add_ons`. No new tables needed.

**Primary recommendation:** Extend existing code in-place rather than building new components from scratch. The signed URL upload pattern, server actions, and lightbox are all proven -- add batch capability, section column, and drag-and-drop on top.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions
- Multi-select file picker -- same "Upload Photo" button but accepts multiple files
- Files upload sequentially in selection order via existing signed URL pattern
- Inline progress list showing each file's status (uploading/done/error)
- Photos appear in the grid as each upload completes
- File size validation only -- reject files over 10MB, no dimension checks
- Warning at 30 photos per property (soft limit, not hard block)
- Photos are assigned to whichever section is active at upload time
- Preset sections available as quick-add: Rooms, Common Area, Pool, Exterior
- Owner can add custom-named sections
- Photos default to "General" if no section is selected
- Fixed section display order: presets first in defined order, custom sections after in creation order
- Per-photo dropdown to switch section assignment
- Drag-and-drop (via @dnd-kit/react) to reorder photos within a section
- Deleting a section moves its photos to "General" -- photos never lost
- Section stored as a column on property_photos table (nullable string, null = General)
- Top-level: keep the existing 5-photo hero grid (pulls from all sections by display_order)
- "Show all photos" opens a full-screen photo tour organized by section headers
- Lightbox has section name tabs at top for quick navigation between sections
- Also supports sequential left/right navigation through all photos
- Single photo per experience (use existing photo_url nullable field on add_ons table)
- Add upload button to AddOnForm using same signed URL upload pattern
- Experience card shows photo as hero image above name and pricing
- If no photo, falls back to current text-only card style
- Storage path: same bucket (property-photos), different path prefix for experiences
- Use /frontend-design skill throughout ALL implementation

### Claude's Discretion
- Exact section tab UI in the lightbox (pills, underline tabs, etc.)
- Upload progress list visual design
- @dnd-kit/react wrapper pattern if needed (known issue #1654 with "use client")
- Whether to extend yet-another-react-lightbox or build custom sectioned gallery
- Exact drag-and-drop handle design for photo reordering
- Migration naming for section column addition
- Whether section is a string column on property_photos or a separate table (lean toward simpler string column)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

<phase_requirements>

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PHOTO-01 | Owner can upload multiple photos at once (batch upload) | Extend existing PhotoUploader to accept `multiple` attribute, sequential upload with per-file progress state |
| PHOTO-02 | Owner can drag-to-reorder photos to control display order | @dnd-kit/react with useSortable hook, "use client" wrapper pattern, update display_order via server action |
| PHOTO-03 | Owner can organize photos into sections | Add nullable `section` text column to property_photos, preset section quick-add, per-photo section dropdown |
| PHOTO-04 | Owner can add photos to individual experiences/add-ons | Reuse signed URL pattern in AddOnForm, store URL in existing add_ons.photo_url field |
| PHOTO-05 | Guest-facing photo gallery displays sections with polished UI | Extend PhotoGallery with sectioned "show all" view, custom lightbox plugin for section tabs |

</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @dnd-kit/react | 0.3.2 | Drag-to-reorder photos | Already decided -- only React 19 compatible DnD lib |
| @dnd-kit/helpers | latest | `move` utility for reorder logic | Companion to @dnd-kit/react |
| yet-another-react-lightbox | ^3.29.1 | Photo lightbox with section navigation | Already installed and used |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| yet-another-react-lightbox/plugins/counter | (bundled) | Show slide position (e.g., 3/24) | Guest gallery lightbox |
| yet-another-react-lightbox/plugins/thumbnails | (bundled) | Thumbnail strip in lightbox | Optional polish for guest gallery |
| lucide-react | (installed) | Icons for upload, grip handle, sections | Throughout UI |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @dnd-kit/react | HTML5 drag API | No touch support, ugly default ghosts, much more code |
| Custom sectioned gallery | Extending YARL lightbox | YARL has createModule/plugin system -- extend rather than build from scratch |
| Separate sections table | String column on property_photos | String column is simpler, no joins needed, preset order is app-level logic |

**Installation:**
```bash
npm install @dnd-kit/react @dnd-kit/helpers
```

## Architecture Patterns

### Recommended Component Structure
```
src/
├── components/
│   ├── dashboard/
│   │   ├── PhotoUploader.tsx       # EXTEND: batch upload + section assignment + drag reorder
│   │   ├── DndProvider.tsx         # NEW: "use client" wrapper for DragDropProvider
│   │   ├── SortablePhoto.tsx       # NEW: individual draggable photo card with section dropdown
│   │   ├── SectionManager.tsx      # NEW: section CRUD (preset quick-add, custom, delete)
│   │   └── AddOnForm.tsx           # EXTEND: add photo upload button
│   └── property/
│       ├── PhotoGallery.tsx        # EXTEND: add section-aware "show all"
│       ├── SectionedPhotoTour.tsx  # NEW: full-screen sectioned gallery with tabs
│       └── AddOnCard.tsx           # EXTEND: hero image support
├── lib/
│   └── actions/
│       └── photos.ts              # EXTEND: batch support, section update, reorder, experience upload
```

### Pattern 1: "use client" Wrapper for @dnd-kit/react
**What:** @dnd-kit/react v0.3.2 does not include "use client" directive. Its DragDropProvider uses React context (createContext) which fails in Server Components.
**When to use:** Always when importing DragDropProvider.
**Example:**
```typescript
// src/components/dashboard/DndProvider.tsx
'use client'

import { DragDropProvider } from '@dnd-kit/react'
import type { ReactNode } from 'react'

interface DndProviderProps {
  children: ReactNode
  onDragEnd?: (event: { source: any; target: any }) => void
}

export function DndProvider({ children, onDragEnd }: DndProviderProps) {
  return (
    <DragDropProvider onDragEnd={onDragEnd}>
      {children}
    </DragDropProvider>
  )
}
```

### Pattern 2: Sequential Upload with Progress Tracking
**What:** Upload multiple files one at a time, tracking per-file status.
**When to use:** Batch upload -- avoids overwhelming Supabase Storage with concurrent uploads.
**Example:**
```typescript
type FileStatus = 'pending' | 'uploading' | 'done' | 'error'
interface UploadItem {
  file: File
  status: FileStatus
  error?: string
}

// In handleBatchUpload:
const items: UploadItem[] = files.map(f => ({ file: f, status: 'pending' }))
setUploadQueue(items)

for (let i = 0; i < items.length; i++) {
  setUploadQueue(prev => prev.map((item, idx) =>
    idx === i ? { ...item, status: 'uploading' } : item
  ))
  try {
    const result = await getSignedUploadUrl(propertyId)
    // ... upload to signed URL ...
    await savePhotoRecord(propertyId, result.path, activeSection)
    setUploadQueue(prev => prev.map((item, idx) =>
      idx === i ? { ...item, status: 'done' } : item
    ))
  } catch (err) {
    setUploadQueue(prev => prev.map((item, idx) =>
      idx === i ? { ...item, status: 'error', error: err.message } : item
    ))
  }
}
```

### Pattern 3: @dnd-kit/react Sortable for Photo Grid
**What:** New @dnd-kit/react API uses `useSortable` hook with `ref`, `index`, and `group` props.
**When to use:** Photo grid reordering within sections.
**Example:**
```typescript
'use client'

import { useSortable } from '@dnd-kit/react/sortable'

function SortablePhoto({ photo, index, section }: Props) {
  const { ref, isDragging } = useSortable({
    id: photo.id,
    index,
    type: 'photo',
    group: section ?? 'general',
  })

  return (
    <div
      ref={ref}
      className={`relative aspect-video rounded-lg overflow-hidden ${
        isDragging ? 'opacity-50 ring-2 ring-brand-teal' : ''
      }`}
    >
      {/* Photo content + drag handle + section dropdown + delete button */}
    </div>
  )
}
```

### Pattern 4: Extending YARL with Custom Section Navigation
**What:** Use `createModule` from yet-another-react-lightbox to add section tabs as a custom module.
**When to use:** Guest gallery "show all photos" view.
**Example:**
```typescript
import { createModule } from 'yet-another-react-lightbox'
import { useLightboxState, useController } from 'yet-another-react-lightbox'

function SectionTabs({ sections, sectionStartIndices }) {
  const { currentIndex } = useLightboxState()
  const { goto } = useController()

  // Determine active section based on currentIndex
  const activeSection = sections.findLast(
    (s, i) => sectionStartIndices[i] <= currentIndex
  )

  return (
    <div className="flex gap-2 px-4 py-2">
      {sections.map((section, i) => (
        <button
          key={section}
          onClick={() => goto(sectionStartIndices[i])}
          className={activeSection === section ? 'font-bold border-b-2' : ''}
        >
          {section}
        </button>
      ))}
    </div>
  )
}

const sectionTabsModule = createModule('SectionTabs', SectionTabs)
```

### Anti-Patterns to Avoid
- **Concurrent uploads:** Do NOT upload all files in parallel -- Supabase rate limits and browser connection limits will cause failures. Upload sequentially.
- **Re-numbering all display_order on every drag:** Only update the moved item and items that shifted. Or better: update the entire section's order in one batch server action.
- **Storing section as a separate table for this use case:** Adds unnecessary joins and complexity. A nullable string column is sufficient since sections are just labels.
- **Using `useOptimistic` for reorder:** The optimistic state is the drag position itself (visual feedback from @dnd-kit). Only persist on drop via server action.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Drag-and-drop reordering | Custom mouse/touch event handlers | @dnd-kit/react useSortable | Accessibility, touch support, keyboard navigation, collision detection all built-in |
| Photo lightbox | Custom modal with image navigation | yet-another-react-lightbox | Gesture support, preloading, keyboard nav, animation, responsive sizing |
| Signed URL upload | Server action with file body | Existing getSignedUploadUrl pattern | 1MB Server Action limit, security (per CLAUDE.md) |
| File type validation | Manual MIME checking | `accept="image/*"` on input + server-side content-type | Browser handles initial filtering |

## Common Pitfalls

### Pitfall 1: @dnd-kit/react "use client" Missing
**What goes wrong:** `TypeError: createContext is not a function` when DragDropProvider is used in a file that gets server-rendered.
**Why it happens:** @dnd-kit/react v0.3.2 does not include the "use client" directive (GitHub issue #1654).
**How to avoid:** Create a `DndProvider.tsx` wrapper with "use client" at the top. Import ONLY the wrapper, never import DragDropProvider directly.
**Warning signs:** Any import from @dnd-kit/react in a file without "use client".

### Pitfall 2: Display Order Gaps After Delete/Reorder
**What goes wrong:** display_order values become non-contiguous (e.g., 0, 1, 5, 8) causing visual ordering bugs.
**Why it happens:** Deleting photos or reordering without renumbering.
**How to avoid:** On reorder, update ALL photos in the section with contiguous display_order values (0, 1, 2, ...). Use a single server action that takes the ordered array of photo IDs.
**Warning signs:** Photos appearing in wrong order after several edit operations.

### Pitfall 3: Race Condition on Concurrent State Updates During Batch Upload
**What goes wrong:** Upload queue state gets stale during sequential uploads because setState batching doesn't see latest state.
**Why it happens:** Each upload iteration captures state from when the loop started.
**How to avoid:** Always use the functional updater form: `setUploadQueue(prev => prev.map(...))`.
**Warning signs:** Upload progress list showing wrong statuses, items stuck in "uploading" state.

### Pitfall 4: Forgetting to Revalidate Cache After Reorder/Section Change
**What goes wrong:** Photo grid shows stale order after drag-and-drop or section change.
**Why it happens:** Next.js caches server component data; need `revalidatePath` after mutations.
**How to avoid:** Every server action that mutates photo data must call `revalidatePath` for both the owner dashboard and guest listing pages.
**Warning signs:** Changes only visible after manual page refresh.

### Pitfall 5: Section Deletion Orphaning Photos
**What goes wrong:** Photos become invisible because their section no longer exists and there is no fallback.
**Why it happens:** Deleting a section without reassigning its photos.
**How to avoid:** Server action for section deletion must first UPDATE all photos in that section to SET section = NULL (General). Do this atomically.
**Warning signs:** Photo count dropping after section deletion.

### Pitfall 6: Experience Photo Storage Path Collision
**What goes wrong:** Experience photos overwrite property photos or vice versa.
**Why it happens:** Using the same path pattern for both.
**How to avoid:** Use different path prefixes: `{userId}/{propertyId}/{uuid}` for property photos, `experiences/{userId}/{addOnId}/{uuid}` for experience photos.
**Warning signs:** Wrong photo appearing on property or experience.

## Code Examples

### Database Migration: Add Section Column
```sql
-- Migration: 20260308000003_photo_sections.sql
ALTER TABLE property_photos
ADD COLUMN section text;

-- Index for efficient section-based queries
CREATE INDEX idx_property_photos_section
ON property_photos (property_id, section, display_order);
```

### Server Action: Save Photo with Section
```typescript
export async function savePhotoRecord(
  propertyId: string,
  storagePath: string,
  section?: string | null
): Promise<{ error?: string }> {
  await requireOwner()
  const supabase = await createClient()

  const { count } = await supabase
    .from('property_photos')
    .select('*', { count: 'exact', head: true })
    .eq('property_id', propertyId)

  const { error } = await supabase.from('property_photos').insert({
    property_id: propertyId,
    storage_path: storagePath,
    display_order: count ?? 0,
    section: section || null,  // null = General
  })

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/properties/${propertyId}`)
  revalidatePath(`/properties/${propertyId}`)
  return {}
}
```

### Server Action: Reorder Photos in Section
```typescript
export async function reorderPhotos(
  propertyId: string,
  photoIds: string[]  // ordered array
): Promise<{ error?: string }> {
  await requireOwner()
  const supabase = await createClient()

  // Update each photo's display_order in a transaction-like batch
  for (let i = 0; i < photoIds.length; i++) {
    const { error } = await supabase
      .from('property_photos')
      .update({ display_order: i })
      .eq('id', photoIds[i])
      .eq('property_id', propertyId)  // safety: scope to property

    if (error) return { error: error.message }
  }

  revalidatePath(`/dashboard/properties/${propertyId}`)
  revalidatePath(`/properties/${propertyId}`)
  return {}
}
```

### Server Action: Update Photo Section
```typescript
export async function updatePhotoSection(
  photoId: string,
  propertyId: string,
  section: string | null
): Promise<{ error?: string }> {
  await requireOwner()
  const supabase = await createClient()

  const { error } = await supabase
    .from('property_photos')
    .update({ section: section || null })
    .eq('id', photoId)
    .eq('property_id', propertyId)

  if (error) return { error: error.message }

  revalidatePath(`/dashboard/properties/${propertyId}`)
  revalidatePath(`/properties/${propertyId}`)
  return {}
}
```

### Experience Photo Upload (AddOn)
```typescript
export async function getExperienceUploadUrl(
  addOnId: string,
  propertyId: string
): Promise<{ signedUrl: string; token: string; path: string } | { error: string }> {
  const user = await requireOwner()
  const supabase = await createClient()

  // Verify add-on belongs to owner's property
  const { data: addOn } = await supabase
    .from('add_ons')
    .select('id, property_id')
    .eq('id', addOnId)
    .single()

  if (!addOn) return { error: 'Add-on not found' }

  // Verify property ownership
  const { data: prop } = await supabase
    .from('properties')
    .select('id')
    .eq('id', addOn.property_id)
    .eq('owner_id', user.id)
    .single()

  if (!prop) return { error: 'Access denied' }

  const path = `experiences/${user.id}/${addOnId}/${crypto.randomUUID()}`
  const { data, error } = await supabase.storage
    .from('property-photos')
    .createSignedUploadUrl(path)

  if (error) return { error: error.message }
  return { signedUrl: data.signedUrl, token: data.token, path }
}

export async function saveExperiencePhoto(
  addOnId: string,
  storagePath: string
): Promise<{ error?: string }> {
  await requireOwner()
  const supabase = await createClient()

  const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-photos/${storagePath}`

  const { error } = await supabase
    .from('add_ons')
    .update({ photo_url: publicUrl })
    .eq('id', addOnId)

  if (error) return { error: error.message }
  return {}
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| @dnd-kit/core + @dnd-kit/sortable | @dnd-kit/react (unified) | 2024-2025 | New API: DragDropProvider + useSortable with ref pattern instead of DndContext + useSortable with listeners/attributes |
| YARL basic usage | YARL with createModule plugin system | v3.x (current) | Full custom UI modules possible via plugin API |
| Single file upload | Batch with progress | This phase | Sequential signed URL upload with per-file state |

**Important API difference:** The NEW @dnd-kit/react uses a simpler API than the old @dnd-kit/core:
- `useSortable` returns `{ ref, isDragging }` -- just attach `ref` to the element
- No more `listeners`, `attributes`, `transform`, `transition` from the old API
- `DragDropProvider` replaces `DndContext` + `SortableContext`
- `move` helper from `@dnd-kit/helpers` simplifies array reordering

## Open Questions

1. **@dnd-kit/react stability**
   - What we know: v0.3.2 is pre-1.0, issue #1654 confirmed but workaround exists
   - What's unclear: Whether the API will change significantly before 1.0
   - Recommendation: Use the wrapper pattern. Pin the version. The API surface we need (useSortable for a flat list) is stable enough.

2. **YARL section tabs: extend vs custom**
   - What we know: YARL has createModule, useLightboxState, useController hooks for building custom UI
   - What's unclear: How well section tabs integrate with YARL's existing UI (toolbar, counter, etc.)
   - Recommendation: Try extending YARL with createModule first. Fall back to a custom full-screen gallery only if YARL's module system proves too limiting for the section tab UX.

3. **Display order scoping**
   - What we know: Currently display_order is global per property. With sections, it could be per-section or remain global.
   - What's unclear: Whether the hero grid (which pulls from all sections) needs a global order
   - Recommendation: Keep display_order global across the property. The hero grid uses the top 5 by global display_order. Within-section reordering updates global display_order for all photos to maintain consistency.

## Sources

### Primary (HIGH confidence)
- Existing codebase: PhotoUploader.tsx, PhotoGallery.tsx, photos.ts server actions -- direct code inspection
- Existing codebase: database.ts types, schema migration -- direct code inspection
- [YARL Advanced API](https://yet-another-react-lightbox.com/advanced) -- createModule, hooks documentation
- [YARL Plugins](https://yet-another-react-lightbox.com/plugins) -- available built-in plugins
- [GitHub #1654](https://github.com/clauderic/dnd-kit/issues/1654) -- "use client" issue confirmation and wrapper workaround

### Secondary (MEDIUM confidence)
- [@dnd-kit/react sortable guide](https://dndkit.com/react/guides/multiple-sortable-lists) -- new API patterns (DragDropProvider, useSortable with ref)
- [GitHub #1695](https://github.com/clauderic/dnd-kit/issues/1695) -- confirmation of new API shape (useSortable returns { ref, isDragging })

### Tertiary (LOW confidence)
- @dnd-kit/react v0.3.2 detailed API surface -- pre-1.0, limited docs available, may need to inspect node_modules during implementation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- libraries already installed or decided, versions known
- Architecture: HIGH -- extending well-understood existing patterns
- Pitfalls: HIGH -- common patterns with known failure modes from codebase experience
- @dnd-kit/react API details: MEDIUM -- pre-1.0 library, docs are sparse, wrapper workaround is confirmed

**Research date:** 2026-03-08
**Valid until:** 2026-04-08 (30 days -- all libraries are stable enough for this window)
