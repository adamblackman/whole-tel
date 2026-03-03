---
phase: 02-auth
plan: 01
subsystem: auth
tags: [supabase, react-hook-form, zod, shadcn-ui, server-actions, next-js, tailwind]

# Dependency graph
requires:
  - phase: 01-foundation
    provides: Supabase client factories (createClient for server), DAL with verifySession/requireOwner, TypeScript types
provides:
  - Supabase session-refresh proxy (src/proxy.ts) — dual-write cookie pattern for Next.js 16
  - All 5 auth Server Actions: signUpGuest, signUpOwner, signIn, signInAsOwner, signOut
  - shadcn/ui form components: Button, Card, Input, Label, Form
  - react-hook-form, zod, zod-form-data installed and available
affects: [02-02, 02-03, 02-04, all auth UI plans]

# Tech tracking
tech-stack:
  added:
    - react-hook-form ^7.71.2
    - zod ^4.3.6
    - zod-form-data ^3.0.1
    - tw-animate-css ^1.4.0
    - shadcn/ui (button, card, input, label, form components)
    - @hookform/resolvers, class-variance-authority, clsx, tailwind-merge, lucide-react, radix-ui (shadcn deps)
  patterns:
    - Server Actions with 'use server' directive import only from @/lib/supabase/server
    - Proxy pattern for session refresh (not middleware) — Next.js 16 replacement
    - Dual-write cookie pattern: request.cookies first, then response.cookies (ensures Server Components + browser both see refreshed token)
    - Owner role verification inline in signInAsOwner (sign in → check profiles.role → sign out if not owner)
    - revalidatePath('/', 'layout') before redirect on all auth mutations to clear server-component cache

key-files:
  created:
    - src/proxy.ts
    - src/lib/actions/auth.ts
    - src/components/ui/button.tsx
    - src/components/ui/card.tsx
    - src/components/ui/input.tsx
    - src/components/ui/label.tsx
    - src/components/ui/form.tsx
    - src/lib/utils.ts
    - components.json
  modified:
    - package.json
    - package-lock.json
    - src/app/globals.css

key-decisions:
  - "tw-animate-css placed in runtime dependencies (not devDependencies) — shadcn init placed it in dev, moved to match plan spec"
  - "No route protection in proxy.ts — session refresh only; authorization handled by DAL verifySession()/requireOwner() in layout.tsx"
  - "signInAsOwner queries profiles table post-login to verify role — owner check cannot be done server-side before login completes"
  - "signUpOwner is open registration (no secret URL) — v1 decision documented in plan"
  - "revalidatePath must precede redirect in signOut — redirect clears rendering context, making subsequent revalidatePath unreachable"

patterns-established:
  - "Proxy pattern: src/proxy.ts (not middleware.ts) with named export 'proxy' — Next.js 16 requirement"
  - "Server Actions: 'use server' at top, import createClient from @/lib/supabase/server, return { error: string } | void pattern"
  - "Dual-write cookies: request.cookies.set() -> NextResponse.next({ request }) -> response.cookies.set() for session refresh"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05]

# Metrics
duration: 2min
completed: 2026-03-03
---

# Phase 2 Plan 01: Auth Foundation Summary

**Supabase session-refresh proxy with dual-write cookie pattern, 5 auth Server Actions (guest/owner signup, sign-in with owner role check, sign-out), and shadcn/ui form components installed**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-03-03T18:50:28Z
- **Completed:** 2026-03-03T18:52:30Z
- **Tasks:** 3
- **Files modified:** 12

## Accomplishments
- Installed react-hook-form, zod, zod-form-data, tw-animate-css and initialized shadcn/ui with Tailwind v4 detection
- Created src/proxy.ts with dual-write cookie pattern for Supabase session refresh (getUser not getSession)
- Implemented all 5 auth Server Actions with correct error-return/redirect pattern and owner role verification

## Task Commits

Each task was committed atomically:

1. **Task 1: Install Phase 2 dependencies and shadcn/ui form components** - `7aa0d78` (feat)
2. **Task 2: Create src/proxy.ts for session refresh** - `3f05353` (feat)
3. **Task 3: Create Server Actions for all auth mutations** - `79b34e9` (feat)

## Files Created/Modified
- `src/proxy.ts` — Next.js 16 session-refresh proxy with dual-write cookie pattern
- `src/lib/actions/auth.ts` — All 5 auth Server Actions with 'use server' directive
- `src/components/ui/button.tsx` — shadcn/ui Button component
- `src/components/ui/card.tsx` — shadcn/ui Card component
- `src/components/ui/input.tsx` — shadcn/ui Input component
- `src/components/ui/label.tsx` — shadcn/ui Label component
- `src/components/ui/form.tsx` — shadcn/ui Form component (react-hook-form integration)
- `src/lib/utils.ts` — cn() helper via clsx + tailwind-merge
- `components.json` — shadcn/ui configuration
- `package.json` — Added 4 new runtime deps + shadcn transitive deps
- `src/app/globals.css` — Updated with shadcn CSS variables

## Decisions Made
- Moved tw-animate-css from devDependencies to dependencies: shadcn init placed it in devDependencies but the plan spec requires it in runtime dependencies since it's imported in application CSS.
- Proxy vs middleware naming: Next.js 16 requires the exported function be named `proxy`, not `middleware` — this is a breaking rename from Next.js 15.
- Owner role verification post-login in signInAsOwner: the only way to check the profiles table is after authentication succeeds (no pre-auth role check possible via Supabase anon client).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Moved tw-animate-css from devDependencies to dependencies**
- **Found during:** Task 1 (dependency verification)
- **Issue:** `shadcn init` placed tw-animate-css in devDependencies; plan verification check requires it in dependencies
- **Fix:** Edited package.json to move tw-animate-css to dependencies section, ran npm install to sync package-lock.json
- **Files modified:** package.json, package-lock.json
- **Verification:** Node verification script confirms all 4 deps in dependencies
- **Committed in:** 7aa0d78 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 — package placement correction)
**Impact on plan:** Minimal fix to package.json structure. No scope creep, no behavior change.

## Issues Encountered
- `npx tsc --noEmit` fails with `MODULE_NOT_FOUND` for tsc.js due to a broken symlink in node_modules/.bin/tsc. Resolved by using `node node_modules/typescript/bin/tsc --noEmit` directly — TypeScript itself works correctly.

## User Setup Required
None — no external service configuration required for this plan. All Phase 2 Supabase setup (migrations) was handled in Phase 1.

## Next Phase Readiness
- All auth Server Actions available for Client Component forms in plans 02-02, 02-03, 02-04
- shadcn/ui form components (Button, Card, Input, Label, Form) ready for auth UI implementation
- proxy.ts session refresh active for all non-static routes
- TypeScript compiles clean (0 errors) across entire codebase

---
*Phase: 02-auth*
*Completed: 2026-03-03*

## Self-Check: PASSED

- FOUND: src/proxy.ts
- FOUND: src/lib/actions/auth.ts
- FOUND: src/components/ui/button.tsx
- FOUND: src/components/ui/form.tsx
- FOUND: .planning/phases/02-auth/02-01-SUMMARY.md
- FOUND commit: 7aa0d78 (Task 1)
- FOUND commit: 3f05353 (Task 2)
- FOUND commit: 79b34e9 (Task 3)
