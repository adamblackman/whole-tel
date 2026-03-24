# Technology Stack

**Project:** Whole-Tel v1.2 — Amenities, Calendar & Client Refinements
**Researched:** 2026-03-23
**Scope:** New libraries/patterns needed for v1.2 features ONLY. Everything from v1.1 STACK.md is still valid and in production.
**Confidence:** HIGH

---

## Context: What Already Exists

Before listing new additions, the following are already installed and in use — do NOT add duplicates:

| Existing Capability | Package | Notes |
|---------------------|---------|-------|
| Drag-and-drop | `@dnd-kit/react@0.3.2`, `@dnd-kit/helpers@0.3.2` | Used for photo reordering in owner dashboard |
| Form handling | `react-hook-form@7.71.2`, `@hookform/resolvers@5.2.2`, `zod@4.3.6` | Multi-field forms already wired up |
| Date utilities | `date-fns@4.1.0` | Date formatting, arithmetic |
| Date picker | `react-day-picker@9.14.0` | Already powers booking date range UI |
| Email | `resend@6.9.3` | Transactional email for invites |
| Payments | `stripe@20.4.0` | Checkout + webhooks operational |
| Icons | `lucide-react@0.576.0` | Already used for amenity icons in `AmenityList.tsx` |
| File upload | `<input multiple>` + Supabase signed URLs | Pattern validated in v1.1 photo manager |

---

## New Dependencies for v1.2

### 1. Interactive Calendar / Itinerary Builder

**Decision: Use `@fullcalendar/react` with the interaction + timegrid plugins.**

The itinerary builder requires a week/day timeline view with 30-minute time slots, draggable activity cards, and visual availability windows. This is a full calendar UX problem, not a list or sortable grid. `@dnd-kit/react` handles list reordering; it does not provide a calendar grid, time-slot snapping, or the visual timeline that this feature requires. These are fundamentally different UI primitives.

| Package | Version | Purpose | Why |
|---------|---------|---------|-----|
| `@fullcalendar/react` | `6.1.20` | React wrapper for FullCalendar engine | Explicitly supports React 19 (declared in peer deps since v6.1.14). Actively maintained — v6.1.20 released Jan 2026. |
| `@fullcalendar/core` | `6.1.20` | Required peer dependency of all FC packages | Provides the calendar engine; must be installed alongside the React adapter. |
| `@fullcalendar/timegrid` | `6.1.20` | Week/day views with hourly rows | Needed for time-slot display — the "itinerary day" view with draggable hour blocks. |
| `@fullcalendar/interaction` | `6.1.20` | Drag-drop and resize for calendar events | Enables dragging activities between time slots. Works with timegrid out of the box. |
| `@fullcalendar/daygrid` | `6.1.20` | Month/week grid view | Needed if the itinerary has a multi-day overview mode. Can be omitted if day view only, but add for completeness. |

**Why NOT build on `@dnd-kit/react` for the calendar:**
The project already uses `@dnd-kit/react` for photo reordering (sortable list). Building a calendar time-grid with time-snapping drag behavior on top of raw DnD primitives would require building a custom calendar engine from scratch — column layout, slot calculation, event overlap handling, resize handles. That is 2-3 weeks of work that FullCalendar ships as a tested package. Use the right tool.

**Why NOT `react-big-calendar`:**
react-big-calendar does not include drag-drop built-in; it requires a separate addon (`react-big-calendar/lib/addons/dragAndDrop`) plus manual wiring. FullCalendar's interaction plugin is the same API as the calendar itself — no separate addon coordination. FullCalendar also ships its own styles in the JS bundle starting in v6, eliminating the CSS import complexity that plagued v5 + Next.js App Router.

**React 19 compatibility verified:**
`npm info @fullcalendar/react@6.1.20 peerDependencies` returns `react: '^16.7.0 || ^17 || ^18 || ^19'`. React 19 support was added in v6.1.14 and is explicit in all subsequent releases. HIGH confidence.

**Integration with existing `@dnd-kit/react`:**
No conflict. FullCalendar manages its own drag state internally within the calendar container. `@dnd-kit/react` continues to handle photo reorder on the owner dashboard. The two DnD systems do not share context and will not interfere.

**"use client" requirement:**
FullCalendar is a purely client-side library (DOM manipulation for resize/drag). Wrap in a `'use client'` component boundary, same pattern as the existing `DndProvider.tsx`. The calendar data (activities, availability windows) can still be fetched server-side and passed as props.

---

### 2. Split Payment System

**Decision: No new Stripe library. Custom database tracking with existing Stripe Checkout.**

The PROJECT.md explicitly scopes this as "Split payment system with guest registration (all attendees: name, email, phone)" and separately notes "Individual payment splitting (each guest pays separately) — calculator only for now" is OUT OF SCOPE.

This means the feature is:
1. Collect registered guest list (name, email, phone) on booking
2. Show per-person cost (total / guest count)
3. Track payment deadline rules (36hr first payment)
4. NOT: each guest pays their own share through separate Stripe charges

This does not require Stripe Connect, additional Stripe packages, or a new payment library. It requires:
- A `booking_registrations` table (guest name, email, phone, booking_id)
- Payment deadline logic in the booking flow
- Deadline reminder emails via existing Resend

| Approach | Package | Why |
|----------|---------|-----|
| Guest registration form | `react-hook-form` + `zod` (already installed) | Multi-field form per guest — name, email, phone. Same pattern as existing booking form. |
| Payment deadlines | Custom Supabase column + cron or Supabase Edge Functions | `payment_due_at` timestamp on booking. Check on booking load. No new library. |
| Deadline emails | `resend` (already installed) | New email template for payment reminders. Resend supports scheduled sends or use Supabase cron to trigger. |

**What NOT to add for split payments:**
- Stripe Connect: Not needed. All payments still go to Whole-Tel's single Stripe account. Connect is for marketplace payouts to third parties.
- Any "split billing" SaaS (Splitwise API, etc.): Out of scope. This is a display/registration feature, not a financial splitting feature.

---

### 3. Partner Application Form

**Decision: No new library. react-hook-form already handles multi-step forms and file uploads.**

The partner application is a multi-section form with file uploads (property photos, documents). The project already has:
- `react-hook-form` + `zod` for form state and validation
- Supabase Storage with signed URL uploads (validated pattern from photo manager)
- `resend` for notification emails

A multi-step wizard UI can be built with React local state controlling which step is visible. The form data accumulates in a single `useForm` instance across steps — this is a standard react-hook-form pattern.

The one potential addition is a file drop zone for document uploads in the application form:

| Package | Version | Purpose | Add? |
|---------|---------|---------|------|
| `react-dropzone` | `15.0.0` | Drag-from-desktop file drop for application documents | OPTIONAL — only if UX spec requires drag-drop zone. The existing `<input type="file">` pattern works. The v1.1 STACK.md consciously deferred react-dropzone. Add only if the partner application explicitly needs a polished drop zone UX rather than a file picker button. |

**If added:**
`react-dropzone@15.0.0` peer dep declares `react: '>= 16.8 || 18.0.0'` in npm metadata, but the library uses standard React hooks and has been confirmed working with React 19 in community usage. The peer dep metadata is a documentation gap, not a true incompatibility. Install with `--legacy-peer-deps` only if npm complains; pnpm typically handles this without flags.

**What NOT to add:**
- Formik: Project uses react-hook-form. Do not mix form libraries.
- React Wizard / Stepper libraries (e.g., react-step-wizard): Over-engineered for a 3-4 step form. Custom step state is 10 lines of React.

---

### 4. Amenities Management System

**Decision: No new library. The groundwork already exists.**

`AmenityList.tsx` already exists with a `lucide-react` icon map for common amenity types. The new system adds:
1. Owner UI to select/manage amenities per property (checkboxes + category grouping)
2. Database storage (`property_amenities` table or JSONB column)
3. Guest-facing display (extends existing `AmenityList.tsx`)

The categorization (Water, Social, Work/Event, Culinary, Wellness) is a UI concern — `shadcn/ui` Tabs or a section grouping with existing components handles this. `lucide-react` already provides all needed icons (pool, gym, WiFi, etc.). No additional icon library needed.

| Feature | Approach | Package |
|---------|----------|---------|
| Owner amenity selector | Checkbox grid, grouped by category | shadcn `Checkbox` component (add via CLI) |
| Category tabs | Organize amenities into Water/Social/etc. sections | shadcn `Tabs` (add via CLI if not already present) |
| Guest display | Extend existing `AmenityList.tsx` with category headers | No change to icon mapping |
| Storage | JSONB column on `properties` table or `property_amenities` join table | Supabase (no new library) |

---

## shadcn/ui Components to Add for v1.2

These are CLI-generated, not npm dependencies.

| Component | CLI Command | Used For |
|-----------|-------------|----------|
| Checkbox | `npx shadcn@latest add checkbox` | Amenity selector in owner dashboard |
| Tabs (if not present) | `npx shadcn@latest add tabs` | Amenity category grouping (may already be installed from v1.1 — check first) |
| Progress | `npx shadcn@latest add progress` | Multi-step partner application progress indicator |

**Already installed from v1.1 (do not re-add):** Accordion, Collapsible, Dialog, Tooltip, Dropdown Menu.

---

## Installation Commands

```bash
# FullCalendar — calendar/itinerary builder
pnpm add @fullcalendar/react @fullcalendar/core @fullcalendar/timegrid @fullcalendar/interaction @fullcalendar/daygrid

# shadcn components (generates source files, no npm install)
npx shadcn@latest add checkbox progress

# Optional: react-dropzone for partner application file drop zone
# Only add if UX spec requires drag-drop zone (not just file picker button)
pnpm add react-dropzone
```

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| `@fullcalendar/react` v6 | Build calendar on `@dnd-kit/react` | Raw DnD primitives don't include calendar grid, time snapping, event overlap, or resize. Would require building a calendar engine. |
| `@fullcalendar/react` v6 | `react-big-calendar` | No built-in drag-drop; requires separate addon coordination. CSS import issues with Next.js App Router. Lower overall DX. |
| Supabase custom tables for payment tracking | Stripe Connect | Stripe Connect is for multi-party payouts. Whole-Tel keeps all payments on one account by design (PROJECT.md Key Decisions). Connect adds significant complexity for no benefit here. |
| `react-hook-form` multi-step (already installed) | Formik | Project already uses RHF. Two form libraries = maintenance nightmare. |
| `lucide-react` (already installed) for amenity icons | react-icons | Already in codebase with existing icon map. react-icons is 100KB+; lucide covers all needed icons. |

---

## What NOT to Add

| Temptation | Why Resist |
|------------|-----------|
| `@dnd-kit/react` calendar grid | Already in use for list sorting. Does not provide calendar timeline UX. Use FullCalendar for calendar features. |
| `react-beautiful-dnd` / `@hello-pangea/dnd` | Incompatible with React 19. Already resolved in v1.1. |
| Stripe Connect | All payments go to Whole-Tel account. Connect is for marketplace payouts. Explicitly out of scope in PROJECT.md. |
| Stripe Payment Intents (individual guest payments) | Out of scope per PROJECT.md: "Individual payment splitting — calculator only for now." |
| Supabase Realtime | Not needed until v2. No live collaboration features in v1.2 scope. |
| Date picker library for calendar | `react-day-picker` is already installed for booking date range. FullCalendar has its own navigation. No third date library needed. |
| Stepper/wizard UI library | Partner form is 3-4 steps. Local React state handles step progression in 10 lines. Libraries add bundle weight and styling conflicts. |

---

## Version Compatibility

| Package | Version | React 19.2.3 | Next.js 16.1.6 | Notes |
|---------|---------|--------------|-----------------|-------|
| `@fullcalendar/react` | `6.1.20` | Explicit `^19` peer dep | Compatible | Must use `'use client'` wrapper. CSS is bundled in JS (no separate import). |
| `@fullcalendar/core` | `6.1.20` | N/A (no React dep) | Compatible | Required alongside React adapter. |
| `@fullcalendar/timegrid` | `6.1.20` | N/A | Compatible | Peer dep on `@fullcalendar/core ~6.1.20`. |
| `@fullcalendar/interaction` | `6.1.20` | N/A | Compatible | Peer dep on `@fullcalendar/core ~6.1.20`. |
| `@fullcalendar/daygrid` | `6.1.20` | N/A | Compatible | Peer dep on `@fullcalendar/core ~6.1.20`. |
| `react-dropzone` | `15.0.0` (if added) | Functional (peer dep metadata gap) | Compatible | Peer dep says `>= 16.8 || 18.0.0` but works on React 19. Use `--legacy-peer-deps` only if npm blocks install. |

---

## Integration Points with Existing Code

### FullCalendar + existing `@dnd-kit/react`

No conflict. They live in separate component trees:
- `@dnd-kit/react` → `DndProvider` → photo management in owner dashboard
- FullCalendar → `ItineraryCalendar` component → booking flow / guest itinerary view

Neither shares DnD context with the other.

### FullCalendar + existing `date-fns`

FullCalendar v6 has its own internal date handling. For date formatting in surrounding UI (e.g., displaying "March 24" labels outside the calendar), continue using `date-fns`. Do not add a FullCalendar date adapter unless the calendar needs to consume dates from a locale-specific source.

### Partner Application + existing photo upload pattern

The partner application file uploads (property photos, documents) should reuse the same signed URL upload pattern from `PhotoUploader.tsx`. Do not build a second upload mechanism. Extract the upload logic into a shared utility if needed.

### Amenities + existing `AmenityList.tsx`

The existing `AmenityList.tsx` uses a flat icon map keyed by string name. For v1.2, this needs to be extended with category metadata (Water, Social, etc.). The simplest approach: add a `AMENITY_CATEGORIES` constant grouping amenity names, and render category headers above each group. No new library.

---

## Sources

- `npm info @fullcalendar/react@6.1.20 peerDependencies` — React 19 peer dep verified directly. HIGH confidence.
- [FullCalendar React Component docs](https://fullcalendar.io/docs/react) — Integration guide, "use client" pattern. HIGH confidence.
- [FullCalendar v6 Upgrade Guide](https://fullcalendar.io/docs/upgrading-from-v5) — CSS now bundled in JS (no separate import). HIGH confidence.
- `npm info react-dropzone version` — v15.0.0 confirmed. MEDIUM confidence (React 19 peer dep gap noted).
- Existing `package.json` — Confirmed all v1.1 dependencies in production. HIGH confidence.
- Existing `DndProvider.tsx` — `@dnd-kit/react` usage pattern confirmed. HIGH confidence.
- Existing `AmenityList.tsx` — Existing amenity icon map confirmed; no new icon library needed. HIGH confidence.
- PROJECT.md v1.2 scope — Split payment "calculator only" scope confirmed. HIGH confidence.

---

*Stack research for: Whole-Tel v1.2 — Calendar, Split Payments, Partner Application, Amenities*
*Researched: 2026-03-23*
