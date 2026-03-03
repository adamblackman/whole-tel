# Phase 2: Auth - Research

**Researched:** 2026-03-03
**Domain:** Supabase Auth with Next.js App Router — role-based signup, session management, route protection
**Confidence:** HIGH

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | Guest can sign up with email and password | Supabase `auth.signUp()` with `options.data.role = 'guest'`; handle_new_user trigger auto-creates profile |
| AUTH-02 | Guest can log in and stay logged in across browser sessions | `auth.signInWithPassword()`; @supabase/ssr writes HttpOnly session cookie persisted across browser sessions |
| AUTH-03 | Guest can log out from any page | `auth.signOut()` server action callable from any layout; cookie cleared, redirect to / |
| AUTH-04 | Owner can sign up with separate owner role | Dedicated `/owner/signup` page passes `options.data.role = 'owner'`; trigger reads raw_user_meta_data->>'role' |
| AUTH-05 | Owner can log in and access owner dashboard | `auth.signInWithPassword()` on dedicated `/owner/login`; DAL `requireOwner()` guards `/dashboard` routes |
| AUTH-06 | Guest and owner auth flows are visually distinct (separate login paths) | Separate route group pages: `(auth)/login` for guests, `(auth)/owner/login` for owners; no shared form |
</phase_requirements>

---

## Summary

Phase 1 established all the prerequisites Phase 2 needs: `src/lib/supabase/server.ts` and `browser.ts` are both in place, `src/lib/dal.ts` has `verifySession()` and `requireOwner()` implemented, and the database `handle_new_user()` trigger already reads `raw_user_meta_data->>'role'` to set the profile role. This means Phase 2 is almost entirely wiring: build the UI pages (sign up / log in / log out for guests and owners), write the Server Actions that call Supabase auth methods, add `proxy.ts` for optimistic session refresh, and protect the `/dashboard` route group in its layout.

The critical open question from STATE.md is whether owners self-register or are admin-invited. The research recommendation is **self-registration with a secret URL** for v1 — it unblocks Phase 2 immediately without admin tooling, and the security gap (anyone who knows the URL can become an "owner") is acceptable for the single-operator model of Whole-Tel, where the real owner is Adam. This can be hardened in v2.

The only sharp edge is the `proxy.ts` session refresh pattern. The Supabase @supabase/ssr package requires a proxy/middleware file that creates a server-side Supabase client with both `request.cookies` reads AND `response.cookies` writes so the JWT refresh token round-trip propagates to both Server Components and the browser. The existing `server.ts` does this correctly for Server Components but the proxy version must handle both sides.

**Primary recommendation:** Build two distinct auth route groups (`(guest-auth)` and `(owner-auth)`) with separate pages, shared Server Actions under `src/lib/actions/auth.ts`, and a single `proxy.ts` that handles session refresh for all routes.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | 2.98.0 (installed) | Auth methods: signUp, signInWithPassword, signOut, getUser | Already installed in Phase 1 |
| @supabase/ssr | 0.9.0 (installed) | Cookie-based SSR auth; createServerClient/createBrowserClient | Already installed; required for Next.js App Router session persistence |
| next (App Router) | 16.1.6 (installed) | Server Actions for form handling; Route Groups for layout separation | Already installed |
| shadcn/ui | CLI 3.0+ | Form components: Input, Button, Label, Card | Project uses shadcn; not yet installed — Phase 2 adds these components |
| react-hook-form | ^7 | Form state management for auth forms | Standard per STACK.md; not yet installed — Phase 2 adds |
| zod | ^3 | Schema validation for signup/login form data | Standard per STACK.md; not yet installed — Phase 2 adds |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod-form-data | latest | Validates FormData from Server Actions using Zod schemas | Use in Server Actions that receive FormData |
| tw-animate-css | latest | CSS transitions for auth form states (loading, error) | Subtle UX polish on form submission states |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase Auth | NextAuth.js | NextAuth requires a custom adapter for Supabase. Supabase Auth is already provisioned and integrates natively with RLS — no reason to add NextAuth complexity. |
| Server Actions | API Routes for auth | Server Actions are simpler (no endpoint URL, no fetch call on client), work fine for auth mutations. Only use Route Handlers when a static URL is required (e.g., Stripe webhook). |
| react-hook-form | Uncontrolled HTML form + FormData | FormData works fine for simple auth forms, but react-hook-form gives field-level error display without extra state management code. |

**Installation (packages not yet in package.json):**
```bash
npm install react-hook-form zod zod-form-data tw-animate-css
npx shadcn@latest add button card input label form
```

---

## Architecture Patterns

### Recommended Auth File Structure

```
src/
├── app/
│   ├── (auth)/                       # Route group — no layout prefix on URLs
│   │   ├── login/
│   │   │   └── page.tsx              # Guest login page (Client Component with form)
│   │   ├── signup/
│   │   │   └── page.tsx              # Guest signup page
│   │   ├── owner/
│   │   │   ├── login/
│   │   │   │   └── page.tsx          # Owner login page (visually distinct)
│   │   │   └── signup/
│   │   │       └── page.tsx          # Owner signup page (secret URL)
│   │   └── layout.tsx                # Auth layout (centered card, no nav)
│   │
│   └── (owner)/
│       └── dashboard/
│           ├── layout.tsx            # Owner layout — calls requireOwner() here
│           └── page.tsx              # Dashboard placeholder (Phase 3 builds content)
│
├── lib/
│   ├── actions/
│   │   └── auth.ts                   # Server Actions: signUp, signIn, signOut
│   ├── supabase/
│   │   ├── server.ts                 # ALREADY EXISTS from Phase 1
│   │   └── browser.ts                # ALREADY EXISTS from Phase 1
│   └── dal.ts                        # ALREADY EXISTS from Phase 1
│
└── proxy.ts                           # Session refresh (root of src/ OR project root)
```

**Note on proxy.ts location:** In Next.js 16 App Router with `src/` directory, `proxy.ts` goes in `src/` (same level as `app/`), not the project root.

---

### Pattern 1: proxy.ts for Session Refresh

**What:** A `proxy.ts` file at `src/proxy.ts` (or project root) that runs on every non-static request. It creates a Supabase server client with both request AND response cookie write access, calls `supabase.auth.getUser()` to trigger token refresh, and passes the updated session to both Server Components (via request cookies) and the browser (via response cookies).

**When to use:** Always — without this, Supabase JWT tokens expire and users get silently logged out. The session cookie is only refreshed when a new client is created with response cookie write access.

**Why getUser() not getClaims() in proxy:** The proxy exists specifically to refresh expired tokens. `getClaims()` only validates the existing JWT but doesn't refresh it. `getUser()` triggers the full refresh flow. For the DAL (protecting server components), `getUser()` is also correct (as Phase 1 already implemented) because it validates against the Supabase auth server, not just locally.

**Note on getClaims():** `getClaims()` is a newer API that validates JWT signature locally via WebCrypto (faster, no network). It's appropriate for high-frequency reads but doesn't refresh tokens. The project's existing DAL uses `getUser()` — keep that as-is per Phase 1 decisions.

```typescript
// src/proxy.ts
// Source: https://supabase.com/docs/guides/auth/server-side/nextjs
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          // Write to request (for Server Components to read)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // Rebuild response with updated request headers
          response = NextResponse.next({
            request,
          })
          // Write to response (for browser to store)
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Trigger token refresh — do NOT use getSession() here
  await supabase.auth.getUser()

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

---

### Pattern 2: Server Actions for Auth Mutations

**What:** Auth mutations (signUp, signIn, signOut) run as Server Actions. They use `createClient()` from `server.ts` (NOT browser.ts), call the Supabase auth methods, and redirect on success.

**When to use:** All form submissions for signup, login, and logout.

**Critical:** Server Actions that call `supabase.auth.signIn/signUp/signOut` must use the server-side client (from `server.ts`) because cookie write access is required to persist the session. Using `browser.ts` in a Server Action would fail at runtime — `createBrowserClient` uses localStorage which doesn't exist on the server.

```typescript
// src/lib/actions/auth.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

export async function signUpGuest(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const displayName = formData.get('display_name') as string

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: 'guest',          // read by handle_new_user trigger
        display_name: displayName,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }
  // Guest signup: redirect to listings or home
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signUpOwner(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: 'owner',          // read by handle_new_user trigger → profile.role = 'owner'
      },
    },
  })

  if (error) {
    return { error: error.message }
  }
  // Owner signup: redirect to owner login (confirm email first, then login)
  redirect('/owner/login?message=Check your email to confirm your account')
}

export async function signIn(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const returnTo = formData.get('return_to') as string | null

  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return { error: error.message }
  }
  revalidatePath('/', 'layout')
  redirect(returnTo || '/')
}

export async function signInAsOwner(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    return { error: error.message }
  }

  // Verify they actually have owner role in the profiles table
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', data.user.id)
    .single()

  if (profile?.role !== 'owner') {
    await supabase.auth.signOut()
    return { error: 'This account does not have owner access.' }
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/')
}
```

---

### Pattern 3: Owner Route Protection via Layout

**What:** The `(owner)/dashboard/layout.tsx` calls `requireOwner()` from the DAL. This is the **application-level** auth boundary. The proxy is UX-only (fast redirect); the DAL is the true security enforcer.

**When to use:** Every layout in the `(owner)` route group calls `requireOwner()`. Individual page files don't need to re-call it — the layout guard cascades.

```typescript
// src/app/(owner)/dashboard/layout.tsx
import { requireOwner } from '@/lib/dal'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // requireOwner() redirects to /login if not authenticated,
  // redirects to / if authenticated but not an owner
  await requireOwner()

  return (
    <div className="min-h-screen bg-background">
      {/* Owner nav will be added in Phase 3 */}
      {children}
    </div>
  )
}
```

---

### Pattern 4: Owner Registration — Self-Register with Secret URL

**Decision required:** STATE.md flags this as a blocker. Research recommendation:

**Use secret URL path for owner signup.** Specifically:
- Owner signup is at `/owner/signup/[secret-token]` where the token is set in `.env.local` as `OWNER_SIGNUP_SECRET`
- The page checks the URL token against the env var — if mismatch, renders a 404-equivalent
- No admin tooling required for v1
- Adam controls who becomes an owner by controlling the URL
- This is architecturally simpler than invite flow (no email sending needed), and more secure than a public `/owner/signup` page

**Alternative if owner model is truly single-owner (just Adam):** Skip owner signup entirely. Create Adam's owner account via Supabase Dashboard (set role manually in the profiles table), and display a "Contact us to become a host" message on any owner signup page. This is even simpler and eliminates security concerns entirely.

**Research conclusion:** Recommend secret-URL self-registration. Lock this decision before planning begins.

---

### Anti-Patterns to Avoid

- **Using `getSession()` in DAL or proxy:** The existing DAL already uses `getUser()` — maintain this. `getSession()` does not validate the JWT against the auth server and can return stale/invalid sessions.
- **Storing role only in JWT claims:** Phase 1's `requireOwner()` correctly checks the `profiles` table, not JWT claims. This is the right pattern — JWT claims can be stale if the session isn't refreshed.
- **Using `createBrowserClient` in a Server Action:** Will cause a runtime error on the server (localStorage doesn't exist). Server Actions must use `createClient()` from `server.ts`.
- **Checking role in proxy.ts:** proxy.ts should only handle session refresh, not role-based redirects. Role-based protection belongs in the DAL (`requireOwner()` in the layout).
- **Sharing a single form page for guest and owner login with a role dropdown:** AUTH-06 explicitly requires visually distinct pages. No shared form.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session persistence across browser restarts | Custom cookie management | @supabase/ssr `createServerClient` + `proxy.ts` | Handles HttpOnly cookie, PKCE, token refresh, SameSite — all edge cases pre-solved |
| JWT signature validation | Custom JWT parsing | `supabase.auth.getUser()` (existing DAL pattern) | Validates against Supabase's published JWKS endpoint; handles asymmetric keys correctly |
| CSRF protection on Server Actions | Custom token generation | Next.js Server Actions have built-in CSRF protection (same-origin header check) | Don't add manual CSRF tokens to auth forms |
| Password hashing | bcrypt integration | Supabase Auth handles all password hashing (bcrypt by default) | Never store or hash passwords yourself |
| Email confirmation flow | Custom email system | Supabase Auth's built-in email confirmation | Supabase sends confirmation email automatically on `signUp()`; just redirect with a "check your email" message |

**Key insight:** Supabase Auth is a complete hosted auth system. The only code needed is: (1) calling the right methods with the right parameters, (2) handling the session cookie via proxy.ts, and (3) redirecting users to the right places based on role.

---

## Common Pitfalls

### Pitfall 1: proxy.ts Cookie Write Pattern Wrong

**What goes wrong:** Developer creates the Supabase client in proxy.ts using only `request.cookies` (matching the server.ts pattern). This reads the existing session but never writes updated tokens back to the browser. Result: session tokens expire and users get logged out silently, or worse, the refresh loop causes an infinite redirect.

**Why it happens:** The server.ts client correctly handles cookie write failures (the try/catch comment in the existing code), but proxy.ts MUST write to both request AND response. The patterns are different.

**How to avoid:** Proxy's `setAll` must write to `request.cookies` first (so Server Components see the refreshed token in the same request), then rebuild the response with updated request headers, then write the same cookies to `response.cookies` (so the browser stores the refreshed token). See Pattern 1 code above.

**Warning signs:** Users get logged out after ~1 hour (JWT access token default expiry), or browser shows different auth state than server components.

---

### Pitfall 2: Owner Role Check Using JWT Claims Instead of Database

**What goes wrong:** `requireOwner()` checks `user.user_metadata?.role` (from the JWT) instead of querying the `profiles` table. If the owner signs up and the JWT hasn't been refreshed since a role change, the check fails or allows stale role data.

**Why it happens:** JWT claims are faster (no database round-trip) but can be stale. The existing Phase 1 `requireOwner()` already does the right thing (queries `profiles` table) — don't change it.

**How to avoid:** Keep the existing `requireOwner()` implementation that queries `profiles.role`. The database is the source of truth.

**Warning signs:** Owner can't access dashboard immediately after first signup even though profile was created correctly.

---

### Pitfall 3: signUp Succeeds But Profile Not Created (Trigger Not Applied)

**What goes wrong:** A user signs up successfully (auth.users row created), but querying `profiles` returns no record. All subsequent auth guards that check `profiles.role` fail, leaving the user in a broken state.

**Why it happens:** The `handle_new_user` trigger from migration `20260302000001_schema_rls.sql` hasn't been applied to the Supabase project yet (the manual application step from Phase 1 is still pending). If migrations haven't been applied, the trigger doesn't exist.

**How to avoid:** Before testing Phase 2 auth flows, verify the migration has been applied:
```sql
-- Run in Supabase Dashboard SQL Editor
SELECT routine_name FROM information_schema.routines
WHERE routine_name = 'handle_new_user';
-- Should return 1 row
```

**Warning signs:** Signup appears to succeed but user can never access any protected content; querying `profiles` WHERE `id = user.id` returns empty.

---

### Pitfall 4: Guest Accessing Owner Dashboard via Direct URL

**What goes wrong:** A guest navigates directly to `/dashboard` — if the proxy only does a soft session check (no role check) and the layout doesn't enforce the owner check, the guest sees the owner dashboard.

**Why it happens:** Three-layer defense requires all three layers. Proxy = session check only, DAL in layout = role check. If the layout `requireOwner()` call is missing, the route is unprotected at the application layer.

**How to avoid:** The `(owner)/dashboard/layout.tsx` MUST call `await requireOwner()` before rendering children. This is the critical layer — the proxy is for UX speed only, not security.

**Warning signs:** Navigating to `/dashboard` as a guest shows content instead of redirecting.

---

### Pitfall 5: Email Confirmation Required Before Login (Default Supabase Setting)

**What goes wrong:** Developer builds the signup flow and tests end-to-end, but login always fails with "Email not confirmed" error after a successful signup. User can never log in.

**Why it happens:** Supabase projects have email confirmation enabled by default. The test environment may not have a real SMTP server configured, so confirmation emails don't arrive.

**How to avoid:** During development, disable email confirmation in Supabase Dashboard: Authentication → Settings → "Enable email confirmations" → toggle off. In production, enable it with a real SMTP provider (Resend, SendGrid). The signup Server Action should gracefully handle the confirmation-pending state: redirect with a message like "Check your email to confirm your account before logging in."

**Warning signs:** `signUp()` returns no error, but `signInWithPassword()` immediately after returns "Email not confirmed."

---

### Pitfall 6: signOut Not Calling revalidatePath

**What goes wrong:** User clicks "Sign Out," is redirected to `/`, but server components on that page still show the "logged in" state (cached user data from before logout).

**Why it happens:** Next.js caches server component renders. After signOut, the cache still has the pre-signout page state.

**How to avoid:** Always call `revalidatePath('/', 'layout')` before the `redirect()` in the signOut Server Action. This purges the full page tree cache.

---

## Code Examples

Verified patterns from Phase 1 and official sources:

### Existing DAL (from Phase 1 — do not change)

```typescript
// src/lib/dal.ts — already exists, verifies pattern is correct
import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const verifySession = cache(async () => {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) redirect('/login')
  return user
})

export const requireOwner = cache(async () => {
  const user = await verifySession()
  const supabase = await createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  if (profile?.role !== 'owner') redirect('/')
  return user
})
```

### Guest Login Page (Client Component)

```typescript
// src/app/(auth)/login/page.tsx
'use client'
import { useTransition } from 'react'
import { signIn } from '@/lib/actions/auth'
// shadcn/ui components installed in Phase 2
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function LoginPage() {
  const [isPending, startTransition] = useTransition()

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await signIn(formData)
      if (result?.error) {
        // Show error — use local state or URL search params
      }
    })
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Welcome back</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit}>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required />
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>
        <p className="mt-4 text-sm">
          Are you an owner? <a href="/owner/login">Owner login →</a>
        </p>
      </CardContent>
    </Card>
  )
}
```

### Logout Button (Client Component, usable from any page)

```typescript
// src/components/LogoutButton.tsx
'use client'
import { useTransition } from 'react'
import { signOut } from '@/lib/actions/auth'
import { Button } from '@/components/ui/button'

export function LogoutButton() {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="ghost"
      onClick={() => startTransition(async () => { await signOut() })}
      disabled={isPending}
    >
      {isPending ? 'Signing out...' : 'Sign out'}
    </Button>
  )
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `middleware.ts` with `export function middleware()` | `proxy.ts` with `export function proxy()` | Next.js 16.0 (Oct 2025) | File rename only; same logic, same matcher pattern |
| `@supabase/auth-helpers-nextjs` | `@supabase/ssr` | Mid-2024 | auth-helpers deprecated; @supabase/ssr is the current package (already installed) |
| `getSession()` for server-side auth | `getUser()` (or `getClaims()` for read-only) | Supabase SSR docs update 2024-2025 | getSession() removed from server recommendations — already handled correctly in Phase 1 |
| Custom JWT role claims via `raw_user_meta_data` | Database `profiles.role` column as source of truth | Project design decision | Roles live in profiles table; JWT claims are supplemental, not authoritative |

**Deprecated/outdated:**
- `@supabase/auth-helpers-nextjs`: Deprecated. Replaced by `@supabase/ssr` (already installed).
- `middleware.ts`: Deprecated in Next.js 16. Use `proxy.ts` with `export function proxy()`.
- `supabase.auth.getSession()` on server: Removed from official recommendations. Use `getUser()`.

---

## Open Questions

1. **Owner registration model: self-register vs admin-invite vs admin-creates-only**
   - What we know: The `handle_new_user` trigger supports any role passed in `options.data`; there is no admin invite infrastructure yet
   - What's unclear: Adam needs to decide before Phase 2 planning starts — it affects whether an owner signup page exists at all
   - Recommendation: Self-register with a secret URL (`/owner/signup/[OWNER_SIGNUP_SECRET]` where the env var controls access). Simplest for v1; Adam controls who knows the URL. If it's just Adam, skip the page entirely and create the account via Supabase Dashboard.

2. **Email confirmation in development vs production**
   - What we know: Supabase enables email confirmation by default; no SMTP is configured in the project
   - What's unclear: Should Phase 2 build with email confirmation disabled (dev) or add Resend/SendGrid now?
   - Recommendation: Build with email confirmation disabled for Phase 2 (toggle in Supabase Dashboard). Leave email setup for a separate task or Phase 7 polish. The signup actions should return a "check your email" message but flow should work without it in dev.

3. **Guest signup: immediate access or require email verification?**
   - What we know: Supabase can be configured to auto-confirm emails (development mode)
   - What's unclear: Product decision — does a guest need to verify email before accessing the site?
   - Recommendation: For Phase 2 simplicity, build the signup flow that works with email confirmation disabled. The architecture supports adding email confirmation later without code changes.

---

## Sources

### Primary (HIGH confidence)
- Phase 1 existing code (`src/lib/supabase/server.ts`, `src/lib/supabase/browser.ts`, `src/lib/dal.ts`) — direct inspection of implemented patterns
- `supabase/migrations/20260302000001_schema_rls.sql` — direct inspection of handle_new_user trigger using `raw_user_meta_data->>'role'`
- [Next.js proxy.ts API Reference](https://nextjs.org/docs/app/api-reference/file-conventions/proxy) (version 16.1.6, last updated 2026-02-27) — complete proxy.ts file convention, function signature, matcher config
- [Supabase SSR Next.js Guide](https://supabase.com/docs/guides/auth/server-side/nextjs) — updateSession proxy pattern, getUser() vs getSession() recommendation, getClaims() notes

### Secondary (MEDIUM confidence)
- [Supabase getUser() vs getClaims() discussion](https://github.com/supabase/supabase/issues/40985) — confirms getClaims() is faster but doesn't refresh tokens; getUser() is correct for proxy
- [Next.js 16 proxy.ts Migration Guide](https://www.rabinarayanpatra.com/blogs/hello-proxy-ts-nextjs-16) — middleware → proxy rename confirmed
- [Supabase User Management docs](https://supabase.com/docs/guides/auth/managing-user-data) — `raw_user_meta_data` confirmed as signUp options.data target; `raw_app_meta_data` is admin-only

### Tertiary (LOW confidence — flag for validation)
- Pattern for `signUpOwner` role check via `profiles` table after login: inferred from existing `requireOwner()` implementation + general Supabase RBAC guidance. Should be validated during implementation.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all core libraries installed from Phase 1; verified in package.json
- Architecture: HIGH — Phase 1 patterns directly inspected; proxy.ts pattern from official Next.js docs (2026-02-27)
- Auth Server Actions: HIGH — signUp/signIn/signOut patterns from official Supabase @supabase/ssr docs; confirmed by existing server.ts implementation
- Pitfalls: HIGH — all pitfalls verified against official sources or directly observed in Phase 1 code
- Owner registration model: LOW — decision not yet locked; recommendation is research-driven but requires user confirmation

**Research date:** 2026-03-03
**Valid until:** 2026-04-03 (stable libraries; proxy.ts and @supabase/ssr are stable)
