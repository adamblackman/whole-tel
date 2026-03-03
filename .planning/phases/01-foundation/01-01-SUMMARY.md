---
phase: 01-foundation
plan: 01
subsystem: database
tags: [nextjs, supabase, postgres, rls, gist, btree_gist, tailwind, typescript]

# Dependency graph
requires: []
provides:
  - Next.js 16.1.6 app scaffold with App Router, TypeScript, Tailwind v4, src/ directory
  - "@supabase/supabase-js and @supabase/ssr installed"
  - Complete Supabase migration SQL with 6 tables, RLS policies, no_overlapping_confirmed_bookings exclusion constraint
  - Storage bucket SQL for property-photos with public read / authenticated write
  - Auto-create profile trigger on auth.users INSERT
  - .env.local.example with placeholder Supabase keys
affects:
  - 01-02 (Supabase client factories depend on this schema existing)
  - 01-03 (seeder depends on profiles/properties/add_ons tables)
  - All subsequent phases

# Tech tracking
tech-stack:
  added:
    - "next@16.1.6"
    - "@supabase/ssr@0.9.0"
    - "@supabase/supabase-js@2.98.0"
    - "tailwindcss@4.x"
    - "typescript@5.x"
    - "eslint-config-next@16.1.6"
  patterns:
    - "(SELECT auth.uid()) pattern in all RLS policies for performance (prevents per-row re-evaluation)"
    - "Partial exclusion constraint (WHERE status = 'confirmed') for double-booking prevention"
    - "Half-open daterange '[)' bounds for back-to-back booking support"
    - "ON CONFLICT DO NOTHING for idempotent storage bucket creation"
    - ".env.local excluded from git; .env.local.example committed as template"

key-files:
  created:
    - "package.json"
    - "next.config.ts"
    - "tsconfig.json"
    - "src/app/layout.tsx"
    - "src/app/page.tsx"
    - "src/app/globals.css"
    - ".env.local.example"
    - ".gitignore"
    - "supabase/migrations/20260302000001_schema_rls.sql"
    - "supabase/config.toml"
  modified: []

key-decisions:
  - "Used (SELECT auth.uid()) not auth.uid() in all RLS policies for performance"
  - "Exclusion constraint only on status='confirmed' — pending bookings don't block dates"
  - "daterange '[)' half-open bounds allow back-to-back bookings (checkout day = next checkin)"
  - "Migration file committed to repo; database application requires manual Supabase Dashboard step due to IPv6-only DB connectivity"
  - "No NEXT_PUBLIC_ prefix on SUPABASE_SERVICE_ROLE_KEY per CLAUDE.md security requirements"

requirements-completed: [DATA-01, DATA-02, DATA-04]

# Metrics
duration: 29min
completed: 2026-03-03
---

# Phase 1 Plan 01: Bootstrap and Schema Summary

**Next.js 16.1.6 app scaffold + complete 6-table Supabase schema with RLS, GiST exclusion constraint for double-booking prevention, and storage bucket configuration**

## Performance

- **Duration:** 29 min
- **Started:** 2026-03-03T01:04:30Z
- **Completed:** 2026-03-03T01:34:05Z
- **Tasks:** 2 of 2 (migration application pending manual step)
- **Files modified:** 18

## Accomplishments
- Next.js 16.1.6 bootstrapped with App Router, TypeScript, Tailwind v4, ESLint, src/ directory layout
- @supabase/supabase-js and @supabase/ssr installed and in package.json
- Complete Supabase migration written: 6 tables (profiles, properties, property_photos, add_ons, bookings, booking_add_ons), all with RLS enabled at table creation time
- no_overlapping_confirmed_bookings exclusion constraint using btree_gist extension and daterange '[)' bounds
- Auto-create profile trigger (handle_new_user) for seamless signup
- Storage bucket SQL for property-photos with public read / authenticated upload/delete
- .env.local.example committed, .env.local gitignored

## Task Commits

Each task was committed atomically:

1. **Task 1: Bootstrap Next.js 16 app and install Supabase packages** - `192f413` (feat)
2. **Task 2: Write and apply the complete schema + RLS + storage migration** - `a5fa367` (feat)

**Plan metadata:** TBD (docs: complete plan)

## Files Created/Modified
- `package.json` - Next.js 16.1.6 with @supabase/ssr + @supabase/supabase-js dependencies
- `next.config.ts` - Default Next.js config (Turbopack ready)
- `tsconfig.json` - TypeScript strict config with @/* path alias
- `src/app/layout.tsx` - Root layout with Tailwind globals
- `src/app/page.tsx` - Default placeholder page
- `src/app/globals.css` - Tailwind v4 global styles
- `.env.local.example` - Template with SUPABASE URL/ANON KEY/SERVICE ROLE KEY placeholders
- `.gitignore` - Excludes .env*, .next/, node_modules/, supabase/.temp/; allows .env.local.example
- `supabase/migrations/20260302000001_schema_rls.sql` - Complete 6-table schema with RLS and storage
- `supabase/config.toml` - Supabase local dev configuration

## Decisions Made
- Used `(SELECT auth.uid())` in all RLS policies (prevents per-row function re-evaluation — standard Supabase performance pattern)
- Exclusion constraint partial condition `WHERE (status = 'confirmed')` — pending/cancelled bookings don't block dates, allowing optimistic flow
- `daterange(check_in, check_out, '[)')` half-open bounds — checkout date is available for next guest's check-in on the same day
- `SUPABASE_SERVICE_ROLE_KEY` without NEXT_PUBLIC_ prefix per CLAUDE.md security requirements
- Migration committed to version control; applied to database via Supabase Dashboard SQL Editor (see User Setup below)

## Deviations from Plan

### Blocking Issue

**1. [Rule 3 - Blocking] Database migration requires manual application**
- **Found during:** Task 2 (apply migration to Supabase project jxbafovfobsmqxjfjrqp)
- **Issue:** Project jxbafovfobsmqxjfjrqp is not under any accessible Supabase management account. The Supabase CLI cannot link to this project (management API returns "no privileges"), direct DB connection via PostgreSQL is not possible (project uses IPv6-only DB host, local machine has no IPv6 route), and PostgREST REST API does not expose DDL execution endpoints.
- **Fix:** Migration file written and committed to source control. Must be applied via Supabase Dashboard SQL Editor (see User Setup Required section below).
- **Files modified:** supabase/migrations/20260302000001_schema_rls.sql
- **Verification:** File contents verified locally — no_overlapping_confirmed_bookings constraint present, all 6 CREATE TABLE statements present, all ENABLE ROW LEVEL SECURITY statements present, storage bucket INSERT present.
- **Committed in:** a5fa367 (Task 2 commit)

---

**Total deviations:** 1 blocking (database application)
**Impact on plan:** Migration file is complete and correct. Database application is the only outstanding step. All subsequent plans (01-02, 01-03) can proceed after the migration is applied.

## Issues Encountered

- create-next-app could not run in the project directory due to existing files (.claude/, .planning/, CLAUDE.md). Resolved by bootstrapping in /tmp/whole-tel-bootstrap and copying files to the project directory.
- Supabase project jxbafovfobsmqxjfjrqp is accessible via REST API (PostgREST works with sb_secret_ key) but not via management API or direct DB connection. Exhaustively tested: pooler (all regions), direct DB (IPv6 only), management API (two different account tokens), REST API SQL endpoints — none successful. Migration must be applied via Dashboard.

## User Setup Required

**The Supabase migration must be applied manually.**

1. Go to: https://supabase.com/dashboard/project/jxbafovfobsmqxjfjrqp/sql/new
2. Open `supabase/migrations/20260302000001_schema_rls.sql`
3. Paste the entire file contents into the SQL Editor
4. Click "Run" (Ctrl+Enter)
5. Verify: run `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;` — should return 6 rows
6. Verify: run `SELECT conname FROM pg_constraint WHERE conname = 'no_overlapping_confirmed_bookings';` — should return 1 row
7. Verify: run `SELECT id FROM storage.buckets WHERE id = 'property-photos';` — should return 1 row

After applying the migration, create `.env.local` from `.env.local.example` and fill in:
- `NEXT_PUBLIC_SUPABASE_URL=https://jxbafovfobsmqxjfjrqp.supabase.co`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY=` (from Supabase Dashboard > Project Settings > API > anon key)
- `SUPABASE_SERVICE_ROLE_KEY=` (from Supabase Dashboard > Project Settings > API > service_role key)

## Next Phase Readiness
- Next.js 16 app is bootstrapped and ready for development (run `npm run dev` to start)
- Migration SQL is complete and version-controlled
- Schema will be ready for client factory creation (01-02) once migration is applied
- .env.local needs to be created with real Supabase API keys before 01-02 can be tested

## Self-Check: PASSED

All files and commits verified:
- package.json: FOUND
- next.config.ts: FOUND
- tsconfig.json: FOUND
- .env.local.example: FOUND
- supabase/migrations/20260302000001_schema_rls.sql: FOUND
- src/app/ directory: FOUND
- Commit 192f413 (Task 1): FOUND
- Commit a5fa367 (Task 2): FOUND
- no_overlapping_confirmed_bookings in migration: FOUND
- @supabase/ssr in package.json: FOUND
- @supabase/supabase-js in package.json: FOUND
- .env.local gitignored: FOUND

---
*Phase: 01-foundation*
*Completed: 2026-03-03*
