# Whole-Tel

## What This Is

A boutique hotel booking platform — Whole-Tel connects groups with hand-picked boutique hotels for unforgettable group getaways. Hotel owners list their properties with detailed room configurations, photos organized by section, pricing with per-person tiers, and customizable add-on experiences. Guests browse properties, book with date selection, invite their group, customize with add-ons, and pay via Stripe.

## Core Value

Groups can find, customize, and book a Whole-Tel with unique local add-on experiences and seamless group coordination in a single flow.

## Requirements

### Validated

- ✓ Property owners can list and manage properties with photos, details, pricing, and add-ons — v1.0
- ✓ Guests can browse properties by destination — v1.0
- ✓ Guests can book a property with date selection and add-on customization — v1.0
- ✓ Guests can pay via Stripe (credit card with fee surcharge) — v1.0
- ✓ Per-person cost calculator (total ÷ number of guests) — v1.0
- ✓ Separate auth for guests and property owners — v1.0
- ✓ Owner dashboard to manage properties and add-ons — v1.0
- ✓ Full landing page homepage with hero, brand story, featured properties, testimonials — v1.0

### Active

- [ ] Full rebrand from "party villas" to "Whole-Tel" boutique hotels across all copy, UI, and descriptions
- [ ] Owner: location input with actual address field
- [ ] Owner: bed configuration (King, Queen, Double, Twin, Bunk with individual counts)
- [ ] Owner: additional per-person rate above a guest threshold (e.g., $100/night/person above 25 guests)
- [ ] Owner: multi-photo upload (batch)
- [ ] Owner: photo ordering/arrangement (drag-to-reorder)
- [ ] Owner: photo sections (Rooms, Common area, Pool, custom sections)
- [ ] Owner: tiered experience pricing (up to X people included, $Y per person above X)
- [ ] Owner: photos on experiences
- [ ] Bookings: expandable booking detail view
- [ ] Bookings: guest invite system (add other users to a booking)
- [ ] Bookings: correct guest count display and editing

### Out of Scope

- Real-time chat between guests and owners — defer to v2
- Stripe Connect / owner payouts — all payments go to Whole-Tel account for now
- Individual payment splitting (each guest pays separately) — calculator only for now
- Mobile app — web-first, responsive design
- Reviews / ratings system — defer to v2

## Current Milestone: v1.1 Whole-Tel Rebrand & Owner Enhancements

**Goal:** Rebrand from party villas to Whole-Tel boutique hotels, enhance owner property management (beds, photos, tiered pricing), and add guest invite system for bookings.

**Target features:**
- Full site rebrand to Whole-Tel identity
- Enhanced owner dashboard (bed config, photo sections, tiered pricing, address)
- Experience pricing tiers and photos
- Booking guest invites and expandable details

## Context

- **Brand**: Whole-Tel (whole-tel.com) — hand-picked boutique hotels for unforgettable group getaways
- **Contact**: adam@whole-tel.com
- **Launch properties**: Cabo San Lucas, Puerto Vallarta, Miami (placeholder content)
- **Add-ons are unique per property**: Cabo might have boat tours, Miami might have club packages
- **Pricing model**: Per hotel per night, with per-person tiers above a guest threshold
- **Payment**: Stripe Checkout — credit card (with processing fee passed to customer) or bank transfer. Full payment upfront.
- **Content**: Placeholder photos and dummy data for launch, owners add real content later
- **Design inspiration**: Airbnb — clean, elegant, seamless booking experience
- **UI libraries**: shadcn/ui, React Bits for polished components and animations

## Constraints

- **Tech stack**: Next.js + Supabase + Stripe + shadcn/ui + React Bits
- **Database**: Supabase (project: jxbafovfobsmqxjfjrqp) — use MCP to set up schema
- **Payments**: Stripe Checkout with credit card fee surcharge and bank transfer option
- **Auth**: Supabase Auth with separate user/owner roles
- **Design**: Airbnb-level polish — mobile-responsive, clean typography, smooth transitions

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js framework | SSR for SEO, API routes for Stripe, best React ecosystem | — Pending |
| Supabase for backend | Already set up, auth + database + storage in one | — Pending |
| Stripe Checkout (not Elements) | Simplest secure integration, Stripe handles payment UI | — Pending |
| All payments to owner account | Simpler than Stripe Connect for v1, manual owner payouts | — Pending |
| Per-property add-ons (not shared catalog) | Each location has unique local experiences | — Pending |
| Separate guest/owner auth | Owners need dashboard, guests need booking — different experiences | — Pending |

| Full rebrand to Whole-Tel | Client wants "boutique hotels" not "party villas" — identity shift | — Pending |
| Guest invite system | Client specifically requested adding users to bookings, not just count update | — Pending |

---
*Last updated: 2026-03-07 after milestone v1.1 start*
