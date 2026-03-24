# Phase 12: Branding, Copy & Amenities Schema - Context

**Gathered:** 2026-03-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Homepage copy overhaul with "Custom-Inclusive" messaging, TM branding across all public pages, Coming Soon destination cards, bed count display on property cards, hotel tax integration into calculatePricing(), per-person cost display, and amenities DB foundation (schema + seed only -- UI is Phase 15).

</domain>

<decisions>
## Implementation Decisions

### Hero Section (BRAND-01)
- Replace current headline ("Your next unforgettable group trip starts with a Whole-Tel!") with: "Your Own Private Resort. No Strangers. No Compromises. Custom-Inclusive, Only Pay For What You Want"
- CTA button changes from "Browse Hotels" to "Browse Whole-Tels(TM)"
- Keep existing gradient background and animation approach

### TM Branding (BRAND-02)
- All public-facing instances of "Whole-Tel" display with TM symbol
- Apply to: Hero nav, BrandStory, FeaturedProperties, DestinationCards, Testimonials, footer, about page, contact page, property detail, bookings, auth pages
- Use HTML entity `&trade;` or Unicode `\u2122` -- consistent across all files

### "The Whole-Tel(TM) Experience" Section (BRAND-03)
- Rename from "The Whole Experience" to "The Whole-Tel(TM) Experience"
- Update copy to center on Custom-Inclusive model: guests choose and pay only for what they want, not a fixed all-inclusive package
- Keep the 4 experience icons (Private Chefs, Boat Excursions, VIP Nightlife, Sunset Tours)

### "How a Whole-Tel Takeover Works" Section (BRAND-04)
- New 3-step about section replacing or added near BrandStory
- Step 1: Browse (magnifying glass icon) -- Find your perfect Whole-Tel from hand-picked properties
- Step 2: Customize (checklist icon) -- Build your trip with custom activities and experiences
- Step 3: Arrive (gold key icon) -- Show up and enjoy -- everything is handled
- Clean, horizontal layout on desktop, stacked on mobile

### "Featured Whole-Tels(TM)" Section (BRAND-05)
- Rename "Featured Hotels" to "Featured Whole-Tels(TM)"
- Update subtitle to: "Hand-picked 'custom-inclusive' properties for your next group trip"

### Coming Soon Cities (BRAND-06)
- Miami moves FROM active destinations TO Coming Soon
- Active destinations: Cabo San Lucas, Puerto Vallarta only
- Coming Soon cards: Miami, Palm Springs, Los Angeles, Las Vegas
- Coming Soon cards are non-clickable with a visual "Coming Soon" badge/overlay
- Active destinations remain clickable links to filtered browse page

### Remove "hotel" from Copy (BRAND-07)
- Replace "Browse Hotels" with "Browse Whole-Tels(TM)" in nav and CTA buttons
- Replace "Featured Hotels" with "Featured Whole-Tels(TM)"
- "hotel" only appears when describing the concept of turning hotels into Whole-Tels (e.g., about page context)
- Footer nav link: "Browse Hotels" becomes "Browse Whole-Tels(TM)"

### Bed Count on Property Cards (BRAND-08)
- PropertyListingCard currently shows generic "N bed" from `property.bedrooms`
- Replace with bed_config breakdown: "King x2, Queen x1" etc.
- Compact inline format, only show types with count > 0
- Query must include bed_config in property select (currently not fetched for cards)

### Amenities DB Schema (AMEN-01)
- Seed table `amenities` with columns: id, name, category, icon_name, display_order
- Join table `property_amenities` with: property_id, amenity_id
- 5 categories with ~30-35 total amenities:
  - Water: Pool, Infinity Pool, Hot Tub, Beach Access, Waterfront, Water Slides, Lazy River
  - Social: Game Room, Movie Theater, Fire Pit, Outdoor Lounge, Bar, Dance Floor, DJ Booth
  - Work/Event: Conference Room, Event Space, Projector/AV, High-Speed WiFi, Private Office
  - Culinary: Full Kitchen, Gourmet Kitchen, BBQ Grill, Pizza Oven, Wine Cellar, Outdoor Dining
  - Wellness: Spa, Sauna, Gym, Yoga Studio, Meditation Garden, Steam Room
- RLS policies on both tables
- This phase is schema + seed ONLY -- owner UI and guest display are Phase 15

### Hotel Tax in Pricing (PAY-07)
- Add `tax_rate` column (decimal, nullable) to properties table -- percentage-based
- Owner enters tax rate during property setup (optional field)
- calculatePricing() adds hotel tax as a line item: tax = (accommodationSubtotal + perPersonSurcharge) * tax_rate
- Tax displays as "Hotel Tax (X%)" in price breakdown
- If no tax_rate set (null): no tax line item -- gross amount sent, hotel submits taxes from gross
- PricingBreakdown interface gains `hotelTax: number` and `taxRate: number | null` fields
- Processing fee calculated AFTER tax (tax is part of the Stripe charge)

### Per-Person Cost Display (PAY-09)
- Show per-person cost on booking confirmation: total / guest_count
- Simple display line: "Per person: $X" beneath the total
- No changes to pricing logic -- purely display

### Claude's Discretion
- Exact 3-step section layout and spacing
- Coming Soon card visual design (gradient colors, badge style)
- Amenity icon_name values (Lucide icon names)
- Exact amenity list within each category (targeting ~30-35 total)
- Tax rate field placement in PropertyForm
- Testimonial copy updates to remove "hotel" references

</decisions>

<specifics>
## Specific Ideas

- "Custom-Inclusive" is the core brand differentiator -- guests choose and pay only for what they want
- The 3 takeover steps should feel aspirational and easy -- "just show up" energy
- Coming Soon cards should create anticipation without looking broken/incomplete
- Bed config data already exists in JSONB `bed_config` column -- just needs to surface on cards

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Hero.tsx` (Server Component with auth check): Replace headline, subtitle, CTA text
- `BrandStory.tsx`: Rename heading, update copy, potentially split into two sections (Experience + Takeover Steps)
- `FeaturedProperties.tsx` + `PropertyListingCard.tsx`: Rename heading, add bed_config to card
- `DestinationCards.tsx`: Restructure for active vs Coming Soon split
- `AmenityList.tsx`: Existing component with icon mapping -- will be updated in Phase 15 but schema informs its future shape
- `calculatePricing()` in `src/lib/pricing.ts`: Add hotelTax calculation, update PricingBreakdown interface
- `PricingWidget.tsx`: Consumes PricingBreakdown -- needs to display tax line item

### Established Patterns
- Landing sections are separate Server Components in `src/components/landing/`
- Property queries use Supabase `.select()` with joined tables
- Pricing module is framework-agnostic pure functions shared between client and server
- shadcn/ui Card, Badge components used throughout

### Integration Points
- `src/app/page.tsx`: Orchestrates all landing sections -- may need new section import
- `src/app/(guest)/properties/page.tsx`: Browse page uses PropertyListingCard -- needs bed_config in query
- `src/lib/actions/bookings.ts`: Server-side pricing -- must pass tax_rate to calculatePricing()
- `src/components/property/PricingWidget.tsx`: Client-side pricing display -- must show tax line
- Supabase migrations: New migration for amenities tables + tax_rate column

</code_context>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 12-branding-copy-amenities-schema*
*Context gathered: 2026-03-23*
