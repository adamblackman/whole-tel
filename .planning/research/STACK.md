# Technology Stack

**Project:** Whole-Tel v1.1 -- Rebrand & Owner Enhancements
**Researched:** 2026-03-07
**Scope:** New libraries/patterns needed for v1.1 features ONLY. Core stack (Next.js 16, Supabase, Stripe, shadcn/ui, React Bits) is validated and unchanged.

---

## New Dependencies for v1.1

### Drag-and-Drop (Photo Reordering)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @dnd-kit/react | ^0.3.2 | Photo grid drag-to-reorder | The only production-ready React DnD library with React 19 support. Built specifically for React (not a generic DOM wrapper). Supports sortable grids natively -- exactly what photo reordering needs. |
| @dnd-kit/dom | ^0.3.2 | Required peer dependency of @dnd-kit/react | Core DnD engine that @dnd-kit/react builds on. Installed automatically as dependency. |

**Why NOT alternatives:**

| Alternative | Why Not |
|-------------|---------|
| @hello-pangea/dnd | Does NOT support React 19. Latest release (18.0.1) is over a year old. Open issue #864 requesting React 19 support with no timeline. This project runs React 19.2.3 -- incompatible. |
| @dnd-kit/core + @dnd-kit/sortable (legacy API) | The old API (v5.x). The maintainer is moving to @dnd-kit/react as the new React-first API. Legacy packages still work but are being deprecated in favor of the new architecture. Use the new API for a greenfield feature. |
| react-beautiful-dnd | Abandoned. Superseded by @hello-pangea/dnd, which itself lacks React 19 support. |
| Native HTML5 drag-and-drop | No touch support, no smooth animations, no accessibility. Unacceptable for an Airbnb-quality UI. |

**Integration notes:**
- @dnd-kit/react provides `useSortable` hook and `SortableContext` -- wrap the existing photo grid in these.
- On drag end, update `display_order` for affected photos via a Server Action (batch update).
- The existing `PhotoUploader.tsx` component becomes the container; each photo thumbnail becomes a sortable item.
- Touch and pointer support is built in -- critical for mobile owner dashboard usage.

### Batch File Upload

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| *No new library needed* | -- | Multi-file selection | The existing `<input type="file">` just needs `multiple` attribute added. The signed URL upload pattern already works. Loop over selected files and upload each with its own signed URL. |

**Why NOT react-dropzone:**
- The existing upload UX is a button click, not a drag-drop zone. Adding a large dropzone area to the photo management UI is unnecessary visual clutter for a dashboard that already has a clean layout.
- The only thing react-dropzone adds is drag-from-desktop-to-browser-zone, which is a nice-to-have for a file management app but not essential for a hotel listing form where owners upload 5-20 photos.
- If drag-to-upload UX is wanted later, react-dropzone v14.3.6+ supports React 19 and can be added incrementally. But do not add it preemptively.

**Implementation approach:**
- Change `<input type="file" accept="image/*">` to `<input type="file" accept="image/*" multiple>`.
- On change, iterate over `e.target.files` (FileList), get a signed URL for each, upload in parallel (with a concurrency limit of 3 to avoid rate limits).
- Show per-file upload progress indicators using local state.

---

## shadcn/ui Components to Add

These components are NOT npm dependencies (shadcn copies source into the project), but they need to be added via the CLI for v1.1 features.

| Component | Install Command | Used For |
|-----------|----------------|----------|
| Accordion | `npx shadcn@latest add accordion` | Expandable booking details -- each booking row expands to show guest list, add-ons, pricing breakdown |
| Collapsible | `npx shadcn@latest add collapsible` | Photo sections -- "Rooms", "Common Area", "Pool" sections that expand/collapse in the owner dashboard |
| Tabs | `npx shadcn@latest add tabs` | Bed configuration UI -- tab per bedroom, or tiered pricing tab vs base pricing tab |
| Dialog | `npx shadcn@latest add dialog` | Guest invite modal -- enter email, send invite. Also useful for photo section management. |
| Tooltip | `npx shadcn@latest add tooltip` | Bed type icons, pricing tier help text, invite status indicators |
| Dropdown Menu | `npx shadcn@latest add dropdown-menu` | Photo actions (set as cover, move to section, delete), booking actions |

**Already installed (no action needed):** Button, Card, Input, Label, Form, Select, Textarea, Badge, Table, Separator, Alert Dialog, Calendar.

**Note:** The project already has `radix-ui@1.4.3` (unified package) installed, so all Radix primitives these shadcn components depend on are already available. The shadcn CLI just generates the styled wrapper components.

---

## No New Libraries Needed For

| Feature | Why No New Library |
|---------|-------------------|
| **Photo sections** | Database schema change (add `section` column to `property_photos`) + existing Select component for section assignment. The Collapsible shadcn component handles the UI grouping. |
| **Bed configuration** | Pure form UI: array of `{bed_type, count}` objects. Use existing Input + Select + Button components. No specialized bed/room library exists or is needed. |
| **Tiered per-person pricing** | Form fields for `threshold_guests` and `per_person_rate`. Pricing calculation is server-side math in the booking flow. No library needed. |
| **Experience photos** | Reuse the same `PhotoUploader` pattern but for `experience_photos` table instead of `property_photos`. Same Supabase Storage bucket. |
| **Experience tiered pricing** | Same pattern as property tiered pricing. Form fields + server-side calculation. |
| **Guest invite system** | Supabase Auth for user lookup, Resend (already installed v6.9.3) for invite emails, new `booking_guests` junction table. No new library. |
| **Expandable booking details** | shadcn Accordion component (to be added). No runtime library needed beyond Radix primitives already installed. |
| **Rebrand** | Copy/content changes only. No library implications. |

---

## Recommended Stack (v1.1 Additions Only)

### Install Command

```bash
# New runtime dependency -- drag-and-drop for photo reordering
pnpm add @dnd-kit/react

# New shadcn/ui components (copies source, no npm dependency)
npx shadcn@latest add accordion collapsible tabs dialog tooltip dropdown-menu
```

That is it. One new npm dependency (`@dnd-kit/react`, which pulls `@dnd-kit/dom` as a peer). Everything else is either already installed or handled by shadcn component generation.

---

## What NOT to Add

| Temptation | Why Resist |
|------------|-----------|
| react-dropzone | Existing `<input multiple>` pattern is sufficient. Adds 12KB for drag-from-desktop UX that is not a requirement. |
| @hello-pangea/dnd | Incompatible with React 19. Would require downgrading React or using --legacy-peer-deps (fragile). |
| react-sortable-hoc | Deprecated, uses legacy findDOMNode API removed in React 19. |
| Framer Motion (for drag) | Massive bundle (32KB+). @dnd-kit handles drag animations natively. Framer Motion is fine for page transitions but overkill for sortable grids. |
| TanStack Query | Not needed for v1.1. All new features use Server Actions for mutations and Server Components for reads. Client-side cache invalidation is handled by `revalidatePath()` in Server Actions. |
| Supabase Realtime | Not needed until v2. Guest invites use email, not live push. Booking status uses server-side queries. |
| nanoid / uuid (for invite tokens) | Already have `crypto.randomUUID()` in Node.js 20+ and Supabase can generate UUIDs server-side. No library needed. |
| @stripe/react-stripe-js | No new Stripe UI needed for v1.1. Tiered pricing is calculated server-side before creating the Checkout Session. |

---

## Version Compatibility Check

| New Package | React 19.2.3 | Next.js 16.1.6 | Notes |
|-------------|--------------|-----------------|-------|
| @dnd-kit/react@0.3.2 | Compatible | Compatible | Published Feb 2026, built for React 19. Has open issue (#1654) about "use client" directive -- may need to add "use client" to wrapper component, which we are doing anyway since drag is inherently client-side. |
| @dnd-kit/dom@0.3.2 | N/A (no React dep) | Compatible | Core engine, framework-agnostic. |

---

## Integration Points with Existing Code

### PhotoUploader.tsx Evolution

The existing `PhotoUploader.tsx` handles single-file upload + delete. For v1.1 it needs:

1. **Batch upload**: Add `multiple` to file input, loop over FileList with parallel signed URL uploads.
2. **Drag reorder**: Wrap photo grid in `@dnd-kit/react` SortableContext, make each photo a sortable item.
3. **Photo sections**: Add section selector (shadcn Select) per photo or per batch. Group photos by section in display.
4. **Cover photo**: First photo in "Hero" section (or `display_order: 0`) becomes the listing cover.

### PropertyForm.tsx Evolution

The existing form needs new sections for:

1. **Bed configuration**: Dynamic array of `{bed_type: enum, count: number}` with add/remove buttons. Use existing Input + Select.
2. **Tiered pricing**: Additional fields below nightly rate -- `guest_threshold` (number) and `per_person_rate` (currency).

### Booking Detail Evolution

Currently `BookingsTable.tsx` shows a flat table. For v1.1:

1. Wrap each row in shadcn Accordion for expandable details.
2. Expanded view shows: guest list (from `booking_guests` table), add-on selections, pricing breakdown, invite actions.

### Guest Invite Flow

1. Owner or booking creator opens invite dialog (shadcn Dialog).
2. Enters email, Server Action checks if user exists in Supabase Auth.
3. If exists: add to `booking_guests` table, send notification via Resend.
4. If not: send invite email via Resend with signup link containing booking reference.

---

## Sources

- [@dnd-kit/react on npm](https://www.npmjs.com/package/@dnd-kit/react) -- v0.3.2, published Feb 2026, React 19 compatible. HIGH confidence.
- [@dnd-kit/dom on npm](https://www.npmjs.com/@dnd-kit/dom) -- v0.3.2, published Feb 2026. HIGH confidence.
- [dnd-kit "use client" issue #1654](https://github.com/clauderic/dnd-kit/issues/1654) -- React 19 Server Components compatibility note. MEDIUM confidence.
- [@hello-pangea/dnd React 19 discussion #810](https://github.com/hello-pangea/dnd/discussions/810) -- Confirms no React 19 support. HIGH confidence.
- [@hello-pangea/dnd React 19 issue #864](https://github.com/hello-pangea/dnd/issues/863) -- Open issue, no resolution. HIGH confidence.
- [react-dropzone v14.3.6 release](https://github.com/react-dropzone/react-dropzone/releases) -- React 19 fix, but not needed for this project. MEDIUM confidence.
- [shadcn/ui Accordion docs](https://ui.shadcn.com/docs/components/radix/accordion) -- Built on Radix, supports type="multiple". HIGH confidence.
- [shadcn/ui Collapsible docs](https://ui.shadcn.com/docs/components/radix/collapsible) -- Three-part API (Collapsible, Trigger, Content). HIGH confidence.
- [Top 5 DnD Libraries for React 2026](https://puckeditor.com/blog/top-5-drag-and-drop-libraries-for-react) -- Ecosystem comparison. MEDIUM confidence.

---

*Stack research for: Whole-Tel v1.1 enhancements*
*Researched: 2026-03-07*
