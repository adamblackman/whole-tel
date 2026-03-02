# Roadmap: Whole-Tel

## Overview

Seven phases that build from the database foundation outward. Everything depends on the schema and auth being right first (Phase 1-2), then owners populate data (Phase 3), then guests browse it (Phase 4), then they book (Phase 5), then they pay (Phase 6), then the marketing layer is polished (Phase 7). The booking transaction is the architectural spine — every earlier phase exists to make it possible, every later phase makes it more compelling.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Supabase schema, RLS policies, double-booking constraint, and client infrastructure
- [ ] **Phase 2: Auth** - Guest and owner authentication with role-based access and route protection
- [ ] **Phase 3: Owner Dashboard** - Owner CRUD for properties, photos, and per-property add-on experiences
- [ ] **Phase 4: Guest Browsing** - Property listing pages, destination browsing, add-on display, and brand design
- [ ] **Phase 5: Booking Flow** - Date selection through add-on customization, price summary, and Stripe handoff
- [ ] **Phase 6: Payments** - Stripe Checkout (CC + ACH), webhook confirmation, and booking email
- [ ] **Phase 7: Landing Page and Polish** - Homepage, about/contact pages, and final brand polish

## Phase Details

### Phase 1: Foundation
**Goal**: A secure, race-condition-proof database foundation that every subsequent phase can build on without rework
**Depends on**: Nothing (first phase)
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04
**Success Criteria** (what must be TRUE):
  1. Supabase schema exists with all tables (profiles, properties, add_ons, bookings, booking_add_ons) and no RLS gaps — all queries return correct data for authenticated users and empty/denied for unauthenticated queries
  2. A PostgreSQL exclusion constraint physically blocks overlapping booking date ranges for the same property — concurrent booking attempts cannot produce a double booking
  3. Supabase Storage bucket exists and accepts photo uploads via signed URLs
  4. Placeholder properties for Cabo, Puerto Vallarta, and Miami are seeded with dummy data visible to guests
  5. Two separate Supabase client files exist (browser vs server) such that the service role key is never accessible in the browser
**Plans**: 3 plans

Plans:
- [ ] 01-01-PLAN.md — Bootstrap Next.js app + apply full schema/RLS/storage migration
- [ ] 01-02-PLAN.md — Create Supabase client factories (server.ts, browser.ts), DAL, and database types
- [ ] 01-03-PLAN.md — Seed placeholder properties for Cabo, Puerto Vallarta, and Miami

### Phase 2: Auth
**Goal**: Guests and owners can securely sign up, log in, and access their respective experiences — with no cross-role access possible
**Depends on**: Phase 1
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, AUTH-06
**Success Criteria** (what must be TRUE):
  1. A new guest can create an account with email and password and immediately access guest features
  2. A logged-in guest stays logged in across browser sessions and can log out from any page
  3. A new owner can sign up through a distinct owner path and receive the owner role (not guest role)
  4. An owner can log in and land on the owner dashboard — a guest account cannot access /dashboard routes
  5. The guest login and owner login flows are visually distinct pages, not a shared form with a role dropdown
**Plans**: TBD

### Phase 3: Owner Dashboard
**Goal**: An owner can create, manage, and populate villa listings with all details and per-property add-on experiences from their dashboard
**Depends on**: Phase 2
**Requirements**: OWNER-01, OWNER-02, OWNER-03, OWNER-04, OWNER-05, OWNER-06, OWNER-07, OWNER-08
**Success Criteria** (what must be TRUE):
  1. An owner can create a new property listing with all required fields (bedrooms, bathrooms, max guests, nightly rate, description, location) and it appears in guest browsing
  2. An owner can upload photos to a property listing and they display correctly on the property page
  3. An owner can create, edit, and delete add-on experiences for their property with pricing set as per-person or per-booking
  4. An owner can view all bookings made for their properties
  5. An owner cannot see or modify another owner's properties — data isolation is enforced at both the UI and database layer
**Plans**: TBD

### Phase 4: Guest Browsing
**Goal**: A guest can browse party villas by destination, view full property details with add-ons and pricing, and see the per-person cost before starting a booking
**Depends on**: Phase 3
**Requirements**: PROP-01, PROP-02, PROP-03, PROP-04, PROP-05, PROP-06, PROP-07, PROP-08, ADDON-01, ADDON-02, ADDON-03, PAGE-04, PAGE-05
**Success Criteria** (what must be TRUE):
  1. A guest can filter properties by destination (Cabo, Puerto Vallarta, Miami) and see the matching listings
  2. A property listing page shows a photo gallery with full-screen view, all details (bedrooms, bathrooms, max guests), amenities with icons, and location description
  3. When a guest selects check-in and check-out dates, the nightly rate and total price display on the listing page before entering the booking flow
  4. A property listing page shows its unique add-on experiences (name, description, price, pricing unit) so guests can evaluate the full trip cost before booking
  5. All pages render correctly on mobile and match the tropical chill brand aesthetic using shadcn/ui and React Bits components
**Plans**: TBD

### Phase 5: Booking Flow
**Goal**: A logged-in guest can select dates, choose add-ons, see a full price breakdown with per-person calculator, and hand off to Stripe Checkout
**Depends on**: Phase 4
**Requirements**: BOOK-01, BOOK-02, BOOK-03, BOOK-04, BOOK-05, BOOK-06, BOOK-07, ADDON-04, ADDON-05
**Success Criteria** (what must be TRUE):
  1. A guest can select check-in and check-out dates from the availability calendar — already-booked dates are blocked and unselectable
  2. A guest can set guest count and is prevented from exceeding the property's max occupancy
  3. A guest can select or deselect add-ons for the property during the booking flow and the price summary updates in real time
  4. The price summary shows a complete breakdown: nightly rate times nights, each selected add-on cost, credit card processing fee (if applicable), and total — plus the total divided by number of guests
  5. A guest can reach Stripe Checkout from the price summary, and a guest can view their past and upcoming bookings in their booking history
**Plans**: TBD

### Phase 6: Payments
**Goal**: Guests can complete payment via credit card or ACH bank transfer through Stripe Checkout, with bookings confirmed only after webhook verification
**Depends on**: Phase 5
**Requirements**: PAY-01, PAY-02, PAY-03, PAY-04, PAY-05
**Success Criteria** (what must be TRUE):
  1. A guest can complete payment with a credit card through Stripe Checkout and the booking is confirmed
  2. A guest can complete payment via ACH bank transfer through Stripe Checkout and the booking is confirmed
  3. The credit card processing fee is displayed transparently before the guest commits to payment — labeled as "processing fee" not "credit card surcharge"
  4. A booking confirmation email arrives in the guest's inbox after successful payment
  5. If a guest closes the browser after Stripe redirects but before returning to the site, the booking is still confirmed (webhook-driven confirmation, not redirect-driven)
**Plans**: TBD

### Phase 7: Landing Page and Polish
**Goal**: Whole-Tel has a compelling public homepage with hero, brand story, featured properties, and supporting pages that convert visitors to bookings
**Depends on**: Phase 6
**Requirements**: PAGE-01, PAGE-02, PAGE-03
**Success Criteria** (what must be TRUE):
  1. The homepage displays a hero section, brand story, featured properties from the database, and destination browsing — all with the tropical chill party brand aesthetic and React Bits animations
  2. An About Us page explains the Whole-Tel brand story
  3. A Contact page has a form that routes inquiries to adam@whole-tel.com
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/3 | Not started | - |
| 2. Auth | 0/TBD | Not started | - |
| 3. Owner Dashboard | 0/TBD | Not started | - |
| 4. Guest Browsing | 0/TBD | Not started | - |
| 5. Booking Flow | 0/TBD | Not started | - |
| 6. Payments | 0/TBD | Not started | - |
| 7. Landing Page and Polish | 0/TBD | Not started | - |
