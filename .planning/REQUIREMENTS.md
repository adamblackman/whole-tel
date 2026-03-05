# Requirements: Whole-Tel

**Defined:** 2026-03-02
**Core Value:** Guests can find, customize, and book a party villa with unique local add-on experiences in a single seamless flow.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [x] **AUTH-01**: Guest can sign up with email and password
- [x] **AUTH-02**: Guest can log in and stay logged in across browser sessions
- [x] **AUTH-03**: Guest can log out from any page
- [x] **AUTH-04**: Owner can sign up with separate owner role
- [x] **AUTH-05**: Owner can log in and access owner dashboard
- [x] **AUTH-06**: Guest and owner auth flows are visually distinct (separate login paths)

### Property Listings

- [x] **PROP-01**: Property listing page displays photo gallery with full-screen view
- [x] **PROP-02**: Property listing page shows details (bedrooms, bathrooms, max guests)
- [x] **PROP-03**: Property listing page displays amenities list with icons (pool, hot tub, BBQ, etc.)
- [x] **PROP-04**: Property listing page shows availability calendar with booked/available dates
- [x] **PROP-05**: Property listing page displays location info (area description, neighborhood context)
- [x] **PROP-06**: Property listing page shows per-property add-on experiences with pricing
- [x] **PROP-07**: Property listing page displays nightly rate and total price when dates are selected
- [x] **PROP-08**: Properties can be browsed/filtered by destination (Cabo, PV, Miami)

### Add-On Experiences

- [x] **ADDON-01**: Each property has unique add-on experiences (boat rides, chefs, alcohol, etc.)
- [x] **ADDON-02**: Add-ons have name, description, price, and pricing unit (per person or per booking)
- [x] **ADDON-03**: Add-ons are displayed on property listing page with pricing
- [ ] **ADDON-04**: Guest can select add-ons during booking flow before checkout
- [ ] **ADDON-05**: Add-on costs are included in total price breakdown and per-person calculator

### Booking Flow

- [ ] **BOOK-01**: Guest can select check-in and check-out dates via date range picker
- [ ] **BOOK-02**: Guest can select number of guests with occupancy limit enforcement
- [ ] **BOOK-03**: Guest sees add-on selection step with per-property add-ons
- [ ] **BOOK-04**: Guest sees full price summary (nightly rate x nights + add-ons + CC fee if applicable)
- [ ] **BOOK-05**: Guest sees per-person cost calculator (total ÷ number of guests)
- [ ] **BOOK-06**: Guest can proceed to Stripe Checkout from price summary
- [ ] **BOOK-07**: Guest can view their booking history (past and upcoming stays)

### Payments

- [ ] **PAY-01**: Guest can pay via credit card through Stripe Checkout
- [ ] **PAY-02**: Guest can pay via ACH bank transfer through Stripe Checkout
- [ ] **PAY-03**: Credit card processing fee is passed to customer and displayed transparently
- [ ] **PAY-04**: Guest receives booking confirmation email after successful payment
- [ ] **PAY-05**: Booking is confirmed only after Stripe webhook verifies payment (not on redirect)

### Owner Dashboard

- [x] **OWNER-01**: Owner can create a new property listing with all details
- [x] **OWNER-02**: Owner can edit existing property listings
- [x] **OWNER-03**: Owner can delete their property listings
- [x] **OWNER-04**: Owner can upload and manage property photos
- [x] **OWNER-05**: Owner can create, edit, and delete add-on experiences per property
- [x] **OWNER-06**: Owner can set add-on pricing (per person or per booking)
- [x] **OWNER-07**: Owner can view bookings for their properties
- [x] **OWNER-08**: Owner can only see and manage their own properties (not other owners')

### Pages & Design

- [ ] **PAGE-01**: Homepage with hero section, brand story, featured properties, and testimonials
- [ ] **PAGE-02**: About Us page with brand story
- [ ] **PAGE-03**: Contact page with form routing to adam@whole-tel.com
- [x] **PAGE-04**: Mobile-responsive design across all pages (Airbnb-level polish)
- [x] **PAGE-05**: Tropical chill party brand aesthetic throughout (shadcn/ui + React Bits animations)

### Data & Infrastructure

- [x] **DATA-01**: Supabase database schema with RLS policies for all tables
- [x] **DATA-02**: PostgreSQL exclusion constraint preventing double-booking (overlapping dates)
- [x] **DATA-03**: Placeholder properties seeded for Cabo, Puerto Vallarta, and Miami
- [x] **DATA-04**: Supabase Storage bucket for property photos with signed URL uploads

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Communication

- **COMM-01**: Guest-owner real-time messaging
- **COMM-02**: Owner receives email notification on new booking
- **COMM-03**: Email inquiry form on property listing page

### Discovery

- **DISC-01**: Advanced property filters (bedrooms, price range, amenities)
- **DISC-02**: Guest wishlists / saved properties

### Owner Tools

- **OTOOL-01**: Owner can block dates (maintenance, personal use)
- **OTOOL-02**: Dynamic pricing / seasonal rate overrides
- **OTOOL-03**: Stripe Connect for direct owner payouts

### Trust

- **TRUST-01**: Guest reviews and ratings system
- **TRUST-02**: FAQ / cancellation policy page

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Mobile app (iOS/Android) | Web-first, responsive design sufficient for v1 |
| Individual payment splitting (each guest pays) | Calculator only — one person books, group splits via Venmo/Zelle |
| Channel manager (Airbnb/VRBO sync) | Commoditizes the brand, defeats direct-booking purpose |
| AI recommendations | 3 properties at launch — every guest sees everything |
| Multi-currency support | USD only — Stripe handles international cards automatically |
| Automated refunds | Complex policy edge cases — manual via Stripe dashboard |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| DATA-01 | Phase 1 | Complete |
| DATA-02 | Phase 1 | Complete |
| DATA-03 | Phase 1 | Complete |
| DATA-04 | Phase 1 | Complete |
| AUTH-01 | Phase 2 | Complete |
| AUTH-02 | Phase 2 | Complete |
| AUTH-03 | Phase 2 | Complete |
| AUTH-04 | Phase 2 | Complete |
| AUTH-05 | Phase 2 | Complete |
| AUTH-06 | Phase 2 | Complete |
| OWNER-01 | Phase 3 | Complete |
| OWNER-02 | Phase 3 | Complete |
| OWNER-03 | Phase 3 | Complete |
| OWNER-04 | Phase 3 | Complete |
| OWNER-05 | Phase 3 | Complete |
| OWNER-06 | Phase 3 | Complete |
| OWNER-07 | Phase 3 | Complete |
| OWNER-08 | Phase 3 | Complete |
| PROP-01 | Phase 4 | Complete |
| PROP-02 | Phase 4 | Complete |
| PROP-03 | Phase 4 | Complete |
| PROP-04 | Phase 4 | Complete |
| PROP-05 | Phase 4 | Complete |
| PROP-06 | Phase 4 | Complete |
| PROP-07 | Phase 4 | Complete |
| PROP-08 | Phase 4 | Complete |
| ADDON-01 | Phase 4 | Complete |
| ADDON-02 | Phase 4 | Complete |
| ADDON-03 | Phase 4 | Complete |
| PAGE-04 | Phase 4 | Complete |
| PAGE-05 | Phase 4 | Complete |
| BOOK-01 | Phase 5 | Pending |
| BOOK-02 | Phase 5 | Pending |
| BOOK-03 | Phase 5 | Pending |
| BOOK-04 | Phase 5 | Pending |
| BOOK-05 | Phase 5 | Pending |
| BOOK-06 | Phase 5 | Pending |
| BOOK-07 | Phase 5 | Pending |
| ADDON-04 | Phase 5 | Pending |
| ADDON-05 | Phase 5 | Pending |
| PAY-01 | Phase 6 | Pending |
| PAY-02 | Phase 6 | Pending |
| PAY-03 | Phase 6 | Pending |
| PAY-04 | Phase 6 | Pending |
| PAY-05 | Phase 6 | Pending |
| PAGE-01 | Phase 7 | Pending |
| PAGE-02 | Phase 7 | Pending |
| PAGE-03 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 48 total
- Mapped to phases: 48
- Unmapped: 0

Note: The initial requirements file stated 35 requirements. The actual count is 48 (6 AUTH + 8 PROP + 5 ADDON + 7 BOOK + 5 PAY + 8 OWNER + 5 PAGE + 4 DATA). All 48 are mapped.

---
*Requirements defined: 2026-03-02*
*Last updated: 2026-03-02 after roadmap creation — traceability complete*
