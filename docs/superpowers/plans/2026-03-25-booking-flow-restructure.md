# Booking Flow Restructure: Villa Dates -> Experiences -> Payment

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the booking flow so guests pick dates first, optionally plan experiences on a calendar, see a live price total, then proceed to Stripe checkout with everything in one payment.

**Architecture:** Split `createBookingAndCheckout` into two server actions: `createPendingBooking` (dates/guests only, redirects to plan page) and `checkoutBooking` (calculates full total with experiences, creates Stripe session). Add a new `/bookings/[id]/plan` page that combines the existing ItineraryCalendar with a live pricing sidebar. The existing itinerary page (`/bookings/[id]/itinerary`) remains for post-booking viewing/editing.

**Tech Stack:** Next.js 16 App Router, Supabase, Stripe, FullCalendar, shadcn/ui, Zod, `calculatePricing` from `src/lib/pricing.ts`

---

## File Map

| Action | Path | Responsibility |
|--------|------|---------------|
| Modify | `src/lib/actions/bookings.ts` | Split into `createPendingBooking` + `checkoutBooking` |
| Modify | `src/components/property/PricingWidget.tsx` | Change "Reserve" to call `createPendingBooking`, redirect to plan page |
| Create | `src/app/(guest)/bookings/[bookingId]/plan/page.tsx` | New plan page: calendar + pricing sidebar |
| Create | `src/components/booking/PlanPricingSidebar.tsx` | Live pricing sidebar with checkout button |
| Modify | `src/components/booking/ItineraryCalendar.tsx` | Add `onEventsChange` callback for live pricing updates |
| Modify | `src/lib/actions/itinerary.ts` | Allow pending bookings (not just confirmed) |
| Modify | `src/app/(guest)/bookings/[bookingId]/itinerary/page.tsx` | Keep for post-booking, no changes needed |
| Modify | `src/components/booking/BookingCardClient.tsx` | Show "Plan Itinerary" link for pending bookings too |
| Modify | `src/app/api/webhooks/stripe/route.ts` | No changes needed (already handles pending->confirmed) |

---

### Task 1: Split `createBookingAndCheckout` into two actions

**Files:**
- Modify: `src/lib/actions/bookings.ts`

This is the core backend change. We split the monolithic action into:
1. `createPendingBooking` — creates pending booking row, returns booking ID (no Stripe)
2. `checkoutBooking` — fetches booking + itinerary events, calculates full pricing, creates Stripe session, redirects

- [ ] **Step 1: Create `createPendingBooking` action**

Replace the existing `createBookingAndCheckout` with two new exports. `createPendingBooking` does steps 1-7 of the old function (auth, validate, fetch property, calculate base pricing, insert booking row) but does NOT create a Stripe session. Instead it returns the booking ID.

```typescript
export async function createPendingBooking(input: {
  propertyId: string
  checkIn: string
  checkOut: string
  guestCount: number
}): Promise<string> {
  const user = await verifySession()

  const parsed = bookingInputSchema.safeParse(input)
  if (!parsed.success) {
    throw new Error(parsed.error.issues[0]?.message ?? 'Invalid booking input')
  }

  const supabase = await createClient()

  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('id, name, nightly_rate, cleaning_fee, max_guests, guest_threshold, per_person_rate, tax_rate')
    .eq('id', input.propertyId)
    .single()

  if (propError || !property) throw new Error('Property not found')

  if (input.guestCount < 1 || input.guestCount > property.max_guests) {
    throw new Error('Invalid guest count')
  }

  const checkInDate = new Date(input.checkIn)
  const checkOutDate = new Date(input.checkOut)
  const nights = Math.ceil(
    (checkOutDate.getTime() - checkInDate.getTime()) / 86400000
  )
  if (nights < 1) throw new Error('Invalid date range')

  // Base pricing (no add-ons yet — guest will add on plan page)
  const breakdown = calculatePricing({
    nightlyRate: Number(property.nightly_rate),
    cleaningFee: Number(property.cleaning_fee),
    nights,
    guestCount: input.guestCount,
    guestThreshold: property.guest_threshold != null ? Number(property.guest_threshold) : null,
    perPersonRate: property.per_person_rate != null ? Number(property.per_person_rate) : null,
    taxRate: property.tax_rate != null ? Number(property.tax_rate) : null,
    selectedAddOns: [],
  })

  const subtotal = breakdown.accommodationSubtotal + breakdown.perPersonSurcharge

  // Check for existing pending booking for same property/user — reuse it instead of creating duplicates
  const { data: existing } = await supabase
    .from('bookings')
    .select('id')
    .eq('property_id', input.propertyId)
    .eq('guest_id', user.id)
    .eq('status', 'pending')
    .limit(1)
    .maybeSingle()

  if (existing) {
    // Update the existing pending booking with new dates/guests instead of creating a new one
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        check_in: input.checkIn,
        check_out: input.checkOut,
        guest_count: input.guestCount,
        subtotal,
        add_ons_total: 0,
        processing_fee: breakdown.processingFee,
        total: breakdown.total,
      })
      .eq('id', existing.id)

    if (updateError) throw new Error('Failed to update booking')
    return existing.id
  }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      property_id: input.propertyId,
      guest_id: user.id,
      check_in: input.checkIn,
      check_out: input.checkOut,
      guest_count: input.guestCount,
      subtotal,
      add_ons_total: 0,
      processing_fee: breakdown.processingFee,
      total: breakdown.total,
      status: 'pending',
    })
    .select('id, created_at')
    .single()

  if (bookingError || !booking) throw new Error('Failed to create booking')

  // Set payment deadline but NOT activity_deadline yet — that gets set
  // after checkout confirmation so near-term bookings aren't locked during planning
  const bookingCreatedAt = new Date(booking.created_at)
  await supabase
    .from('bookings')
    .update({
      payment_deadline: new Date(bookingCreatedAt.getTime() + 36 * 3600 * 1000).toISOString(),
    })
    .eq('id', booking.id)

  return booking.id
}
```

- [ ] **Step 2: Create `checkoutBooking` action**

This action is called from the plan page's "Proceed to checkout" button. It fetches the pending booking, fetches itinerary events to find which add-ons were selected, recalculates full pricing server-side, creates the Stripe session, and redirects.

```typescript
export async function checkoutBooking(bookingId: string): Promise<void> {
  const user = await verifySession()
  const supabase = await createClient()

  // Fetch booking
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('id, property_id, check_in, check_out, guest_count, status')
    .eq('id', bookingId)
    .eq('guest_id', user.id)
    .eq('status', 'pending')
    .single()

  if (bookingError || !booking) throw new Error('Booking not found or already paid')

  // Fetch property
  const { data: property, error: propError } = await supabase
    .from('properties')
    .select('id, name, nightly_rate, cleaning_fee, max_guests, guest_threshold, per_person_rate, tax_rate')
    .eq('id', booking.property_id)
    .single()

  if (propError || !property) throw new Error('Property not found')

  // Fetch itinerary events with activity details
  const { data: events } = await supabase
    .from('itinerary_events')
    .select('activity_id')
    .eq('booking_id', bookingId)
    .not('activity_id', 'is', null)

  // Get unique activity IDs from itinerary.
  // Pricing is per-unique-activity (not per-occurrence). A guest who books
  // "Snorkeling" on Monday and Wednesday pays for Snorkeling once.
  // This matches the add-on pricing model (flat fee or per-person, not per-session).
  const activityIds = [...new Set((events ?? []).map(e => e.activity_id).filter(Boolean))] as string[]

  // Fetch add-on details for selected activities
  let selectedAddOns: {
    id: string
    name: string
    price: number
    pricingUnit: 'per_person' | 'per_booking'
    includedGuests: number | null
    perPersonAbove: number | null
  }[] = []

  if (activityIds.length > 0) {
    const { data: addOns } = await supabase
      .from('add_ons')
      .select('id, name, price, pricing_unit, included_guests, per_person_above')
      .in('id', activityIds)

    selectedAddOns = (addOns ?? []).map(a => ({
      id: a.id,
      name: a.name,
      price: Number(a.price),
      pricingUnit: a.pricing_unit as 'per_person' | 'per_booking',
      includedGuests: a.included_guests != null ? Number(a.included_guests) : null,
      perPersonAbove: a.per_person_above != null ? Number(a.per_person_above) : null,
    }))
  }

  const nights = Math.ceil(
    (new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / 86400000
  )

  // Full pricing with experiences
  const breakdown = calculatePricing({
    nightlyRate: Number(property.nightly_rate),
    cleaningFee: Number(property.cleaning_fee),
    nights,
    guestCount: booking.guest_count,
    guestThreshold: property.guest_threshold != null ? Number(property.guest_threshold) : null,
    perPersonRate: property.per_person_rate != null ? Number(property.per_person_rate) : null,
    taxRate: property.tax_rate != null ? Number(property.tax_rate) : null,
    selectedAddOns,
  })

  const subtotal = breakdown.accommodationSubtotal + breakdown.perPersonSurcharge
  const total = breakdown.total

  // Update booking with final totals
  await supabase
    .from('bookings')
    .update({
      subtotal,
      add_ons_total: breakdown.addOnsTotal,
      processing_fee: breakdown.processingFee,
      total,
    })
    .eq('id', bookingId)

  // Build Stripe line items
  const lineItems = [
    {
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(breakdown.accommodationSubtotal * 100),
        product_data: {
          name: `${property.name} -- ${nights} night${nights !== 1 ? 's' : ''}`,
        },
      },
      quantity: 1,
    },
    ...(breakdown.perPersonSurcharge > 0
      ? [{
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(breakdown.perPersonSurcharge * 100),
            product_data: {
              name: `Per-person surcharge (${breakdown.surchargeDetail!.extraGuests} extra guest${breakdown.surchargeDetail!.extraGuests !== 1 ? 's' : ''})`,
            },
          },
          quantity: 1,
        }]
      : []),
    {
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(breakdown.cleaningFee * 100),
        product_data: { name: 'Cleaning fee' },
      },
      quantity: 1,
    },
    // Individual experience line items
    ...breakdown.addOnItems.map(item => ({
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(item.totalCost * 100),
        product_data: { name: item.name },
      },
      quantity: 1,
    })),
    ...(breakdown.hotelTax > 0
      ? [{
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(breakdown.hotelTax * 100),
            product_data: {
              name: `Hotel Tax (${((breakdown.taxRate ?? 0) * 100).toFixed(0)}%)`,
            },
          },
          quantity: 1,
        }]
      : []),
    {
      price_data: {
        currency: 'usd',
        unit_amount: Math.round(breakdown.processingFee * 100),
        product_data: { name: 'Processing fee' },
      },
      quantity: 1,
    },
  ]

  const headerStore = await headers()
  const origin =
    headerStore.get('origin') ||
    process.env.NEXT_PUBLIC_APP_URL ||
    'http://localhost:3000'

  let stripeUrl: string

  try {
    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card', 'us_bank_account'],
      line_items: lineItems,
      client_reference_id: bookingId,
      metadata: { booking_id: bookingId },
      customer_email: user.email ?? undefined,
      success_url: `${origin}/bookings?success=true`,
      cancel_url: `${origin}/bookings/${bookingId}/plan`,
    })

    stripeUrl = session.url!

    // Set activity_deadline now (at checkout time, not booking creation)
    // so near-term bookings aren't locked during the planning phase
    const { data: bk } = await supabase
      .from('bookings')
      .select('created_at')
      .eq('id', bookingId)
      .single()
    const createdAt = new Date(bk?.created_at ?? new Date())

    await supabase
      .from('bookings')
      .update({
        stripe_checkout_url: session.url,
        activity_deadline: computeActivityDeadline(booking.check_in, createdAt),
      })
      .eq('id', bookingId)
  } catch (err) {
    console.error('Checkout failed:', err)
    throw new Error('Failed to create checkout session. Please try again.')
  }

  redirect(stripeUrl)
}
```

- [ ] **Step 3: Remove old `createBookingAndCheckout` export**

Delete the entire `createBookingAndCheckout` function. It is fully replaced by the two new actions.

- [ ] **Step 4: Verify the file compiles**

Run: `npx next build --no-lint 2>&1 | head -30` (or `pnpm tsc --noEmit`)

- [ ] **Step 5: Commit**

```bash
git add src/lib/actions/bookings.ts
git commit -m "refactor: split createBookingAndCheckout into createPendingBooking + checkoutBooking"
```

---

### Task 2: Update PricingWidget to create pending booking and redirect to plan page

**Files:**
- Modify: `src/components/property/PricingWidget.tsx`

The widget currently calls `createBookingAndCheckout` which goes straight to Stripe. Change it to call `createPendingBooking` and redirect to `/bookings/[id]/plan`.

- [ ] **Step 1: Update import and handler**

Change the import from `createBookingAndCheckout` to `createPendingBooking`. Update `handleReserve` to get the booking ID back and redirect to the plan page.

```typescript
// Change import
import { createPendingBooking } from '@/lib/actions/bookings'
import { useRouter } from 'next/navigation'

// Inside component, add router:
const router = useRouter()

// Replace handleReserve:
const handleReserve = () => {
  if (!dateRange?.from || !dateRange?.to) return
  setError(null)

  startTransition(async () => {
    try {
      const bookingId = await createPendingBooking({
        propertyId,
        checkIn: dateRange.from!.toISOString().slice(0, 10),
        checkOut: dateRange.to!.toISOString().slice(0, 10),
        guestCount,
      })
      router.push(`/bookings/${bookingId}/plan`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    }
  })
}
```

- [ ] **Step 2: Update button text**

Change the button text from "Redirecting to checkout..." to "Creating reservation..." during pending state.

```tsx
{isPending ? 'Creating reservation...' : 'Reserve'}
```

- [ ] **Step 3: Verify build**

Run: `pnpm tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git add src/components/property/PricingWidget.tsx
git commit -m "feat: PricingWidget redirects to plan page instead of Stripe"
```

---

### Task 3: Add `onEventsChange` callback to ItineraryCalendar

**Files:**
- Modify: `src/components/booking/ItineraryCalendar.tsx`

The plan page needs to know which activities are on the calendar so it can calculate live pricing. Add an optional `onEventsChange` callback that fires whenever events are added or removed, passing the current list of activity IDs.

- [ ] **Step 1: Add optional prop**

Add to `ItineraryCalendarProps`:

```typescript
onEventsChange?: (activityIds: string[]) => void
```

- [ ] **Step 2: Call callback after event changes**

**Important:** Both `handleAddEvent` and `handleEventClick` use `useCallback` without `events` in their dependency arrays. Reading `events` directly would give stale values. All `onEventsChange` calls MUST go inside the `setEvents` functional updater.

In `handleAddEvent`, replace the existing `setEvents` call (line 165) with:

```typescript
setEvents((prev) => {
  const next = [...prev, calEvent]
  if (onEventsChange) {
    const ids = next
      .map(e => (e.extendedProps as { activityId?: string | null })?.activityId)
      .filter((id): id is string => id != null)
    onEventsChange([...new Set(ids)])
  }
  return next
})
```

In `handleEventClick`, replace the existing `setEvents` call (line 136) with:

```typescript
setEvents((prev) => {
  const next = prev.filter((e) => e.id !== eventId)
  if (onEventsChange) {
    const ids = next
      .map(e => (e.extendedProps as { activityId?: string | null })?.activityId)
      .filter((id): id is string => id != null)
    onEventsChange([...new Set(ids)])
  }
  return next
})
```

Add `onEventsChange` to the dependency arrays of both `useCallback` hooks.

- [ ] **Step 3: Commit**

```bash
git add src/components/booking/ItineraryCalendar.tsx
git commit -m "feat: add onEventsChange callback to ItineraryCalendar"
```

---

### Task 4: Allow itinerary actions on pending bookings

**Files:**
- Modify: `src/lib/actions/itinerary.ts`

Currently `upsertItineraryEvent` and `deleteItineraryEvent` don't check booking status, but the itinerary page only loads for `status: 'confirmed'`. Since the plan page will use these for pending bookings, we just need to confirm the actions work for pending bookings. Check that RLS policies also allow this.

- [ ] **Step 1: Verify itinerary actions don't filter by status**

Read `src/lib/actions/itinerary.ts` — confirm that `upsertItineraryEvent` and `deleteItineraryEvent` query by `bookingId` and `guest_id` but do NOT filter by `status`. They already work for pending bookings. No code change needed.

- [ ] **Step 2: Handle `activity_deadline` check for pending bookings**

`upsertItineraryEvent` checks `isDeadlinePassed(booking.activity_deadline)`. Since we now defer setting `activity_deadline` until checkout, pending bookings will have `activity_deadline = null`. `isDeadlinePassed(null)` returns `false` (line 29 of itinerary-event.ts), so this works correctly — pending bookings are never deadline-locked. No code change needed.

- [ ] **Step 3: Verify RLS allows itinerary_events for pending bookings**

Check Supabase RLS on `itinerary_events` table. The policy should allow insert/update/delete where the booking belongs to the user (via `booking_id -> bookings.guest_id`). Status should not be part of the RLS check. If it is, we need a migration.

Run: Check via Supabase MCP or SQL: `SELECT * FROM pg_policies WHERE tablename = 'itinerary_events';`

- [ ] **Step 4: Commit (if changes needed)**

Only if RLS migration was needed.

---

### Task 5: Create the Plan page

**Files:**
- Create: `src/app/(guest)/bookings/[bookingId]/plan/page.tsx`

This is the new step 2 page. Server component that fetches the pending booking, property, add-ons, and existing itinerary events, then renders the ItineraryCalendar alongside a pricing sidebar.

- [ ] **Step 1: Create the plan page**

```typescript
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Metadata } from 'next'

import { verifySession } from '@/lib/dal'
import { createClient } from '@/lib/supabase/server'
import { PlanPageClient } from '@/components/booking/PlanPageClient'
import type { AddOn, ItineraryEvent } from '@/types/database'

export const metadata: Metadata = {
  title: 'Plan Your Trip — Whole-Tel',
}

export default async function PlanPage({
  params,
}: {
  params: Promise<{ bookingId: string }>
}) {
  const { bookingId } = await params
  const user = await verifySession()
  const supabase = await createClient()

  // Fetch pending booking with property
  const { data: booking } = await supabase
    .from('bookings')
    .select('id, check_in, check_out, guest_count, status, properties!inner(id, name, timezone, nightly_rate, cleaning_fee, guest_threshold, per_person_rate, tax_rate)')
    .eq('id', bookingId)
    .eq('guest_id', user.id)
    .single()

  if (!booking) {
    notFound()
  }

  // If already confirmed, redirect to the post-booking itinerary page
  if (booking.status === 'confirmed') {
    redirect(`/bookings/${bookingId}/itinerary`)
  }

  // Only allow planning for pending bookings
  if (booking.status !== 'pending') {
    notFound()
  }

  const property = Array.isArray(booking.properties)
    ? booking.properties[0]
    : booking.properties

  if (!property) {
    notFound()
  }

  // Fetch schedulable experiences
  const { data: addOns } = await supabase
    .from('add_ons')
    .select('*')
    .eq('property_id', property.id)
    .not('duration_min', 'is', null)
    .order('name')

  // Fetch all add-ons for pricing (including non-schedulable)
  const { data: allAddOns } = await supabase
    .from('add_ons')
    .select('id, name, price, pricing_unit, included_guests, per_person_above')
    .eq('property_id', property.id)

  // Fetch existing itinerary events
  const { data: events } = await supabase
    .from('itinerary_events')
    .select('*')
    .eq('booking_id', bookingId)
    .order('event_date')
    .order('start_time')

  const nights = Math.ceil(
    (new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / 86400000
  )

  const formatDate = (dateStr: string) =>
    new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/properties/${property.id}`}
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to property
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Plan Your Trip</h1>
        <p className="text-lg text-muted-foreground mt-1">{property.name}</p>
        <p className="text-sm text-muted-foreground">
          {formatDate(booking.check_in)} &rarr; {formatDate(booking.check_out)}
        </p>
      </div>

      <p className="text-sm text-muted-foreground">
        Add experiences to your itinerary, then proceed to checkout. Experiences are optional.
      </p>

      <PlanPageClient
        bookingId={bookingId}
        checkIn={booking.check_in}
        checkOut={booking.check_out}
        guestCount={booking.guest_count}
        timezone={property.timezone}
        nights={nights}
        nightlyRate={Number(property.nightly_rate)}
        cleaningFee={Number(property.cleaning_fee)}
        guestThreshold={property.guest_threshold != null ? Number(property.guest_threshold) : null}
        perPersonRate={property.per_person_rate != null ? Number(property.per_person_rate) : null}
        taxRate={property.tax_rate != null ? Number(property.tax_rate) : null}
        initialEvents={(events ?? []) as ItineraryEvent[]}
        activities={(addOns ?? []) as AddOn[]}
        allAddOns={(allAddOns ?? []).map(a => ({
          id: a.id,
          name: a.name,
          price: Number(a.price),
          pricingUnit: a.pricing_unit as 'per_person' | 'per_booking',
          includedGuests: a.included_guests != null ? Number(a.included_guests) : null,
          perPersonAbove: a.per_person_above != null ? Number(a.per_person_above) : null,
        }))}
      />
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/\(guest\)/bookings/\[bookingId\]/plan/page.tsx
git commit -m "feat: add plan page (step 2 of booking flow)"
```

---

### Task 6: Create PlanPageClient component

**Files:**
- Create: `src/components/booking/PlanPageClient.tsx`

Client component that wraps the ItineraryCalendar and PlanPricingSidebar together. Manages the state of which activity IDs are selected, passes them to the pricing sidebar.

- [ ] **Step 1: Create PlanPageClient**

```typescript
'use client'

import { useState, useCallback } from 'react'
import { ItineraryCalendar } from './ItineraryCalendar'
import { PlanPricingSidebar } from './PlanPricingSidebar'
import type { ItineraryEvent, AddOn } from '@/types/database'
import type { PricingInput } from '@/lib/pricing'

interface PlanPageClientProps {
  bookingId: string
  checkIn: string
  checkOut: string
  guestCount: number
  timezone: string
  nights: number
  nightlyRate: number
  cleaningFee: number
  guestThreshold: number | null
  perPersonRate: number | null
  taxRate: number | null
  initialEvents: ItineraryEvent[]
  activities: AddOn[]
  allAddOns: PricingInput['selectedAddOns']
}

export function PlanPageClient({
  bookingId,
  checkIn,
  checkOut,
  guestCount,
  timezone,
  nights,
  nightlyRate,
  cleaningFee,
  guestThreshold,
  perPersonRate,
  taxRate,
  initialEvents,
  activities,
  allAddOns,
}: PlanPageClientProps) {
  // Derive initial activity IDs from existing events
  const initialActivityIds = [
    ...new Set(
      initialEvents
        .map((e) => e.activity_id)
        .filter((id): id is string => id != null)
    ),
  ]

  const [selectedActivityIds, setSelectedActivityIds] = useState<string[]>(initialActivityIds)

  const handleEventsChange = useCallback((activityIds: string[]) => {
    setSelectedActivityIds(activityIds)
  }, [])

  // Filter allAddOns to only those selected on the calendar
  const selectedAddOns = allAddOns.filter((a) => selectedActivityIds.includes(a.id))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
      <ItineraryCalendar
        bookingId={bookingId}
        checkIn={checkIn}
        checkOut={checkOut}
        timezone={timezone}
        initialEvents={initialEvents}
        activities={activities}
        isLocked={false}
        onEventsChange={handleEventsChange}
      />

      <div className="lg:sticky lg:top-8 self-start">
        <PlanPricingSidebar
          bookingId={bookingId}
          nights={nights}
          nightlyRate={nightlyRate}
          cleaningFee={cleaningFee}
          guestCount={guestCount}
          guestThreshold={guestThreshold}
          perPersonRate={perPersonRate}
          taxRate={taxRate}
          selectedAddOns={selectedAddOns}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/booking/PlanPageClient.tsx
git commit -m "feat: add PlanPageClient bridging calendar and pricing sidebar"
```

---

### Task 7: Create PlanPricingSidebar component

**Files:**
- Create: `src/components/booking/PlanPricingSidebar.tsx`

Displays live pricing breakdown and "Proceed to checkout" button. Uses `calculatePricing` client-side for display, but the actual charge is recalculated server-side in `checkoutBooking`.

- [ ] **Step 1: Create PlanPricingSidebar**

```typescript
'use client'

import { useTransition, useState } from 'react'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { calculatePricing, type PricingInput } from '@/lib/pricing'
import { checkoutBooking } from '@/lib/actions/bookings'

interface PlanPricingSidebarProps {
  bookingId: string
  nights: number
  nightlyRate: number
  cleaningFee: number
  guestCount: number
  guestThreshold: number | null
  perPersonRate: number | null
  taxRate: number | null
  selectedAddOns: PricingInput['selectedAddOns']
}

export function PlanPricingSidebar({
  bookingId,
  nights,
  nightlyRate,
  cleaningFee,
  guestCount,
  guestThreshold,
  perPersonRate,
  taxRate,
  selectedAddOns,
}: PlanPricingSidebarProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const breakdown = calculatePricing({
    nightlyRate,
    cleaningFee,
    nights,
    guestCount,
    guestThreshold,
    perPersonRate,
    taxRate,
    selectedAddOns,
  })

  const handleCheckout = () => {
    setError(null)
    startTransition(async () => {
      try {
        await checkoutBooking(bookingId)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    })
  }

  return (
    <div className="rounded-xl border p-6 shadow-sm space-y-4">
      <h3 className="text-lg font-semibold">Price Breakdown</h3>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span>
            ${nightlyRate.toLocaleString()} &times; {nights} night{nights !== 1 ? 's' : ''}
          </span>
          <span>${breakdown.accommodationSubtotal.toLocaleString()}</span>
        </div>

        {breakdown.perPersonSurcharge > 0 && breakdown.surchargeDetail && (
          <div className="flex justify-between text-sm">
            <span>
              Per-person surcharge ({breakdown.surchargeDetail.extraGuests} extra)
            </span>
            <span>${breakdown.perPersonSurcharge.toLocaleString()}</span>
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span>Cleaning fee</span>
          <span>${cleaningFee.toLocaleString()}</span>
        </div>

        {breakdown.addOnItems.length > 0 && (
          <>
            <Separator />
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Experiences
            </p>
            {breakdown.addOnItems.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span>{item.name}</span>
                <span>${item.totalCost.toLocaleString()}</span>
              </div>
            ))}
          </>
        )}

        {breakdown.hotelTax > 0 && breakdown.taxRate != null && (
          <div className="flex justify-between text-sm">
            <span>Hotel Tax ({(breakdown.taxRate * 100).toFixed(0)}%)</span>
            <span>${breakdown.hotelTax.toLocaleString()}</span>
          </div>
        )}

        <div className="flex justify-between text-sm">
          <span>Processing fee</span>
          <span>${breakdown.processingFee.toLocaleString()}</span>
        </div>

        <Separator />

        <div className="flex justify-between font-semibold text-lg">
          <span>Total</span>
          <span>${breakdown.total.toLocaleString()}</span>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <Button
        onClick={handleCheckout}
        disabled={isPending}
        className="w-full"
      >
        {isPending ? 'Redirecting to checkout...' : 'Proceed to Checkout'}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Experiences are optional — you can check out with just the villa.
      </p>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/booking/PlanPricingSidebar.tsx
git commit -m "feat: add PlanPricingSidebar with live pricing and checkout button"
```

---

### Task 8: Update BookingCardClient for pending bookings

**Files:**
- Modify: `src/components/booking/BookingCardClient.tsx`

Currently shows "Plan Itinerary" only for confirmed bookings. Add a link for pending bookings to continue planning.

- [ ] **Step 1: Add plan link for pending bookings**

Add before the existing confirmed block (around line 119):

```tsx
{status === 'pending' && (
  <div className="pt-3">
    <Button variant="outline" size="sm" className="text-xs h-8 gap-1.5" asChild>
      <Link href={`/bookings/${bookingId}/plan`}>
        <CalendarPlus className="h-3.5 w-3.5" />
        Continue Planning
      </Link>
    </Button>
  </div>
)}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/booking/BookingCardClient.tsx
git commit -m "feat: show Continue Planning link for pending bookings"
```

---

### Task 9: Stripe cancel URL update

**Files:**
- Already handled in Task 1

The `checkoutBooking` action already sets `cancel_url` to `/bookings/${bookingId}/plan` so if the guest cancels Stripe checkout, they return to the plan page (not the property page). Verify this is in the Task 1 code. No additional work needed.

- [ ] **Step 1: Verify cancel URL points to plan page**

Confirm in `checkoutBooking`: `cancel_url: \`${origin}/bookings/${bookingId}/plan\``

---

### Task 10: End-to-end manual test

- [ ] **Step 1: Start dev server**

Run: `pnpm dev`

- [ ] **Step 2: Test the full flow**

1. Go to a property page
2. Pick dates and guests
3. Click "Reserve" — should redirect to `/bookings/[id]/plan`
4. See the ItineraryCalendar and pricing sidebar
5. Add an experience — pricing sidebar should update live
6. Remove it — pricing should go back down
7. Click "Proceed to Checkout" — should redirect to Stripe
8. Complete payment — booking should be confirmed
9. Check `/bookings` — booking shows as confirmed with correct total

- [ ] **Step 3: Test skip experiences flow**

1. Reserve → plan page → immediately click "Proceed to Checkout" (no experiences)
2. Verify Stripe total matches villa-only pricing

- [ ] **Step 4: Test abandoned booking**

1. Reserve → plan page → close browser
2. Verify payment_deadline is set (36 hours)
3. Pending booking should expire normally via existing cleanup
