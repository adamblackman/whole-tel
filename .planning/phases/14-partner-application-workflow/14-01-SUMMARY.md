---
phase: 14-partner-application-workflow
plan: 01
subsystem: database
tags: [supabase, postgres, zod, server-actions, rls]

# Dependency graph
requires:
  - phase: 13-guest-registration-payment-deadlines
    provides: migration naming convention and profiles table referenced by partner_applications.reviewed_by FK
provides:
  - partner_applications table with ENUM status state machine and JSONB section columns
  - ApplicationStatus type and PartnerApplication TypeScript interface
  - 6 Zod schemas covering all 5 application form sections plus combined ApplicationSchema
  - submitApplication, updateApplicationStatus, createOwnerFromApplication Server Actions
affects:
  - 14-02-multi-step-form (consumes Zod schemas for step validation)
  - 14-03-admin-review (consumes updateApplicationStatus and createOwnerFromApplication)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - ENUM state machine via PostgreSQL CREATE TYPE for application lifecycle
    - JSONB columns per form section (flexible schema, avoids wide table)
    - anon-accessible Server Action for public form submission (no auth required)
    - VALID_TRANSITIONS map to enforce state machine transitions in Server Action
    - createAdminClient for owner account creation (bypasses RLS, only in Server Action)

key-files:
  created:
    - supabase/migrations/20260324000002_partner_applications.sql
    - src/lib/validations/application.ts
    - src/lib/actions/applications.ts
  modified:
    - src/types/database.ts

key-decisions:
  - "No UNIQUE constraint on applicant_email — rejected applicants can reapply"
  - "Contact info (name/email/phone) extracted from logistics step into top-level applicant columns for easier admin list view"
  - "createOwnerFromApplication does NOT query profiles after creation — handle_new_user trigger is async, not immediately consistent"
  - "Zod v4 uses error option instead of required_error for z.enum params"

patterns-established:
  - "VALID_TRANSITIONS: Record<string, string[]> pattern for state machine enforcement in Server Actions"
  - "submitApplication uses anon createClient() (RLS INSERT policy allows anon), not admin client"

requirements-completed: [PART-03, PART-05]

# Metrics
duration: 2min
completed: 2026-03-24
---

# Phase 14 Plan 01: Partner Applications Data Layer Summary

**PostgreSQL ENUM state machine + JSONB section columns for partner applications, with 3 Server Actions enforcing curated partner onboarding lifecycle**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-24T04:53:07Z
- **Completed:** 2026-03-24T04:54:58Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Migration creates `application_status` ENUM and `partner_applications` table with 3 RLS policies (public INSERT, owner-role SELECT/UPDATE)
- 6 Zod schemas provide per-step and combined validation for the 5-section application form
- 3 Server Actions cover the full lifecycle: submit (anon), update status (owner + state machine), create owner account (admin API)

## Task Commits

Each task was committed atomically:

1. **Task 1: Database migration and TypeScript types** - `d7873d7` (feat)
2. **Task 2: Zod schemas and Server Actions** - `259d49b` (feat)

**Plan metadata:** committed with this summary

## Files Created/Modified
- `supabase/migrations/20260324000002_partner_applications.sql` - ENUM type, table DDL, 3 RLS policies
- `src/lib/validations/application.ts` - 5 step schemas + combined ApplicationSchema with inferred types
- `src/lib/actions/applications.ts` - submitApplication, updateApplicationStatus, createOwnerFromApplication
- `src/types/database.ts` - Added ApplicationStatus type union and PartnerApplication interface

## Decisions Made
- No UNIQUE constraint on applicant_email — rejected applicants can reapply without contacting support
- Contact info extracted from the logistics step into top-level columns for easier admin list display
- createOwnerFromApplication does NOT query profiles after creation — handle_new_user trigger is async

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed z.enum Zod v4 API incompatibility**
- **Found during:** Task 2 (TypeScript verification)
- **Issue:** `required_error` no longer valid in Zod v4 `z.enum` params — `error` is the correct key
- **Fix:** Replaced `required_error` with `error` in two `z.enum` calls (propertyType, kitchenType)
- **Files modified:** src/lib/validations/application.ts
- **Verification:** `npx tsc --noEmit` passes with no errors
- **Committed in:** `259d49b` (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Fix necessary for TypeScript compilation. No scope creep.

## Issues Encountered
- `npx supabase db reset` could not run — Docker Desktop not running in this environment. Migration syntax verified by review against existing migrations. No structural issues found.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Data layer complete: migration, types, validation schemas, and Server Actions all ready
- Plan 14-02 (multi-step form) can import Zod schemas directly from `@/lib/validations/application`
- Plan 14-03 (admin review) can import all 3 Server Actions from `@/lib/actions/applications`

---
*Phase: 14-partner-application-workflow*
*Completed: 2026-03-24*
