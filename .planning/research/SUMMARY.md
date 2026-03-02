# Project Research Summary

**Project:** Whole-Tel
**Domain:** Party villa / luxury vacation rental booking platform
**Researched:** 2026-03-02
**Confidence:** HIGH

## Executive Summary

Whole-Tel is a direct-booking vacation rental platform targeting party villa guests (Cabo, Puerto Vallarta, Miami) with a key differentiator: integrated add-on experiences selected at booking time rather than coordinated post-booking. The research confirms this is a well-understood domain with a clear, proven technical path. The recommended approach is a Next.js 16 App Router monolith backed by Supabase (already provisioned) and Stripe Embedded Checkout — a stack where official documentation is current and patterns are well-established. Building this right means following the server-first data fetching model, implementing defense-in-depth auth (middleware + DAL + RLS), and keeping the booking flow as the architectural spine around which everything else organizes.

The two strongest competitive angles that research supports building explicitly: (1) per-property add-on selection integrated into the booking flow — no competitor does this at checkout time, and (2) transparent all-in pricing shown at the listing level before the guest even starts the flow. Both are low-to-medium complexity but high trust/conversion value. Features like reviews, messaging, Stripe Connect, and dynamic pricing should be deferred — they require real booking volume to be useful and create disproportionate complexity for a v1.

The critical risks are all well-documented with clear prevention patterns: double-booking must be blocked at the database layer with a PostgreSQL exclusion constraint (not just in application code), the Stripe webhook must read raw request body (not parsed JSON), the Supabase service role key must never reach the client, and surcharge implementation must avoid the debit card legal issue. Each of these is a "looks done but isn't" category problem — they appear to work in development and break silently in production. None are hard to prevent if addressed at the correct phase.

## Key Findings

### Recommended Stack

The stack is greenfield-friendly with no legacy constraints. Next.js 16 with App Router provides the server-first architecture needed for SEO-critical property listing pages, and its Server Actions pattern eliminates the traditional `/api/` boilerplate for most mutations. Supabase is already provisioned (project: jxbafovfobsmqxjfjrqp) and covers database, auth, and storage in one — no reason to add Prisma or a separate auth library. Stripe Embedded Checkout handles PCI compliance and supports both credit card (with fee passthrough) and ACH bank transfer natively.

Two important versioning notes: Next.js 16 requires Node.js 20.9+ (Node 18 dropped) and renames `middleware.ts` to `proxy.ts`. The `tailwindcss-animate` plugin is deprecated — use `tw-animate-css` instead. Both are traps for developers scaffolding from older tutorials.

**Core technologies:**
- Next.js 16.1.6: Full-stack React framework — App Router SSR for SEO, Server Actions replace API routes for mutations, Turbopack default
- Supabase (@supabase/supabase-js 2.80.0): Database + Auth + Storage — already provisioned, RLS enforces owner/guest separation at DB layer
- Stripe (stripe 20.4.0): Payments — Embedded Checkout handles PCI compliance, supports CC fee passthrough and ACH bank transfer
- TypeScript 5.1+: Type safety — Supabase generates types from schema, eliminates booking/payment flow bugs
- Tailwind CSS 4.2.1 + shadcn/ui: Styling — CSS-first config, accessible Radix primitives, full component ownership
- React Bits: Animated UI components — 110+ animated components for hero sections and cards, works alongside shadcn

**What NOT to use:**
- Stripe Connect (overkill for v1 — manual payouts to owners are fine)
- Supabase Realtime for v1 (WebSocket complexity not needed until live availability is a requirement)
- Prisma (redundant when Supabase JS client generates typed queries from schema)
- Individual Stripe Elements (use Embedded Checkout for full PCI coverage with less code)

### Expected Features

The feature research confirms a clear MVP scope centered on the booking transaction. The four-step booking flow (dates/guests → add-on selection → price summary → Stripe Checkout) is the product's core value delivery and the highest-priority engineering work. Property browsing and owner dashboard management are the two supporting pillars that must exist before the booking flow can be exercised.

**Must have (table stakes):**
- Property listing pages with photo gallery, amenities, location, and max occupancy — guests can't evaluate the property without it
- Availability calendar with date range picker — prevents invalid bookings, the entry point for the whole flow
- Guest count selector — occupancy limits are critical for group villas
- Total price breakdown before payment — industry trust expectation, especially for high-ticket bookings
- Stripe Checkout with CC + bank transfer — required to take money
- Booking confirmation email — minimum post-booking communication
- Mobile-responsive design — majority of browsing is on phones
- Guest auth with booking history — guests need to see their upcoming stays
- Owner auth with property management dashboard — owners must be able to create and manage listings
- Per-property add-on CRUD — owners configure their unique local experiences

**Should have (competitive differentiators):**
- Per-property customizable add-ons integrated at booking time — the core differentiator vs Airbnb/VRBO where extras are coordinated post-booking
- Per-person cost calculator on booking summary — party groups think in per-person terms, no competitor shows this at listing level
- Dual payment: CC with fee passthrough + ACH bank transfer — high-ticket bookings make guests fee-sensitive, no competitor offers both
- Transparent all-in pricing shown at listing level when dates are selected — not just at checkout, builds trust earlier in the funnel
- Party-brand positioning throughout UX (copy, photography, voice) — self-selects the right guest and sets expectations correctly

**Defer to v2+:**
- Reviews and ratings — requires real bookings first; placeholder reviews undermine trust
- Real-time guest-owner messaging — high infrastructure cost, email is sufficient for v1
- Stripe Connect / owner payouts — manual payouts viable until >10 active owners
- Dynamic pricing — premature without booking volume data
- Channel manager (iCal/API sync with Airbnb/VRBO) — commoditizes the brand, defeating the purpose

### Architecture Approach

The architecture is a straightforward Next.js App Router monolith with three route groups: `(guest)` for public-facing pages, `(owner)` for the protected dashboard, and `(auth)` for login/signup. All data fetching is server-first (async Server Components calling Supabase directly), with Client Components used only for interactive elements like the date picker, add-on selector, and booking form. Security is three-layered: middleware handles fast redirects, the Data Access Layer (`lib/dal.ts`) enforces server-side auth in every component/action, and Supabase RLS is the true security boundary at the database. No global client state manager is needed — booking form state lives in the BookingForm Client Component and after submission, server-driven state takes over.

**Major components:**
1. Guest Pages `(guest)/` — Public property browsing and booking flow; Server Components for SEO, Client Components for interactivity
2. Owner Dashboard `(owner)/dashboard/` — Protected property management; all mutations via Server Actions with `requireOwner()` check
3. Data Access Layer `lib/dal.ts` — Centralized `verifySession()` and `requireOwner()` wrapped in `React.cache()`; the auth enforcement point for all server code
4. Stripe Route Handlers `app/api/checkout/` + `app/api/webhooks/stripe/` — Payment session creation and webhook fulfillment; the only traditional API routes in the project
5. Supabase RLS Policies — Database-layer security enforcing owner/guest data separation; the last line of defense

**Build order dictated by dependencies:**
1. Supabase schema + RLS policies + Auth
2. DAL + Supabase client utilities (`lib/supabase/server.ts`, `lib/supabase/browser.ts`)
3. Owner property management (data must exist before guest experience)
4. Guest browsing + property detail pages
5. Booking flow (depends on property detail + availability logic)
6. Stripe Checkout + webhook (touches everything — must come last)
7. Homepage/landing (no blocking dependencies, can be polished after core flow works)

### Critical Pitfalls

1. **Stripe webhook raw body destroyed by Next.js parsing** — Use `req.text()` not `req.json()` in the webhook handler; `req.json()` invalidates the raw buffer Stripe needs for signature verification, causing silent booking confirmation failures. Address in the Stripe integration phase.

2. **Double-booking race condition** — Use a PostgreSQL exclusion constraint (`EXCLUDE USING gist`) on the bookings table to make overlapping date ranges physically impossible at the database level. Application-code availability checks have an inherent TOCTOU race condition under concurrent load. Must be in the initial schema migration — adding later requires resolving any existing overlaps.

3. **Supabase service_role key client exposure** — Maintain two strictly separate Supabase client files: one using `NEXT_PUBLIC_SUPABASE_ANON_KEY` for browser contexts, one using `SUPABASE_SERVICE_ROLE_KEY` (no `NEXT_PUBLIC_` prefix) for server-only contexts. Mixing them is the most common cause of complete database compromise in Next.js + Supabase projects. Must be the first architectural decision in the foundation phase.

4. **CC surcharge applied to debit cards — illegal under federal law** — The Durbin Amendment prohibits surcharging debit card transactions. Stripe Checkout doesn't distinguish credit from debit automatically. Use a "processing fee" label (legally distinct from "credit card surcharge") applied uniformly, or implement card-type detection. Also prohibited entirely in CA, CT, ME, and MA. Address before any live transactions.

5. **RLS enabled with no policies — silent denial of all data** — Enabling RLS without creating policies silently returns empty arrays for all queries, no error. Write RLS enable + policies in the same migration. Test via the Supabase JS client with a real user session (the SQL editor bypasses RLS and will mislead you). Address in the database schema phase.

## Implications for Roadmap

Based on research, the dependency graph and pitfall-to-phase mapping suggest a 7-phase structure:

### Phase 1: Foundation and Database Schema
**Rationale:** Everything depends on the database being set up and auth working. Supabase RLS policies must exist before any data can be read/written correctly. This is also where the most dangerous pitfalls live — the service role key separation and the double-booking exclusion constraint must be established here before a single line of application code is written.
**Delivers:** Supabase schema (profiles, properties, add_ons, bookings, booking_add_ons), RLS policies for all tables, PostgreSQL exclusion constraint for bookings, Supabase client factory files (`lib/supabase/server.ts`, `lib/supabase/browser.ts`), DAL (`lib/dal.ts`)
**Addresses:** Guest auth, owner auth (role-based), secure data access patterns
**Avoids:** Service role key exposure, RLS silent-deny trap, double-booking race condition

### Phase 2: Auth and Role Management
**Rationale:** Supabase auth with role-based access (guest / owner) must work before any protected pages can be built. The JWT role staleness pitfall must be solved here — designing the role grant + token refresh flow before the owner dashboard is built prevents a hard-to-diagnose 403 bug.
**Delivers:** Guest signup/login, owner signup/login with role, `proxy.ts` middleware for route protection, JWT custom claims hook, `requireOwner()` and `verifySession()` DAL functions, role-based redirect logic
**Uses:** `@supabase/ssr`, `lib/supabase/server.ts`, `lib/supabase/browser.ts`, `lib/dal.ts`
**Avoids:** JWT role claims staleness, `user_metadata` vs `app_metadata` mistake

### Phase 3: Owner Property Management
**Rationale:** Owners create properties before guests can browse. No data means no guest experience to build. Validating the photo upload flow and add-on schema at this stage also unblocks the guest-facing product. Owner dashboard is the highest-complexity feature (P1, HIGH) and benefits from being built while the schema is freshest.
**Delivers:** Owner dashboard, property CRUD, photo upload via signed URLs (bypasses Vercel 4.5MB limit), per-property add-on management, Supabase Storage bucket setup, placeholder property seeding for Cabo/PV/Miami
**Uses:** Server Actions for mutations, `requireOwner()` in all mutations, `react-hook-form` + Zod for forms, shadcn/ui form components
**Avoids:** Server Action 1MB body limit (use signed upload URLs), Next.js Image + Supabase Storage incompatibility (configure remotePatterns in `next.config.ts`)

### Phase 4: Guest Property Browsing
**Rationale:** Depends on properties existing in the database (Phase 3). Property listing page is the SEO-critical page and the "sales page" for each villa — it must show add-ons, pricing, gallery, and availability calendar. This is pure Server Component data fetching with Client Component interactivity.
**Delivers:** Homepage with hero, featured properties, destination filter; property listing page with gallery, amenities, availability calendar, add-on display; per-person cost calculator; transparent all-in pricing display at listing level
**Implements:** Server-first data fetching pattern, `DateRangePicker` and `AddOnSelector` Client Components
**Addresses:** All table stakes display features (P1), party-brand positioning, per-person differentiator

### Phase 5: Booking Flow
**Rationale:** Depends on property detail page (Phase 4) and the availability logic (Phase 1 schema). The booking flow is the core transaction — date selection through checkout. Availability blocking must use the exclusion constraint established in Phase 1. All pricing must be calculated server-side.
**Delivers:** 4-step booking flow (dates/guests → add-ons → price summary → Stripe redirect), server-side total calculation, pending booking record creation before payment, guest count selector
**Implements:** `BookingForm` Client Component managing local state, Server Action or Route Handler for checkout session creation
**Avoids:** Client-side price calculation (security), add-on pricing manipulation, abandoned session holding dates

### Phase 6: Stripe Checkout and Webhook
**Rationale:** Touches everything — bookings table, property data, guest identity, add-on pricing. Must come after all earlier pieces are working. This phase also handles webhook idempotency, the raw body parsing requirement, the bank transfer customer object requirement, and the surcharge legal compliance issue.
**Delivers:** Stripe Embedded Checkout (CC + ACH bank transfer), `POST /api/checkout/route.ts` (session creation), `POST /api/webhooks/stripe/route.ts` (booking confirmation), `checkout.session.expired` handler (abandoned session cleanup), booking confirmation email, booking history page for guests
**Uses:** `stripe@20.4.0`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` in webhook only
**Avoids:** Raw body parsing error (use `req.text()`), debit card surcharge legal issue (use "processing fee"), bank transfer without customer object, unverified webhooks

### Phase 7: Landing Page and Polish
**Rationale:** No blocking dependencies — purely a content and brand page. Can be polished once the core booking flow is validated. React Bits animated components fit here.
**Delivers:** Full homepage (hero, brand story, featured properties, destination browsing), FAQ/cancellation policy page, mobile-responsive polish pass, React Bits animations, placeholder property content for all three destinations
**Uses:** React Bits, tw-animate-css, shadcn/ui

### Phase Ordering Rationale

- Schema and auth first is non-negotiable: RLS policies, the exclusion constraint, and the DAL must exist before any page can safely read or write data.
- Owner before guest: Owners generate the content guests browse. Without real (or seeded placeholder) property records, the entire guest-facing experience is empty.
- Booking flow before Stripe: The booking form and state management must work before connecting payment. Separating these phases makes debugging each layer easier.
- Stripe last among feature phases: It touches every other component. Building it last means it integrates a working system rather than a partial one.
- Landing page last: It has no dependencies and can be optimized once you know the core booking flow converts.

### Research Flags

Phases that need deeper research during planning:
- **Phase 6 (Stripe Checkout + Webhook):** The surcharge/processing fee legal nuance, bank transfer customer object requirement, and webhook idempotency patterns are more complex than typical Stripe integrations. Recommend `/gsd:research-phase` before implementation, focused on Stripe's current Embedded Checkout + bank transfer configuration.
- **Phase 2 (Auth and Role Management):** The custom access token hook + JWT claims refresh flow has several sharp edges. Verify the current Supabase hook implementation pattern before building the owner dashboard.

Phases with standard, well-documented patterns (skip research-phase):
- **Phase 1 (Foundation/Schema):** PostgreSQL exclusion constraints and Supabase RLS are well-documented. Research has the exact SQL.
- **Phase 3 (Owner Property Management):** Server Actions + `react-hook-form` + Supabase Storage signed URLs is a standard Next.js pattern with multiple confirmed sources.
- **Phase 4 (Guest Browsing):** Server Components + shadcn/ui + react-day-picker v9 is fully documented. No research needed.
- **Phase 7 (Landing Page):** Pure content and UI polish. No research needed.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Core stack verified via official docs (Next.js 16.1, Supabase 2.80, Stripe 20.4, Tailwind 4.2); version compatibility table confirmed across multiple sources |
| Features | MEDIUM | Based on competitor analysis (Airbnb, VRBO, Sun Cabo, Cabo Platinum) and industry blogs — not user interviews. Feature prioritization is well-reasoned but should be validated with real guests after first bookings. |
| Architecture | HIGH | Official Next.js docs updated 2026-02-27; Supabase and Stripe architecture patterns from official sources; CVE-2025-29927 middleware vulnerability confirmed |
| Pitfalls | HIGH | Critical pitfalls (double-booking constraint, raw body parsing, service role key exposure, surcharge legality) verified against official PostgreSQL docs, Stripe docs, and Supabase docs |

**Overall confidence:** HIGH

### Gaps to Address

- **Surcharge state-law compliance:** The research identifies CA, CT, ME, MA as prohibiting surcharges, but the correct technical implementation in Stripe Checkout to detect billing state and conditionally apply fees needs verification during Phase 6 planning. The safest path is a flat "processing fee" applied uniformly (legally distinct from a surcharge) — recommend confirming this approach with the Stripe surcharging guide before implementation.
- **Supabase Image Transformations on free tier:** Research confirms transformations (resizing, WebP conversion) require Supabase Pro ($25/month+). If the project stays on free tier, plan to resize images on upload client-side (e.g., `browser-image-compression`) rather than relying on Supabase serving optimized thumbnails. This affects Phase 3 and Phase 4.
- **Owner onboarding flow:** Research defines the technical role-grant mechanics but doesn't address the product question of whether owners self-register or are invited by Whole-Tel admin. This affects the auth flow design in Phase 2 and should be decided before building the owner signup page.
- **Booking confirmation email provider:** Research references Supabase + Resend as a pattern but doesn't evaluate alternatives (Postmark, SendGrid). Any transactional email provider works — this is a Phase 6 implementation decision, not a blocker.

## Sources

### Primary (HIGH confidence)
- [Next.js 16 Official Blog Post](https://nextjs.org/blog/next-16) — Version 16.0 release, Turbopack stable, React 19.2, proxy.ts, breaking changes
- [Next.js 16.1 Blog](https://nextjs.org/blog/next-16-1) — Latest stable 16.1.6
- [Next.js Server and Client Components — Official Docs (updated 2026-02-27)](https://nextjs.org/docs/app/getting-started/server-and-client-components)
- [Next.js Authentication Guide — Official Docs (updated 2026-02-27)](https://nextjs.org/docs/app/guides/authentication)
- [Supabase Auth with Next.js App Router — Official Docs](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase Row Level Security — Official Docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Custom Access Token Hook — Official Docs](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook)
- [Supabase Storage Image Transformations — Official Docs](https://supabase.com/docs/guides/storage/serving/image-transformations)
- [Stripe Checkout Quickstart — Official Docs](https://docs.stripe.com/checkout/quickstart?client=next)
- [Stripe Webhooks — Official Docs](https://docs.stripe.com/webhooks)
- [Stripe Bank Transfers — Official Docs](https://docs.stripe.com/payments/bank-transfers)
- [Stripe Abandoned Carts — Official Docs](https://docs.stripe.com/payments/checkout/abandoned-carts)
- [shadcn/ui Tailwind v4 docs](https://ui.shadcn.com/docs/tailwind-v4)
- [shadcn/ui June 2025 Calendar changelog](https://ui.shadcn.com/docs/changelog/2025-06-calendar) — react-day-picker v9 upgrade
- [PostgreSQL Non-Overlapping Date Intervals](https://wiki.postgresql.org/wiki/How_to_avoid_overlapping_intervals_with_PostgreSQL) — exclusion constraint pattern

### Secondary (MEDIUM confidence)
- [Sun Cabo Vacations](https://www.suncabo.com/) — direct competitor review
- [Cabo Platinum Bachelor Party Villas](https://caboplatinum.com/bachelor-party-villas/) — direct competitor review
- [Airbnb 2025 Summer Release — Rental Scale-Up](https://www.rentalscaleup.com/airbnb-summer-release-2025/) — industry analyst coverage
- [Guesty: Short-term rental upselling](https://www.guesty.com/blog/short-term-rental-upselling-the-untapped-potential-of-your-properties/)
- [Hostaway: Short-term rental upsells](https://www.hostaway.com/blog/short-term-rental-upsell/)
- [Hostfully: Vacation rental payments guide](https://www.hostfully.com/blog/vacation-rental-payments/)
- [Next.js Middleware CVE-2025-29927](https://www.hashbuilds.com/articles/next-js-middleware-authentication-protecting-routes-in-2025) — verified against multiple sources
- [React Bits GitHub](https://github.com/DavidHDev/react-bits) — 18.8k stars, active maintenance
- [Credit Card Surcharge Laws by State 2025 — LawPay](https://www.lawpay.com/about/blog/credit-card-surcharge-rules/)
- [Signed URL File Uploads with Next.js and Supabase — Medium](https://medium.com/@olliedoesdev/signed-url-file-uploads-with-nextjs-and-supabase-74ba91b65fe0)
- [10 best short-term rental platforms 2026 — Touchstay](https://touchstay.com/blog/best-short-term-rental-platforms)
- [AvantStay: Split vacation rental fairly](https://avantstay.com/blog/split-vacation-rental-fairly/)

### Tertiary (LOW confidence)
- [Booking UX best practices — Ralabs](https://ralabs.org/blog/booking-ux-best-practices/) — content not fully accessible during research

---
*Research completed: 2026-03-02*
*Ready for roadmap: yes*
