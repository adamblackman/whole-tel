# Whole-Tel

## What This Is

A vacation villa booking platform — like Airbnb but specifically for large party villas around the world. Property owners list their villas with photos, pricing, and customizable add-on experiences (boat rides, private chefs, alcohol packages). Guests browse properties, book with date selection, customize their trip with add-ons, and pay via Stripe. The brand is tropical chill with a fun party side — relaxed luxury, not Vegas loud.

## Core Value

Guests can find, customize, and book a party villa with unique local add-on experiences in a single seamless flow.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Property owners can list and manage villas with photos, details, pricing, and add-ons
- [ ] Guests can browse properties by destination
- [ ] Guests can book a villa with date selection and add-on customization
- [ ] Guests can pay via Stripe (credit card with fee surcharge, or bank transfer)
- [ ] Per-person cost calculator (total ÷ number of guests)
- [ ] Separate auth for guests and property owners
- [ ] Owner dashboard to manage properties and add-ons
- [ ] Full landing page homepage with hero, brand story, featured properties, testimonials

### Out of Scope

- Real-time chat between guests and owners — defer to v2
- Stripe Connect / owner payouts — all payments go to Whole-Tel account for now
- Individual payment splitting (each guest pays separately) — calculator only for now
- Mobile app — web-first, responsive design
- Reviews / ratings system — defer to v2

## Context

- **Brand**: Whole-Tel (whole-tel.com) — tropical chill party villas
- **Contact**: adam@whole-tel.com
- **Launch properties**: Cabo San Lucas, Puerto Vallarta, Miami (placeholder content)
- **Add-ons are unique per property**: Cabo might have boat rides, Miami might have club packages
- **Pricing model**: Per villa per night, with per-person split calculator
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

---
*Last updated: 2026-03-02 after initialization*
