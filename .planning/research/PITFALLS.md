# Pitfalls Research

**Domain:** Villa / vacation rental booking platform
**Researched:** 2026-03-02
**Confidence:** HIGH (critical pitfalls verified against official Stripe and Supabase docs; availability race condition verified against PostgreSQL docs)

---

## Critical Pitfalls

### Pitfall 1: Stripe Webhook Raw Body Parsing Destroyed by Next.js Middleware

**What goes wrong:**
Stripe requires the **raw, unmodified request body** to verify webhook signatures. Next.js API routes and server actions parse the request body as JSON by default. If any middleware or framework processing touches the body before the webhook handler reads it, `stripe.webhooks.constructEvent()` throws a signature verification error. The webhook silently fails — bookings never get confirmed, availability never unlocks.

**Why it happens:**
Next.js App Router uses the Web Fetch `Request` API, which means `req.body` is already consumed or parsed. Developers read `req.json()` first (natural instinct), which invalidates the raw buffer Stripe needs.

**How to avoid:**
In the webhook route handler (`app/api/webhooks/stripe/route.ts`), read the body as a raw buffer using `req.text()` or `req.arrayBuffer()` before passing to `stripe.webhooks.constructEvent()`. Never call `req.json()` in the webhook handler. Disable any body parsing middleware for this specific route.

```typescript
// Correct pattern
export async function POST(req: Request) {
  const body = await req.text(); // raw string, not parsed JSON
  const sig = req.headers.get('stripe-signature')!;
  const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  // ...
}
```

**Warning signs:**
- Stripe dashboard shows webhook deliveries with 400 status responses
- `No signatures found matching the expected signature for payload` error in logs
- Bookings remain in `pending` status after payment completes

**Phase to address:** Payment integration phase (Stripe Checkout + webhook setup)

---

### Pitfall 2: Booking Availability Race Condition — Double Bookings Under Concurrent Load

**What goes wrong:**
Two guests simultaneously view the same villa's available dates. Both pass the "is this date available?" check. Both proceed to Stripe. Both pay successfully. Both get a booking confirmation. The villa is double-booked. The check-then-insert pattern in application code has an inherent TOCTOU (time-of-check-time-of-use) race condition.

**Why it happens:**
Developers write availability logic as: (1) SELECT to check if dates overlap with existing bookings, (2) if clear, INSERT new booking. Under concurrent requests, two transactions can both pass step 1 before either completes step 2.

**How to avoid:**
Use a PostgreSQL **exclusion constraint** with `gist` index on the bookings table. This enforces non-overlapping date ranges at the database level, making double-booking physically impossible regardless of application logic:

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings
ADD CONSTRAINT no_overlapping_bookings
EXCLUDE USING gist (
  property_id WITH =,
  daterange(check_in, check_out, '[)') WITH &&
);
```

The database rejects the second INSERT with a constraint violation. Catch this error in the API and return a "dates no longer available" response to the user. Also set booking status to `pending` on Stripe session creation and `confirmed` only after `checkout.session.completed` webhook fires — this prevents holding dates for unpaid sessions indefinitely.

**Warning signs:**
- Availability logic lives entirely in application code with no database constraint
- No unique/exclusion constraint on the bookings table for date ranges
- Booking status jumps directly from "available" to "confirmed" without a pending state

**Phase to address:** Booking system schema phase — must be in the initial database migration, not added later

---

### Pitfall 3: Supabase service_role Key Exposed in Client-Side Code

**What goes wrong:**
The `SUPABASE_SERVICE_ROLE_KEY` completely bypasses Row Level Security. If it leaks to the browser (via `NEXT_PUBLIC_` prefix or being bundled into client components), any user can read all data from all tables — every booking, every owner's personal details, payment metadata.

**Why it happens:**
In Next.js App Router, the boundary between server and client components is not always obvious. Developers create a single Supabase client used in both contexts. The service role key gets included to bypass RLS for admin operations, then that same client gets imported in a client component. With Lovable/v0-generated code, this happens constantly — 83% of exposed Supabase databases involve RLS misconfigurations.

**How to avoid:**
Maintain two strictly separate Supabase client files:
- `lib/supabase/client.ts` — uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`, for browser/client components
- `lib/supabase/server.ts` — uses `SUPABASE_SERVICE_ROLE_KEY` (no `NEXT_PUBLIC_`), only imported in Server Actions and API Route handlers

Never name the service role key with `NEXT_PUBLIC_` prefix. Use ESLint rules or a pre-commit check to detect service role key usage in client component files.

**Warning signs:**
- Single `createClient()` function imported from both server and client components
- `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` in `.env` (the prefix alone is a critical mistake)
- Supabase project dashboard shows "Advisor" warnings about exposed keys

**Phase to address:** Foundation/setup phase — this must be the first architectural decision

---

### Pitfall 4: Credit Card Surcharge Applied to Debit Cards — Illegal Under Federal Law

**What goes wrong:**
Stripe Checkout doesn't automatically distinguish credit cards from debit cards when applying surcharges. If you add a blanket 2.9% surcharge line item to all card transactions, you are charging a surcharge on debit card transactions, which violates the Durbin Amendment (federal law) and Visa/Mastercard network rules. This exposes the business to fines, account termination, and legal liability.

**Why it happens:**
Developers implement surcharging as a simple percentage add-on applied to all Stripe Checkout sessions. They don't realize debit cards route through the same Stripe Checkout flow as credit cards and look identical from a session configuration perspective.

**How to avoid:**
Stripe's recommended approach for surcharging is to use the `payment_method_data` features in Checkout to restrict to credit cards only when surcharging. Alternatively, label the fee as a "payment processing fee" rather than "credit card surcharge" and apply it uniformly — this is legally distinct from a surcharge and avoids the debit card prohibition. Consult the Stripe surcharging documentation for your specific jurisdiction.

Additionally: surcharging is **completely prohibited** in California, Connecticut, Maine, and Massachusetts as of 2026. If a guest from those states books through the platform, the surcharge cannot be applied. Consider using a uniform "processing fee" (which is legally distinct from a surcharge) to sidestep state-by-state restrictions.

**Warning signs:**
- Surcharge applied as a flat line item without payment method type detection
- No state-based surcharge logic
- Fee labeled "credit card surcharge" in Stripe metadata without debit card exclusion logic

**Phase to address:** Payment integration phase — address before any live transactions

---

### Pitfall 5: RLS Enabled With No Policies — Silent Denial of All Data Access

**What goes wrong:**
Developer enables Row Level Security on a table (correct!) but does not create any RLS policies yet (common when scaffolding). The Supabase client returns an empty array `[]` for all queries on that table, with no error. The developer assumes the table is empty and spends hours debugging, or worse, ships with a broken feature that shows no properties to guests.

**Why it happens:**
RLS with no policies means "deny all by default." Supabase doesn't throw an error — it just returns nothing. This is correct PostgreSQL behavior but extremely surprising to developers who expect backward compatibility after enabling RLS.

**How to avoid:**
Enable RLS and write policies **in the same migration**. Never leave a table in the RLS-enabled-but-no-policies state. Use a checklist:
```sql
-- Enable RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

-- Immediately create at minimum a read policy
CREATE POLICY "Public properties are viewable by everyone"
ON properties FOR SELECT USING (status = 'published');
```

Test policies immediately after creation using the Supabase client SDK (not the SQL editor — the SQL editor bypasses RLS entirely).

**Warning signs:**
- `SELECT` queries return `[]` with no error after enabling RLS
- Testing in the Supabase SQL editor shows data but the app shows nothing
- RLS is enabled on tables with no corresponding policies in the schema

**Phase to address:** Database schema phase — part of initial schema migration

---

### Pitfall 6: JWT Role Claims Stale After Owner Role Grant

**What goes wrong:**
An owner registers as a guest, then gets the `owner` role assigned in the database. They log out and back in — but their JWT still shows the old role. Or more commonly: the role is assigned programmatically (e.g., after completing a form to become a host), but the user's existing session JWT doesn't refresh. Their next request to the owner dashboard returns 403, confusing both the user and the developer debugging it.

**Why it happens:**
Supabase JWTs are issued with role claims at token creation time. Custom claims added via the Custom Access Token hook only take effect when a new token is issued (on next sign-in or explicit token refresh). Updating `user_metadata` or a roles table in PostgreSQL does not retroactively update the active JWT.

**How to avoid:**
After granting owner role, force a session refresh server-side or prompt the user to refresh by calling `supabase.auth.refreshSession()` client-side. Design the owner flow so role grant is followed immediately by a redirect that triggers the refresh. Store role in both the JWT (via custom access token hook) AND a `profiles` table — use the database record for immediate server-side RLS checks rather than relying solely on the JWT claim.

```typescript
// After granting owner role, force refresh
const { data, error } = await supabase.auth.refreshSession();
```

**Warning signs:**
- Owner dashboard shows 403 immediately after role assignment
- Auth hook exists but no token refresh is triggered after role changes
- Role stored only in JWT with no fallback database check

**Phase to address:** Auth setup phase — design the role refresh flow before building owner dashboard

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Skip database exclusion constraint, check availability in app code only | Faster to write | Double bookings under load; nightmare to fix with live data | Never — add constraint from day one |
| Use single Supabase client for server + client | Less code | Service role key leaks to browser; catastrophic security breach | Never |
| Store booking add-ons as JSON blob in `bookings.metadata` | Simple schema | Can't query by add-on, can't change add-on pricing without breaking history, no aggregation | MVP only if add-ons are informational only; must migrate before reporting is needed |
| Skip webhook idempotency, process all events naively | Faster to implement | Duplicate bookings or charges on Stripe retry | Never — implement from day one |
| Calculate Stripe fee client-side and pass as amount | No server round-trip | Client can manipulate amount — user pays $0 surcharge | Never — all amount calculations server-side only |
| Use Supabase Storage with Next.js `<Image>` without custom loader | Seems to work locally | Production builds fail with "url parameter is valid but upstream response is invalid" | Never — configure custom loader from day one |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| Stripe Checkout | Creating session from client-side code | Always create session in a Server Action or API route; never from browser |
| Stripe Checkout + bank transfer | Assuming bank transfer works without specifying customer | Must pass `customer` param in session — bank transfers require a Stripe customer object |
| Stripe webhooks | Returning 200 after heavy processing causes timeout | Return 200 immediately after signature verification; process event asynchronously |
| Stripe bank transfer | Assuming funds arrive immediately | ACH/bank transfer takes 4-7 business days; customer balance reconciliation required; 75-day auto-refund window applies |
| Stripe fee surcharge | Adding surcharge as `amount_subtotal` manipulation client-side | All surcharge math server-side: `chargeAmount = (base + 0.30) / (1 - 0.029)` for gross-up |
| Supabase Storage | Uploading via Next.js Server Action | Server Actions have 1MB body limit by default; use signed upload URLs for direct-to-storage uploads |
| Supabase Storage + `next/image` | Using `<Image src={supabaseUrl}>` directly | Fails in production; configure `remotePatterns` in `next.config.ts` AND use custom Supabase image loader |
| Supabase Storage transformations | Expecting free tier support | Image transformations (resizing, WebP conversion) require Pro plan ($25/month+); free tier serves originals only |
| Supabase RLS testing | Testing in SQL editor | SQL editor bypasses RLS; always test policies using the Supabase JS client with a real user session |
| Supabase auth dual-role | Storing authorization data in `raw_user_metadata` | `raw_user_metadata` is user-editable; use `raw_app_metadata` or a server-controlled `profiles` table |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Missing index on RLS policy columns (`user_id`, `property_id`) | API calls get progressively slower as data grows | Add `CREATE INDEX` on every column referenced in RLS `USING` clauses | ~1,000+ rows — 99% performance degradation documented |
| `auth.uid()` called per-row in RLS policy (not cached) | Slow queries even with indexes | Use `(SELECT auth.uid())` with parentheses to cache per-query | Any table with >100 rows |
| Supabase `storage.list()` with large bucket | Listing images for a property gets slow | Use Postgres function for filtered object queries; organize storage by `property_id/` prefix | ~500+ files in a single listing scope |
| Loading full-resolution villa photos on listing/browse page | Page load >5s for browse view with 10+ properties | Use Supabase image transformations (Pro) or resize on upload; never serve originals for thumbnails | Day 1 if original images are >2MB each |
| Unindexed date range overlap check | Availability check slow on calendar load | Index `check_in`, `check_out` columns on bookings table; use GiST index for range queries | ~100+ bookings per property |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| Stripe amount calculated/passed from client | User pays arbitrary amount (e.g., $0.01 for a $5,000 villa) | Calculate all amounts server-side; never trust `amount` from request body |
| Stripe webhook endpoint missing signature verification | Attacker sends fake "payment succeeded" events; free bookings | Always call `stripe.webhooks.constructEvent()` with raw body + secret |
| Supabase service role key used in client component | Complete database bypass; all data exposed | `SUPABASE_SERVICE_ROLE_KEY` never in `NEXT_PUBLIC_` env; never imported in client files |
| RLS policy missing on bookings table | Guests can read other guests' booking details, PII, and payment status | Every table with personal or financial data needs RLS + policies before first deployment |
| Owner can modify other owners' properties via API | Owner crafts request changing `property_id` to another owner's property | RLS policy on `UPDATE` must check `auth.uid() = owner_id`; never rely on frontend filtering |
| Supabase Storage bucket is public when it should be private | Anyone with URL can access private booking documents or unreleased property photos | Default new buckets to private; use signed URLs for owner-only assets |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Dates stored in UTC but displayed without timezone conversion | Guest books "March 15 check-in" but system records March 14 UTC; owner prepares wrong day | Store dates as `date` type (not `timestamp`) — villas are date-based, not time-based |
| Date picker allows checkout on same day as check-in | Guest selects 1-day "stay"; booking is nonsensical for a villa | Enforce minimum 2-night stay; disable same-day checkout in date picker logic |
| Check-in date shows as unavailable even though prior booking checks out that day | Calendar blocks the checkout date as "booked" | The last night of a booking is the night before checkout; use `[check_in, check_out)` half-open range so checkout day is bookable as next check-in |
| Add-on selection not shown in booking confirmation | Guest forgets what they ordered; owner doesn't know what to arrange | Include add-on line items in Stripe Checkout line_items AND in confirmation email |
| Stripe bank transfer selected but customer unaware of 4-7 day delay | Customer expects instant confirmation; calls support wondering if booking went through | Display clear messaging at checkout: "Bank transfer takes 3-5 business days to confirm. Your dates will be held for 7 days pending payment." |
| No abandoned checkout cleanup | Dates held indefinitely for sessions that expired; property appears unavailable | Listen to `checkout.session.expired` webhook; revert `pending` bookings to `available` |
| Per-person price calculator shows fractional cents | "$123.333/person" looks unprofessional | Always `Math.ceil()` or `Math.floor()` to nearest dollar for display; make rounding logic explicit |

---

## "Looks Done But Isn't" Checklist

- [ ] **Stripe webhooks:** Endpoint exists and returns 200 — verify it processes `checkout.session.completed` AND `checkout.session.expired` events; verify signature verification is active (not commented out during dev)
- [ ] **Booking availability:** Property shows "available" dates — verify database exclusion constraint exists; verify `pending` bookings also block availability (not just `confirmed`)
- [ ] **Owner dashboard:** Owner can see their properties — verify RLS policy prevents them from seeing other owners' properties; verify UPDATE policy is also restricted
- [ ] **Image upload:** Images upload successfully in dev — verify signed URL pattern is used (not Server Action body); verify `next.config.ts` has Supabase remotePatterns configured
- [ ] **Add-on pricing:** Add-ons display and get selected — verify add-on totals are included in Stripe line_items on the server; verify they appear in booking record in database
- [ ] **Bank transfer checkout:** Payment method appears in Stripe Checkout — verify `customer` object is passed in session; verify pending state messaging is shown to user
- [ ] **Fee surcharge:** Surcharge shows in checkout — verify it's calculated server-side; verify it's not applied when payment method is bank transfer (bank transfers don't have card processing fees)
- [ ] **Auth roles:** Owner can access owner dashboard — verify token refresh is called after role grant; verify RLS policies use database role check not just JWT claim

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| Double booking from missing exclusion constraint | HIGH | Add exclusion constraint (will fail if overlaps exist); manually resolve conflicts with affected guests; compensation/refunds |
| Service role key leaked in client bundle | HIGH | Immediately rotate Supabase service role key in dashboard; audit access logs; add server-only guards; redeploy |
| Surcharge applied to debit cards | MEDIUM | Disable surcharge immediately; refund surcharge amounts; implement proper card type detection or switch to processing fee model |
| Webhook not processing (raw body issue) | MEDIUM | All payments since deploy are "pending"; retroactively reconcile via Stripe dashboard event replay; fix handler; verify all events |
| RLS table with no policies (silent deny) | LOW | Create policies; no data loss; feature appears broken but recovers immediately after migration |
| JWT role claims stale | LOW | Force token refresh for affected users; add refresh call to role grant flow |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Double booking race condition | Database schema setup | Run concurrent booking test hitting same dates simultaneously; confirm constraint violation error |
| Service role key client exposure | Project foundation / auth setup | Grep for `SUPABASE_SERVICE_ROLE_KEY` in client component files; check browser network tab for key exposure |
| RLS enabled without policies | Database schema setup | Test every table via Supabase JS client with a real anon session; confirm expected data returned |
| JWT role claims staleness | Auth setup / owner role implementation | Test: grant owner role → make immediate dashboard request without refresh → confirm 403; implement refresh → confirm 200 |
| Stripe webhook raw body issue | Stripe Checkout integration | Trigger test webhook from Stripe CLI; confirm `checkout.session.completed` updates booking status |
| Debit card surcharge legality | Stripe Checkout integration | Review surcharge implementation; confirm it's applied as "processing fee" or credit-only |
| Abandoned session cleanup | Stripe Checkout integration | Let a test session expire; confirm `checkout.session.expired` reverts pending booking |
| Image upload 1MB limit | Owner property management (image upload) | Test uploading a 5MB JPEG via the property form; confirm signed URL pattern handles it |
| Next.js Image + Supabase Storage incompatibility | Owner property management (image display) | Production build test with `next build`; confirm images render in production Vercel deployment |
| Add-on pricing client manipulation | Booking flow / add-on selection | Send a crafted request with manipulated add-on prices; confirm server recalculates from database |
| Bank transfer without customer object | Stripe Checkout integration | Create checkout session with bank transfer selected; confirm payment method appears |

---

## Sources

- [Stripe Webhooks — Official Documentation](https://docs.stripe.com/webhooks) — raw body requirement, signature verification, idempotency (HIGH confidence)
- [Stripe Bank Transfers — Official Documentation](https://docs.stripe.com/payments/bank-transfers) — customer object requirement, over/under payment handling, 75-day window (HIGH confidence)
- [Stripe Credit Card Surcharges Guide](https://stripe.com/resources/more/credit-card-surcharges-explained-what-businesses-need-to-know) (HIGH confidence)
- [Credit Card Surcharge Laws by State 2025 — LawPay](https://www.lawpay.com/about/blog/credit-card-surcharge-rules/) — state prohibitions, Durbin Amendment (MEDIUM confidence)
- [Supabase Row Level Security — Official Docs](https://supabase.com/docs/guides/database/postgres/row-level-security) — performance, enable-without-policies trap, testing (HIGH confidence)
- [Supabase Custom Access Token Hook — Official Docs](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook) — JWT refresh timing, required claims (HIGH confidence)
- [Supabase Custom Claims & RBAC — Official Docs](https://supabase.com/docs/guides/database/postgres/custom-claims-and-role-based-access-control-rbac) — app_metadata vs user_metadata, role refresh (HIGH confidence)
- [Supabase Storage Image Transformations — Official Docs](https://supabase.com/docs/guides/storage/serving/image-transformations) — Pro plan requirement, $5/1000 images, format support (HIGH confidence)
- [Supabase Storage Scaling — Official Docs](https://supabase.com/docs/guides/storage/production/scaling) — listing performance, RLS indexing (HIGH confidence)
- [PostgreSQL Non-Overlapping Date Intervals](https://wiki.postgresql.org/wiki/How_to_avoid_overlapping_intervals_with_PostgreSQL) — exclusion constraint pattern (HIGH confidence)
- [Signed URL File Uploads with Next.js and Supabase — Medium](https://medium.com/@olliedoesdev/signed-url-file-uploads-with-nextjs-and-supabase-74ba91b65fe0) — 1MB server action limit workaround (MEDIUM confidence)
- [Supabase Storage + Next.js Image Optimization Issue #3821](https://github.com/supabase/supabase/issues/3821) — incompatibility, custom loader required (MEDIUM confidence)
- [Stripe Idempotent Requests — Official Docs](https://docs.stripe.com/api/idempotent_requests) — idempotency key patterns (HIGH confidence)
- [Stripe Abandoned Carts — Official Docs](https://docs.stripe.com/payments/checkout/abandoned-carts) — session expiry, checkout.session.expired event (HIGH confidence)
- [Supabase Hacker News discussion: Your Supabase is public if you turn off RLS](https://news.ycombinator.com/item?id=46355345) — 83% exposure stat from Lovable incident (MEDIUM confidence)

---

*Pitfalls research for: Villa booking platform (Whole-Tel)*
*Researched: 2026-03-02*
