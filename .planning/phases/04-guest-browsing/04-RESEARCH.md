# Phase 4: Guest Browsing - Research

**Researched:** 2026-03-04
**Domain:** Next.js 16 App Router — public-facing property browsing, photo gallery with lightbox, date range picker with availability, add-on display, destination filtering via URL search params, React Bits animations, brand aesthetic
**Confidence:** HIGH

---

## Summary

Phase 4 builds the public guest-facing side of Whole-Tel: a destination browsing page and a full property listing page. The data is entirely read-only from the guest perspective — all content was seeded in Phase 1 and managed by owners in Phase 3. The RLS policies from Phase 1 grant public read access to `properties`, `property_photos`, `add_ons`, and `bookings` with `TO anon, authenticated`, so no auth is required for browsing. The pages are Server Components with selective Client Components for interactive UI elements.

The most architecturally important decisions in this phase are: (1) the destination filter pattern — URL search params read by the Server Component page, Client Component for the interactive filter buttons; (2) the photo gallery and full-screen lightbox — requires a dedicated lightbox library because hand-rolling an accessible modal gallery is a major scope risk; (3) the date-selection pricing widget — a Client Component that reads nightly rate and check-out/check-in dates to compute an estimated total before booking. The availability calendar reads confirmed bookings from the database to disable already-booked date ranges.

React Bits provides the brand animation layer (Blur Text, Fade Content). These are copy-paste/CLI installed as individual components — there is no npm package to install. React Bits is not a shadcn replacement; shadcn/ui provides form primitives and layout components, React Bits provides motion and delight. For the lightbox, `yet-another-react-lightbox` is the clear ecosystem choice: actively maintained, works with `next/image`, React 19 compatible, plugin-based architecture. For the availability calendar, shadcn's `Calendar` component (built on `react-day-picker` v9) supports a `disabled` prop that accepts arrays of date ranges — perfect for blocking confirmed booking dates.

**Primary recommendation:** Destination browse page uses URL `?destination=` search param read by the Server Component page prop and filtered in the Supabase query. Property listing page is a Server Component for data fetching with three isolated Client Components: `PhotoGallery` (lightbox), `PricingWidget` (date selection + price calc), and optionally `DestinationFilter` (URL param updates). No client-side data fetching needed.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROP-01 | Property listing page displays photo gallery with full-screen view | `yet-another-react-lightbox` handles the fullscreen modal. A `PhotoGallery` Client Component wraps the thumbnail grid and the `Lightbox` component. Supabase public URLs are constructed server-side from `property_photos.storage_path`. |
| PROP-02 | Property listing page shows details (bedrooms, bathrooms, max guests) | Server Component renders these directly from the `properties` row. No client interactivity needed. Lucide icons (`BedDouble`, `Bath`, `Users`) add visual anchors. |
| PROP-03 | Property listing page displays amenities list with icons (pool, hot tub, BBQ, etc.) | `properties.amenities` is a JSONB array of strings seeded with values like "Infinity pool", "Hot tub", "BBQ grill". Map amenity strings to Lucide icons with a lookup dictionary. Server Component renders the list. |
| PROP-04 | Property listing page shows availability calendar with booked/available dates | shadcn `Calendar` component (`react-day-picker` v9). Fetch confirmed bookings for the property server-side, pass date ranges to the `PricingWidget` Client Component as `disabledDates` prop. `disabled` prop on Calendar accepts `{ from, to }` range objects. |
| PROP-05 | Property listing page displays location info (area description, neighborhood context) | `properties.location`, `properties.address`, and `properties.description` fields. Server Component renders these as text sections. No external map library required for MVP. |
| PROP-06 | Property listing page shows per-property add-on experiences with pricing | Supabase query includes `add_ons(*)`. Server Component renders an `AddOnCard` list below property details. Displays name, description, price, and pricing unit (`per_person` / `per_booking`). |
| PROP-07 | Property listing page displays nightly rate and total price when dates are selected | `PricingWidget` Client Component with `useState` for check-in/check-out dates. Total = `nightly_rate × nights + cleaning_fee`. Derived in the client from props — no server call needed. Cleaning fee and nightly rate passed as Server Component props. |
| PROP-08 | Properties can be browsed/filtered by destination (Cabo, PV, Miami) | URL search param `?destination=Cabo+San+Lucas`. Server Component page reads `searchParams.destination`, Supabase query adds `.eq('location', destination)` filter. Client `DestinationFilter` component updates URL via `useRouter`/`useSearchParams`. |
| ADDON-01 | Each property has unique add-on experiences (boat rides, chefs, alcohol, etc.) | Already seeded (Phase 1). Supabase query `add_ons(*)` on property detail page exposes all add-ons. |
| ADDON-02 | Add-ons have name, description, price, and pricing unit (per person or per booking) | All four fields exist in the `add_ons` table schema. `pricing_unit` is `per_person` or `per_booking`. Display "per person" or "per booking" label in the add-on card. |
| ADDON-03 | Add-ons are displayed on property listing page with pricing | Rendered below property details in the Server Component. An `AddOnCard` component displays each add-on's name, description, price, and unit. |
| PAGE-04 | Mobile-responsive design across all pages | Tailwind responsive prefixes (`md:`, `lg:`) on grid layouts. Property card grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`. Photo gallery: `grid-cols-2 md:grid-cols-3`. Sticky pricing widget on desktop, bottom-anchored on mobile. |
| PAGE-05 | Tropical chill party brand aesthetic (shadcn/ui + React Bits animations) | React Bits `BlurText` for page headings, `FadeContent` for scroll reveal on property sections. shadcn/ui for Card, Badge, Button, Calendar. Brand color palette defined in `globals.css` CSS variables (warm amber/teal/sand over existing neutral tokens). |
</phase_requirements>

---

## Standard Stack

### Core (already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App Router, Server Components, async searchParams | Project baseline |
| React | 19.2.3 | useState, useCallback for PricingWidget | Ships with Next.js 16 |
| @supabase/ssr | ^0.9.0 | `createServerClient` for Server Component data fetching | Project baseline |
| @supabase/supabase-js | ^2.98.0 | `getPublicUrl` for photo URLs | Project baseline |
| shadcn/ui | CLI ^3.8.5 | Calendar, Card, Badge, Button, Separator, Dialog | Already installed core components |
| lucide-react | ^0.576.0 | Amenity icons, UI icons | Already installed |
| tw-animate-css | ^1.4.0 | CSS animation layer | Already installed |
| tailwindcss | ^4 | Responsive layout utilities | Already installed |

### New: Need to Install

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| yet-another-react-lightbox | ^3.x | Full-screen photo lightbox modal | React 19 compatible, `next/image` integration, plugin architecture, 19K+ GitHub stars, actively maintained |
| react-day-picker | ^9.x | Powers shadcn Calendar (installed as dep when Calendar added) | Bundled with shadcn Calendar add |

### New: Need to Add (shadcn CLI)

| Component | Command | Purpose |
|-----------|---------|---------|
| Calendar | `npx shadcn@latest add calendar` | Availability date picker in PricingWidget |
| Dialog | `npx shadcn@latest add dialog` | (Optional) If Dialog needed beyond AlertDialog already installed |

### React Bits (copy-paste, no npm install)

React Bits is NOT an npm package. Components are installed via the shadcn CLI or jsrepo CLI and copied into the source tree. There is no `npm install react-bits`.

| Component | Install Command | Purpose |
|-----------|----------------|---------|
| BlurText | `npx shadcn@latest add @react-bits/BlurText-TS-TW` | Animated section headings |
| FadeContent | Copy from reactbits.dev — Fade Content component | Scroll-triggered section reveal |

**Installation method (verified):**

```bash
# yet-another-react-lightbox
npm install yet-another-react-lightbox

# shadcn Calendar (installs react-day-picker as peer dep)
npx shadcn@latest add calendar

# React Bits BlurText (TypeScript + Tailwind variant)
npx shadcn@latest add @react-bits/BlurText-TS-TW
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| yet-another-react-lightbox | shadcn Dialog + next/image | Hand-rolling gallery keyboard nav, focus trap, swipe gestures, and animation is 200+ lines of risky custom code. Don't. |
| URL search params for filter | Client-side useState filter | URL params are bookmarkable, SEO-friendly, and allow Server Component to filter at DB level — no over-fetching |
| shadcn Calendar for availability | react-datepicker | shadcn Calendar is already project-standard; react-datepicker is a separate dependency with its own design system |
| React Bits animations | Framer Motion | React Bits is zero-dependency copy-paste; Framer Motion adds ~30KB and is specified in CLAUDE.md as the alternative NOT to use |

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   ├── properties/
│   │   ├── page.tsx                  # Browse page (Server Component) — reads ?destination= search param
│   │   └── [propertyId]/
│   │       └── page.tsx              # Property listing page (Server Component)
│   └── (guest)/                      # Optional route group for nav layout
│       └── layout.tsx                # Guest-facing nav header (GuestNav)
├── components/
│   ├── browse/
│   │   ├── DestinationFilter.tsx     # Client Component — destination tab buttons, updates URL
│   │   ├── PropertyListingCard.tsx   # Server-compatible card for browse grid
│   │   └── NoPropertiesMessage.tsx   # Empty state
│   └── property/
│       ├── PhotoGallery.tsx          # Client Component — thumbnail grid + lightbox
│       ├── PricingWidget.tsx         # Client Component — calendar, date selection, price calc
│       ├── AddOnCard.tsx             # Server Component — displays single add-on
│       └── AmenityList.tsx           # Server Component — amenities with icon mapping
```

### Pattern 1: Server Component Destination Filtering via searchParams Prop

**What:** The browse page is an async Server Component. It reads `searchParams.destination` from the page prop (not `useSearchParams` — that's Client only). The Supabase query conditionally adds a `.eq('location', destination)` filter. The Client Component `DestinationFilter` updates the URL, which causes the Server Component to re-render with filtered data.

**When to use:** Any filter that should be bookmarkable and SEO-visible, and where the filter changes what data the server fetches.

```typescript
// Source: https://nextjs.org/docs/app/api-reference/file-conventions/page#searchparams-optional
// src/app/properties/page.tsx
export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ destination?: string }>
}) {
  const { destination } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('properties')
    .select(`
      id, name, location, bedrooms, bathrooms, max_guests, nightly_rate,
      property_photos(id, storage_path, display_order)
    `)
    .order('nightly_rate', { ascending: true })

  // Filter by destination if provided and valid
  const VALID_DESTINATIONS = ['Cabo San Lucas', 'Puerto Vallarta', 'Miami']
  if (destination && VALID_DESTINATIONS.includes(destination)) {
    query = query.eq('location', destination)
  }

  const { data: properties } = await query

  return (
    <div>
      <Suspense fallback={<div>Loading filter...</div>}>
        <DestinationFilter currentDestination={destination} />
      </Suspense>
      <PropertyGrid properties={properties ?? []} />
    </div>
  )
}
```

**Critical:** In Next.js 16, `searchParams` passed to a page is a `Promise<...>` — it MUST be awaited. This was verified against the Next.js 16.1.6 docs.

### Pattern 2: Client Component URL Param Update

**What:** `DestinationFilter` reads the current URL params, adds/removes the destination param, and calls `router.push()`. This triggers a Server Component re-render with the new filter.

**When to use:** Any filter UI that updates URL state without a form submission.

```typescript
// Source: https://nextjs.org/docs/app/api-reference/functions/use-search-params#updating-searchparams
// src/components/browse/DestinationFilter.tsx
'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

const DESTINATIONS = [
  { label: 'All', value: '' },
  { label: 'Cabo', value: 'Cabo San Lucas' },
  { label: 'Puerto Vallarta', value: 'Puerto Vallarta' },
  { label: 'Miami', value: 'Miami' },
]

export function DestinationFilter({ currentDestination }: { currentDestination?: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handleSelect = useCallback(
    (destination: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (destination) {
        params.set('destination', destination)
      } else {
        params.delete('destination')
      }
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  return (
    <div className="flex gap-2 flex-wrap">
      {DESTINATIONS.map(({ label, value }) => (
        <button
          key={value}
          onClick={() => handleSelect(value)}
          className={/* active/inactive styles */}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
```

**Note:** `DestinationFilter` uses `useSearchParams`, so it must be wrapped in a `<Suspense>` boundary in the parent Server Component during static rendering, otherwise the Next.js build fails.

### Pattern 3: Photo Gallery with Lightbox

**What:** `PhotoGallery` is a `'use client'` component. It renders a thumbnail grid using `next/image`. Clicking any thumbnail opens the `Lightbox` component from `yet-another-react-lightbox` at the correct index. The `PhotoGallery` receives pre-constructed public URLs from the Server Component parent (no client-side Supabase call needed).

**When to use:** Whenever interactive UI (click handler + modal state) wraps otherwise static imagery.

```typescript
// Source: https://yet-another-react-lightbox.com/documentation
// src/components/property/PhotoGallery.tsx
'use client'

import { useState } from 'react'
import Image from 'next/image'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'

interface Photo {
  id: string
  url: string
  alt: string
}

export function PhotoGallery({ photos }: { photos: Photo[] }) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)

  const slides = photos.map((p) => ({ src: p.url, alt: p.alt }))

  const openAt = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
  }

  return (
    <>
      {/* Thumbnail grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {photos.map((photo, idx) => (
          <button
            key={photo.id}
            onClick={() => openAt(idx)}
            className="relative aspect-video overflow-hidden rounded-md group"
          >
            <Image
              src={photo.url}
              alt={photo.alt}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              sizes="(max-width: 768px) 50vw, 33vw"
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        slides={slides}
        index={lightboxIndex}
      />
    </>
  )
}
```

**Photo URL construction in Server Component:**

```typescript
// Server Component builds the URL — no client import needed
// Same pattern as PropertyCard.tsx from Phase 3
const photos = sortedPhotos.map((p) => ({
  id: p.id,
  url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-photos/${p.storage_path}`,
  alt: `${property.name} photo ${p.display_order + 1}`,
}))
```

### Pattern 4: Pricing Widget with Availability Calendar

**What:** `PricingWidget` is a `'use client'` component. It receives the property's `nightly_rate`, `cleaning_fee`, and an array of confirmed booking date ranges as props from the Server Component. The user selects check-in and check-out dates from a shadcn `Calendar`. The component computes the total price locally — no server round-trip.

**When to use:** Any interactive calculation that depends on server-fetched constants (rates) but user-variable inputs (dates).

```typescript
// Source: Supabase booking query + react-day-picker v9 disabled prop
// Server Component: fetch booked ranges
const { data: bookings } = await supabase
  .from('bookings')
  .select('check_in, check_out')
  .eq('property_id', propertyId)
  .eq('status', 'confirmed')

const bookedRanges = (bookings ?? []).map((b) => ({
  from: new Date(b.check_in),
  to: new Date(b.check_out),
}))

// Pass to Client Component
<PricingWidget
  nightlyRate={property.nightly_rate}
  cleaningFee={property.cleaning_fee}
  maxGuests={property.max_guests}
  disabledDates={bookedRanges}
/>
```

```typescript
// src/components/property/PricingWidget.tsx
'use client'

import { useState } from 'react'
import { Calendar } from '@/components/ui/calendar'
import { DateRange } from 'react-day-picker'

interface PricingWidgetProps {
  nightlyRate: number
  cleaningFee: number
  maxGuests: number
  disabledDates: { from: Date; to: Date }[]
}

export function PricingWidget({ nightlyRate, cleaningFee, maxGuests, disabledDates }: PricingWidgetProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  const nights =
    dateRange?.from && dateRange?.to
      ? Math.ceil(
          (dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24)
        )
      : 0

  const subtotal = nights * nightlyRate
  const total = subtotal + (nights > 0 ? cleaningFee : 0)

  return (
    <div className="rounded-xl border p-6 shadow-sm space-y-4">
      <p className="text-2xl font-bold">
        ${nightlyRate.toLocaleString()} <span className="text-base font-normal text-muted-foreground">/ night</span>
      </p>
      <Calendar
        mode="range"
        selected={dateRange}
        onSelect={setDateRange}
        disabled={[
          { before: new Date() },  // disable past dates
          ...disabledDates,        // disable confirmed bookings
        ]}
        numberOfMonths={2}
      />
      {nights > 0 && (
        <div className="space-y-2 text-sm border-t pt-4">
          <div className="flex justify-between">
            <span>${nightlyRate.toLocaleString()} × {nights} nights</span>
            <span>${subtotal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span>Cleaning fee</span>
            <span>${cleaningFee.toLocaleString()}</span>
          </div>
          <div className="flex justify-between font-semibold border-t pt-2">
            <span>Total before taxes</span>
            <span>${total.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  )
}
```

**Note:** The `disabled` prop on shadcn's Calendar (react-day-picker v9) accepts an array of Matchers: `{ before: Date }` for past dates, and `{ from: Date, to: Date }` range objects for booked dates. Both can be passed together in a single array.

### Pattern 5: Amenity Icon Mapping

**What:** `properties.amenities` is a JSONB array of human-readable strings (e.g., `"Infinity pool"`, `"Hot tub"`). A dictionary maps these strings to Lucide icons. Unknown amenities fall back to a generic `Check` icon.

**When to use:** Any time a DB field drives iconographic UI.

```typescript
// src/components/property/AmenityList.tsx
// Server Component — no interactivity needed
import { Waves, Flame, Wifi, Tv, WashingMachine, ParkingSquare, Utensils, Bath } from 'lucide-react'

const AMENITY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'Infinity pool': Waves,
  'Private pool': Waves,
  'Waterfront pool': Waves,
  'Hot tub': Bath,
  'BBQ grill': Flame,
  'WiFi': Wifi,
  'Smart TV': Tv,
  'Smart TVs (all rooms)': Tv,
  'Washer/dryer': WashingMachine,
  'Parking (4 cars)': ParkingSquare,
  'Full kitchen': Utensils,
  // ... extend as needed
}
```

### Pattern 6: Brand Aesthetic with React Bits

**What:** React Bits `BlurText` animates page headings on mount. `FadeContent` (or `BlurFade`) wraps sections to reveal them as they scroll into view. These are Client Components that add micro-interactions without blocking server rendering.

**Installation is copy-paste into the project source tree — not an npm package:**

```bash
# TypeScript + Tailwind variant
npx shadcn@latest add @react-bits/BlurText-TS-TW
# This writes the component source into your components directory
```

**Brand color palette** needs to be added to `globals.css` for the tropical chill aesthetic. The current palette is neutral (no brand colors defined). Phase 4 should establish brand tokens:

```css
/* Add to globals.css :root */
--color-brand-amber: oklch(0.78 0.15 75);      /* warm gold/amber */
--color-brand-teal: oklch(0.65 0.14 185);      /* ocean teal */
--color-brand-sand: oklch(0.92 0.04 85);       /* warm sand/cream */
--color-brand-palm: oklch(0.42 0.12 150);      /* deep jungle green */
```

### Anti-Patterns to Avoid

- **Calling `useSearchParams` in a Server Component:** It's a Client-only hook. Use the page's `searchParams` prop (async, must await) in Server Components.
- **Wrapping `DestinationFilter` without `<Suspense>`:** Any component using `useSearchParams` in a statically rendered page MUST be inside a `<Suspense>` boundary or the build fails.
- **Fetching bookings client-side for the calendar:** The booked date ranges are static server data — fetch them in the Server Component and pass as props. No client Supabase call needed.
- **Routing photo lightbox through a Server Action:** The lightbox is pure client-side UI state. No server involvement needed.
- **Using `getSession()` instead of `createClient()` with anon key:** Guest browsing pages access public data with the anon key — no auth required. Do not call `requireOwner()` or `verifySession()` on public pages.
- **Importing `createBrowserClient` in a Server Component:** Already a project rule. Photo URLs are constructed server-side using the public URL pattern, not the Supabase client.
- **Installing React Bits via npm:** There is no `react-bits` npm package in the standard React Bits library. Use the shadcn CLI or jsrepo CLI to add individual components.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fullscreen photo lightbox | Custom modal with keyboard nav + swipe | `yet-another-react-lightbox` | Focus trap, keyboard (arrows/Escape), swipe gestures, accessibility — hundreds of edge cases |
| Availability calendar | Custom date grid with disabled state | shadcn `Calendar` (react-day-picker v9) | `disabled` prop accepts date ranges natively; already in project stack |
| URL param management | `window.history.pushState` manual calls | `useRouter` + `useSearchParams` from `next/navigation` | Properly triggers Server Component re-renders with new searchParams |
| Price calculation validation | Complex server round-trip | Local arithmetic in PricingWidget | Total = `nights × nightly_rate + cleaning_fee` is deterministic; no async needed |
| Brand animations | Framer Motion | React Bits (copy-paste) | CLAUDE.md specifies React Bits; Framer Motion is ~30KB and not project standard |
| Icon fallbacks for unknown amenities | SVG hand-drawing | Lucide `Check` as default fallback | Consistent with existing lucide-react usage |

**Key insight:** The photo lightbox is the highest-risk hand-roll in this phase. Accessible modal dialogs with keyboard navigation, swipe gestures, focus management, and transition animations are each individually complex. `yet-another-react-lightbox` solves all of them in a 12KB bundle.

---

## Common Pitfalls

### Pitfall 1: searchParams Must Be Awaited in Next.js 16

**What goes wrong:** Developer writes `function PropertiesPage({ searchParams }) { const { destination } = searchParams }` and gets `destination` as `undefined` even though it's in the URL.

**Why it happens:** In Next.js 16 (App Router), `searchParams` passed to a page is a `Promise<Record<string, string | string[] | undefined>>`. Not awaiting it returns the Promise object, not the values.

**How to avoid:** Mark the page as `async` and `await searchParams`:
```typescript
export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ destination?: string }>
}) {
  const { destination } = await searchParams
  // ...
}
```

**Warning signs:** Filter appears to work in development but `destination` is always undefined.

### Pitfall 2: useSearchParams Without Suspense Boundary Breaks Production Build

**What goes wrong:** `DestinationFilter` uses `useSearchParams`. Production build fails with: `Missing Suspense boundary with useSearchParams`.

**Why it happens:** Any Client Component using `useSearchParams` in a statically rendered route must be wrapped in `<Suspense>` so the static HTML can render a fallback while the Client Component hydrates.

**How to avoid:** Always wrap `DestinationFilter` (and any `useSearchParams` component) in a `<Suspense>`:
```tsx
<Suspense fallback={<DestinationFilterSkeleton />}>
  <DestinationFilter currentDestination={destination} />
</Suspense>
```

**Warning signs:** Works in dev (`next dev`) but fails during `next build`.

### Pitfall 3: Lightbox CSS Import Missing

**What goes wrong:** `yet-another-react-lightbox` renders but has no visible styling — the lightbox overlay doesn't appear correctly, buttons are unstyled.

**Why it happens:** The library requires a CSS import: `import "yet-another-react-lightbox/styles.css"`. This is easy to miss.

**How to avoid:** Add the CSS import to the `PhotoGallery.tsx` Client Component (or to `globals.css` for global inclusion):
```typescript
import "yet-another-react-lightbox/styles.css"
```

**Warning signs:** Lightbox opens but is nearly invisible or completely unstyled.

### Pitfall 4: Public Browsing Pages Must Not Require Auth

**What goes wrong:** Developer accidentally calls `verifySession()` or `requireOwner()` in the property listing page. Unauthenticated guests are redirected to `/login`.

**Why it happens:** Copy-pasting from dashboard pages that do require auth.

**How to avoid:** Guest browsing pages use `createClient()` with the anon key. RLS policy "Properties are publicly readable" (`TO anon, authenticated USING (true)`) means no session is required. Do not call `verifySession()` or `requireOwner()` on `/properties` or `/properties/[propertyId]`.

**Warning signs:** Clicking "Browse Properties" redirects an unauthenticated user to `/login`.

### Pitfall 5: Photo URL Construction With Wrong Env Variable

**What goes wrong:** `next/image` shows a broken image icon. Console shows a remotePatterns hostname mismatch.

**Why it happens:** The URL is constructed with a different hostname than what's in `next.config.ts` `remotePatterns`. The Supabase project URL is `https://jxbafovfobsmqxjfjrqp.supabase.co` (already in next.config.ts). If the URL is constructed differently, the hostname check fails.

**How to avoid:** Always use `process.env.NEXT_PUBLIC_SUPABASE_URL` for the base of the URL (consistent with Phase 3 PropertyCard pattern). The `remotePatterns` in `next.config.ts` already covers this hostname.

**Warning signs:** Images show broken icon; Next.js logs hostname not in allowed list.

### Pitfall 6: Booked Date Range Boundaries

**What goes wrong:** A guest tries to book check-in on the same day as another guest's check-out and the calendar incorrectly shows that date as unavailable.

**Why it happens:** The schema uses `daterange(check_in, check_out, '[)')` — half-open intervals that allow back-to-back bookings. The calendar's disabled ranges should mirror this: exclude `from: check_in` to `to: the day before check_out`, not through check_out.

**How to avoid:** When constructing `disabledDates` from booked ranges, subtract one day from the `to` boundary:
```typescript
const bookedRanges = bookings.map((b) => ({
  from: new Date(b.check_in),
  to: new Date(new Date(b.check_out).getTime() - 86400000), // day before checkout
}))
```

**Warning signs:** Guests report they cannot book the day immediately after another booking ends.

### Pitfall 7: React Bits BlurText is a Client Component

**What goes wrong:** `BlurText` is placed directly in a Server Component page without `'use client'`. Build or runtime error: `useState` not in a Client Component.

**Why it happens:** React Bits animation components use React hooks (`useState`, `useEffect`) internally, making them Client Components.

**How to avoid:** Either wrap the page heading in a small `'use client'` wrapper component, or isolate the animated heading in its own Client Component and use it from the Server Component:
```tsx
// src/components/property/AnimatedHeading.tsx
'use client'
import { BlurText } from '@/components/ui/blur-text' // wherever it was installed
export function AnimatedHeading({ text }: { text: string }) {
  return <BlurText text={text} className="text-4xl font-bold" />
}
```

---

## Code Examples

Verified patterns from official sources:

### Property Listing Page Data Fetch

```typescript
// Source: Phase 1 schema + Supabase JS SDK patterns
// src/app/properties/[propertyId]/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'

export default async function PropertyListingPage({
  params,
}: {
  params: Promise<{ propertyId: string }>
}) {
  const { propertyId } = await params
  const supabase = await createClient()

  // Parallel fetch: property details + booked dates
  const [propertyResult, bookingsResult] = await Promise.all([
    supabase
      .from('properties')
      .select(`
        *,
        property_photos(id, storage_path, display_order),
        add_ons(id, name, description, price, pricing_unit)
      `)
      .eq('id', propertyId)
      .single(),
    supabase
      .from('bookings')
      .select('check_in, check_out')
      .eq('property_id', propertyId)
      .eq('status', 'confirmed'),
  ])

  if (!propertyResult.data) notFound()

  const property = propertyResult.data
  const bookings = bookingsResult.data ?? []

  const sortedPhotos = [...property.property_photos].sort(
    (a, b) => a.display_order - b.display_order
  )

  const photos = sortedPhotos.map((p, idx) => ({
    id: p.id,
    url: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/property-photos/${p.storage_path}`,
    alt: `${property.name} photo ${idx + 1}`,
  }))

  // Build disabled date ranges matching '[)' half-open booking intervals
  const disabledDates = bookings.map((b) => ({
    from: new Date(b.check_in),
    to: new Date(new Date(b.check_out).getTime() - 86400000),
  }))

  const amenities = Array.isArray(property.amenities) ? (property.amenities as string[]) : []

  return (
    <div>
      <PhotoGallery photos={photos} />
      {/* ... details, amenities, add-ons ... */}
      <PricingWidget
        nightlyRate={Number(property.nightly_rate)}
        cleaningFee={Number(property.cleaning_fee)}
        maxGuests={property.max_guests}
        disabledDates={disabledDates}
      />
    </div>
  )
}
```

### Browse Page with Destination Filter

```typescript
// Source: Next.js 16.1.6 docs — searchParams prop, verified 2026-03-04
// src/app/properties/page.tsx
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import { DestinationFilter } from '@/components/browse/DestinationFilter'

const VALID_DESTINATIONS = ['Cabo San Lucas', 'Puerto Vallarta', 'Miami']

export default async function PropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ destination?: string }>
}) {
  const { destination } = await searchParams

  const supabase = await createClient()
  let query = supabase
    .from('properties')
    .select(`
      id, name, location, bedrooms, bathrooms, max_guests, nightly_rate,
      property_photos(id, storage_path, display_order)
    `)
    .order('nightly_rate', { ascending: true })

  if (destination && VALID_DESTINATIONS.includes(destination)) {
    query = query.eq('location', destination)
  }

  const { data: properties } = await query

  return (
    <div>
      <Suspense fallback={null}>
        <DestinationFilter currentDestination={destination} />
      </Suspense>
      {/* property grid */}
    </div>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `searchParams` as sync prop | `searchParams` as `Promise<...>` in Next.js 16 | Next.js 15+ | Must await — same pattern established in Phase 2 for `params` |
| `react-day-picker` v8 shadcn Calendar | `react-day-picker` v9 (shadcn latest) | Late 2024 | v9 breaking changes: `selected` prop type changed for ranges, `mode` prop required |
| Custom lightbox modals | `yet-another-react-lightbox` | 2023+ (ecosystem settled) | 19K+ GitHub stars, React 19 compatible, `next/image` integration via custom render prop |
| `tailwindcss-animate` | `tw-animate-css` | shadcn update 2024 | Already handled in Phase 2 — `globals.css` imports `tw-animate-css` |
| `useFormState` | `useActionState` | React 19 | Irrelevant to Phase 4 — no forms in browse/listing pages |

**Deprecated/outdated:**
- `react-day-picker` v7/v8 docs: If searching for Calendar usage, ensure v9 docs are consulted. v9 has breaking API changes from v8.
- `import { DayPicker } from 'react-day-picker'`: shadcn Calendar wraps this. Use the shadcn `Calendar` component, not `DayPicker` directly.
- `getStaticProps`/`getServerSideProps`: Pages Router only. All Phase 4 pages use App Router Server Components.

---

## Open Questions

1. **Nav header for guest-facing pages**
   - What we know: The auth layout has its own `(auth)/layout.tsx`. The owner dashboard has `(owner)/dashboard/layout.tsx`. There is no guest-facing layout with a nav header yet.
   - What's unclear: Should Phase 4 introduce a `(guest)/layout.tsx` with a nav bar (logo + login link), or should the property pages be wrapped in a simple header? The homepage (Phase 7) will also need this.
   - Recommendation: Create a minimal `GuestNav` component and apply it at the root layout level or via a new route group. Keep it simple for Phase 4 — logo + "Log in" link + "Book a Villa" CTA. Full polish in Phase 7.

2. **Sticky pricing widget on desktop**
   - What we know: Airbnb-pattern: property details scroll on the left, pricing widget is sticky on the right. This requires a two-column layout with `sticky` positioning.
   - What's unclear: At what viewport breakpoint should it switch from stacked (mobile) to sticky sidebar (desktop)?
   - Recommendation: `md:` breakpoint (768px). Below: full-width stacked. Above: `grid-cols-[1fr_380px]` with `sticky top-8` on the widget column.

3. **No photos state**
   - What we know: Seed data in Phase 1 does NOT include photos — photos are uploaded by owners in Phase 3. The seeded properties have zero photos.
   - What's unclear: How should the photo gallery look when there are no photos? Is the assumption that a real owner will upload photos before guests browse?
   - Recommendation: Render a branded placeholder (gradient background with Whole-Tel logo) when no photos exist. The `PhotoGallery` component should handle 0 photos gracefully without crashing. The lightbox should not open if no photos exist.

4. **react-day-picker v9 TypeScript import for DateRange type**
   - What we know: `DateRange` type is used in `PricingWidget`. In react-day-picker v9, imports changed.
   - What's unclear: The exact import path for `DateRange` in react-day-picker v9 vs v8.
   - Recommendation: Use `import type { DateRange } from 'react-day-picker'` — this is the v9 path. If the shadcn Calendar component was installed with a specific v9, the type will be available from the same package.

---

## Validation Architecture

> `workflow.nyquist_validation` is not set in `.planning/config.json` — skipping this section.

---

## Sources

### Primary (HIGH confidence)

- Next.js 16.1.6 official docs (fetched 2026-03-04) — `useSearchParams`, `searchParams` page prop, `params` async pattern, `Suspense` boundary requirement
  - https://nextjs.org/docs/app/api-reference/functions/use-search-params
  - https://nextjs.org/docs/app/api-reference/file-conventions/page#searchparams-optional
- Supabase Phase 1 schema migration — RLS policies, public read access, booking date ranges (read directly 2026-03-04)
  - `/Users/adamblackman/Code/whole-tel/supabase/migrations/20260302000001_schema_rls.sql`
- react-day-picker v9 official docs (fetched 2026-03-04) — `disabled` prop Matcher types, `{ from, to }` date range syntax
  - https://daypicker.dev/selections/disabling-dates
- yet-another-react-lightbox official docs (fetched 2026-03-04) — `open`, `close`, `slides`, `index` props, CSS import requirement
  - https://yet-another-react-lightbox.com/documentation
- Project source files (read directly 2026-03-04) — package.json, next.config.ts, globals.css, existing component patterns, seed data
- Phase 3 RESEARCH.md (read 2026-03-04) — established patterns for Supabase queries, URL construction, Server Component data fetching

### Secondary (MEDIUM confidence)

- WebSearch + official docs cross-verification: shadcn Calendar uses react-day-picker v9 — confirmed by shadcn docs URL at `ui.shadcn.com/docs/components/radix/calendar` referencing react-day-picker
- WebSearch: React Bits install via `npx shadcn@latest add @react-bits/BlurText-TS-TW` — confirmed by GitHub README pattern
- yet-another-react-lightbox npm page — React 19 compatibility confirmed

### Tertiary (LOW confidence)

- Lucide icon exact names for specific amenities (pool, hot tub) — not all amenity-specific icons confirmed in Lucide. Fallback to semantically-related icons (`Waves` for pool, `Bath` for hot tub) is LOW confidence on exact names; verify at lucide.dev during implementation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified via official docs or direct package.json inspection
- Architecture patterns: HIGH — searchParams pattern verified against Next.js 16.1.6 official docs; lightbox and calendar patterns verified against their respective official docs
- Pitfalls: HIGH — searchParams async pattern established in Phase 2 decisions (STATE.md); Suspense boundary requirement verified in Next.js docs
- React Bits install method: MEDIUM — confirmed via GitHub README but exact component availability at install time should be verified (library updates weekly)
- Lucide icon names for amenities: LOW — only WiFi and TV confirmed definitively; others are reasonable guesses

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (stable ecosystem — Next.js 16, react-day-picker v9, yet-another-react-lightbox v3 are unlikely to change materially in 30 days; React Bits updates weekly but is copy-paste so version drift doesn't affect installed components)
