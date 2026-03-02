# Feature Research

**Domain:** Party villa / luxury vacation rental booking platform
**Researched:** 2026-03-02
**Confidence:** MEDIUM — based on competitor analysis, industry research, and direct review of comparable sites (Sun Cabo, Cabo Platinum, Airbnb 2025 release notes). Feature categorizations draw on observable patterns across multiple sources.

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Property listing page with photo gallery | Every rental site has this; without it guests can't evaluate the property | LOW | Full-screen hero photo + scrollable gallery. Min 8-10 photos per property. Professional quality critical for luxury positioning. |
| Availability calendar | Guests need to know if dates are open before committing time to the booking | LOW | Block dates, show booked/available visually. Must update on booking confirmation. |
| Date picker in booking flow | Industry standard entry point for any rental | LOW | Check-in/check-out date range picker. Show pricing for selected range. |
| Guest count selector | Villas have occupancy limits; guests need to know if their group fits | LOW | Dropdown or stepper. Show occupancy max on listing. |
| Total price breakdown before payment | Guests have been burned by hidden fees; expect full transparency | LOW | Show nightly rate x nights + cleaning fee + any add-ons + CC fee if applicable before checkout. |
| Property amenities list | Guests use amenities to qualify properties (pool, beach access, AC, etc.) | LOW | Structured list with icons. Required for filtering. |
| Property location info | Guests need to understand where the villa is — neighborhood, proximity to beach/airport | LOW | Area description + map embed (Google Maps). No exact address until confirmed booking. |
| Max occupancy display | Group travel requires knowing how many people fit | LOW | Bedrooms + bathrooms + guest count prominently shown. |
| Mobile-responsive design | Majority of browsing happens on phones; non-responsive = users leave | MEDIUM | Full booking flow must work on mobile. Airbnb-level polish. |
| Booking confirmation email | Guests expect immediate proof of booking | LOW | Automated transactional email via Supabase + Resend or similar. Include booking details, dates, total paid. |
| Secure payment processing | Guests won't enter CC details on an untrusted-looking form | MEDIUM | Stripe Checkout handles this — guests see Stripe's branded UI, not a custom form. Trust signal. |
| Contact / inquiry option | Not every booking happens via instant checkout; some guests want to ask questions first | LOW | Contact form or email link. For complex group bookings, direct contact builds trust. |
| Homepage with property browsing | Guests land here and need to see what's available to get excited | MEDIUM | Hero section, featured properties grid, destination filtering. |
| Property search / filter by destination | With multiple properties across Cabo/PV/Miami, guests filter by where they want to go | LOW | Destination dropdown or filter. Expand to bedroom count, price range later. |
| FAQ / cancellation policy display | Guests want to know refund rules before booking; missing = trust killer | LOW | Per-property cancellation terms + site-wide FAQ page. |
| Owner listing management | Owners need to add/edit property details, photos, pricing, availability | HIGH | CRUD for properties. Photo upload to Supabase Storage. Calendar management. |
| Guest account / booking history | Return guests expect to see their past bookings and upcoming stays | MEDIUM | Supabase Auth guest accounts. Booking history page. No complex state needed. |
| Owner account / dashboard | Owners need separate login and view of their properties | MEDIUM | Role-based auth. Owner sees only their properties and bookings. |

---

### Differentiators (Competitive Advantage)

Features that set the product apart from Airbnb/VRBO for the party villa niche.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Per-property customizable add-on experiences | Cabo gets boat tours; Miami gets club packages; PV gets private chefs. No generic catalog — each villa's add-ons reflect what's actually available locally. This is the core differentiator vs Airbnb where guests have to coordinate extras themselves. | HIGH | Add-ons linked to a specific property, not a global catalog. Each add-on has name, description, price, unit (per person / per booking), optional max quantity. Guest selects add-ons during booking flow before checkout. |
| Per-person cost calculator | Party groups always think in "how much per person?" not total. Showing this prominently removes a mental step and makes pricing feel accessible. No competitor does this at the listing level. | LOW | Total cost / guest count = per person. Update dynamically as dates + add-ons change. Show prominently on booking summary. |
| Party-brand positioning (not generic luxury) | Airbnb is everything. VRBO is family-focused. Whole-Tel is explicitly tropical chill party villas. Guests self-select and show up with the right expectations. | LOW | Copy, photography, brand voice. Not a tech feature — but must be baked into the homepage, listing descriptions, and overall UX. |
| Curated destination-specific add-ons shown at booking time | Rather than a post-booking concierge call, guests see available experiences during the booking flow and can add them immediately. Reduces coordination overhead for both guest and owner. | MEDIUM | Add-on selector step between date selection and payment. Show add-on cards with photos, descriptions, prices. Support "per person" pricing on add-ons (e.g., boat tour = $80/person x 10 guests). |
| Dual payment options: CC with fee passthrough + bank transfer | High-ticket villa bookings ($2,000-$15,000+) make guests sensitive to CC fees. Offering ACH/bank transfer lets guests who care about fees avoid them. Neither Airbnb nor VRBO offers this. | MEDIUM | Stripe Checkout supports both. CC fee: present as separate line item (e.g., 3% surcharge). Bank transfer: Stripe ACH (US only). Note: Stripe surcharge rules require careful compliance — charge must be included in submitted amount, not added on top. |
| Placeholder-first listings that owners fill in | Rather than waiting for owner-generated content to launch, ship with curated placeholder properties for Cabo/PV/Miami. Demonstrates the concept before real inventory exists. | LOW | Admin/owner can update listing content after launch. Placeholder photos and dummy data for initial launch. |
| Transparent all-in pricing display | Industry problem: guests see low nightly rate, then sticker shock at checkout fees. Whole-Tel shows complete total — nightly subtotal + cleaning + add-ons + CC fee — from the listing page. Builds trust. | LOW | Show full price breakdown on listing page when dates are selected, not just at checkout. |

---

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create complexity without proportional value for v1.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Real-time guest-owner chat | Guests want to ask questions; owners want to vet guests | Creates support burden, notification infrastructure, and moderation complexity. Airbnb has a team managing this. For v1, email is sufficient. | Contact form on listing page routes to adam@whole-tel.com. Owner email shown post-booking. Add messaging in v2 once volume justifies it. |
| Reviews and ratings system | Social proof drives bookings | Requires two-sided moderation, fake review prevention, and handling negative reviews. Before you have real guests, you have no reviews. Placeholder reviews create trust issues if they look fake. | Curated testimonials section on homepage (manually controlled). Add real review system in v2 after bookings happen. |
| Stripe Connect / owner payouts | Owners naturally want their money going directly to them | Stripe Connect requires significant compliance, KYC for each owner, and complex fee splitting. For a small portfolio (Cabo/PV/Miami), manual payouts are totally viable. | All payments to Whole-Tel Stripe account. Manual owner payouts via bank transfer. Revisit Stripe Connect when >10 active owners. |
| Individual payment splitting (each guest pays their share) | Groups of 10 don't want one person fronting the cost | Technically complex — requires Stripe Payment Links per-person, tracking partial payments, and handling cases where not everyone pays. High support overhead when it breaks. | Show per-person cost calculator prominently. One person books and pays; they handle splitting with their group via Venmo/Zelle. Clear UX about this expectation. |
| Dynamic pricing (demand-based) | Maximize revenue during peak seasons | Requires pricing model, market data, and ongoing tuning. Premature optimization for a platform that doesn't have booking volume data yet. | Owner sets pricing manually in the dashboard. Static pricing with ability for owner to create date-based rate overrides in v2. |
| Channel manager (list on Airbnb/VRBO too) | Broader reach, more bookings | For a brand-differentiated platform, listing on Airbnb commoditizes the product. Channel sync also requires iCal or API integration, doubling-booking risk, and fee complications. | Direct booking only for v1. The platform IS the brand — keep guests on Whole-Tel. |
| Mobile app (iOS/Android) | Native app feels premium | App Store approval delays, dual codebase maintenance, and push notification infrastructure for a v1 platform that hasn't validated its booking volume. | Mobile-responsive web app with PWA potential. Airbnb started as web-first. Ship and validate before committing to native. |
| AI-powered recommendation engine | "Personalize which villas guests see" | Requires behavioral data and ML infrastructure. With 3 properties at launch, every guest sees every property anyway. | Manual featured properties curation on homepage. Simple destination filter handles discovery for small catalog. Add recommendations in v2+ when catalog grows. |
| Multi-currency support | International guests | Adds complexity to pricing display, Stripe currency routing, and tax considerations. Most bookings will be US-based guests at launch (Cabo, PV, Miami target market is Americans). | USD only at launch. Stripe handles international cards automatically — guests pay in USD. Add currency display in v2 if international bookings materialize. |
| Instant automated refunds | Feels like better UX | Villa refund policies are complex (cancellation windows, damage deposits). Automated refunds create fraud exposure and override edge-case policies. | Manual refund process via Stripe dashboard with clear cancellation policy displayed pre-booking. Stripe Checkout captures payment; owner/admin initiates refund manually. |

---

## Feature Dependencies

```
Guest Auth (Supabase)
    └──required by──> Booking Flow
                          └──required by──> Booking History (guest account)
                          └──required by──> Add-On Selection (attached to booking)
                          └──required by──> Payment (Stripe Checkout session with booking ID)

Owner Auth (Supabase roles)
    └──required by──> Owner Dashboard
                          └──required by──> Property CRUD (create/edit listings)
                                                └──required by──> Add-On Management (per-property add-ons)
                                                └──required by──> Availability Calendar (block dates)
                                                └──required by──> Booking Visibility (owner sees their bookings)

Property Listing (database record)
    └──required by──> Property Page (display)
    └──required by──> Availability Calendar (tied to property)
    └──required by──> Add-Ons Catalog (per-property)
    └──required by──> Booking Flow (which property is being booked)

Availability Calendar
    └──required by──> Date Picker (show available dates)
    └──required by──> Booking Confirmation (marks dates as booked)

Add-On Catalog (per-property)
    └──required by──> Add-On Selection in Booking Flow
    └──required by──> Checkout Total Calculation (add-on prices summed)

Stripe Checkout Session
    └──required by──> Booking Confirmation (webhook confirms payment)
    └──required by──> Booking Record Creation (happens after payment success)

Per-Person Calculator ──enhances──> Booking Flow (no dependency, pure display logic)
Total Price Display ──enhances──> Property Page (no dependency, computed from available data)
```

### Dependency Notes

- **Booking Flow requires Guest Auth:** Guests must be logged in (or create account) before completing a booking. This prevents orphaned bookings with no contact info.
- **Add-On Management requires Property CRUD:** Add-ons are children of properties. You can't manage add-ons until property records exist.
- **Stripe Checkout requires Booking Record:** Create a pending booking record first, pass its ID to Stripe as metadata, then confirm via webhook. Don't create the booking after payment — create it before, mark as pending, confirm on webhook.
- **Availability Calendar requires Booking Confirmation:** Calendar blocking only happens after Stripe webhook confirms payment. Prevents double-booking if user abandons checkout.
- **Per-Person Calculator has no blocking dependencies:** Pure frontend math. Can be built at any time.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to take real bookings and validate demand.

- [ ] Homepage with hero, brand story, featured properties, destination filter — establishes trust and brand
- [ ] Property listing pages (photo gallery, amenities, calendar, add-ons, pricing) — the sales page for each villa
- [ ] Availability calendar (date picker that shows open dates) — prevents invalid bookings
- [ ] Booking flow: dates → guest count → add-on selection → price summary → payment — the core transaction
- [ ] Per-person cost calculator on booking summary — core differentiator, low complexity
- [ ] Stripe Checkout with CC fee option and bank transfer option — required to take money
- [ ] Booking confirmation email to guest — bare minimum post-booking communication
- [ ] Guest auth (Supabase) with booking history — guests can log in and see their bookings
- [ ] Owner auth (separate role) with property management dashboard — owners can manage listings
- [ ] Per-property add-on management (CRUD) — owners configure their unique experiences
- [ ] Photo upload for properties (Supabase Storage) — owner-managed property photos
- [ ] Placeholder properties for Cabo, Puerto Vallarta, Miami — launch with real-looking content

### Add After Validation (v1.x)

Features to add once first bookings are happening and patterns emerge.

- [ ] Email inquiry form on listing page — once bookings start, some guests will have questions pre-booking
- [ ] Owner booking notifications (email when new booking comes in) — owners need to know
- [ ] Cancellation policy display per property — reduces support requests
- [ ] Property search with more filters (bedrooms, price range, amenities) — once catalog grows beyond 3 properties
- [ ] Owner availability blocking (mark dates as unavailable without a booking) — maintenance windows, owner personal use

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] Reviews and ratings — requires real bookings first; placeholder reviews look fake
- [ ] Real-time guest-owner messaging — high infrastructure cost, low v1 value
- [ ] Stripe Connect / owner payouts — once more than ~10 active owners
- [ ] Dynamic pricing / seasonal rate overrides — once booking volume provides data
- [ ] Wishlists / saved properties — nice for returning users, low priority until repeat booking rate is known
- [ ] Referral program — premature before baseline conversion is established
- [ ] Multi-language support — validate US market first

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Property listing page (photos, details, amenities) | HIGH | LOW | P1 |
| Date picker + availability calendar | HIGH | LOW | P1 |
| Add-on selection in booking flow | HIGH | MEDIUM | P1 |
| Per-person cost calculator | HIGH | LOW | P1 |
| Stripe Checkout (CC + bank transfer) | HIGH | MEDIUM | P1 |
| Homepage with featured properties | HIGH | MEDIUM | P1 |
| Guest auth + booking history | HIGH | MEDIUM | P1 |
| Owner dashboard + property management | HIGH | HIGH | P1 |
| Booking confirmation email | HIGH | LOW | P1 |
| Per-property add-on CRUD (owner side) | HIGH | MEDIUM | P1 |
| Photo upload (Supabase Storage) | HIGH | LOW | P1 |
| Mobile-responsive design | HIGH | MEDIUM | P1 |
| Total price transparency (pre-checkout) | MEDIUM | LOW | P1 |
| Property search / destination filter | MEDIUM | LOW | P1 |
| FAQ / cancellation policy | MEDIUM | LOW | P2 |
| Owner availability blocking | MEDIUM | LOW | P2 |
| Owner new-booking email notification | MEDIUM | LOW | P2 |
| Property inquiry / contact form | MEDIUM | LOW | P2 |
| Reviews and ratings | HIGH | HIGH | P3 |
| Guest-owner messaging | MEDIUM | HIGH | P3 |
| Wishlists / saved properties | LOW | MEDIUM | P3 |
| Stripe Connect / owner payouts | HIGH | HIGH | P3 |
| Dynamic pricing | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | Airbnb | VRBO | Sun Cabo / Cabo Platinum | Whole-Tel Approach |
|---------|--------|------|--------------------------|-------------------|
| Add-on experiences at booking | Post-booking via "Experiences" tab, not integrated | No — manual concierge call post-booking | Post-booking via phone/email with concierge | Integrated at booking time — select add-ons before checkout |
| Per-person cost display | No — shows total price only | No — shows total price only | No — quotes total only | Show per-person breakdown prominently on booking summary |
| Payment options | CC only (Stripe + Airbnb wallet) | CC only | Wire transfer or CC via phone | CC (with fee passthrough) + ACH bank transfer via Stripe |
| Party/group brand positioning | Generic — all trip types | Family-focused | Niche Cabo-specific | Explicitly party villa brand; tropical chill aesthetic |
| Owner add-on management | Experiences is a separate product, complex to list | No — managed via PMS integrations | Managed offline by concierge team | Owner creates add-ons in their dashboard, per property |
| Booking flow | 3-step: dates → review → pay | Similar to Airbnb | Inquiry-based, manual | 4-step: dates/guests → add-ons → review → pay (Stripe Checkout) |
| Total price at listing level | "Total before taxes" shown on hover | Similar | Not shown until inquiry | Show full total (including add-ons + CC fee) when dates selected |
| Property filtering | Highly granular (50+ filters) | Good filtering | Basic | Destination + bedroom count for v1; expand later |

---

## Sources

- [Airbnb 2025 Summer Release — Rental Scale-Up](https://www.rentalscaleup.com/airbnb-summer-release-2025/) — MEDIUM confidence (industry analyst coverage)
- [Sun Cabo Vacations](https://www.suncabo.com/) — HIGH confidence (direct site review)
- [Cabo Platinum Bachelor Party Villas](https://caboplatinum.com/bachelor-party-villas/) — HIGH confidence (direct site review)
- [Guesty: Short-term rental upselling](https://www.guesty.com/blog/short-term-rental-upselling-the-untapped-potential-of-your-properties/) — MEDIUM confidence (industry blog)
- [Hostaway: Short-term rental upsells](https://www.hostaway.com/blog/short-term-rental-upsell/) — MEDIUM confidence (industry blog)
- [Hostfully: Vacation rental payments guide](https://www.hostfully.com/blog/vacation-rental-payments/) — MEDIUM confidence (vendor blog, verified against Stripe docs)
- [Booking UX best practices — Ralabs](https://ralabs.org/blog/booking-ux-best-practices/) — LOW confidence (content not fully accessible)
- [10 best short-term rental platforms 2026 — Touchstay](https://touchstay.com/blog/best-short-term-rental-platforms) — MEDIUM confidence
- [Stripe surcharge requirements](https://stripe.com/legal/ssa-services-terms) — HIGH confidence (official Stripe terms)
- [AvantStay: Split vacation rental fairly](https://avantstay.com/blog/split-vacation-rental-fairly/) — MEDIUM confidence (industry practitioner)

---

*Feature research for: Party villa / luxury vacation rental booking platform (Whole-Tel)*
*Researched: 2026-03-02*
