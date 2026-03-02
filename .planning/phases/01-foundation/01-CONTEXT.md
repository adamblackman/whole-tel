# Phase 1: Foundation - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Supabase database schema (all tables), Row Level Security policies, PostgreSQL exclusion constraint for double-booking prevention, Supabase Storage bucket with signed URL uploads, two separate Supabase client files (browser vs server), and placeholder property seed data for Cabo, Puerto Vallarta, and Miami. No application code beyond the Supabase client utilities and DAL.

</domain>

<decisions>
## Implementation Decisions

### Database Schema
- Tables: profiles, properties, property_photos, add_ons, bookings, booking_add_ons
- Properties table: name, description, location (city), address, bedrooms, bathrooms, max_guests, nightly_rate, cleaning_fee, amenities (JSONB), house_rules (text), check_in_time, check_out_time, owner_id (FK to profiles)
- Add-ons linked to specific properties, not a global catalog
- Add-ons have: name, description, price, pricing_unit (per_person | per_booking), max_quantity (nullable), photo_url (nullable), property_id (FK)
- Bookings: property_id, guest_id, check_in (date), check_out (date), guest_count, subtotal, add_ons_total, processing_fee, total, status (pending | confirmed | cancelled), stripe_session_id, stripe_payment_intent_id
- booking_add_ons: booking_id, add_on_id, quantity, unit_price, total_price
- Use date type (not timestamp) for check-in/check-out — villa bookings are day-level

### RLS Policies
- Properties: public read, owner-only write (owner_id = auth.uid())
- Add-ons: public read, owner-only write (via property ownership check)
- Bookings: guest sees own bookings, owner sees bookings for their properties, service_role for webhook writes
- Profiles: user sees own profile, public read for display names
- Property photos: public read, owner-only write
- Enable RLS on ALL tables in the same migration as table creation — never leave a gap

### Double-Booking Prevention
- PostgreSQL exclusion constraint using GiST index on bookings table
- Constraint on (property_id, daterange(check_in, check_out)) — prevents overlapping confirmed bookings
- Only apply to status = 'confirmed' bookings (pending bookings don't block dates)

### Supabase Clients
- `lib/supabase/server.ts` — createServerClient using cookies, for Server Components/Actions
- `lib/supabase/browser.ts` — createBrowserClient using NEXT_PUBLIC keys only
- Service role key NEVER in browser code, NEVER prefixed with NEXT_PUBLIC_
- DAL file `lib/dal.ts` with verifySession() and requireOwner() wrapped in React.cache()

### Storage
- Bucket: "property-photos" — public read, authenticated write
- Signed URL upload pattern for photos (bypasses 1MB Server Action limit)
- File naming: {property_id}/{uuid}.{ext}

### Seed Data (Placeholder Properties)
- **Cabo San Lucas**: "Villa Paraiso" — 6 bedrooms, 7 bathrooms, 16 max guests, $1,200/night. Add-ons: Private yacht tour ($150/person), Private chef dinner ($80/person), Tequila tasting ($45/person), Airport transfer ($200/booking)
- **Puerto Vallarta**: "Casa del Sol" — 5 bedrooms, 5 bathrooms, 12 max guests, $800/night. Add-ons: Snorkeling excursion ($65/person), Mariachi band ($400/booking), Surfing lessons ($90/person), Grocery delivery ($150/booking)
- **Miami**: "The Palms Estate" — 8 bedrooms, 9 bathrooms, 20 max guests, $2,500/night. Add-ons: Nightclub VIP table ($250/person), Private DJ ($800/booking), Catered pool party ($120/person), Yacht day trip ($200/person)
- All seeded with placeholder amenities (pool, hot tub, WiFi, AC, parking, BBQ grill, etc.)
- Use realistic descriptions with tropical chill party brand voice

### Claude's Discretion
- Exact column types and constraints beyond what's specified
- Index strategy beyond the GiST exclusion constraint
- Migration naming conventions
- Seed data descriptions and amenity lists
- Profile table fields beyond id, email, role, display_name

</decisions>

<specifics>
## Specific Ideas

- Use the Supabase MCP connected to the project (jxbafovfobsmqxjfjrqp) to set up the database directly
- Pricing should feel realistic for each market (Cabo mid-range, PV affordable, Miami premium)
- Add-ons should reflect what's actually available in each location — not generic
- Brand voice in seed descriptions: tropical chill, fun, not corporate or generic

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-03-02*
