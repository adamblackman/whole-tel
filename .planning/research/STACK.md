# Stack Research

**Domain:** Villa / vacation rental booking platform
**Researched:** 2026-03-02
**Confidence:** HIGH (core stack verified via official docs and WebSearch with multiple sources)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| Next.js | 16.1.6 (latest) | Full-stack React framework | App Router gives SSR for SEO-critical property listing pages, Server Actions replace API routes for Stripe and Supabase mutations, Turbopack default for fast DX. React 19.2 included. |
| React | 19.2 (via Next.js) | UI rendering | Ships with Next.js 16; React Compiler stable in 16, View Transitions available. |
| TypeScript | 5.1+ | Type safety | Required by Next.js 16 minimum. Supabase generates types from schema — eliminates a whole class of bugs in booking/payment flows. |
| Supabase | @supabase/supabase-js 2.80.0 | Database, Auth, Storage | Postgres + Auth + Storage in one. Project already provisioned (jxbafovfobsmqxjfjrqp). Row Level Security enforces owner/guest separation at the DB layer. |
| Stripe | stripe 20.4.0 (server) + @stripe/stripe-js (client) | Payments | Industry standard. Hosted Checkout handles PCI compliance; Embedded Checkout keeps user on-domain. Fee passthrough and bank transfer supported natively. |
| Tailwind CSS | 4.2.1 | Styling | Ships with `create-next-app` defaults. shadcn/ui fully compatible with v4. CSS-first config (no tailwind.config.js). 5x faster builds than v3. |
| shadcn/ui | CLI 3.0+ (no fixed version — copied components) | UI component library | Not a dependency — components are copied into the project, fully owned. Tailwind v4 and React 19 support confirmed. Radix primitives for accessible modals, dropdowns, calendars. |
| React Bits | Latest from reactbits.dev | Animated UI components | 110+ animated components (hero sections, text effects, cards, backgrounds). CLI or copy-paste. Works alongside shadcn. 18k+ GitHub stars — active maintenance confirmed. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @supabase/ssr | Latest | Supabase SSR auth helpers | Always — required for cookie-based auth in Next.js App Router. Exports `createBrowserClient` and `createServerClient`. |
| react-hook-form | ^7 | Form state management | All booking, add-on selection, owner listing forms. Integrates with shadcn form components natively (documented in shadcn/ui). |
| zod | ^3 | Schema validation | Client + server validation with shared schemas. Use with `zod-form-data` for Server Action FormData validation. Prevents invalid bookings reaching Stripe. |
| react-day-picker | v9 (via shadcn Calendar) | Date range selection | Booking check-in/check-out calendar. shadcn upgraded to react-day-picker v9 in June 2025. Range selection built in. |
| date-fns | ^3 | Date math | Availability checks, pricing calculations (nights × rate), check-in/check-out formatting. Pairs with react-day-picker. |
| tw-animate-css | Latest | CSS animations | Replacement for deprecated `tailwindcss-animate`. Import with `@import "tw-animate-css"`. Use alongside React Bits animations. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Turbopack | Bundler | Default in Next.js 16. No config needed. 5–10x faster Fast Refresh. Use `--webpack` flag only if custom webpack config required. |
| Supabase CLI | DB schema management, local dev, type generation | Run `supabase gen types typescript` to sync DB types. Use MCP for schema setup. |
| Supabase MCP | Schema setup from Claude | Already configured per PROJECT.md. Use to scaffold tables, RLS policies, storage buckets. |
| ESLint (flat config) | Linting | Next.js 16 defaults to ESLint flat config format. `next lint` command removed — run ESLint directly. |
| `@next/codemod` | Migration helper | Use for Next.js upgrades: `npx @next/codemod@canary upgrade latest`. |

---

## Installation

```bash
# Bootstrap
npx create-next-app@latest whole-tel --typescript --tailwind --eslint --app

# Supabase
npm install @supabase/supabase-js @supabase/ssr

# Stripe
npm install stripe @stripe/stripe-js

# Forms + Validation
npm install react-hook-form zod zod-form-data

# Date handling
npm install date-fns react-day-picker

# shadcn/ui (CLI — copies components, not a runtime dependency)
npx shadcn@latest init
npx shadcn@latest add button card dialog calendar date-picker input label select textarea badge separator

# Animations
npm install tw-animate-css
# React Bits components are copy-pasted via: npx jsrepo add [component]
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Next.js 16 App Router | Next.js 15 | Only if team needs more time to learn async `params`/`cookies()` patterns that became required in v16 — but v16 is stable and correct choice for greenfield. |
| Next.js | Remix | If data loading patterns are all loader-based and no SSG/ISR needed. Not worth switching for this use case — Next.js has better static property listing support. |
| Supabase | Prisma + Postgres | If you need a separate hosted DB and more complex ORM queries. For this project, Supabase is already provisioned and includes Auth + Storage — Prisma adds unnecessary complexity. |
| Supabase Auth | NextAuth.js / Auth.js | If using multiple OAuth providers or custom DB. Supabase Auth handles Google/email natively and integrates with RLS — no reason to add Auth.js complexity. |
| Stripe Embedded Checkout | Stripe Elements | If full custom payment UI is required. Embedded Checkout is faster to build and handles PCI compliance, ACH/bank transfer, and fee passthrough without custom form code. |
| Stripe Embedded Checkout | Stripe Hosted Checkout (redirect) | If you don't mind leaving the domain. Embedded keeps users on whole-tel.com — better conversion, same compliance. Use hosted only as fallback if iframe embedding fails. |
| Tailwind CSS v4 | Tailwind CSS v3 | If using legacy component libraries that haven't migrated. shadcn is v4-compatible — no reason to stay on v3. |
| shadcn/ui + React Bits | Chakra UI / MUI | If you need a pre-designed system with less customization. shadcn gives full ownership of component code, which is needed for Airbnb-level polish. MUI/Chakra enforce their design system. |
| react-day-picker (via shadcn) | Flatpickr / vanilla date inputs | Flatpickr lacks React integration and range selection ergonomics. shadcn Calendar with react-day-picker v9 has built-in range mode and accessible keyboard navigation. |
| date-fns | dayjs | date-fns is tree-shakeable and modular; dayjs is fine too but date-fns integrates natively with react-day-picker. |
| Zod | Yup | Zod has better TypeScript inference, smaller API surface, and is the de facto standard with react-hook-form and shadcn forms in 2025. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Stripe Connect | Overkill for v1 — requires onboarding each owner, handling split payments. Per PROJECT.md: all payments to Whole-Tel account for now. | Stripe Checkout with manual payout reconciliation |
| `middleware.ts` for auth | Deprecated in Next.js 16. Renamed to `proxy.ts`. Using `middleware.ts` triggers deprecation warning. | `proxy.ts` (or keep `middleware.ts` for edge runtime only) |
| `getSession()` server-side | Does not revalidate JWT with Supabase server — can return stale session data. | `supabase.auth.getClaims()` for server-side user verification |
| `tailwindcss-animate` | Deprecated as of March 2025. | `tw-animate-css` (drop-in replacement via CSS import) |
| `next/legacy/image` | Deprecated in Next.js 16. | `next/image` |
| `images.domains` config | Deprecated in Next.js 16 for security reasons. | `images.remotePatterns` |
| `serverRuntimeConfig` / `publicRuntimeConfig` | Removed in Next.js 16. | `.env` files with `NEXT_PUBLIC_` prefix |
| Real-time subscriptions (Supabase Realtime) for v1 | Adds WebSocket complexity not needed until live availability updates are required (v2 feature). | Server-side availability queries on each booking load |
| Individual Stripe Elements (card number, expiry, etc.) | Complex PCI scope, brittle form UX. | Stripe Embedded Checkout (single component, full PCI coverage) |
| Prisma | Extra ORM layer when Supabase JS client already generates typed queries from schema. | `@supabase/supabase-js` with generated TypeScript types |

---

## Stack Patterns by Variant

**For server-side data fetching (property listings, availability):**
- Use async Server Components directly — fetch from Supabase with `createServerClient`
- No need for TanStack Query / SWR on the server — RSC handles this natively
- Cache with `"use cache"` directive (stable in Next.js 16) for static property pages

**For client-side interactivity (booking form, add-on picker, date selection):**
- Use `"use client"` components with react-hook-form + Zod
- Mutations via Server Actions (not API routes) — eliminates `/api/` boilerplate
- Supabase realtime NOT needed for v1

**For payment flow:**
- Server Action creates Stripe Checkout Session (never expose secret key to client)
- Return `clientSecret` for Embedded Checkout, or `url` for Hosted redirect
- Webhook handler in `app/api/webhooks/stripe/route.ts` for `checkout.session.completed`
- Verify Stripe webhook signature — never trust unverified webhook payloads

**For owner auth vs guest auth:**
- Single Supabase Auth project, single users table
- Add `role` column: `'guest' | 'owner'`
- RLS policies restrict property management to `role = 'owner'`
- Separate `/owner` route group with middleware role check via `proxy.ts`

**For image uploads (property photos):**
- Signed upload URLs from a Server Action → client uploads directly to Supabase Storage
- Avoids routing large files through Next.js server
- Supabase Storage bucket with public read, authenticated write RLS
- Use `next/image` with `images.remotePatterns` for Supabase storage domain

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| next@16.1.6 | react@19.2, react-dom@19.2 | Next.js 16 bundles React 19.2 — install react@latest alongside next@latest |
| next@16.1.6 | Node.js 20.9+ | Node 18 dropped in Next.js 16. Verify local/CI Node version. |
| next@16.1.6 | TypeScript 5.1+ | Minimum TS version enforced by Next.js 16. |
| @supabase/supabase-js@2.80.0 | Node.js 20+ | Node 18 support dropped at supabase-js 2.79.0. |
| tailwindcss@4.2.1 | shadcn/ui (CLI 3.0+) | Full compatibility confirmed. shadcn auto-detects v4 during `init`. |
| react-day-picker@9 | shadcn Calendar (June 2025+) | shadcn upgraded to v9 in June 2025 changelog. If shadcn Calendar was installed before June 2025, re-add the component. |
| stripe@20.4.0 | Stripe API version 2026-02-25 | stripe-node pins API version on install — check `STRIPE_API_VERSION` if webhook events differ from expected schema. |
| tw-animate-css | tailwindcss@4 | Replaces `tailwindcss-animate`; CSS import, no plugin config needed. |

---

## Sources

- [Next.js 16 Official Blog Post](https://nextjs.org/blog/next-16) — Version 16.0 release October 21, 2025; confirmed Turbopack stable, React 19.2, proxy.ts, breaking changes. HIGH confidence.
- [Next.js 16.1 Blog](https://nextjs.org/blog/next-16-1) — Latest stable 16.1.6 as of March 2026. HIGH confidence.
- [Supabase SSR Auth Guide for Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs) — `createBrowserClient`/`createServerClient`, `getClaims()` over `getSession()`, middleware pattern. HIGH confidence.
- [Stripe Checkout Quickstart for Next.js](https://docs.stripe.com/checkout/quickstart?client=next) — Route Handler and Server Action patterns. HIGH confidence.
- WebSearch: "stripe npm version latest" — stripe@20.4.0, Stripe API pinned to 2026-02-25. MEDIUM confidence (npm page blocked, multiple sources confirm).
- WebSearch: "@supabase/supabase-js npm version" — 2.80.0 latest, Node 18 dropped at 2.79.0. MEDIUM confidence.
- [shadcn/ui Tailwind v4 docs](https://ui.shadcn.com/docs/tailwind-v4) — Full v4 compatibility, OKLCH colors, tw-animate-css migration. HIGH confidence.
- [shadcn/ui June 2025 Calendar changelog](https://ui.shadcn.com/docs/changelog/2025-06-calendar) — react-day-picker v9 upgrade confirmed. HIGH confidence.
- [React Bits GitHub](https://github.com/DavidHDev/react-bits) — 18.8k stars, active maintenance, CLI install via jsrepo. MEDIUM confidence.
- WebSearch: "tailwindcss v4 npm version" — v4.2.1 current as of March 2026. MEDIUM confidence.
- WebSearch: Zod + react-hook-form + Server Actions pattern — Standard pattern, multiple 2025 sources. MEDIUM confidence.

---

*Stack research for: Whole-Tel villa booking platform*
*Researched: 2026-03-02*
