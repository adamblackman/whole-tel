# Whole-Tel

## What This Is

An all-inclusive hotel booking platform — Whole-Tel connects groups with hand-picked all-inclusive hotels for unforgettable group getaways. Hotel owners list their properties with detailed room configurations, photos organized by section, pricing with per-person tiers, and customizable add-on experiences. Guests browse properties, book with date selection, invite their group, customize with add-ons, and pay via Stripe.

## Core Value

Groups can find, customize, and book a Whole-Tel with unique local add-on experiences and seamless group coordination in a single flow.

## Requirements

### Validated

- ✓ Property owners can list and manage properties with photos, details, pricing, and add-ons — v1.0
- ✓ Guests can browse properties by destination — v1.0
- ✓ Guests can book a property with date selection and add-on customization — v1.0
- ✓ Guests can pay via Stripe (credit card with fee surcharge) — v1.0
- ✓ Per-person cost calculator (total / number of guests) — v1.0
- ✓ Separate auth for guests and property owners — v1.0
- ✓ Owner dashboard to manage properties and add-ons — v1.0
- ✓ Full landing page homepage with hero, brand story, featured properties, testimonials — v1.0
- ✓ Full rebrand from "party villas" to "Whole-Tel" all-inclusive hotels — v1.1
- ✓ Owner: bed configuration (King, Queen, Double, Twin, Bunk with individual counts) — v1.1
- ✓ Owner: location input with actual address field — v1.1
- ✓ Owner: additional per-person rate above a guest threshold — v1.1
- ✓ Owner: tiered experience pricing (up to X people included, $Y per person above X) — v1.1
- ✓ Owner: multi-photo upload (batch), drag-to-reorder, photo sections — v1.1
- ✓ Owner: photos on experiences — v1.1
- ✓ Guest-facing sectioned photo gallery with Airbnb-quality tour — v1.1
- ✓ Bookings: expandable detail view with full price breakdown — v1.1
- ✓ Bookings: guest count display and editing with price recalculation — v1.1
- ✓ Bookings: guest invite system (email invitations, accept/decline) — v1.1

### Active

**Current Milestone: v1.2 — Amenities, Calendar & Client Refinements**

**Goal:** Implement interactive itinerary builder, partner application system, split payments, guest registration, and comprehensive frontend copy/branding updates per client feedback.

**Target features:**
- Frontend copy & branding overhaul (hero, about section, ™ branding, "Custom-Inclusive" messaging)
- Partner property application system (replace owner signup)
- Amenities system for properties (categorized: Water, Social, Work/Event, Culinary, Wellness)
- Interactive calendar-based itinerary builder (full UX, time slots, activity scheduling)
- Split payment system with guest registration (all attendees: name, email, phone)
- Payment deadline rules (36hr first payment, activity booking deadlines)
- Hotel tax declaration handling (gross amount, hotel responsible for tax submission)
- Coming Soon cities (Miami, Palm Springs, Los Angeles, Las Vegas)

### Out of Scope

- Real-time chat between guests and owners — defer to v2
- Stripe Connect / owner payouts — all payments go to Whole-Tel account for now
- Individual payment splitting (each guest pays separately) — calculator only for now
- Mobile app — web-first, responsive design
- Reviews / ratings system — defer to v2

## Context

- **Brand**: Whole-Tel (whole-tel.com) — hand-picked all-inclusive hotels for unforgettable group getaways
- **Contact**: adam@whole-tel.com
- **Launch properties**: Cabo San Lucas, Puerto Vallarta, Miami (placeholder content)
- **Add-ons are unique per property**: Cabo might have boat tours, Miami might have club packages
- **Pricing model**: Per hotel per night, with per-person tiers above a guest threshold
- **Payment**: Stripe Checkout — credit card (with processing fee passed to customer) or bank transfer. Full payment upfront.
- **Content**: Placeholder photos and dummy data for launch, owners add real content later
- **Design inspiration**: Airbnb — clean, elegant, seamless booking experience
- **UI libraries**: shadcn/ui, React Bits for polished components and animations
- **Codebase**: 9,259 LOC TypeScript, Next.js 16 + Supabase + Stripe
- **Shipped**: v1.0 MVP (2026-03-06), v1.1 Rebrand & Owner Enhancements (2026-03-08)

## Constraints

- **Tech stack**: Next.js + Supabase + Stripe + shadcn/ui + React Bits
- **Database**: Supabase (project: jxbafovfobsmqxjfjrqp) — use MCP to set up schema
- **Payments**: Stripe Checkout with credit card fee surcharge and bank transfer option
- **Auth**: Supabase Auth with separate user/owner roles
- **Design**: Airbnb-level polish — mobile-responsive, clean typography, smooth transitions

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Next.js framework | SSR for SEO, API routes for Stripe, best React ecosystem | ✓ Good |
| Supabase for backend | Already set up, auth + database + storage in one | ✓ Good |
| Stripe Checkout (not Elements) | Simplest secure integration, Stripe handles payment UI | ✓ Good |
| All payments to owner account | Simpler than Stripe Connect for v1, manual owner payouts | ✓ Good |
| Per-property add-ons (not shared catalog) | Each location has unique local experiences | ✓ Good |
| Separate guest/owner auth | Owners need dashboard, guests need booking — different experiences | ✓ Good |
| Full rebrand to Whole-Tel | Client wants "all-inclusive hotels" not "party villas" — identity shift | ✓ Good |
| Guest invite system | Client specifically requested adding users to bookings | ✓ Good |
| Shared calculatePricing() module | Single source of truth eliminates price drift between widget and server | ✓ Good |
| @dnd-kit/react for photo reorder | Only React 19 compatible DnD library available | ✓ Good |
| YARL lightbox with custom plugins | Section tabs via addChild + createModule pattern for gallery | ✓ Good |
| Bed config as JSONB column | Flexible schema, simple queries, no joins needed | ✓ Good |

---
*Last updated: 2026-03-23 after v1.2 milestone start*
