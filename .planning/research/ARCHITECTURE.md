# Architecture Research

**Domain:** Villa booking platform (Airbnb-style, single-operator, with add-ons)
**Researched:** 2026-03-02
**Confidence:** HIGH — based on official Next.js docs (updated 2026-02-27), Supabase official docs, Stripe official docs, verified WebSearch

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS APP ROUTER                               │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌────────────┐  │
│  │ Guest Pages  │  │ Owner Dash   │  │  Auth Pages  │  │ API Routes │  │
│  │ (public)     │  │ /dashboard/* │  │ /login       │  │ /api/*     │  │
│  │ / /listings  │  │ (protected)  │  │ /signup      │  │ Stripe     │  │
│  │ /villas/:id  │  │              │  │              │  │ webhooks   │  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘  │
│         │                 │                  │                │         │
│  ┌──────┴─────────────────┴──────────────────┴────────────────┴──────┐  │
│  │                   MIDDLEWARE (auth guard, role check)              │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │              DATA ACCESS LAYER (DAL) — server-only                 │  │
│  │   verifySession() | getUser() | requireOwner() | requireGuest()    │  │
│  └────────────────────────────────────────────────────────────────────┘  │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │ Server       │  │ Server       │  │ Client       │                  │
│  │ Components   │  │ Actions      │  │ Components   │                  │
│  │ (data fetch) │  │ (mutations)  │  │ ('use client'│                  │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘                  │
└─────────┼─────────────────┼─────────────────┼────────────────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                            SUPABASE                                      │
│                                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                  │
│  │   Postgres   │  │     Auth     │  │   Storage    │                  │
│  │   Database   │  │  (JWT +      │  │  (property   │                  │
│  │   + RLS      │  │  RBAC hooks) │  │   photos)    │                  │
│  └──────────────┘  └──────────────┘  └──────────────┘                  │
└─────────────────────────────────────────────────────────────────────────┘
          │
          ▼ (payment initiation + fulfillment via webhook)
┌─────────────────────────────────────────────────────────────────────────┐
│                           STRIPE                                         │
│  Checkout Sessions → Hosted Payment Page → Webhook → Booking confirmed   │
└─────────────────────────────────────────────────────────────────────────┘
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Guest Pages | Public-facing villa browsing, property detail, booking flow | Server Components with `async/await` data fetch from Supabase; interactive elements (date picker, add-on selector) as Client Components |
| Owner Dashboard | Property management, add-on management, booking visibility | Protected route group; Server Components fetch owner's own data via DAL with RLS enforcement |
| Auth Pages | Login / signup for both roles | Server Actions handle form submission; Supabase `@supabase/ssr` for cookie-based sessions |
| API Route Handlers | Stripe Checkout session creation, webhook handler | `app/api/checkout/route.ts`, `app/api/webhooks/stripe/route.ts` — server-only, never exposed to client |
| Middleware | Optimistic route protection, redirect unauthenticated users | Cookie-based session check, redirect `/dashboard` → `/login` if no session |
| Data Access Layer (DAL) | Centralized auth verification, secure data queries | `app/lib/dal.ts` with `verifySession()`, `requireRole()`, wrapped in `React.cache()` |
| Supabase Postgres | All application data storage | Tables: `profiles`, `properties`, `add_ons`, `bookings`, `booking_add_ons` |
| Supabase Auth | User identity, JWT issuance, RBAC via custom claims | Custom Access Token Hook adds `user_role` claim to JWT; used in RLS policies |
| Supabase Storage | Property photos, add-on images | Private bucket with signed upload URLs; owner uploads via Server Action, guests read via public CDN URLs or transformed URLs |
| Stripe Checkout | Hosted payment page, credit card + bank transfer | Session created server-side in Route Handler; webhook fulfills booking on `checkout.session.completed` |

---

## Recommended Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (guest)/                  # Route group: public guest pages
│   │   ├── page.tsx              # Homepage / landing
│   │   ├── villas/               # Villa listing + detail
│   │   │   ├── page.tsx          # Browse / search page
│   │   │   └── [slug]/
│   │   │       └── page.tsx      # Villa detail + booking flow
│   │   └── booking/
│   │       ├── success/page.tsx  # Post-checkout confirmation
│   │       └── cancel/page.tsx   # Cancelled checkout return
│   │
│   ├── (owner)/                  # Route group: owner dashboard (protected)
│   │   └── dashboard/
│   │       ├── layout.tsx        # Owner layout (auth check here)
│   │       ├── page.tsx          # Dashboard overview
│   │       ├── properties/
│   │       │   ├── page.tsx      # List owner's properties
│   │       │   ├── new/page.tsx  # Create new property
│   │       │   └── [id]/
│   │       │       ├── page.tsx  # Edit property
│   │       │       └── add-ons/page.tsx # Manage add-ons
│   │       └── bookings/
│   │           └── page.tsx      # View incoming bookings
│   │
│   ├── (auth)/                   # Route group: login/signup
│   │   ├── login/page.tsx
│   │   └── signup/page.tsx
│   │
│   ├── api/
│   │   ├── checkout/
│   │   │   └── route.ts          # POST: create Stripe Checkout session
│   │   └── webhooks/
│   │       └── stripe/
│   │           └── route.ts      # POST: handle Stripe webhook events
│   │
│   └── layout.tsx                # Root layout (ThemeProvider, etc.)
│
├── lib/                          # Server-only logic
│   ├── dal.ts                    # Data Access Layer: verifySession, getUser, requireRole
│   ├── supabase/
│   │   ├── server.ts             # createServerClient() factory
│   │   └── browser.ts            # createBrowserClient() factory
│   ├── stripe.ts                 # Stripe Node SDK instance
│   └── actions/                  # Server Actions
│       ├── auth.ts               # signup, login, logout
│       ├── bookings.ts           # createBooking, updateBookingStatus
│       └── properties.ts         # createProperty, updateProperty, uploadPhoto
│
├── components/                   # UI components
│   ├── ui/                       # shadcn/ui base components
│   ├── guest/                    # Guest-facing components
│   │   ├── PropertyCard.tsx      # Villa card (Server Component)
│   │   ├── DateRangePicker.tsx   # 'use client' — interactive
│   │   ├── AddOnSelector.tsx     # 'use client' — interactive
│   │   └── BookingForm.tsx       # 'use client' — manages booking state
│   └── owner/                    # Owner dashboard components
│       ├── PropertyForm.tsx      # 'use client' — create/edit property
│       ├── AddOnForm.tsx         # 'use client'
│       └── PhotoUploader.tsx     # 'use client' — file upload widget
│
└── types/                        # TypeScript types
    ├── database.ts               # Supabase generated types
    └── index.ts                  # App-level types
```

### Structure Rationale

- **Route groups `(guest)` / `(owner)` / `(auth)`:** Separate layouts and auth requirements without affecting URL paths. Owner group enforces auth in its layout; guest group is public.
- **`lib/dal.ts` server-only:** Centralizes all auth checks. Every data function calls `verifySession()` first. This is the Next.js-recommended "defense-in-depth" pattern per official docs.
- **`lib/supabase/server.ts` + `browser.ts`:** Supabase `@supabase/ssr` requires two separate client creators — one for server (reads cookies via `next/headers`) and one for browser. Mixing them causes auth failures.
- **`lib/actions/`:** Server Actions for all mutations — no traditional API routes except Stripe (which needs a static URL for webhooks).
- **`components/guest/` vs `components/owner/`:** Clear separation prevents accidental exposure of owner UI to guests and keeps bundles smaller.

---

## Architectural Patterns

### Pattern 1: Server-First Data Fetching

**What:** Pages and layouts are Server Components by default. Fetch data directly from Supabase in the page component using `async/await`. Pass only serializable data down to Client Components as props.

**When to use:** All read operations — property listing, villa detail, booking confirmation, dashboard overview.

**Trade-offs:** Better SEO, smaller JS bundles, secure DB queries. Cannot use `useState` / `useEffect` in the same file. Interactive widgets must be extracted to Client Component children.

**Example:**
```typescript
// app/(guest)/villas/[slug]/page.tsx — Server Component
import { createServerClient } from '@/lib/supabase/server'
import { BookingForm } from '@/components/guest/BookingForm'

export default async function VillaPage({ params }: { params: { slug: string } }) {
  const supabase = await createServerClient()
  const { data: property } = await supabase
    .from('properties')
    .select('*, add_ons(*)')
    .eq('slug', params.slug)
    .single()

  // Pass data to interactive Client Component
  return <BookingForm property={property} />
}
```

### Pattern 2: Defense-in-Depth Authorization

**What:** Three layers of auth protection: (1) Middleware for optimistic redirect, (2) DAL `verifySession()` in Server Components/Actions, (3) Supabase RLS policies at the database layer. Never rely on middleware alone.

**When to use:** All protected routes and mutations. Critical after CVE-2025-29927 disclosed that middleware-only auth can be bypassed via header manipulation.

**Trade-offs:** Slightly more code than single-layer check. The redundancy is intentional — database RLS is the true security boundary, middleware is UX (fast redirect), DAL is application-level enforcement.

**Example:**
```typescript
// lib/dal.ts — server-only
import 'server-only'
import { cache } from 'react'
import { createServerClient } from '@/lib/supabase/server'

export const verifySession = cache(async () => {
  const supabase = await createServerClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')
  return user
})

export const requireOwner = cache(async () => {
  const user = await verifySession()
  // Role is stored in user_metadata or profiles table
  if (user.user_metadata?.role !== 'owner') redirect('/')
  return user
})
```

### Pattern 3: Server Actions for Mutations

**What:** All create/update/delete operations go through Server Actions (`'use server'` functions). They run on the server, have access to environment variables, and can call Supabase directly. No need for API routes for most mutations.

**When to use:** Property creation, add-on management, booking status updates, photo upload coordination.

**Trade-offs:** Simpler than traditional API routes. Must return serializable values. Not suitable for file streaming — use signed upload URLs for large files instead.

**Example:**
```typescript
// lib/actions/properties.ts
'use server'
import { requireOwner } from '@/lib/dal'
import { createServerClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createProperty(formData: FormData) {
  const user = await requireOwner() // auth check first
  const supabase = await createServerClient()

  const { data, error } = await supabase
    .from('properties')
    .insert({ owner_id: user.id, name: formData.get('name') as string })
    .select()
    .single()

  if (error) throw new Error('Failed to create property')
  revalidatePath('/dashboard/properties')
  return data
}
```

### Pattern 4: Stripe Checkout via Route Handler + Webhook

**What:** Payment flow uses two Route Handlers. First: `POST /api/checkout` creates a Stripe Checkout Session (server-side, session includes booking metadata). Second: `POST /api/webhooks/stripe` receives `checkout.session.completed` event and writes confirmed booking to Supabase.

**When to use:** This is the only correct pattern for Stripe Checkout. Success URL redirects are unreliable (user can close tab); webhooks are the authoritative signal.

**Trade-offs:** Requires running webhook handler in production (Vercel handles this). Webhook signature verification is mandatory — any public POST endpoint must be validated.

**Example:**
```typescript
// app/api/checkout/route.ts
import { stripe } from '@/lib/stripe'
import { verifySession } from '@/lib/dal'

export async function POST(req: Request) {
  const user = await verifySession() // guest must be logged in to book
  const { propertyId, checkIn, checkOut, addOnIds, guestCount } = await req.json()

  // Calculate total server-side — never trust client price
  const total = await calculateBookingTotal(propertyId, checkIn, checkOut, addOnIds, guestCount)

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card', 'us_bank_account'],
    line_items: [{ price_data: { currency: 'usd', unit_amount: total, product_data: { name: 'Villa Booking' } }, quantity: 1 }],
    metadata: { userId: user.id, propertyId, checkIn, checkOut },
    success_url: `${process.env.NEXT_PUBLIC_URL}/booking/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.NEXT_PUBLIC_URL}/villas/${propertyId}`,
  })

  return Response.json({ url: session.url })
}

// app/api/webhooks/stripe/route.ts
export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature')!
  const body = await req.text() // must use raw body for signature verification
  const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    await confirmBookingInDatabase(session.metadata)
  }

  return new Response(null, { status: 200 })
}
```

### Pattern 5: Supabase Storage with Signed Upload URLs

**What:** For property photo uploads, generate a signed upload URL on the server (Server Action), return it to the client, then the client uploads directly to Supabase Storage. Avoids routing large files through the Next.js server.

**When to use:** Owner uploads property photos, add-on images.

**Trade-offs:** More complex than direct upload through API route, but avoids Vercel's 4.5MB request body limit and keeps Next.js server fast.

**Example:**
```typescript
// lib/actions/properties.ts — generates upload URL, client does the actual upload
'use server'
export async function getUploadUrl(fileName: string) {
  const user = await requireOwner()
  const supabase = await createServerClient()
  const path = `${user.id}/${Date.now()}-${fileName}`

  const { data } = await supabase.storage
    .from('property-photos')
    .createSignedUploadUrl(path)

  return data // { signedUrl, token, path }
}
```

---

## Data Flow

### Booking Flow (Guest)

```
Guest selects dates + add-ons (Client Component state)
    ↓
BookingForm calls Server Action or Route Handler with booking params
    ↓
Server validates: property availability, calculates total (never trust client price)
    ↓
Server creates Stripe Checkout Session with metadata
    ↓
Server returns session.url → client redirects to Stripe hosted page
    ↓
Guest completes payment on Stripe
    ↓
Stripe POSTs webhook to /api/webhooks/stripe
    ↓
Webhook handler verifies signature, reads metadata
    ↓
Booking record written to Supabase with status: 'confirmed'
    ↓
Guest redirected to /booking/success?session_id=... (UX confirmation only)
```

### Property Management Flow (Owner)

```
Owner logs in → Supabase Auth issues JWT with role: 'owner' claim
    ↓
Middleware reads session cookie → allows /dashboard/* access
    ↓
Dashboard page Server Component calls requireOwner() via DAL
    ↓
Supabase query fetches only owner's properties (RLS enforces owner_id = auth.uid())
    ↓
Owner edits property → Client Component manages form state
    ↓
On save: Server Action called → requireOwner() verified again → Supabase update
    ↓
revalidatePath() clears Next.js cache → page re-renders with fresh data
```

### Auth Flow

```
User submits signup form (role: 'guest' or 'owner')
    ↓
Server Action calls supabase.auth.signUp() with role in user_metadata
    ↓
Supabase issues JWT, Custom Access Token Hook embeds role claim
    ↓
@supabase/ssr writes session to HttpOnly cookie
    ↓
Middleware reads cookie on all subsequent requests (optimistic check)
    ↓
DAL verifySession() calls supabase.auth.getUser() for secure verification
    ↓
RLS policies read auth.jwt()->>'user_role' to enforce data boundaries
```

### State Management

```
Server Components → fetch data → render HTML (no client state)
    ↓ (pass serializable props)
Client Components → manage local UI state (dates, add-on selections, form inputs)
    ↓ (on submit)
Server Actions → validate, mutate DB, revalidatePath()
    ↓
Next.js cache invalidated → Server Component re-renders with fresh data
```

No global client state manager (Zustand/Redux) needed. Booking form state lives in the `BookingForm` Client Component only. After submission, server-driven state takes over.

---

## Database Schema (Supabase Postgres)

```
profiles
  id (uuid, FK → auth.users.id)
  role ('guest' | 'owner')
  full_name
  created_at

properties
  id (uuid)
  owner_id (uuid, FK → profiles.id)
  name
  slug (unique, URL-friendly)
  description
  location (text — city/country)
  base_price_per_night (integer, cents)
  max_guests (integer)
  cover_photo_url
  photo_urls (text[])
  is_published (boolean)
  created_at

add_ons
  id (uuid)
  property_id (uuid, FK → properties.id)
  name
  description
  price_per_unit (integer, cents)
  unit_label (e.g. 'per person', 'per day', 'flat fee')
  photo_url
  is_available (boolean)

bookings
  id (uuid)
  property_id (uuid, FK → properties.id)
  guest_id (uuid, FK → profiles.id)
  check_in (date)
  check_out (date)
  guest_count (integer)
  subtotal_cents (integer)
  processing_fee_cents (integer)
  total_cents (integer)
  stripe_session_id (text, unique)
  stripe_payment_intent_id (text)
  status ('pending' | 'confirmed' | 'cancelled')
  created_at

booking_add_ons
  id (uuid)
  booking_id (uuid, FK → bookings.id)
  add_on_id (uuid, FK → add_ons.id)
  quantity (integer)
  price_snapshot_cents (integer)  -- price at time of booking
```

### Key RLS Policy Structure

```sql
-- Guests can read published properties
CREATE POLICY "public can read published properties"
ON properties FOR SELECT USING (is_published = true);

-- Owners can only CRUD their own properties
CREATE POLICY "owners manage own properties"
ON properties FOR ALL USING (owner_id = auth.uid());

-- Guests can only read their own bookings
CREATE POLICY "guests read own bookings"
ON bookings FOR SELECT USING (guest_id = auth.uid());

-- Webhook service role can write bookings (bypasses RLS via service_role key)
-- Stripe webhook handler uses SUPABASE_SERVICE_ROLE_KEY, not anon key
```

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Stripe Checkout | Route Handler creates session server-side; webhook confirms | Use `stripe-signature` header verification; read raw body with `req.text()` not `req.json()` |
| Supabase Auth | `@supabase/ssr` package with `createServerClient` (cookies) and `createBrowserClient` (localStorage fallback) | Do NOT mix client types — causes session loss |
| Supabase Storage | Signed upload URL generated by Server Action; client uploads directly to Supabase CDN | Avoids Vercel 4.5MB body limit; bucket should be private with RLS |
| Supabase Postgres | Server Component or Server Action queries via `createServerClient` | Use `service_role` key only in webhook handler; everywhere else use `anon` key + RLS |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Server Component → Client Component | Props (serializable only) | Cannot pass functions, class instances, or Promises (except via `use()` API) |
| Client Component → Server | Server Actions or fetch to Route Handlers | Prefer Server Actions for mutations; Route Handlers for Stripe |
| Middleware → App | Cookie read only | Middleware must NOT query Supabase database — only read session cookie for performance |
| Owner routes → Guest routes | Separate route groups with separate layouts | Owner layout enforces auth in layout.tsx; guest layout is public |

---

## Anti-Patterns

### Anti-Pattern 1: Middleware-Only Auth

**What people do:** Put all auth logic in `middleware.ts` and assume routes are protected.

**Why it's wrong:** CVE-2025-29927 (disclosed March 2025) allows attackers to bypass Next.js middleware by manipulating the `x-middleware-subrequest` header. Route access is not blocked at the data layer. Fix: upgrade to Next.js 15.2.3+ AND implement DAL verification in every protected Server Component/Action.

**Do this instead:** Middleware for UX redirects only. DAL `verifySession()` + Supabase RLS as the true security boundary.

### Anti-Pattern 2: Client-Side Price Calculation

**What people do:** Calculate booking total in the browser, send final price to server/Stripe.

**Why it's wrong:** Anyone can modify the price before it's sent. For a booking platform, this means guests could book a $5,000 villa for $1.

**Do this instead:** Always calculate pricing server-side in the Route Handler before creating the Stripe Checkout Session. The server fetches current prices from Supabase and computes the total — never trusts client-sent amounts.

### Anti-Pattern 3: Using Supabase Anon Key in Webhook Handler

**What people do:** Use the same Supabase client (with anon key + user JWT) in the Stripe webhook handler.

**Why it's wrong:** Webhook is a server-to-server call — no user JWT exists. Anon key + no JWT means RLS blocks all writes.

**Do this instead:** Webhook handler uses `SUPABASE_SERVICE_ROLE_KEY` to create an admin Supabase client that bypasses RLS. Webhook is already authenticated by Stripe signature verification.

### Anti-Pattern 4: Mixing Supabase Client Types

**What people do:** Import `createBrowserClient()` in a Server Component, or call `createServerClient()` in a Client Component.

**Why it's wrong:** `createServerClient()` reads cookies via `next/headers` which only works on the server. `createBrowserClient()` uses localStorage which doesn't exist on the server. Using the wrong client causes auth state loss or runtime errors.

**Do this instead:** Always import from the correct factory: `lib/supabase/server.ts` in Server Components/Actions/Route Handlers, `lib/supabase/browser.ts` in Client Components.

### Anti-Pattern 5: Storing Images in Postgres

**What people do:** Store property photos as base64 strings or bytea in the database.

**Why it's wrong:** Massively inflates database size, makes queries slow, bypasses CDN optimization, and costs far more than object storage.

**Do this instead:** Supabase Storage with signed upload URLs. Store only the file path/URL in the database. Use Supabase Image Transformations for on-the-fly resizing.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-100 bookings | Current monolith is fine. Supabase free tier handles it. No changes needed. |
| 100-10K bookings | Enable Supabase connection pooling (PgBouncer). Add `revalidatePath` caching strategy. Consider ISR for property listing pages. |
| 10K+ bookings | Add database indexes on `bookings(property_id, check_in, check_out)`, `properties(is_published, location)`. Consider Supabase Pro for more connections. Stripe webhook retry handling becomes important. |

### Scaling Priorities

1. **First bottleneck:** Database connection limits. Supabase free tier has 60 connections. Enable Supabase's built-in PgBouncer pooler when hitting this limit — it's a config toggle, not a code change.
2. **Second bottleneck:** Property listing page query performance. Add composite index on `properties(is_published, location)` and consider Next.js ISR (revalidate every 60s) for the public listing page to avoid DB query on every visit.

---

## Build Order Implications

The dependency graph dictates this order for phases:

1. **Supabase schema + Auth first** — Everything depends on the database being set up and auth working. RLS policies must exist before any data can be read/written correctly.

2. **DAL + Supabase client utilities second** — `lib/dal.ts`, `lib/supabase/server.ts`, `lib/supabase/browser.ts` must exist before any page can fetch data. Blocks all other work.

3. **Owner property management third** — Owners create properties before guests can browse. No data = no guest experience to build. Also validates the photo upload flow and add-on schema.

4. **Guest browsing + property detail fourth** — Depends on properties existing in the database and the data fetch patterns from step 2 being established.

5. **Booking flow fifth** — Depends on property detail page (step 4) and Stripe integration. Date availability logic requires the bookings table to exist (step 1).

6. **Stripe Checkout + webhook sixth** — Last integration because it touches everything (bookings table, property data, guest identity). Requires all earlier pieces to be working.

7. **Landing page / homepage last** — Pure content page, no blocking dependencies. Can be polished after the core booking flow works.

---

## Sources

- [Next.js Server and Client Components — Official Docs (updated 2026-02-27)](https://nextjs.org/docs/app/getting-started/server-and-client-components) — HIGH confidence
- [Next.js Authentication Guide — Official Docs (updated 2026-02-27)](https://nextjs.org/docs/app/guides/authentication) — HIGH confidence
- [Supabase Auth with Next.js App Router — Official Docs](https://supabase.com/docs/guides/auth/auth-helpers/nextjs) — HIGH confidence
- [Supabase Custom Claims and RBAC — Official Docs](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) — HIGH confidence
- [Stripe Checkout Quickstart — Official Docs](https://docs.stripe.com/checkout/quickstart?client=next) — HIGH confidence
- [Next.js Middleware CVE-2025-29927 (security advisory)](https://www.hashbuilds.com/articles/next-js-middleware-authentication-protecting-routes-in-2025) — MEDIUM confidence (verified against multiple sources; official CVE number confirmed)
- [Supabase Storage Signed URLs Pattern](https://medium.com/@olliedoesdev/signed-url-file-uploads-with-nextjs-and-supabase-74ba91b65fe0) — MEDIUM confidence (consistent with official Supabase Storage docs behavior)

---
*Architecture research for: Villa booking platform (Whole-Tel)*
*Researched: 2026-03-02*
