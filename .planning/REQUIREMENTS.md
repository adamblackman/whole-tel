# Requirements: Whole-Tel

**Defined:** 2026-03-02
**Core Value:** Groups can find, customize, and book a Whole-Tel with unique local add-on experiences and seamless group coordination in a single flow.

## v1.0 Requirements (Complete)

All v1.0 requirements shipped. See v1.0 traceability below for full list.

### Authentication — Complete (6 requirements)
### Property Listings — Complete (8 requirements)
### Add-On Experiences — Complete (5 requirements)
### Booking Flow — Complete (7 requirements)
### Payments — Complete (5 requirements)
### Owner Dashboard — Complete (8 requirements)
### Pages & Design — Complete (5 requirements)
### Data & Infrastructure — Complete (4 requirements)

## v1.1 Requirements

Requirements for milestone v1.1: Whole-Tel Rebrand & Owner Enhancements. Each maps to roadmap phases.

### Rebrand

- [ ] **BRAND-01**: All user-facing copy updated from "party villas" to "Whole-Tel all-inclusive hotels"
- [ ] **BRAND-02**: Hero section updated with new tagline ("Your next unforgettable group trip starts with a Whole-Tel!")
- [ ] **BRAND-03**: Meta tags, SEO, and page titles reflect Whole-Tel all-inclusive hotel branding

### Photo Management

- [ ] **PHOTO-01**: Owner can upload multiple photos at once (batch upload) -- polished upload UX via frontend-design
- [ ] **PHOTO-02**: Owner can drag-to-reorder photos to control display order
- [ ] **PHOTO-03**: Owner can organize photos into sections (Rooms, Common Area, Pool, custom)
- [ ] **PHOTO-04**: Owner can add photos to individual experiences/add-ons
- [ ] **PHOTO-05**: Guest-facing photo gallery displays sections with polished, high-quality UI via frontend-design

### Property Configuration

- [ ] **PROP-09**: Owner can specify bed configuration (King, Queen, Double, Twin, Bunk with counts)
- [ ] **PROP-10**: Owner can enter location name and actual street address
- [ ] **PROP-11**: Owner can set additional per-person rate above a guest threshold (e.g., $100/night/person above 25 guests)

### Experience Enhancements

- [ ] **EXP-01**: Owner can set tiered experience pricing (base price up to X people, $Y per person above X)

### Booking Enhancements

- [ ] **BOOK-08**: Guest can click a booking to expand and see full details (price breakdown, add-ons, dates)
- [ ] **BOOK-09**: Booking displays correct guest count and guest can edit it
- [ ] **BOOK-10**: Guest can invite other users to a booking via email
- [ ] **BOOK-11**: Invited users can accept or decline a booking invitation

### Auth & Bug Fixes

- [ ] **FIX-01**: Auth flow audited and all bugs fixed for smooth login/signup/logout experience
- [ ] **FIX-02**: Existing formatCurrency bug fixed (divides by 100 when values are in dollars)

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

### Payments (v2)

- **PAY-06**: Individual payment splitting (each guest pays their share)
- **PAY-07**: Guest count changes post-payment with price adjustment

### Advanced

- **ADV-01**: AI photo categorization for automatic section assignment
- **ADV-02**: Real-time collaborative booking editing
- **ADV-03**: Per-invitee add-on customization

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Mobile app (iOS/Android) | Web-first, responsive design sufficient |
| Individual payment splitting (each guest pays) | Calculator only -- one person books, group splits via Venmo/Zelle |
| Channel manager (Airbnb/VRBO sync) | Commoditizes the brand, defeats direct-booking purpose |
| AI recommendations | Small property count -- every guest sees everything |
| Multi-currency support | USD only -- Stripe handles international cards automatically |
| Automated refunds | Complex policy edge cases -- manual via Stripe dashboard |

## Traceability

### v1.0 (Complete)

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
| BOOK-01 | Phase 5 | Complete |
| BOOK-02 | Phase 5 | Complete |
| BOOK-03 | Phase 5 | Complete |
| BOOK-04 | Phase 5 | Complete |
| BOOK-05 | Phase 5 | Complete |
| BOOK-06 | Phase 5 | Complete |
| BOOK-07 | Phase 5 | Complete |
| ADDON-04 | Phase 5 | Complete |
| ADDON-05 | Phase 5 | Complete |
| PAY-01 | Phase 6 | Complete |
| PAY-02 | Phase 6 | Complete |
| PAY-03 | Phase 6 | Complete |
| PAY-04 | Phase 6 | Complete |
| PAY-05 | Phase 6 | Complete |
| PAGE-01 | Phase 7 | Complete |
| PAGE-02 | Phase 7 | Complete |
| PAGE-03 | Phase 7 | Complete |

### v1.1 (Current)

| Requirement | Phase | Status |
|-------------|-------|--------|
| FIX-01 | Phase 8 | Pending |
| FIX-02 | Phase 8 | Pending |
| BRAND-01 | Phase 8 | Pending |
| BRAND-02 | Phase 8 | Pending |
| BRAND-03 | Phase 8 | Pending |
| PROP-09 | Phase 9 | Pending |
| PROP-10 | Phase 9 | Pending |
| PROP-11 | Phase 9 | Pending |
| EXP-01 | Phase 9 | Pending |
| PHOTO-01 | Phase 10 | Pending |
| PHOTO-02 | Phase 10 | Pending |
| PHOTO-03 | Phase 10 | Pending |
| PHOTO-04 | Phase 10 | Pending |
| PHOTO-05 | Phase 10 | Pending |
| BOOK-08 | Phase 11 | Pending |
| BOOK-09 | Phase 11 | Pending |
| BOOK-10 | Phase 11 | Pending |
| BOOK-11 | Phase 11 | Pending |

**Coverage:**
- v1.0 requirements: 48 total -- all complete
- v1.1 requirements: 18 total
- Mapped to phases: 18/18
- Unmapped: 0

---
*Requirements defined: 2026-03-02*
*Last updated: 2026-03-08 after v1.1 roadmap creation*
