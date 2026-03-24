# Phase 14: Partner Application Workflow - Context

**Gathered:** 2026-03-24
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace open owner self-signup with a curated partner application flow. Multi-step form with 5 sections, admin review via ENUM state machine, approved applications trigger owner account creation. No applicant-facing dashboard (they just get a confirmation page). No email notifications (NOTF-01 is future).

</domain>

<decisions>
## Implementation Decisions

### Replace Owner Signup Link (PART-01)
- Owner login page (`/owner/login`) currently has "New owner? Create owner account" linking to `/owner/signup`
- Replace with "Apply to be a featured partner on Whole-Tel™" linking to `/apply`
- The `/owner/signup` page will be removed — owner accounts are now created only via approved applications
- `/owner/login` remains for existing owners to sign in

### Multi-Step Application Form (PART-02)
- Route: `/apply` — public page, no auth required (applicants don't have accounts yet)
- 5 sections as specified, each a step in a multi-step form with progress indicator:
  1. **Property Basics & Classification** — property name, location (city/address), property type (villa/estate/boutique hotel), brief description
  2. **Capacity & Inventory** — total guest capacity, number of bedrooms, bed configuration breakdown, number of bathrooms
  3. **Common Areas & Amenities** — pool, hot tub, outdoor spaces, kitchen type, notable amenities (freetext list)
  4. **Group Hosting Experience** — prior group hosting experience (yes/no + details), max group size hosted, what makes property unique for groups
  5. **Logistics & Content** — check-in/check-out times, minimum stay, photo upload capability (signed URLs), contact info (name, email, phone)
- Client-side form state managed in React state (no server round-trips between steps)
- Final step submits all data in a single Server Action call
- Confirmation page shown after successful submission

### Application Storage (PART-03)
- New `partner_applications` table with:
  - `id uuid` PK, `created_at timestamptz`, `updated_at timestamptz`
  - `status application_status` ENUM (submitted, under_review, approved, rejected, onboarded)
  - `applicant_email text NOT NULL`, `applicant_name text NOT NULL`, `applicant_phone text`
  - JSONB columns for each form section (flexible schema, avoids wide table)
  - `admin_notes text` — internal notes from reviewer
  - `reviewed_by uuid` FK to profiles (admin who last updated status)
  - `reviewed_at timestamptz`
- RLS: public INSERT (no auth needed to apply), owner-role SELECT/UPDATE for admin review
- Status ENUM: `submitted → under_review → approved → rejected` plus `onboarded` (terminal after account created)

### Admin Review Interface (PART-04)
- New route: `/dashboard/applications` — accessible to owner-role users (reuse `requireOwner` DAL check)
- List view with status filter tabs and application cards
- Detail view: `/dashboard/applications/[id]` — shows all form data, status badge, admin notes field
- Single `updateApplicationStatus` Server Action (per STATE.md decision) — validates valid state transitions
- Valid transitions: submitted→under_review, under_review→approved, under_review→rejected, approved→onboarded

### Owner Account Creation on Approval (PART-05)
- When admin sets status to `approved`: show a "Create Owner Account" button on the application detail page
- Button calls a Server Action that:
  1. Creates Supabase auth user with applicant_email + generated temp password
  2. Creates profile with role='owner'
  3. Updates application status to `onboarded`
  4. Returns the temp password for admin to share with applicant
- No magic link / no automated email — admin manually communicates credentials (simple for v1.2, email notifications are NOTF-01 future)
- The applicant can then log in at `/owner/login` and set up their property

### Claude's Discretion
- Exact form field validation rules and Zod schemas
- Multi-step form progress indicator design (steps/dots/progress bar)
- Application list card layout and status badge styling
- Admin notes UX (inline textarea vs modal)
- Confirmation page design after submission
- Whether to use Supabase admin client for user creation or service_role key

</decisions>

<specifics>
## Specific Ideas

- Application form should feel professional and welcoming — this is partner onboarding, not a job application
- Multi-step form should save progress client-side so back navigation doesn't lose data
- Admin interface should be simple — table/list with status badges, not a full CRM
- Status transitions should be explicit buttons ("Move to Review", "Approve", "Reject") not a dropdown

</specifics>

<deferred>
## Deferred Ideas

- Email notifications on status change (Future: NOTF-01)
- Applicant-facing status tracking dashboard
- Bulk application review
- Application analytics/metrics

</deferred>

---

*Phase: 14-partner-application-workflow*
*Context gathered: 2026-03-24 from requirements + STATE.md decisions*
