# Milestones

## v1.1 Rebrand & Owner Enhancements (Shipped: 2026-03-08)

**Phases completed:** 4 phases (8-11), 11 plans
**Timeline:** 6 days (2026-03-02 → 2026-03-08)
**Files modified:** 91 | **Lines:** +11,523 / -1,202 | **Total TypeScript LOC:** 9,259

**Key accomplishments:**
- Full rebrand from "party villas" to "Whole-Tel all-inclusive hotels" across all copy, metadata, and seed data
- Shared `calculatePricing()` module — single source of truth for all pricing (property surcharges, experience tiers, add-ons)
- Full photo management system — batch upload, drag-to-reorder, sections, experience photos, Airbnb-quality sectioned photo gallery
- Guest invitation system — email invites, auth-aware accept/decline page, automatic price recalculation on accept
- Owner property configuration — bed types, street addresses, per-person tiered pricing for properties and experiences

**Requirements:** 18/18 satisfied (FIX-01, FIX-02, BRAND-01-03, PROP-09-11, EXP-01, PHOTO-01-05, BOOK-08-11)

---

## v1.0 MVP (Shipped: 2026-03-06)

**Phases completed:** 7 phases (1-7), 24 plans
**Timeline:** 4 days (2026-03-03 → 2026-03-06)

**Key accomplishments:**
- Supabase schema with RLS policies and double-booking constraint
- Guest and owner authentication with role-based access
- Owner dashboard for property and add-on management
- Property browsing by destination with add-on display
- Full booking flow with date selection and add-on customization
- Stripe Checkout (credit card with processing fee + bank transfer)
- Landing page with hero, brand story, featured properties, testimonials

**Requirements:** 48/48 satisfied

---
