# Roadmap: Whole-Tel

## Milestones

- v1.0 MVP - Phases 1-7 (shipped 2026-03-06)
- v1.1 Rebrand & Owner Enhancements - Phases 8-11 (shipped 2026-03-08)
- v1.2 Amenities, Calendar & Client Refinements - Phases 12-17 (in progress)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

<details>
<summary>v1.0 MVP (Phases 1-7) - SHIPPED 2026-03-06</summary>

- [x] **Phase 1: Foundation** - Supabase schema, RLS policies, double-booking constraint, and client infrastructure (completed 2026-03-03)
- [x] **Phase 2: Auth** - Guest and owner authentication with role-based access and route protection (completed 2026-03-03)
- [x] **Phase 3: Owner Dashboard** - Owner CRUD for properties, photos, and per-property add-on experiences (completed 2026-03-04)
- [x] **Phase 4: Guest Browsing** - Property listing pages, destination browsing, add-on display, and brand design (completed 2026-03-05)
- [x] **Phase 5: Booking Flow** - Date selection through add-on customization, price summary, and Stripe handoff (completed 2026-03-05)
- [x] **Phase 6: Payments** - Stripe Checkout (CC + ACH), webhook confirmation, and booking email (completed 2026-03-06)
- [x] **Phase 7: Landing Page and Polish** - Homepage, about/contact pages, and final brand polish (completed 2026-03-06)

</details>

<details>
<summary>v1.1 Rebrand & Owner Enhancements (Phases 8-11) - SHIPPED 2026-03-08</summary>

- [x] **Phase 8: Fixes and Rebrand** - Auth bug fixes, formatCurrency fix, full rebrand to Whole-Tel all-inclusive hotels (completed 2026-03-08)
- [x] **Phase 9: Owner Property Tools** - Bed configuration, location address, tiered per-person pricing for properties and experiences (completed 2026-03-08)
- [x] **Phase 10: Photo Management** - Batch upload, drag-to-reorder, photo sections, experience photos, and polished guest gallery (completed 2026-03-08)
- [x] **Phase 11: Booking Enhancements** - Expandable booking details, guest count editing, and guest invite system (completed 2026-03-08)

</details>

### v1.2 Amenities, Calendar & Client Refinements (In Progress)

**Milestone Goal:** Deliver frontend copy overhaul, amenities system, partner application workflow, guest registration, interactive itinerary builder, and split payment display.

- [x] **Phase 12: Branding, Copy & Amenities Schema** - Homepage copy overhaul, ™ branding, hotel tax in pricing, Coming Soon cities, and amenities DB foundation (completed 2026-03-24)
- [ ] **Phase 13: Guest Registration & Payment Deadlines** - Attendee name/phone collection, 36hr deadline enforcement, per-person cost display, and cron-based expiry
- [ ] **Phase 14: Partner Application Workflow** - Multi-step application form, ENUM state machine, admin review UI, and approval-triggered owner account creation
- [ ] **Phase 15: Amenities Owner UI & Guest Display** - Owner checkbox grid by category, guest amenity display with "See all" modal, and amenity highlights on property cards
- [ ] **Phase 16: Itinerary Builder** - Calendar-based day-by-day activity scheduler, owner time slot configuration, auto-save to bookings, and timezone-safe storage
- [ ] **Phase 17: Split Payments** - Group lead payment division UI, per-person Stripe payment links, and split amount validation against canonical pricing

## Phase Details

### Phase 12: Branding, Copy & Amenities Schema
**Goal**: Visible client-facing copy and branding updates ship, hotel tax flows through calculatePricing(), and the amenities data foundation is in place for Phase 15 UI work
**Depends on**: Nothing (first phase of milestone)
**Requirements**: BRAND-01, BRAND-02, BRAND-03, BRAND-04, BRAND-05, BRAND-06, BRAND-07, BRAND-08, AMEN-01, PAY-07, PAY-09
**Success Criteria** (what must be TRUE):
  1. Homepage hero displays the new Custom-Inclusive headline and "Browse Whole-Tels™" CTA
  2. Every public-facing instance of "Whole-Tel" carries the ™ symbol, including the "How a Whole-Tel Takeover Works" section
  3. Coming Soon cards for Miami, Palm Springs, Los Angeles, and Las Vegas appear on the browse/landing page
  4. Property cards display bed count by type (King x2, Queen x1, etc.)
  5. Hotel tax amount appears as a line item in the price breakdown, calculated through calculatePricing() — not added externally
**Plans:** 4/4 plans complete

Plans:
- [ ] 12-01-PLAN.md — Landing page copy overhaul (Hero, BrandStory, TakeoverSteps, FeaturedProperties, DestinationCards, Testimonials)
- [ ] 12-02-PLAN.md — Site-wide TM branding, hotel removal, bed config on property cards
- [ ] 12-03-PLAN.md — Amenities DB schema migration with seed data and tax_rate column
- [ ] 12-04-PLAN.md — Pricing module hotel tax extension and consumer updates

### Phase 13: Guest Registration & Payment Deadlines
**Goal**: All booking attendees have name, email, and phone on record; the 36-hour first-payment deadline is enforced with automated expiry; per-person cost shows on confirmation
**Depends on**: Phase 12
**Requirements**: PAY-01, PAY-02, PAY-05, PAY-06, PAY-08
**Success Criteria** (what must be TRUE):
  1. Booking confirmation requires full name, email, and phone for each attendee 18+; group lead can enter details manually or add via email/username
  2. Booking detail view displays the first-payment deadline (36 hours after booking) and activity booking deadline (30 days before check-in OR 7 days after booking, whichever is first)
  3. Unpaid bookings that miss the 36-hour deadline are automatically cancelled and property dates released
  4. Per-person cost breakdown is visible on booking confirmation
**Plans:** 3 plans

Plans:
- [ ] 13-01-PLAN.md — Database migration: deadline columns, status constraint, registration columns, atomic increment RPC
- [ ] 13-02-PLAN.md — Server actions: acceptInvitation registration gating, addAttendeeManually, createBookingAndCheckout deadline storage
- [ ] 13-03-PLAN.md — UI components: countdown timer, deadline display, manual attendee form, invitation registration gate, cron expiry route

### Phase 14: Partner Application Workflow
**Goal**: Open owner self-signup is replaced by a curated partner application flow with admin review; approved applications trigger owner account creation
**Depends on**: Phase 12
**Requirements**: PART-01, PART-02, PART-03, PART-04, PART-05
**Success Criteria** (what must be TRUE):
  1. The "New Owner? Create owner account" link is replaced by "Apply to be a featured partner on Whole-Tel™" and leads to the application form
  2. Applicant completes all 5 form sections (Property Basics, Capacity, Common Areas, Group Hosting Experience, Logistics) and receives confirmation of submission
  3. Admin can see all submitted applications, update status through the ENUM state machine (submitted → under_review → approved/rejected → onboarded), and changes persist correctly
  4. An approved application triggers an owner account creation flow for the applicant
**Plans**: TBD

### Phase 15: Amenities Owner UI & Guest Display
**Goal**: Owners can manage amenities for their property through a structured checkbox grid; guests see categorized amenities on the property detail page and highlights on property cards
**Depends on**: Phase 12 (amenities schema from AMEN-01)
**Requirements**: AMEN-02, AMEN-03, AMEN-04
**Success Criteria** (what must be TRUE):
  1. Owner dashboard shows a checkbox grid of ~30-35 amenities grouped into 5 categories (Water, Social, Work/Event, Culinary, Wellness); selections save and reload correctly
  2. Property detail page shows top amenities inline and a "See all" modal displays the full categorized amenity list
  3. Property cards on the browse page display key amenity highlights (pool, hot tub, etc.) sourced from structured amenity IDs
**Plans**: TBD

### Phase 16: Itinerary Builder
**Goal**: Guests can build a day-by-day activity calendar within their booked dates, scheduling both property activities and custom events; itinerary auto-saves per booking
**Depends on**: Phase 13 (attendee model), Phase 15 (amenities context)
**Requirements**: ITIN-01, ITIN-02, ITIN-03, ITIN-04, ITIN-05, ITIN-06, ITIN-07
**Success Criteria** (what must be TRUE):
  1. Owner can configure activities with available time slots and duration windows (e.g., boat ride: 9:30–12, 1–4, 5–7)
  2. Guest sees an interactive calendar scoped to their booking dates and can add property activities to specific day/time slots
  3. Guest can add custom events (e.g., "Pool day 11am–5pm") to any day in the booking range
  4. Activity time slot availability respects windows set by the hotel; slots outside those windows are not selectable
  5. Itinerary auto-saves on every change and persists when the guest navigates away and returns
**Plans**: TBD

### Phase 17: Split Payments
**Goal**: Group lead can divide the booking total among attendees and each guest receives an individual Stripe payment link for their share; split amounts validate against the canonical pricing total
**Depends on**: Phase 13 (attendee roster), Phase 16 (itinerary cost context)
**Requirements**: PAY-03, PAY-04
**Success Criteria** (what must be TRUE):
  1. Group lead can view all attendees and assign a payment amount to each person, with the UI showing remaining unallocated balance
  2. Each attendee receives a Stripe payment link scoped to their assigned share
  3. Split amounts server-side validate that the sum equals the canonical booking total from calculatePricing() before any link is generated
**Plans**: TBD

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 3/3 | Complete | 2026-03-03 |
| 2. Auth | v1.0 | 4/4 | Complete | 2026-03-03 |
| 3. Owner Dashboard | v1.0 | 5/5 | Complete | 2026-03-04 |
| 4. Guest Browsing | v1.0 | 5/5 | Complete | 2026-03-05 |
| 5. Booking Flow | v1.0 | 3/3 | Complete | 2026-03-05 |
| 6. Payments | v1.0 | 2/2 | Complete | 2026-03-06 |
| 7. Landing Page and Polish | v1.0 | 2/2 | Complete | 2026-03-06 |
| 8. Fixes and Rebrand | v1.1 | 2/2 | Complete | 2026-03-08 |
| 9. Owner Property Tools | v1.1 | 3/3 | Complete | 2026-03-08 |
| 10. Photo Management | v1.1 | 4/4 | Complete | 2026-03-08 |
| 11. Booking Enhancements | v1.1 | 2/2 | Complete | 2026-03-08 |
| 12. Branding, Copy & Amenities Schema | 4/4 | Complete    | 2026-03-24 | - |
| 13. Guest Registration & Payment Deadlines | v1.2 | 0/3 | Not started | - |
| 14. Partner Application Workflow | v1.2 | 0/TBD | Not started | - |
| 15. Amenities Owner UI & Guest Display | v1.2 | 0/TBD | Not started | - |
| 16. Itinerary Builder | v1.2 | 0/TBD | Not started | - |
| 17. Split Payments | v1.2 | 0/TBD | Not started | - |
