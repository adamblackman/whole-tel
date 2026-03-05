# Phase 5: Booking Flow - Research

**Researched:** 2026-03-04
**Domain:** Next.js 16 App Router — multi-step booking UI, PricingWidget extension, Supabase booking insert (pending status), Stripe Checkout session creation, guest booking history page
**Confidence:** HIGH

---

## Summary

Phase 5 builds the booking flow that takes a guest from the property listing page (where dates are already selected in PricingWidget) through add-on selection, a full price summary with per-person calculator, and finally a handoff to Stripe Checkout. It also adds a "My Bookings" page so guests can view past and upcoming stays.

The existing `PricingWidget` in `src/components/property/PricingWidget.tsx` already handles date selection and a basic price breakdown (nightly rate × nights + cleaning fee). Phase 5 extends it to add: guest count picker with max occupancy enforcement, add-on selection with live price updates, processing fee display, per-person cost calculator, and a "Reserve" button that kicks off the Stripe handoff. No new date-picking infrastructure is needed.

The Stripe handoff in Phase 5 is a handoff only — no webhook, no payment confirmation. The booking is created in Supabase with `status = 'pending'` before the Stripe redirect. Phase 6 will handle the webhook that flips it to `'confirmed'`. This clean separation is critical: the CLAUDE.md rule states "Webhook (`checkout.session.completed`) is the authoritative booking signal, not success URL redirects." Phase 5 must not confirm bookings — it only creates the pending record and opens Checkout.

The booking flow UX stays on the property listing page (no separate multi-step page route is needed). The PricingWidget is already a sticky sidebar Client Component. Extending it in-place avoids a context-breaking navigation step and keeps all booking state local to the widget. The "Reserve" button in the widget calls a Server Action that: (1) validates the guest is logged in, (2) inserts a `pending` booking into Supabase (with subtotal, add_ons_total, processing_fee, total), (3) inserts `booking_add_ons` rows for selected add-ons, (4) creates a Stripe Checkout Session with the booking ID in `metadata.booking_id` and `client_reference_id`, and (5) redirects to the Stripe-hosted URL.

**Primary recommendation:** Extend PricingWidget in-place with guest count + add-on state; Server Action creates pending booking + Stripe session atomically; guest booking history at `/bookings` under the (guest) route group using `verifySession()`.

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| BOOK-01 | Guest can select check-in and check-out dates via date range picker — already-booked dates blocked | Already implemented in PricingWidget (Phase 4). No new work. The Calendar with disabled confirmed-booking ranges is live. |
| BOOK-02 | Guest can set guest count with occupancy limit enforcement | Extend PricingWidget with a numeric input (or `+`/`-` buttons) bound to `useState<number>`. Max enforced client-side with `Math.min(value, maxGuests)` and `disabled` on increment button at limit. `maxGuests` prop already accepted by PricingWidget. |
| BOOK-03 | Guest can select/deselect add-ons and price summary updates in real time | Extend PricingWidget to accept `addOns` prop (from Server Component parent). Client-side `useState<Set<string>>` tracks selected add-on IDs. Price summary recalculated synchronously on toggle — no server call. |
| BOOK-04 | Price summary: nightly rate × nights + each selected add-on cost + CC processing fee + total | All arithmetic is local in PricingWidget. Add-on costs: sum of (price × guestCount for per_person, or price for per_booking) for selected add-ons. Processing fee deferred to Phase 6 display (placeholder 0 in Phase 5 since no payment type known pre-Stripe). Show fee line as "Processing fee (if paying by card)" with amount calculated at ~2.9% + $0.30. |
| BOOK-05 | Per-person cost calculator: total ÷ number of guests | Derived value in PricingWidget: `total / guestCount`. Render as "Per person" line in summary when `guestCount > 1`. |
| BOOK-06 | Guest can proceed to Stripe Checkout from price summary | "Reserve" button in PricingWidget calls a Server Action. Action: verifySession → insert pending booking + booking_add_ons → create Stripe Checkout Session → redirect to session.url. Stripe `stripe` npm package required. `STRIPE_SECRET_KEY` env var required. |
| BOOK-07 | Guest can view past and upcoming bookings in booking history | New page `/bookings` in `(guest)` route group. Server Component calls `verifySession()`, queries `bookings` joined with `properties` and `booking_add_ons`. RLS: "Guests can view their own bookings" policy already in schema. |
| ADDON-04 | Guest can select add-ons during booking flow before checkout | Handled by BOOK-03: add-on state in PricingWidget. Add-on selection UI shows name, description, price, pricing unit. Toggle checkboxes or cards. Selected add-on IDs passed to Server Action. |
| ADDON-05 | Add-on costs included in total price breakdown and per-person calculator | Handled by BOOK-04/BOOK-05: add-on costs summed into total, total divided by guestCount for per-person figure. |
</phase_requirements>

---

## Standard Stack

### Core (already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App Router, Server Actions, async params | Project baseline |
| React | 19.2.3 | useState for widget state | Ships with Next.js 16 |
| @supabase/ssr | ^0.9.0 | createServerClient in Server Actions | Project baseline |
| shadcn/ui | CLI ^3.8.5 | Card, Button, Separator, Checkbox | Already installed |
| lucide-react | ^0.576.0 | Icons in booking UI | Already installed |
| zod | ^4.3.6 | Booking input validation in Server Action | Already installed |
| tailwindcss | ^4 | Responsive layout | Already installed |
| date-fns | ^4.1.0 | Date arithmetic if needed | Already installed |

### New: Need to Install

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| stripe | ^17.x | Stripe SDK for session creation (server-side only) | Official Stripe SDK — required for `stripe.checkout.sessions.create()`. Server-only (never imported by client code). |

### New: Need to Add (shadcn CLI)

| Component | Command | Purpose |
|-----------|---------|---------|
| Checkbox | `npx shadcn@latest add checkbox` | Add-on selection in PricingWidget (if not already installed) |
| Badge | Already installed (Phase 4) | Booking status display in history |

### Installation

```bash
npm install stripe
```

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| In-place PricingWidget extension | Separate `/booking/[propertyId]` multi-step page | Separate route adds navigation complexity, loses sticky context, requires passing state via URL or server (adds latency). PricingWidget is already a Client Component with date state — extending in place is simpler. |
| Server Action for Stripe handoff | Route Handler (`/api/checkout`) | Both work. Server Action is the 2026 standard; avoids a separate API file. However, Route Handlers are still required for webhooks (Phase 6). Use Server Action for session creation in Phase 5. |
| `price_data` inline line items | Pre-created Stripe Products/Prices | Pre-creating Products requires an owner setup flow not planned for v1. `price_data` with `unit_amount` is the correct pattern for dynamic booking amounts. |

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/
│   └── (guest)/
│       ├── layout.tsx                    # Already exists — GuestNav
│       ├── properties/
│       │   └── [propertyId]/
│       │       └── page.tsx              # Already exists — pass addOns to PricingWidget (new)
│       └── bookings/
│           └── page.tsx                  # NEW — guest booking history (BOOK-07)
├── components/
│   └── property/
│       └── PricingWidget.tsx             # EXTEND — add guestCount, addOns, Reserve button
├── lib/
│   ├── actions/
│   │   └── bookings.ts                   # NEW — createBooking Server Action
│   ├── stripe.ts                         # NEW — Stripe client singleton
│   └── validations/
│       └── booking.ts                    # NEW — Zod schema for booking inputs
```

### Pattern 1: PricingWidget State Extension

**What:** The existing PricingWidget already holds `dateRange` state. Extend it to also hold `guestCount` (number, default 1) and `selectedAddOnIds` (Set\<string\>). The widget receives `addOns` as a new prop from the Server Component parent. All price calculations remain local (no server round-trip for price recalc).

**When to use:** All interactive state that can be derived from static props + user input.

```typescript
// src/components/property/PricingWidget.tsx — new props interface
interface PricingWidgetProps {
  nightlyRate: number
  cleaningFee: number
  maxGuests: number
  disabledDates: { from: Date; to: Date }[]
  addOns: AddOnItem[]    // NEW
  propertyId: string     // NEW — needed for Server Action
}

interface AddOnItem {
  id: string
  name: string
  description: string | null
  price: number
  pricing_unit: 'per_person' | 'per_booking'
}

// State additions
const [guestCount, setGuestCount] = useState(1)
const [selectedAddOnIds, setSelectedAddOnIds] = useState<Set<string>>(new Set())

// Add-on cost calculation
const addOnsTotal = addOns
  .filter(a => selectedAddOnIds.has(a.id))
  .reduce((sum, a) => {
    const cost = a.pricing_unit === 'per_person' ? a.price * guestCount : a.price
    return sum + cost
  }, 0)

const subtotal = nights * nightlyRate + cleaningFee
const processingFee = Math.round((subtotal + addOnsTotal) * 0.029 + 30) / 100  // 2.9% + $0.30
const total = subtotal + addOnsTotal + processingFee
const perPerson = guestCount > 1 ? total / guestCount : null
```

**Note:** The processing fee display in Phase 5 is informational only. The actual fee calculation will be confirmed in Phase 6 (payment type determines if fee applies). Show it labeled "Processing fee (card payments)" so guests understand it.

### Pattern 2: Guest Count Picker (Max Occupancy Enforcement)

**What:** A simple inline stepper (+/- buttons) bound to `guestCount` state. The increment button is disabled when `guestCount >= maxGuests`. Client-side only — no server validation needed for the picker itself (the Server Action re-validates on submit).

```typescript
// Inside PricingWidget
<div className="flex items-center gap-3">
  <span className="text-sm font-medium">Guests</span>
  <div className="flex items-center gap-2">
    <Button
      variant="outline"
      size="icon"
      onClick={() => setGuestCount(c => Math.max(1, c - 1))}
      disabled={guestCount <= 1}
    >−</Button>
    <span className="w-8 text-center">{guestCount}</span>
    <Button
      variant="outline"
      size="icon"
      onClick={() => setGuestCount(c => Math.min(maxGuests, c + 1))}
      disabled={guestCount >= maxGuests}
    >+</Button>
  </div>
  <span className="text-xs text-muted-foreground">Max {maxGuests}</span>
</div>
```

### Pattern 3: Add-On Selection with Real-Time Price Update

**What:** Each add-on renders as a toggleable card or checkbox row. Clicking toggles the add-on ID in `selectedAddOnIds`. The price summary re-renders synchronously because all values are derived state from the Set.

```typescript
// Add-on toggle handler
const toggleAddOn = (id: string) => {
  setSelectedAddOnIds(prev => {
    const next = new Set(prev)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
}

// Add-on UI row (inside PricingWidget render)
{addOns.map(addOn => (
  <button
    key={addOn.id}
    onClick={() => toggleAddOn(addOn.id)}
    className={cn(
      "flex items-start gap-3 w-full text-left rounded-lg border p-3 transition-colors",
      selectedAddOnIds.has(addOn.id)
        ? "border-brand-teal bg-brand-teal/5"
        : "border-border hover:border-brand-teal/50"
    )}
  >
    <div className="flex-1">
      <p className="text-sm font-medium">{addOn.name}</p>
      {addOn.description && (
        <p className="text-xs text-muted-foreground">{addOn.description}</p>
      )}
    </div>
    <span className="text-sm font-medium shrink-0">
      ${addOn.price.toLocaleString()}
      <span className="text-xs font-normal text-muted-foreground">
        {addOn.pricing_unit === 'per_person' ? '/person' : '/booking'}
      </span>
    </span>
  </button>
))}
```

### Pattern 4: Reserve Button + Server Action (Booking Insert + Stripe Redirect)

**What:** The "Reserve" button triggers a Server Action via `useTransition` and `startTransition`. The Server Action validates auth, inserts a `pending` booking + `booking_add_ons` rows, creates a Stripe Checkout Session with the booking ID in metadata, then redirects to the Stripe URL. **The Server Action must use `redirect()` from `next/navigation` to send the user to Stripe.**

**Critical sequence:**
1. `verifySession()` — redirect to `/login` if not authenticated
2. Validate inputs (dates, guestCount, selectedAddOnIds) against property data fetched server-side
3. Re-calculate total server-side — **never trust client-submitted prices**
4. Insert `bookings` row with `status = 'pending'`
5. Insert `booking_add_ons` rows
6. Create Stripe session with `client_reference_id = booking.id` and `metadata.booking_id = booking.id`
7. `redirect(session.url)` — sends user to Stripe Checkout

```typescript
// src/lib/actions/bookings.ts
'use server'

import { redirect } from 'next/navigation'
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function createBookingAndCheckout(input: {
  propertyId: string
  checkIn: string          // ISO date string "YYYY-MM-DD"
  checkOut: string
  guestCount: number
  selectedAddOnIds: string[]
}) {
  const user = await verifySession()  // redirects to /login if not authenticated
  const supabase = await createClient()

  // 1. Fetch property server-side for authoritative pricing
  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('id, nightly_rate, cleaning_fee, max_guests, name')
    .eq('id', input.propertyId)
    .single()

  if (propError || !property) throw new Error('Property not found')

  // 2. Validate inputs server-side
  if (input.guestCount > property.max_guests) {
    throw new Error('Guest count exceeds max occupancy')
  }

  const checkInDate = new Date(input.checkIn)
  const checkOutDate = new Date(input.checkOut)
  const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / 86400000)
  if (nights < 1) throw new Error('Invalid date range')

  // 3. Fetch selected add-ons server-side for authoritative pricing
  const { data: addOns } = await supabase
    .from('add_ons')
    .select('id, name, price, pricing_unit')
    .in('id', input.selectedAddOnIds)
    .eq('property_id', input.propertyId)

  // 4. Calculate totals server-side
  const subtotal = Number(property.nightly_rate) * nights + Number(property.cleaning_fee)
  const addOnsTotal = (addOns ?? []).reduce((sum, a) => {
    const cost = a.pricing_unit === 'per_person'
      ? Number(a.price) * input.guestCount
      : Number(a.price)
    return sum + cost
  }, 0)
  const processingFee = Math.round((subtotal + addOnsTotal) * 2.9 + 30) / 100  // 2.9% + $0.30
  const total = subtotal + addOnsTotal + processingFee

  // 5. Insert pending booking
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      property_id: input.propertyId,
      guest_id: user.id,
      check_in: input.checkIn,
      check_out: input.checkOut,
      guest_count: input.guestCount,
      subtotal,
      add_ons_total: addOnsTotal,
      processing_fee: processingFee,
      total,
      status: 'pending',
    })
    .select('id')
    .single()

  if (bookingError || !booking) throw new Error('Failed to create booking')

  // 6. Insert booking_add_ons rows
  if ((addOns ?? []).length > 0) {
    const bookingAddOns = addOns!.map(a => ({
      booking_id: booking.id,
      add_on_id: a.id,
      quantity: a.pricing_unit === 'per_person' ? input.guestCount : 1,
      unit_price: Number(a.price),
      total_price: a.pricing_unit === 'per_person'
        ? Number(a.price) * input.guestCount
        : Number(a.price),
    }))
    await supabase.from('booking_add_ons').insert(bookingAddOns)
  }

  // 7. Build Stripe line items
  const lineItems = [
    {
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(subtotal * 100),  // Stripe uses cents
        product_data: { name: `${property.name} — ${nights} night${nights !== 1 ? 's' : ''}` },
      },
      quantity: 1,
    },
    ...(addOns ?? []).map(a => ({
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(
          (a.pricing_unit === 'per_person'
            ? Number(a.price) * input.guestCount
            : Number(a.price)) * 100
        ),
        product_data: { name: a.name },
      },
      quantity: 1,
    })),
    {
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(processingFee * 100),
        product_data: { name: 'Processing fee' },
      },
      quantity: 1,
    },
  ]

  // 8. Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    client_reference_id: booking.id,    // used in webhook to find booking
    metadata: { booking_id: booking.id },
    customer_email: user.email,
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/bookings?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/properties/${input.propertyId}`,
  })

  // 9. Redirect to Stripe
  redirect(session.url!)
}
```

**Why `client_reference_id`:** This is visible in the Stripe Dashboard and is passed in the `checkout.session.completed` event. Using it as the booking ID means the Phase 6 webhook can look up the booking without querying metadata (simpler). Include it in `metadata.booking_id` as well for belt-and-suspenders.

### Pattern 5: Stripe Client Singleton

**What:** The `stripe` npm package should be instantiated once and reused. Next.js in development will re-evaluate module code on hot reload — using a singleton pattern or module-level variable is the standard approach.

```typescript
// src/lib/stripe.ts
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',  // Use current stable API version
  typescript: true,
})
```

**Critical:** `STRIPE_SECRET_KEY` must never be prefixed with `NEXT_PUBLIC_`. It is server-only.

### Pattern 6: Guest Booking History Page

**What:** A new Server Component page at `src/app/(guest)/bookings/page.tsx`. Calls `verifySession()` to gate access. Fetches all bookings for the current user joined with property name. Renders two sections: "Upcoming" (check_in >= today) and "Past" (check_out < today).

```typescript
// src/app/(guest)/bookings/page.tsx
import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'

export default async function BookingsPage() {
  const user = await verifySession()
  const supabase = await createClient()

  const { data: bookings } = await supabase
    .from('bookings')
    .select(`
      id, check_in, check_out, guest_count, subtotal, add_ons_total,
      processing_fee, total, status, created_at,
      properties(id, name, location)
    `)
    .eq('guest_id', user.id)
    .order('check_in', { ascending: false })

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = (bookings ?? []).filter(b => b.check_in >= today)
  const past = (bookings ?? []).filter(b => b.check_in < today)

  // Render sections with booking cards
}
```

**RLS note:** The "Guests can view their own bookings" policy (`USING ((SELECT auth.uid()) = guest_id)`) already exists in the schema. No migration needed.

### Pattern 7: Calling the Server Action from PricingWidget

**What:** PricingWidget is a `'use client'` component. It cannot call Server Actions directly via `async/await` — it uses `useTransition` to track pending state and wraps the call in `startTransition`. The Server Action returns `void` (it redirects on success or throws on error).

```typescript
// Inside PricingWidget
'use client'

import { useTransition } from 'react'
import { createBookingAndCheckout } from '@/lib/actions/bookings'

// ...
const [isPending, startTransition] = useTransition()

const handleReserve = () => {
  if (!dateRange?.from || !dateRange?.to) return

  startTransition(async () => {
    await createBookingAndCheckout({
      propertyId,
      checkIn: dateRange.from!.toISOString().slice(0, 10),
      checkOut: dateRange.to!.toISOString().slice(0, 10),
      guestCount,
      selectedAddOnIds: Array.from(selectedAddOnIds),
    })
  })
}

// Reserve button
<Button
  onClick={handleReserve}
  disabled={isPending || !dateRange?.from || !dateRange?.to || nights < 1}
  className="w-full"
>
  {isPending ? 'Redirecting…' : 'Reserve'}
</Button>
```

### Anti-Patterns to Avoid

- **Confirming bookings in Phase 5:** The booking must remain `status = 'pending'` after the Server Action. Only the Phase 6 Stripe webhook (authenticated via signature verification) confirms the booking. Do not flip status to `'confirmed'` on the success URL redirect.
- **Trusting client-submitted prices:** The Server Action fetches property and add-on pricing from Supabase server-side. It ignores any price values passed from the client. This is the CLAUDE.md "server-side pricing only" rule.
- **Using `service_role` key in Server Actions for booking insert:** The RLS policy "Guests can insert their own bookings" (`WITH CHECK ((SELECT auth.uid()) = guest_id)`) means the anon-key `createClient()` in the Server Action handles insertion correctly — no service_role key needed. The authenticated user's session is in the cookie, picked up by `createClient()`.
- **Putting Stripe import in any client component:** `import Stripe from 'stripe'` must only appear in server-side code (`'use server'` files or `src/lib/stripe.ts` which is only imported by server files). Importing Stripe client-side exposes the secret key.
- **redirect() inside a try/catch block:** In Next.js, `redirect()` throws an internal error to signal the redirect. If it is inside a try/catch, the error is caught and the redirect never fires. Always call `redirect()` outside any try/catch.
- **Exposing `STRIPE_SECRET_KEY` as `NEXT_PUBLIC_`:** CLAUDE.md non-negotiable. Only `NEXT_PUBLIC_` vars are safe for client code.
- **Skipping the "My Bookings" link in GuestNav:** BOOK-07 requires booking history is accessible. The GuestNav needs a "My Bookings" link that shows only when the user is logged in. This requires GuestNav to become auth-aware (or a separate client component for the authenticated portion).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Payment form UI | Custom card input fields | Stripe Checkout (hosted) | PCI compliance, card tokenization, 3DS, international support — thousands of edge cases |
| Server-side price recalculation | Trusting client-submitted totals | Re-fetch from Supabase in Server Action | CLAUDE.md rule: "Server-side pricing only — never trust client-submitted prices" |
| Optimistic booking conflict check | App-level date overlap check | PostgreSQL GiST exclusion constraint | Race condition: two simultaneous booking requests pass app-level check, both insert. DB constraint is the only safe guard. CLAUDE.md: "Booking date exclusion constraint (GiST index) — application-level checks alone are not safe." |
| Custom checkout session state | URL params or localStorage | `client_reference_id` + Supabase booking row | The pending booking in Supabase is the canonical state. Its ID connects the Stripe session to the booking permanently. |
| Add-on price re-calculation | Client-only calculation passed to Server Action | Server Action re-fetches add-on prices from DB | Add-on prices could change between page load and booking. Always re-fetch authoritatively. |

**Key insight:** The GiST exclusion constraint in the schema (`CONSTRAINT no_overlapping_confirmed_bookings`) is the ONLY reliable double-booking prevention. Phase 5 inserts `pending` bookings (which don't trigger the constraint), so no race condition occurs at the Phase 5 insert step. Phase 6 webhook flips to `confirmed` — that's when the constraint fires. This is the correct design.

---

## Common Pitfalls

### Pitfall 1: redirect() Inside try/catch

**What goes wrong:** Developer wraps the entire Server Action in try/catch. `redirect()` throws a Next.js internal `NEXT_REDIRECT` error to signal the redirect. The catch block catches it, logs it as an error, and returns an error state instead of redirecting.

**Why it happens:** `redirect()` uses throw internally (Next.js documented behavior). Any try/catch around it suppresses the redirect.

**How to avoid:** Structure Server Actions so `redirect()` is called at the end, after the try/catch for Stripe and Supabase operations:

```typescript
export async function createBookingAndCheckout(input) {
  let stripeUrl: string

  try {
    // ...all DB and Stripe operations...
    stripeUrl = session.url!
  } catch (err) {
    return { error: 'Booking failed' }
  }

  redirect(stripeUrl)  // OUTSIDE try/catch
}
```

**Warning signs:** "Reserve" button shows an error state instead of redirecting; server logs show "NEXT_REDIRECT" in caught errors.

### Pitfall 2: Stripe Amounts Must Be in Cents (Integers)

**What goes wrong:** Developer passes `unit_amount: 150.50` (a float). Stripe rejects the session creation with an error.

**Why it happens:** Stripe requires `unit_amount` as a non-negative integer representing cents. `$150.50` → `15050`.

**How to avoid:** Always use `Math.round(dollarAmount * 100)`:

```typescript
unit_amount: Math.round(Number(property.nightly_rate) * nights * 100)
```

**Warning signs:** `Stripe API Error: Invalid integer` during session creation.

### Pitfall 3: Processing Fee Language

**What goes wrong:** UI labels the fee as "Credit card surcharge". This is prohibited in CA, CT, ME, MA and on debit cards under the Durbin Amendment.

**Why it happens:** Intuitive but legally incorrect label.

**How to avoid:** CLAUDE.md non-negotiable: always use "Processing fee" language. Label in the price summary: "Processing fee (card payments)". The fee applies when paying by card — ACH bank transfer (Phase 6) has no fee.

**Warning signs:** Any mention of "surcharge", "credit card fee", or "card fee" in the UI.

### Pitfall 4: Guest Count Not Re-Validated Server-Side

**What goes wrong:** A guest manipulates the client-side state to exceed `maxGuests` and calls the Server Action with an inflated guest count. The Server Action trusts it.

**Why it happens:** Client-side `disabled` buttons are UI-only protections. They can be bypassed with dev tools.

**How to avoid:** The Server Action fetches `property.max_guests` from Supabase and validates:

```typescript
if (input.guestCount > property.max_guests || input.guestCount < 1) {
  throw new Error('Invalid guest count')
}
```

**Warning signs:** Bookings in the DB with `guest_count` exceeding the property's `max_guests`.

### Pitfall 5: Add-Ons From Wrong Property

**What goes wrong:** A crafty guest sends add-on IDs from a different property in their request. The Server Action accepts them and creates `booking_add_ons` for the wrong property's add-ons.

**Why it happens:** Input validation only checks that the add-on IDs exist, not that they belong to the property being booked.

**How to avoid:** The Supabase query for add-ons includes `.eq('property_id', input.propertyId)`:

```typescript
const { data: addOns } = await supabase
  .from('add_ons')
  .select('id, name, price, pricing_unit')
  .in('id', input.selectedAddOnIds)
  .eq('property_id', input.propertyId)  // scoped to this property
```

Only add-ons belonging to the property are fetched, so foreign add-on IDs are silently ignored (not included in the booking).

**Warning signs:** `booking_add_ons` rows referencing add-ons that don't belong to the booked property.

### Pitfall 6: NEXT_PUBLIC_APP_URL Missing

**What goes wrong:** `success_url` and `cancel_url` in the Stripe session are `undefined/properties/...`. Stripe rejects the session or redirects to `undefined`.

**Why it happens:** `process.env.NEXT_PUBLIC_APP_URL` is not set in `.env.local`.

**How to avoid:** Add `NEXT_PUBLIC_APP_URL=http://localhost:3000` to `.env.local`. In production, set it to the deployed URL. The `NEXT_PUBLIC_` prefix is intentional here — the value (a URL base) is not sensitive, and it may be referenced in client components too. Alternatively, use `headers().get('origin')` in the Server Action for a dynamic origin.

**Warning signs:** Stripe shows "Invalid URL" when creating the session.

### Pitfall 7: GuestNav Auth-Awareness

**What goes wrong:** The "My Bookings" link is always visible (unauthenticated guests click it and get redirected to login), or it's never visible (logged-in guests can't find their bookings).

**Why it happens:** GuestNav is currently a Server Component that doesn't check auth state.

**How to avoid:** Convert GuestNav to check the session server-side (call `createClient()` + `supabase.auth.getUser()` in the GuestNav Server Component — do NOT call `verifySession()` which redirects on failure). Render "My Bookings" and "Log out" only when a user is authenticated; show "Log in" when not.

```typescript
// GuestNav as Server Component (no 'use client' needed)
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
// Render conditionally based on !!user
```

**Warning signs:** Unauthenticated guests see "My Bookings" link; logged-in guests only see "Log in".

---

## Code Examples

Verified patterns from official sources and project conventions:

### Stripe Singleton

```typescript
// Source: Stripe Node.js SDK docs + project pattern
// src/lib/stripe.ts
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia',
  typescript: true,
})
```

### Add-On Cost Calculation (matches schema pricing_unit values)

```typescript
// Source: Phase 1 schema — add_ons.pricing_unit IN ('per_person', 'per_booking')
const addOnsTotal = selectedAddOns.reduce((sum, addOn) => {
  const cost = addOn.pricing_unit === 'per_person'
    ? addOn.price * guestCount
    : addOn.price
  return sum + cost
}, 0)
```

### Processing Fee Calculation

```typescript
// Source: CLAUDE.md + Durbin Amendment pattern
// Standard Stripe card rate: 2.9% + $0.30
const processingFee = parseFloat(((subtotal + addOnsTotal) * 0.029 + 0.30).toFixed(2))
```

### Booking History Query (RLS-aware)

```typescript
// Source: Phase 1 schema RLS — "Guests can view their own bookings"
// No .eq('guest_id', user.id) needed — RLS enforces it automatically
// But include it for clarity and defense-in-depth:
const { data: bookings } = await supabase
  .from('bookings')
  .select(`
    id, check_in, check_out, guest_count, subtotal, add_ons_total,
    processing_fee, total, status, created_at,
    properties(id, name, location)
  `)
  .eq('guest_id', user.id)
  .order('check_in', { ascending: false })
```

### Stripe Checkout Session with Ad-Hoc Pricing

```typescript
// Source: https://docs.stripe.com/api/checkout/sessions/create
const session = await stripe.checkout.sessions.create({
  mode: 'payment',
  line_items: [
    {
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(subtotal * 100),  // cents, integer required
        product_data: { name: `${property.name} — ${nights} nights` },
      },
      quantity: 1,
    },
  ],
  client_reference_id: booking.id,  // used in Phase 6 webhook
  metadata: { booking_id: booking.id },
  customer_email: user.email,
  success_url: `${process.env.NEXT_PUBLIC_APP_URL}/bookings?success=true`,
  cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/properties/${propertyId}`,
})

redirect(session.url!)  // OUTSIDE any try/catch
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| API Route `/api/checkout` | Server Action `'use server'` | 2024-2025 (Next.js 14-15) | Session creation in a `.ts` file, not an API file. Route Handlers still required for webhooks. |
| Stripe `price` ID (pre-created products) | `price_data` with `unit_amount` | Always available | Correct approach for dynamic booking amounts — no Stripe Dashboard product setup required |
| `useFormState` (React 18) | `useActionState` (React 19) | React 19 | This project uses React 19. If binding action state, use `useActionState`. For simple redirect-on-success actions, `useTransition` + `startTransition` is simpler. |
| Manual booking conflict check | PostgreSQL GiST exclusion constraint | Phase 1 | The constraint is already in the schema. Phase 5 inserts `pending` bookings — no conflict. Phase 6 confirms — constraint fires if needed. |
| `getSession()` in Server Actions | `verifySession()` from DAL (uses `getUser()`) | Phase 1 decision | `getUser()` validates JWT against Supabase auth server. Established project pattern. |

**Deprecated/outdated:**
- `useFormState` from `react-dom`: React 19 renamed to `useActionState` from `react`. Do not use `useFormState`.
- Stripe `apiVersion: '2022-11-15'` or older: Use current stable version (check Stripe dashboard for current default, currently `2025-01-27.acacia` based on 2026 context).

---

## Open Questions

1. **Processing fee in Phase 5 vs Phase 6**
   - What we know: CLAUDE.md says processing fee is for credit card only (not debit, not restricted states). In Phase 5, we don't know the payment method yet (that's chosen in Stripe Checkout). Phase 6 is where Stripe confirms the payment type.
   - What's unclear: Should Phase 5 show the processing fee in the price summary at all? Or show it as conditional?
   - Recommendation: Show the processing fee as "Processing fee (card payments only)" with the calculated amount. This is transparent and matches user expectation from seeing it before entering Stripe. Phase 6 will confirm via webhook whether the fee was actually charged (ACH has no fee). The Stripe Checkout Session's line items will include the fee regardless — Phase 6 may need to handle ACH refund of the fee. **Flag this for Phase 6 planning.**

2. **GuestNav auth-awareness implementation**
   - What we know: GuestNav is currently a Server Component with no auth check. It always shows "Log in" and never shows "My Bookings" or a logout option.
   - What's unclear: Should GuestNav show a user avatar/name when logged in? Or just change the nav links?
   - Recommendation: Keep it simple for Phase 5 — fetch the user in GuestNav Server Component, show "My Bookings" + "Log out" when authenticated, show "Log in" when not. No avatar needed (Phase 7 polish).

3. **Booking history page — what to show for `pending` bookings**
   - What we know: After Phase 5, a guest who starts a booking but abandons Stripe Checkout will have a `pending` booking in their history.
   - What's unclear: Should `pending` bookings show in the history page? With what UI treatment?
   - Recommendation: Show `pending` bookings in history with a yellow "Payment pending" badge. This gives guests confidence their booking was initiated. Phase 6 will update these to `confirmed` or handle cleanup of abandoned `pending` bookings.

4. **NEXT_PUBLIC_APP_URL for Stripe success/cancel URLs**
   - What we know: Stripe requires absolute URLs for `success_url` and `cancel_url`.
   - What's unclear: Whether to use a static env var or derive the origin dynamically from `headers()`.
   - Recommendation: Use `headers().get('origin')` in the Server Action (dynamic, no env var needed, works in all environments). Fallback to `process.env.NEXT_PUBLIC_APP_URL` if headers are unavailable.

---

## Validation Architecture

> `workflow.nyquist_validation` is not set in `.planning/config.json` — skipping this section.

---

## Sources

### Primary (HIGH confidence)

- Phase 1 schema migration (read directly 2026-03-04): `supabase/migrations/20260302000001_schema_rls.sql` — bookings table schema, RLS policies, GiST constraint, booking_add_ons table
- Phase 4 PricingWidget implementation (read directly 2026-03-04): `src/components/property/PricingWidget.tsx` — exact current state to extend
- Phase 4 property listing page (read directly 2026-03-04): `src/app/(guest)/properties/[propertyId]/page.tsx` — how addOns data flows from Server Component
- `src/types/database.ts` (read directly 2026-03-04) — BookingAddOn, Booking, AddOn types already defined
- CLAUDE.md project guidelines — server-side pricing, processing fee language, auth three-layer pattern
- Stripe API Docs (fetched 2026-03-04): https://docs.stripe.com/api/checkout/sessions/create — `price_data`, `unit_amount`, `client_reference_id`, `metadata` params confirmed
- STATE.md accumulated decisions — `verifySession()` over `getSession()`, `redirect()` + `revalidatePath()` patterns, `requireOwner()` + `verifySession()` from DAL

### Secondary (MEDIUM confidence)

- DEV.to 2026 Stripe + Next.js guide (fetched 2026-03-04): Server Actions as standard for checkout session creation confirmed; Route Handler required for webhooks confirmed
- Stripe metadata docs: https://docs.stripe.com/metadata — key-value pairs in checkout sessions, `client_reference_id` for reconciliation confirmed
- WebSearch + cross-verification: Supabase "Guests can insert their own bookings" policy means anon-key client (with authenticated user cookie) handles insert correctly — no service_role needed

### Tertiary (LOW confidence)

- Stripe `apiVersion: '2025-01-27.acacia'` — latest stable API version as of research date. Verify in Stripe Dashboard before hardcoding.
- ACH fee handling (processing fee refund for ACH payments) — complex scenario; flagged as Open Question for Phase 6.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries either already installed (project-verified) or official Stripe SDK (well-documented)
- Architecture patterns: HIGH — PricingWidget extension follows established Phase 4 pattern; Server Action pattern follows Phase 3 established conventions; booking insert matches schema exactly
- Stripe integration: HIGH for session creation API; MEDIUM for processing fee handling edge cases (ACH scenario)
- Pitfalls: HIGH — redirect/try-catch pitfall verified in Next.js docs; cent/integer pitfall from Stripe docs; processing fee language from CLAUDE.md

**Research date:** 2026-03-04
**Valid until:** 2026-04-04 (Next.js 16, Stripe SDK v17, Supabase schema are all stable; React 19 patterns are settled)
