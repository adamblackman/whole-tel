---
phase: 01-foundation
plan: 03
subsystem: database
tags: [supabase, postgres, seed-data, properties, add-ons]

# Dependency graph
requires:
  - phase: 01-01
    provides: Supabase schema with profiles, properties, add_ons tables and RLS policies
provides:
  - Seed migration file with 3 placeholder party villa properties (Cabo, PV, Miami)
  - 12 add-on experiences (4 per property) with per_person and per_booking pricing
  - Placeholder system owner profile (UUID 00000000-0000-0000-0000-000000000001) in auth.users + profiles
affects:
  - 04-guest-browsing (property listing page uses these records)
  - 05-booking-flow (properties and add-ons drive the booking selection UI)
  - 03-owner-dashboard (placeholder owner will be replaced by real owner account)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Seed data uses fixed UUID constants for idempotent ON CONFLICT DO NOTHING inserts"
    - "Placeholder auth.users row inserted before profiles row to satisfy FK constraint"
    - "Migration applied manually via Supabase SQL Editor (IPv6-only project, no management API)"

key-files:
  created:
    - supabase/migrations/20260302000002_seed_data.sql
  modified: []

key-decisions:
  - "Inserted placeholder system owner into auth.users first to satisfy profiles.id FK (references auth.users)"
  - "Used ON CONFLICT DO NOTHING on all inserts for idempotent re-runs"
  - "Fixed UUID constants for all seed rows (properties and owner) to enable stable foreign key references in future migrations"
  - "Migration requires manual application via Supabase SQL Editor — MCP tools lack permission on project jxbafovfobsmqxjfjrqp"

patterns-established:
  - "Seed migrations: insert auth.users placeholder before profiles to satisfy FK chain"
  - "All seed rows use explicit UUIDs (not gen_random_uuid()) for referential stability"

requirements-completed:
  - DATA-03

# Metrics
duration: 6min
completed: 2026-03-03
---

# Phase 1 Plan 03: Seed Data Summary

**SQL migration seeding 3 party villas (Cabo/PV/Miami) with 12 add-on experiences and a placeholder owner profile, all using stable UUIDs for FK referential integrity**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-03T02:52:14Z
- **Completed:** 2026-03-03T02:58:40Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Wrote seed migration with 3 properties: Villa Paraiso (Cabo, $1,200/night), Casa del Sol (Puerto Vallarta, $800/night), The Palms Estate (Miami, $2,500/night)
- Wrote 12 add-ons (4 per property) with realistic per-location experiences and correct pricing_unit values
- Solved auth.users FK constraint: migration inserts placeholder user into auth.users before the profiles table row
- All inserts idempotent via ON CONFLICT DO NOTHING — safe to re-run after schema reset

## Task Commits

Each task was committed atomically:

1. **Task 1: Write and apply the seed data migration** - `9e17ae1` (chore)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `supabase/migrations/20260302000002_seed_data.sql` - INSERT statements for system owner, 3 properties, and 12 add-ons

## Decisions Made

- **auth.users insert required:** The profiles table has `id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE`. To insert the placeholder system owner profile, we must first insert a matching row into auth.users with the same fixed UUID. The placeholder user has an empty encrypted_password and cannot log in — it exists solely to satisfy the FK constraint until Phase 3 owner onboarding replaces it with a real auth account.
- **ON CONFLICT DO NOTHING on all tables:** Makes the migration idempotent so it can be re-run safely after a schema reset or if applied twice.
- **Fixed UUID constants:** All seed rows use explicit UUIDs rather than gen_random_uuid(). This is important because future migrations (e.g., Phase 2 initial booking test data) may reference these properties by ID without needing a subquery.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added auth.users insert before profiles insert**

- **Found during:** Task 1 (reviewing existing schema migration)
- **Issue:** The plan's SQL block inserted directly into profiles with a UUID that has no corresponding auth.users row. The schema defines `profiles.id REFERENCES auth.users ON DELETE CASCADE`, so the insert would fail with a FK violation.
- **Fix:** Added an INSERT INTO auth.users for the placeholder system owner (same UUID, empty password, no login capability) before the profiles INSERT.
- **Files modified:** supabase/migrations/20260302000002_seed_data.sql
- **Verification:** SQL structure is correct per schema — FK chain satisfied: auth.users -> profiles -> properties
- **Committed in:** 9e17ae1 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 2 - missing critical FK chain requirement)
**Impact on plan:** Auto-fix was essential for correctness. Without it the migration would fail immediately. No scope creep.

## Issues Encountered

- Supabase MCP tools lack permission on project jxbafovfobsmqxjfjrqp — migration was written to disk for manual application via Supabase SQL Editor (consistent with Plan 01-01 pattern).

## User Setup Required

The seed migration file must be applied manually:

1. Open the Supabase SQL Editor: https://app.supabase.com/project/jxbafovfobsmqxjfjrqp/sql/new
2. Copy and paste the contents of `supabase/migrations/20260302000002_seed_data.sql`
3. Click **Run**
4. Verify with:

```sql
SELECT p.name, p.location, COUNT(a.id) AS addon_count
FROM properties p
LEFT JOIN add_ons a ON a.property_id = p.id
GROUP BY p.id, p.name, p.location
ORDER BY p.nightly_rate;
```

Expected result:

| name              | location          | addon_count |
|-------------------|-------------------|-------------|
| Casa del Sol      | Puerto Vallarta   | 4           |
| Villa Paraiso     | Cabo San Lucas    | 4           |
| The Palms Estate  | Miami             | 4           |

## Next Phase Readiness

- Phase 1 is complete: schema migration (01-01) + Supabase client factories (01-02) + seed data (01-03) are all committed
- Phase 4 (guest browsing) can now display real properties — Casa del Sol, Villa Paraiso, The Palms Estate with their add-ons
- Phase 3 (owner auth) will replace the placeholder system owner with a real Supabase Auth account

## Self-Check: PASSED

- `supabase/migrations/20260302000002_seed_data.sql`: FOUND
- Task commit `9e17ae1`: FOUND
- Metadata commit `db261ec`: FOUND

---
*Phase: 01-foundation*
*Completed: 2026-03-03*
