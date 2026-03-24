# Requirements: Whole-Tel

**Defined:** 2026-03-23
**Core Value:** Groups can find, customize, and book a Whole-Tel with unique local add-on experiences and seamless group coordination in a single flow.

## v1.2 Requirements

Requirements for milestone v1.2: Amenities, Calendar & Client Refinements.

### Frontend & Branding

- [x] **BRAND-01**: Hero section displays "Your Own Private Resort. No Strangers. No Compromises. Custom-Inclusive, Only Pay For What You Want" with "Browse Whole-Tels™" CTA
- [x] **BRAND-02**: All instances of "Whole-Tel" display with ™ symbol
- [x] **BRAND-03**: "The Whole Experience" section renamed to "The Whole-Tel™ Experience" with updated copy about Custom-Inclusive model (icons remain)
- [x] **BRAND-04**: "How a Whole-Tel Takeover Works" 3-step about section with icons (magnifying glass, checklist, gold key)
- [x] **BRAND-05**: "Featured Whole-Tels™" section with subtitle "Hand-picked 'custom-inclusive' properties for your next group trip"
- [x] **BRAND-06**: Coming Soon city cards for Miami, Palm Springs, Los Angeles, Las Vegas
- [x] **BRAND-07**: All copy removes word "hotel" except when describing turning hotels into Whole-Tels™
- [x] **BRAND-08**: Property cards display bed count by type (King, Queen, Double, Twin, Bunk)

### Amenities

- [x] **AMEN-01**: DB schema for amenities with 5 categories (Water, Social, Work/Event, Culinary, Wellness) with ~30-35 amenity options
- [x] **AMEN-02**: Owner can select/deselect amenities for their property via checkbox grid grouped by category
- [x] **AMEN-03**: Guest-facing amenity display on property detail page with top amenities inline and "See all" modal
- [x] **AMEN-04**: Property cards show key amenities (pool, hot tub, etc.)

### Partner Application

- [x] **PART-01**: "Apply to be featured partner on Whole-Tel™" replaces "New Owner? Create owner account" link
- [x] **PART-02**: Multi-step application form with 5 sections (Property Basics & Classification, Capacity & Inventory, Common Areas & Amenities, Group Hosting Experience, Logistics & Content)
- [x] **PART-03**: Application stored in DB with ENUM status (submitted, under_review, approved, rejected, onboarded)
- [x] **PART-04**: Admin can review and update application status
- [x] **PART-05**: Approved application triggers owner account creation flow

### Itinerary Builder

- [x] **ITIN-01**: Owner can add activities/experiences with time/length and available time slots (e.g., boat ride 9:30-12, 1-4, 5-7; dinner 2hrs, any time 5pm or later)
- [ ] **ITIN-02**: Interactive calendar-based itinerary builder within booked dates for guests
- [ ] **ITIN-03**: Guest can add property activities to specific days/time slots
- [ ] **ITIN-04**: Guest can add custom events (e.g., "pool day 11am-5pm")
- [ ] **ITIN-05**: Calendar view displays full itinerary with all scheduled activities
- [ ] **ITIN-06**: Activity time slots respect availability windows set by hotel
- [ ] **ITIN-07**: Itinerary auto-saves and persists per booking

### Payment & Booking

- [x] **PAY-01**: Guest registration requires full name, email, and phone for all attendees 18+
- [x] **PAY-02**: Group lead can add attendees via email/username or enter details manually
- [ ] **PAY-03**: Group lead can divide payment and adjust split amounts per person
- [ ] **PAY-04**: Each guest receives individual Stripe payment link for their share
- [x] **PAY-05**: First property payment due within 36 hours of booking
- [x] **PAY-06**: Activity/itinerary booking deadline: 30 days before check-in OR 7 days after booking (whichever comes first)
- [x] **PAY-07**: Hotel tax declaration: hotels must declare required taxes, otherwise Whole-Tel sends gross amount and hotel submits taxes from gross
- [x] **PAY-08**: Payment deadline enforcement (expired unpaid bookings auto-cancel)
- [x] **PAY-09**: Per-person cost breakdown displayed on booking confirmation

## Future Requirements

### Amenity Filtering

- **AMEN-05**: Amenity-based property filtering on browse page (requires real amenity data on live properties first)

### Notifications

- **NOTF-01**: Email notification when partner application status changes
- **NOTF-02**: Payment reminder emails before deadline expiry
- **NOTF-03**: Itinerary update notifications to group members

### Reviews & Ratings

- **REVW-01**: Guests can rate and review properties after checkout
- **REVW-02**: Property detail page displays reviews

## Out of Scope

| Feature | Reason |
|---------|--------|
| Stripe Connect / owner payouts | All payments to Whole-Tel account, manual payouts for now |
| Installment payment plans | Stripe SetupIntent + scheduled charges too complex for v1.2 |
| Real-time collaborative itinerary editing | WebSocket complexity deferred to v2+ |
| In-app chat/messaging | Defer to v2 |
| AI itinerary suggestions | Not in client scope |
| Mobile app | Web-first, responsive design |
| Drag-and-drop itinerary reordering | Click-to-add with calendar view is sufficient for v1.2 |
| Per-guest individual Stripe Checkout sessions | Group lead sets splits, guests pay via payment links |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| BRAND-01 | Phase 12 | Complete |
| BRAND-02 | Phase 12 | Complete |
| BRAND-03 | Phase 12 | Complete |
| BRAND-04 | Phase 12 | Complete |
| BRAND-05 | Phase 12 | Complete |
| BRAND-06 | Phase 12 | Complete |
| BRAND-07 | Phase 12 | Complete |
| BRAND-08 | Phase 12 | Complete |
| AMEN-01 | Phase 12 | Complete |
| PAY-07 | Phase 12 | Complete |
| PAY-09 | Phase 12 | Complete |
| PAY-01 | Phase 13 | Complete |
| PAY-02 | Phase 13 | Complete |
| PAY-05 | Phase 13 | Complete |
| PAY-06 | Phase 13 | Complete |
| PAY-08 | Phase 13 | Complete |
| PART-01 | Phase 14 | Complete |
| PART-02 | Phase 14 | Complete |
| PART-03 | Phase 14 | Complete |
| PART-04 | Phase 14 | Complete |
| PART-05 | Phase 14 | Complete |
| AMEN-02 | Phase 15 | Complete |
| AMEN-03 | Phase 15 | Complete |
| AMEN-04 | Phase 15 | Complete |
| ITIN-01 | Phase 16 | Complete |
| ITIN-02 | Phase 16 | Pending |
| ITIN-03 | Phase 16 | Pending |
| ITIN-04 | Phase 16 | Pending |
| ITIN-05 | Phase 16 | Pending |
| ITIN-06 | Phase 16 | Pending |
| ITIN-07 | Phase 16 | Pending |
| PAY-03 | Phase 17 | Pending |
| PAY-04 | Phase 17 | Pending |

**Coverage:**
- v1.2 requirements: 33 total
- Mapped to phases: 33
- Unmapped: 0

---
*Requirements defined: 2026-03-23*
*Last updated: 2026-03-23 after roadmap creation*
