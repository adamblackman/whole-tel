# Feature Research

**Domain:** Group villa/hotel booking — itinerary coordination, split payments, partner application, amenities
**Researched:** 2026-03-23
**Confidence:** MEDIUM — WebSearch + official platform docs; no Context7 applicable for travel domain

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Amenity display with categories and icons | Every booking platform (Airbnb, VRBO, Booking.com) groups amenities by category with icons; guests scan before booking | LOW | Icon per category, checkmark per amenity, "See all" modal to avoid page bloat — Holidu 2-column modal is the current standard UX |
| Guest registration (name, email, phone) | Group coordinators need a roster; venues need headcount with contact info for emergencies and check-in | LOW | Upgrade the existing invite system — invitees fill out registration fields (name + phone) when accepting. New bookings require organizer to enter names upfront or invite via email |
| Payment deadline display | Guests expect to know when money is due; "pay now or lose your dates" is expected on any hold-based system | LOW | Display the 36hr deadline prominently on booking confirmation page and in booking detail view |
| Per-person cost display on confirmation | Groups always ask "what's my share?" — showing it proactively is expected | LOW | Already built as a calculator; surface the per-person amount on the booking confirmation screen and in the invite email |
| Partner/host application form | Curated marketplace pattern: prospective owners apply, platform reviews, not open self-serve signup | MEDIUM | Plum Guide and Mr & Mrs Smith both use form + manual review. Replaces current owner self-signup flow |
| "Coming Soon" destination cards | Users landing on unavailable cities expect a signal rather than a 404 or missing card | LOW | Simple UI state on the browse/landing page; email capture for notification is optional bonus |
| Hotel tax declaration in price breakdown | All-inclusive pricing must note that tax is owner-submitted; guests need clarity on what they're paying | LOW | Copy and display change in the price breakdown component — no Stripe changes |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Interactive calendar-based itinerary builder | Groups can plan activities across booking days — turns Whole-Tel into a trip planning hub, not just a booking receipt | HIGH | Per-booking calendar, day-by-day cards with time slots, drag-to-reorder. @dnd-kit already in codebase. Core flow: create card on a day, set time range, add title/description. Owner can pre-populate activity suggestions from their experience catalog |
| Activity booking deadlines on the itinerary | Showing "book by [date]" on add-on experience cards creates urgency and reduces late-booking cancellations | LOW | Display field on experience cards within the itinerary — deadline date stored on add_ons or set per-booking |
| Amenity-based property filtering | Guests searching "private pool + chef service" can filter before browsing — reduces pogo-sticking | MEDIUM | Requires amenities stored as structured IDs (not free text). Filter UI on browse page. Dependency: amenities system must be built first |
| Partner application status tracking | Applicants see "under review / approved / declined" rather than a black-hole form submission | LOW | Status field on partner_applications table. Admin updates manually. Triggered email notification on status change |
| Frontend copy/branding overhaul | "Custom-Inclusive" and Whole-Tel™ messaging positions the product clearly; generic copy undermines premium positioning | LOW | Hero, about section, property pages — copy changes across the site. Zero technical dependency |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Individual per-guest Stripe Checkout | "Real" split payment — each person pays their own card | Requires Stripe Connect (explicitly deferred in PROJECT.md), complex partial refund logic, booking state fragmented across N payments | Show per-person calculated amount. One payer completes checkout. Venmo/Zelle reconciliation is a social problem at this scale |
| Installment payment plans (deposit now, balance later) | Reduces drop-off for high-cost bookings | Requires Stripe SetupIntent + saved payment methods (not Checkout), scheduled charge jobs, missed payment redistribution logic — significant Stripe scope for v1.2 | 36hr payment deadline enforces timely payment. Installment plans deferred to v2 when Stripe complexity is warranted |
| Real-time collaborative itinerary editing | Groups want to plan together simultaneously | WebSocket complexity, conflict resolution, presence indicators — months of work for edge-case usage. Most group trip planning is async | Optimistic single-editor model: last write wins, show "last updated by X at T" timestamp |
| In-app messaging / chat | Groups want to communicate inside the product | Explicitly deferred to v2 in PROJECT.md. WebSockets, notifications, read receipts — high complexity, low differentiation for a booking platform | Organizer can broadcast trip updates via email to all registered attendees |
| AI itinerary suggestions | "Tell me what to do in Cabo" | External API integration, hallucination risk for specific venue hours/names, maintenance burden | Curated activity templates per property that the owner pre-populates — more reliable and on-brand |
| 150-amenity exhaustive checklist | VRBO-style completeness | Overwhelming for boutique all-inclusive hotel context; most items irrelevant to whole-hotel takeovers | Curated 30-40 amenity set across 5 categories (Water, Social, Work/Event, Culinary, Wellness) — matches PROJECT.md spec |
| Automated partner application approval | Remove manual review bottleneck | At <100 applications/month, automation adds complexity with no time savings. Automated approval bypasses curation quality control that defines the brand | Manual review by Whole-Tel team. Admin marks application approved/declined. Account created on approval |

## Feature Dependencies

```
Guest Registration (name, email, phone)
    └──enhances──> Split Payment Display (show "your share" per registered guest)
    └──enhances──> Itinerary Builder (invited attendees can view itinerary)
    └──requires──> Existing invite system (upgrade accept flow to collect fields)

Amenities System (structured data: category + amenity IDs in DB)
    └──enables──> Amenity Display on property detail page
    └──enables──> Amenity-Based Browse Filtering (future)
    └──requires──> Owner amenity management UI (owner picks from preset list)

Partner Application Form
    └──replaces──> Owner Self-Signup (current auth/onboarding flow)
    └──creates──> partner_applications record with pending status
    └──triggers──> Manual admin review → account creation on approval

Itinerary Builder (per-booking calendar)
    └──requires──> Booking exists (itinerary is scoped to a booking, not a property)
    └──enhances──> Guest Registration (attendees see the itinerary read-only)
    └──can pull from──> Property experience catalog (owner pre-populates activity templates)

Payment Deadline Rules (36hr first payment, activity deadlines)
    └──depends on──> Existing Stripe Checkout flow (enforced at server action level)
    └──requires──> Booking "pending" state before payment completes

Hotel Tax Declaration
    └──depends on──> Existing price breakdown component (add a copy line)

Coming Soon Cities
    └──depends on──> Landing page / browse page (UI state change only)

Frontend Copy / Branding
    └──independent──> All other features (parallel work)
```

### Dependency Notes

- **Amenities must be structured data before filtering:** Building amenities as free-text description means a migration is required to add filtering later. Build as IDs from day one.
- **Guest registration before itinerary visibility:** The attendee roster is the prerequisite for knowing who can view the itinerary. Without registration data, the itinerary has no audience model.
- **Itinerary is booking-scoped, not property-scoped:** The calendar lives under a booking because it requires known dates and a group. Property owners can provide activity templates (from their add-ons/experiences) but the actual per-day schedule is created post-booking by the organizer.
- **Partner application replaces, not supplements, self-signup:** Both cannot coexist without confusion. The current owner signup flow is retired; the application form becomes the only entry point. Existing owner accounts remain unaffected.

## MVP Definition for v1.2

This is a subsequent milestone. Prioritization is relative to what is already shipped in v1.0 and v1.1.

### Launch With (v1.2 core)

Minimum set to deliver client-requested milestone value.

- [ ] Frontend copy and branding overhaul — client-blocking, zero technical dependency
- [ ] Amenities system: DB schema, owner management UI (select from preset list), guest display with category icons and "See all" modal
- [ ] Partner property application form — replaces open owner signup
- [ ] Guest registration fields (name, email, phone) on booking and invite accept flow
- [ ] Payment deadline display (36hr window, activity deadlines) on booking confirmation and detail view
- [ ] Hotel tax declaration copy in price breakdown
- [ ] Coming Soon city cards on browse/landing page

### Add After Validation (v1.2 extensions)

Features to add once core v1.2 features are stable.

- [ ] Interactive calendar-based itinerary builder — high value, high complexity; validate guest registration is stable first
- [ ] Amenity-based browse filtering — needs real amenity data on live properties before filters are useful
- [ ] Partner application status tracking with email notification — once applications are incoming

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Individual per-guest Stripe Checkout (true split payments) — requires Stripe Connect, complex refund logic, explicitly deferred in PROJECT.md
- [ ] Installment payment plans — Stripe SetupIntent + saved card + scheduled charge complexity
- [ ] Real-time collaborative itinerary editing
- [ ] In-app messaging / chat — deferred in PROJECT.md
- [ ] AI activity suggestions — curated templates preferred

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Frontend copy/branding | HIGH (client-blocking) | LOW | P1 |
| Amenities system + display | HIGH | MEDIUM | P1 |
| Guest registration fields | HIGH | LOW | P1 |
| Partner application form | HIGH | LOW | P1 |
| Payment deadline rules display | MEDIUM | LOW | P1 |
| Hotel tax declaration display | LOW | LOW | P1 |
| Coming Soon cities | LOW | LOW | P1 |
| Interactive itinerary builder | HIGH | HIGH | P2 |
| Amenity-based browse filtering | MEDIUM | MEDIUM | P2 |
| Partner application status tracking | LOW | LOW | P2 |
| Installment payment plans | MEDIUM | VERY HIGH | P3 |
| Individual per-guest Stripe payments | HIGH | VERY HIGH | P3 |

**Priority key:**
- P1: Must have for v1.2 launch
- P2: Should have, add when P1 is stable
- P3: Future milestone

## Specific Implementation Notes

### Itinerary Builder — Recommended Scope

Based on YouLi/SquadTrip analysis, table-stakes is read-only schedule sharing. The differentiator is interactivity. Recommended v1.2 scope:

- Calendar grid: one column per booking day (check-in through check-out)
- Activity cards: title, time range (start/end), optional emoji, optional note
- Drag-to-reorder within a day only (cross-day drag adds complexity, defer to v2)
- Owner can provide a template list of suggested activities sourced from their experience catalog
- Booking organizer can add/edit/remove cards
- Invited registered guests see read-only view
- No map integration, no budget tracking in the itinerary builder — these are YouLi features that exceed Whole-Tel's scoped group experience model

Library: use @dnd-kit/sortable (already in codebase from photo reorder). No new DnD library needed.

### Split Payments — Exact v1.2 Boundary

PROJECT.md is explicit: "Individual payment splitting (each guest pays separately) — calculator only for now." This means:

1. Collect all attendees: name + email + phone during booking or via invite accept
2. Display "Your share: $X" based on total / headcount on confirmation and booking detail
3. One person completes the existing Stripe Checkout (unchanged flow)
4. The 36hr payment deadline is enforced by creating a booking in `pending` state, generating the Stripe Checkout session, and expiring the booking via a scheduled job if payment is not completed in time (Supabase Edge Function with pg_cron or a webhook-based approach)

Do NOT attempt per-guest Stripe sessions in v1.2 — this is explicitly out of scope.

### Partner Application — Recommended Field Set

Based on Plum Guide application pattern and boutique curation positioning:

**Contact:** First name, last name, email, phone
**Property:** Property name, location (city + country), property type (boutique hotel, villa, resort), number of guest rooms, maximum guest capacity
**Listing presence:** Link to existing listing (Airbnb/VRBO/website) or photo gallery URL
**Story:** "Tell us about your property and why it's a fit for Whole-Tel" (textarea, 500 char limit)

Review flow: form submission creates a `partner_applications` record with `status = 'pending'`. Whole-Tel admin reviews, updates status to `approved` or `declined`. On `approved`, system creates an owner account (or sends an invitation to create one). Email sent to applicant at both steps. No automated approval logic — volume does not warrant it for v1.2.

### Amenity Category Model

PROJECT.md specifies 5 categories: Water, Social, Work/Event, Culinary, Wellness. Recommended amenities per category (30-35 total):

- **Water:** Private pool, Hot tub / jacuzzi, Ocean view, Beach access, Kayaks or paddleboards, Swim-up bar, Infinity pool
- **Social:** Outdoor bar, Fire pit, Rooftop terrace, Sound system / dance floor, Game room, Cigar lounge, Sports court
- **Work/Event:** AV equipment, Projector and screen, Event coordinator on-site, High-speed WiFi (100+ Mbps), Breakout spaces, Business center
- **Culinary:** Private chef, Full catering service, BBQ / outdoor grill, Wine cellar, Cooking classes, Cocktail bar, Organic produce garden
- **Wellness:** Gym / fitness center, Spa services, Yoga and meditation space, Massage room, Sauna, Plunge pool

Display pattern (Holidu model, industry current):
- Category header: icon + category name
- Amenities below: simple list with checkmarks (no icons per amenity)
- Property detail page shows top 6-8 amenities across categories
- "See all amenities" button opens a modal with 2-column layout, all categories
- Modal prevents page length bloat (Holidu found 400-600px saved by modal pattern)

DB schema: `amenities` table (id, category, name, display_order), `property_amenities` join table (property_id, amenity_id). Amenity IDs are stable references — enables filtering and consistent display across all properties.

## Competitor Feature Analysis

| Feature | YouLi / SquadTrip | WeTravel | Our Approach |
|---------|-------------------|----------|--------------|
| Itinerary builder | Drag-drop day-by-day calendar, real-time updates, per-traveler views, Magic Links | Calendar view, day-by-day schedule | Per-booking calendar, day-by-day cards, drag-to-reorder within a day, @dnd-kit (already in codebase) |
| Split payments | Individual payment pages per traveler, payment plans, auto-reminders, auto-adjust for late bookers | 1-24 installments, auto-charge, missed payment redistribution | v1.2: single payer with per-person display. v2+: individual Stripe sessions |
| Guest registration | Full registration forms, waivers, dietary preferences, document upload | Full passenger registration with ACH or credit card | v1.2: name + email + phone. Extend with dietary/documents in v2 |
| Partner application | Not applicable (B2B SaaS tool, not curated marketplace) | Not applicable | Short form → manual review → account creation on approval |
| Amenities display | Not applicable | Not applicable | 5-category model, icon per category, checklist per amenity, modal for full list |

## Sources

- [YouLi Group Travel Management Platform](https://go.youli.io/) — MEDIUM confidence
- [SquadTrip — Best Tools for Group Trip Planning 2026](https://squadtrip.com/guides/best-tools-for-group-trip-planning/) — MEDIUM confidence
- [SquadTrip — Ultimate Group Travel Planning App](https://www.squadtrip.com/guides/the-ultimate-group-travel-planning-app) — MEDIUM confidence
- [WeTravel Payment Plans Help Documentation](https://help.wetravel.com/en/articles/1270486-payment-plans-how-they-work-setup) — HIGH confidence (official docs)
- [Holidu Amenities Redesign Case Study](https://holidu.design/how-we-took-our-amenities-to-the-next-level/) — HIGH confidence (official engineering blog)
- [Plum Guide Host Vetting and Application](https://hospitable.com/plum-guide-rentals) — MEDIUM confidence
- [VRBO Host Requirements and Onboarding Fields](https://www.hostaway.com/blog/vrbo-host-requirements/) — MEDIUM confidence
- [GroupCollect Group Travel Registration Platform](https://groupcollect.com/) — MEDIUM confidence
- [AllFly Split Payment Feature](https://allfly.io/post/allflys-game-changing-split-payment-feature) — MEDIUM confidence

---
*Feature research for: Whole-Tel v1.2 — Itinerary Builder, Split Payments, Partner Application, Amenities*
*Researched: 2026-03-23*
