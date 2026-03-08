# Phase 10: Photo Management - Context

**Gathered:** 2026-03-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Owners have full control over property photo presentation — bulk upload, custom ordering via drag-and-drop, organized sections with presets and custom names, and experience photos. Guests see a polished, sectioned photo gallery comparable to Airbnb photo tours. Use /frontend-design skill throughout for high-end aesthetic.

</domain>

<decisions>
## Implementation Decisions

### Batch Upload
- Multi-select file picker — same "Upload Photo" button but accepts multiple files
- Files upload sequentially in selection order via existing signed URL pattern
- Inline progress list showing each file's status (uploading/done/error)
- Photos appear in the grid as each upload completes
- File size validation only — reject files over 10MB, no dimension checks
- Warning at 30 photos per property (soft limit, not hard block)
- Photos are assigned to whichever section is active at upload time

### Photo Sections
- Preset sections available as quick-add: Rooms, Common Area, Pool, Exterior
- Owner can add custom-named sections
- Photos default to "General" if no section is selected
- Fixed section display order: presets first in defined order, custom sections after in creation order
- Per-photo dropdown to switch section assignment
- Drag-and-drop (via @dnd-kit/react) to reorder photos within a section
- Deleting a section moves its photos to "General" — photos never lost
- Section stored as a column on property_photos table (nullable string, null = General)

### Guest Gallery
- Top-level: keep the existing 5-photo hero grid (pulls from all sections by display_order)
- "Show all photos" opens a full-screen photo tour organized by section headers
- Lightbox has section name tabs at top for quick navigation between sections
- Also supports sequential left/right navigation through all photos
- Use /frontend-design skill for the gallery — Airbnb photo tour level polish
- yet-another-react-lightbox already installed — extend or replace as needed for sections

### Experience Photos
- Single photo per experience (use existing `photo_url` nullable field on add_ons table)
- Add upload button to AddOnForm using same signed URL upload pattern
- Experience card shows photo as hero image above name and pricing
- If no photo, falls back to current text-only card style
- Storage path: same bucket (property-photos), different path prefix for experiences

### Design Quality
- Use /frontend-design skill throughout ALL implementation — upload UX, section management, gallery, experience cards
- Target aesthetic: Airbnb-like, high-end, competitive service feel
- Polished drag-and-drop interactions, smooth upload progress, elegant gallery transitions

### Claude's Discretion
- Exact section tab UI in the lightbox (pills, underline tabs, etc.)
- Upload progress list visual design
- @dnd-kit/react wrapper pattern if needed (known issue #1654 with "use client")
- Whether to extend yet-another-react-lightbox or build custom sectioned gallery
- Exact drag-and-drop handle design for photo reordering
- Migration naming for section column addition
- Whether section is a string column on property_photos or a separate table (lean toward simpler string column)

</decisions>

<specifics>
## Specific Ideas

- Upload should feel seamless — select multiple files, watch them appear one by one in the grid
- Section tabs in the lightbox should feel like navigating an Airbnb property photo tour
- Experience cards with hero photos should make add-ons feel premium and worth selecting
- The whole photo management area should feel like a first-class property management tool, not an afterthought

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `PhotoUploader` (`src/components/dashboard/PhotoUploader.tsx`): Single-file upload with signed URL pattern — extend to multi-file
- `PhotoGallery` (`src/components/property/PhotoGallery.tsx`): 5-photo hero grid + lightbox via yet-another-react-lightbox — extend with sections
- `photos.ts` server actions (`src/lib/actions/photos.ts`): getSignedUploadUrl, savePhotoRecord, deletePhoto — reuse for batch and experience uploads
- `AddOnForm` (`src/components/dashboard/AddOnForm.tsx`): Experience form — add photo upload button
- `AddOnCard` (`src/components/property/AddOnCard.tsx`): Experience display card — add hero photo

### Established Patterns
- Signed URL upload: getSignedUploadUrl → browser uploads to Supabase Storage → savePhotoRecord
- display_order: integer on property_photos, auto-incremented on upload
- yet-another-react-lightbox: already installed and used for photo lightbox
- @dnd-kit/react: decided for drag-to-reorder (v0.3.2, known issue #1654 with "use client")
- Supabase Storage bucket: "property-photos" with public read

### Integration Points
- `PropertyPhoto` type in `database.ts`: needs `section` field (nullable string)
- `property_photos` table: needs section column via migration
- Owner property detail page (`src/app/(owner)/dashboard/properties/[propertyId]/page.tsx`): renders PhotoUploader
- Guest listing page (`src/app/(guest)/properties/[propertyId]/page.tsx`): renders PhotoGallery
- AddOn type already has `photo_url` — no schema change needed for experience photos

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 10-photo-management*
*Context gathered: 2026-03-08*
