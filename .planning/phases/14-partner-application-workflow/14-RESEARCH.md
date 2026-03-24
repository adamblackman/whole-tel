# Phase 14: Partner Application Workflow - Research

**Researched:** 2026-03-24
**Domain:** Multi-step form UX, PostgreSQL ENUM state machines, Supabase Admin Auth API, Next.js App Router patterns
**Confidence:** HIGH

## Summary

This phase replaces open owner self-signup with a curated partner application flow. All the building blocks exist in the codebase: Server Actions with Zod validation, `createAdminClient()` for privileged operations, `requireOwner()` / `requireSession()` DAL patterns, Supabase RLS migrations, and shadcn/ui components. Nothing in this phase requires a new library — it is pure composition of existing patterns.

The one architectural decision worth clarifying is how admin creates owner accounts (PART-05): the project already has `createAdminClient()` which exposes `supabase.auth.admin.createUser()` — this is the correct mechanism. The `createAdminClient()` is already documented as webhook/server-only and is already used for cross-user operations (booking invitations, expire-bookings cron). Using it for user creation in a Server Action is consistent with the existing pattern.

The multi-step form is entirely client-side state (React `useState`) with a single Server Action submission on the final step. No third-party multi-step form library is needed — the codebase avoids over-engineering and this is a well-understood React pattern.

**Primary recommendation:** Build the multi-step form as a single `'use client'` component using `useState` for step tracking, submit everything via one Server Action call on the final step, and use `createAdminClient().auth.admin.createUser()` for programmatic owner account creation.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Replace Owner Signup Link (PART-01)**
- Owner login page (`/owner/login`) currently has "New owner? Create owner account" linking to `/owner/signup`
- Replace with "Apply to be a featured partner on Whole-Tel™" linking to `/apply`
- The `/owner/signup` page will be removed — owner accounts are now created only via approved applications
- `/owner/login` remains for existing owners to sign in

**Multi-Step Application Form (PART-02)**
- Route: `/apply` — public page, no auth required (applicants don't have accounts yet)
- 5 sections as specified, each a step in a multi-step form with progress indicator:
  1. Property Basics & Classification — property name, location (city/address), property type (villa/estate/boutique hotel), brief description
  2. Capacity & Inventory — total guest capacity, number of bedrooms, bed configuration breakdown, number of bathrooms
  3. Common Areas & Amenities — pool, hot tub, outdoor spaces, kitchen type, notable amenities (freetext list)
  4. Group Hosting Experience — prior group hosting experience (yes/no + details), max group size hosted, what makes property unique for groups
  5. Logistics & Content — check-in/check-out times, minimum stay, photo upload capability (signed URLs), contact info (name, email, phone)
- Client-side form state managed in React state (no server round-trips between steps)
- Final step submits all data in a single Server Action call
- Confirmation page shown after successful submission

**Application Storage (PART-03)**
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

**Admin Review Interface (PART-04)**
- New route: `/dashboard/applications` — accessible to owner-role users (reuse `requireOwner` DAL check)
- List view with status filter tabs and application cards
- Detail view: `/dashboard/applications/[id]` — shows all form data, status badge, admin notes field
- Single `updateApplicationStatus` Server Action (per STATE.md decision) — validates valid state transitions
- Valid transitions: submitted→under_review, under_review→approved, under_review→rejected, approved→onboarded

**Owner Account Creation on Approval (PART-05)**
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

### Deferred Ideas (OUT OF SCOPE)
- Email notifications on status change (Future: NOTF-01)
- Applicant-facing status tracking dashboard
- Bulk application review
- Application analytics/metrics
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PART-01 | "Apply to be featured partner on Whole-Tel™" replaces "New Owner? Create owner account" link | Login page is a `'use client'` component at `/owner/login/page.tsx` — direct link replacement, remove `/owner/signup` route |
| PART-02 | Multi-step application form with 5 sections | Client-side `useState` step machine, single Server Action on final submit, existing Zod + Server Action patterns apply |
| PART-03 | Application stored in DB with ENUM status (submitted, under_review, approved, rejected, onboarded) | PostgreSQL ENUM type + JSONB per section columns + RLS migration following existing migration conventions |
| PART-04 | Admin can review and update application status | `requireOwner()` guards `/dashboard/applications` route, single `updateApplicationStatus` Server Action with transition validation |
| PART-05 | Approved application triggers owner account creation flow | `createAdminClient().auth.admin.createUser()` creates auth user + trigger creates profile; Server Action returns temp password |
</phase_requirements>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.1.6 | Page routing, Server Actions | Project standard — all routes use App Router |
| Supabase JS | ^2.98.0 | DB queries, auth, storage | Project standard |
| Zod | (via @hookform/resolvers) | Schema validation in Server Actions | All existing actions use Zod `safeParse` |
| shadcn/ui | (radix-ui ^1.4.3) | Card, Button, Input, Label, Textarea, Badge, Tabs | Project standard for all UI components |
| Tailwind v4 | Project standard | Styling | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^0.576.0 | Icons (CheckCircle, ChevronRight, etc.) | Step indicator, status badges |
| crypto (Node built-in) | — | `crypto.randomUUID()` for temp password generation | PART-05 owner account creation |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| useState step machine | react-hook-form multi-step | Project avoids over-engineering; 5-step static form doesn't need a form library |
| createAdminClient().auth.admin.createUser() | service_role key directly | Already has createAdminClient() wrapper — consistent, contained |

**Installation:**
```bash
# No new packages needed — all dependencies already installed
```

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── (auth)/
│   │   └── owner/
│   │       ├── login/page.tsx          # EDIT: replace signup link
│   │       └── signup/                 # DELETE: remove entire directory
│   ├── (public)/
│   │   └── apply/
│   │       └── page.tsx                # NEW: multi-step application form
│   └── (owner)/
│       └── dashboard/
│           ├── layout.tsx              # EDIT: add Applications nav link
│           └── applications/
│               ├── page.tsx            # NEW: admin list view
│               └── [id]/
│                   └── page.tsx        # NEW: admin detail view
├── components/
│   └── applications/
│       ├── ApplicationForm.tsx         # NEW: multi-step form ('use client')
│       ├── ApplicationStepIndicator.tsx # NEW: progress dots/steps
│       └── ApplicationStatusBadge.tsx  # NEW: colored status badge
└── lib/
    ├── actions/
    │   └── applications.ts             # NEW: submitApplication, updateApplicationStatus, createOwnerFromApplication
    └── validations/
        └── application.ts              # NEW: Zod schemas per step + full schema
```

**Route group note:** The `/apply` route should be placed under `(public)` route group (or directly in `app/`) — NOT under `(auth)` — since no authentication is required. The existing `(auth)` group wraps the owner login/signup layout. Create a new route group or place directly at `app/apply/page.tsx`.

### Pattern 1: Multi-Step Form with useState
**What:** Single `'use client'` component tracks current step index and accumulated form data in React state. Navigation between steps updates state without any server round-trips. Final step invokes a Server Action with the complete payload.
**When to use:** Fixed number of steps, all steps known at build time, no per-step server validation needed.

```typescript
// src/components/applications/ApplicationForm.tsx
'use client'

import { useState, useTransition } from 'react'
import { submitApplication } from '@/lib/actions/applications'

type StepData = {
  propertyBasics: PropertyBasicsData
  capacity: CapacityData
  commonAreas: CommonAreasData
  groupHosting: GroupHostingData
  logistics: LogisticsData
}

const TOTAL_STEPS = 5

export function ApplicationForm() {
  const [step, setStep] = useState(0) // 0-indexed
  const [data, setData] = useState<Partial<StepData>>({})
  const [submitted, setSubmitted] = useState(false)
  const [isPending, startTransition] = useTransition()

  function handleStepComplete(stepKey: keyof StepData, stepData: StepData[typeof stepKey]) {
    const updated = { ...data, [stepKey]: stepData }
    setData(updated)
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1)
    } else {
      // Final step — submit
      startTransition(async () => {
        const result = await submitApplication(updated as StepData)
        if (!result.error) setSubmitted(true)
      })
    }
  }

  if (submitted) return <ConfirmationView />

  return (
    <div>
      <ApplicationStepIndicator current={step} total={TOTAL_STEPS} />
      {step === 0 && <PropertyBasicsStep onComplete={(d) => handleStepComplete('propertyBasics', d)} />}
      {step === 1 && <CapacityStep onComplete={(d) => handleStepComplete('capacity', d)} />}
      {/* ... etc */}
    </div>
  )
}
```

### Pattern 2: Server Action for Application Submission (no auth required)
**What:** Server Action that does NOT call `requireOwner()` or `verifySession()`. Validates input with Zod, inserts to `partner_applications` with `status = 'submitted'`, returns success/error.
**When to use:** Public-facing forms where the submitter has no Supabase account.

```typescript
// src/lib/actions/applications.ts
'use server'

import { createClient } from '@/lib/supabase/server'
import { ApplicationSchema } from '@/lib/validations/application'

export async function submitApplication(
  data: unknown
): Promise<{ error?: string }> {
  const parsed = ApplicationSchema.safeParse(data)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid form data' }
  }

  // Use anon client — RLS allows public INSERT on partner_applications
  const supabase = await createClient()
  const { error } = await supabase.from('partner_applications').insert({
    applicant_name: parsed.data.logistics.contactName,
    applicant_email: parsed.data.logistics.contactEmail,
    applicant_phone: parsed.data.logistics.contactPhone,
    status: 'submitted',
    property_basics: parsed.data.propertyBasics,
    capacity: parsed.data.capacity,
    common_areas: parsed.data.commonAreas,
    group_hosting: parsed.data.groupHosting,
    logistics: parsed.data.logistics,
  })

  if (error) return { error: error.message }
  return {}
}
```

### Pattern 3: ENUM State Machine in Server Action
**What:** Server Action validates the requested status transition against a hardcoded allowlist before calling `.update()`. Returns an error for invalid transitions.
**When to use:** Anywhere a status column must follow a directed graph of allowed transitions.

```typescript
// src/lib/actions/applications.ts
const VALID_TRANSITIONS: Record<string, string[]> = {
  submitted: ['under_review'],
  under_review: ['approved', 'rejected'],
  approved: ['onboarded'],
  rejected: [],
  onboarded: [],
}

export async function updateApplicationStatus(
  applicationId: string,
  newStatus: string,
  adminNotes?: string
): Promise<{ error?: string }> {
  const user = await requireOwner()
  const supabase = await createClient()

  const { data: current } = await supabase
    .from('partner_applications')
    .select('status')
    .eq('id', applicationId)
    .single()

  if (!current) return { error: 'Application not found' }

  const allowed = VALID_TRANSITIONS[current.status] ?? []
  if (!allowed.includes(newStatus)) {
    return { error: `Cannot transition from ${current.status} to ${newStatus}` }
  }

  const { error } = await supabase
    .from('partner_applications')
    .update({
      status: newStatus,
      admin_notes: adminNotes,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)

  if (error) return { error: error.message }

  revalidatePath('/dashboard/applications')
  return {}
}
```

### Pattern 4: Admin User Creation (PART-05)
**What:** Server Action uses `createAdminClient()` (existing admin.ts factory) to call `auth.admin.createUser()`. This bypasses email confirmation. The existing `handle_new_user` trigger on `auth.users` auto-creates the `profiles` row with `role` from `raw_user_meta_data`.
**When to use:** Any programmatic user creation that bypasses normal signup flow.

```typescript
// src/lib/actions/applications.ts
export async function createOwnerFromApplication(
  applicationId: string
): Promise<{ tempPassword?: string; error?: string }> {
  const user = await requireOwner()
  const supabase = await createClient()

  // Fetch the approved application
  const { data: application } = await supabase
    .from('partner_applications')
    .select('applicant_email, applicant_name, status')
    .eq('id', applicationId)
    .single()

  if (!application) return { error: 'Application not found' }
  if (application.status !== 'approved') return { error: 'Application must be approved first' }

  // Generate a temporary password (admin communicates to applicant manually)
  const tempPassword = crypto.randomUUID().replace(/-/g, '').slice(0, 16) + 'A1!'

  const admin = createAdminClient()

  // createUser with email_confirm: true bypasses email confirmation
  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email: application.applicant_email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: {
      role: 'owner',
      display_name: application.applicant_name,
    },
  })

  if (authError) return { error: authError.message }

  // handle_new_user trigger auto-creates profiles row
  // But update status to onboarded regardless
  await supabase
    .from('partner_applications')
    .update({
      status: 'onboarded',
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', applicationId)

  revalidatePath('/dashboard/applications')
  return { tempPassword }
}
```

**Critical note on `handle_new_user` trigger:** The existing trigger at line 37-52 of the initial migration reads `raw_user_meta_data->>'role'` to set the profile role. Passing `user_metadata: { role: 'owner' }` in `createUser()` will correctly set `role = 'owner'` in the auto-created profile. No manual profile insert needed.

### Anti-Patterns to Avoid
- **Calling requireOwner() in submitApplication**: The `/apply` route is public — no auth. The anon Supabase client + RLS public INSERT policy is the correct pattern.
- **Server round-trips between form steps**: Each step validates client-side only. Only one server call (final submission). Round-trips would require auth or token management for the in-progress applicant.
- **Using the server-client for admin user creation**: `createClient()` uses the anon key and cannot call `auth.admin.*`. Must use `createAdminClient()` which uses `SUPABASE_SERVICE_ROLE_KEY`. Follow the existing admin.ts comment: "ONLY used in webhook route handlers" — extend this to: also used in privileged Server Actions that require cross-user operations.
- **Generating temp passwords with `Math.random()`**: Use `crypto.randomUUID()` (Node built-in, already used in photos.ts) for cryptographically secure randomness.
- **Storing temp password**: Return it immediately from the Server Action and display once. Never persist the plaintext temp password.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Status badge colors | Custom className logic | shadcn/ui `Badge` variant + Tailwind color classes | Already used throughout the dashboard |
| Status filter tabs | Custom tab component | shadcn/ui `Tabs` / `TabsList` / `TabsTrigger` | Already installed |
| Form field validation | Custom regex/validation | Zod schemas (same pattern as PropertySchema) | Consistent error shapes, works with Server Actions |
| Signed upload URL for application photos | Custom storage endpoint | `supabase.storage.createSignedUploadUrl()` (same as `getSignedUploadUrl` in photos.ts) | Already implemented pattern |
| Admin auth for user creation | service_role key directly in action | `createAdminClient()` from `@/lib/supabase/admin` | Existing wrapper with correct scoping |

**Key insight:** This entire phase composes existing patterns. No new abstractions needed.

---

## Common Pitfalls

### Pitfall 1: Route Group Placement for `/apply`
**What goes wrong:** Placing `/apply` inside `(auth)` route group inherits the auth layout (centered card, HOST badge). The application form needs its own layout — full-width, welcoming design.
**Why it happens:** Developers follow the nearest existing route group without checking layout inheritance.
**How to avoid:** Place at `src/app/apply/page.tsx` (no route group) or create `(public)/apply/` with its own layout. Confirm which layout is desired before creating the route.
**Warning signs:** The "HOST" amber badge appears on the application form.

### Pitfall 2: ENUM Type Requires Migration
**What goes wrong:** Creating the `application_status` ENUM type and the `partner_applications` table must be done in the correct order in a single migration. Splitting into two migrations risks the type not existing when the table is created.
**Why it happens:** Developers create the table DDL without first issuing `CREATE TYPE application_status AS ENUM (...)`.
**How to avoid:** Single migration file. Create ENUM first, then table, then RLS policies.
```sql
CREATE TYPE application_status AS ENUM ('submitted', 'under_review', 'approved', 'rejected', 'onboarded');

CREATE TABLE partner_applications (
  ...
  status application_status NOT NULL DEFAULT 'submitted',
  ...
);
```

### Pitfall 3: RLS for Public INSERT Without SELECT
**What goes wrong:** Granting public SELECT on `partner_applications` would expose all applicant data to unauthenticated users. Public INSERT is needed but SELECT/UPDATE must be owner-role only.
**Why it happens:** Copying existing "publicly readable" policies without thinking about the table's sensitivity.
**How to avoid:** Three separate policies:
- `anon, authenticated` INSERT — no `USING` clause, only `WITH CHECK (true)`
- `authenticated` SELECT/UPDATE — `USING` with a check that the user's profile role = 'owner'
**Warning signs:** Anonymous GET requests to `/api/partner_applications` return rows.

### Pitfall 4: handle_new_user Trigger Race
**What goes wrong:** After `admin.auth.admin.createUser()` returns, the `handle_new_user` trigger runs asynchronously on the DB side. If code immediately queries `profiles` for the new user, the row might not exist yet.
**Why it happens:** Trigger execution is async relative to the `createUser()` API response.
**How to avoid:** The `createOwnerFromApplication` action only needs to update `partner_applications.status` to `onboarded` — it does NOT need to query the newly created profile. The owner logs in later and the profile will exist by then. No immediate profile query needed.
**Warning signs:** `profiles` query returning null for newly created user.

### Pitfall 5: Deleted /owner/signup Must Be Removed from Middleware
**What goes wrong:** If middleware has any route matchers or redirects referencing `/owner/signup`, removing the route without updating middleware causes 404 or redirect loops.
**Why it happens:** Middleware patterns often include specific route paths.
**How to avoid:** Search for `/owner/signup` references in middleware before deleting the directory.
**Warning signs:** Navigation to `/owner/signup` returns an unexpected redirect instead of 404.

### Pitfall 6: Application Photos in Step 5 — Signed URLs Without Property ID
**What goes wrong:** Existing `getSignedUploadUrl` requires a `propertyId` and verifies ownership. At application time, no property exists yet. Using the same action would fail.
**Why it happens:** Reusing the photos action without checking its preconditions.
**How to avoid:** For Step 5 photo upload, use a separate storage bucket path (`applications/{session_id}/{uuid}`) with a different Server Action that does NOT require property ownership — just stores the upload path in the application JSONB. OR defer photo upload: Step 5 can accept a "describe your photos" text field + note that photo upload happens after onboarding. The CONTEXT.md says "photo upload capability (signed URLs)" is in the spec but leaves implementation to Claude's discretion.
**Recommended approach:** Implement a `getApplicationUploadUrl()` Server Action that does NOT require auth (uses anon client RLS) and stores to `application-media` bucket under a UUID path. Or simplify: ask for "photo drive link or attach later" to keep Step 5 simple. The CONTEXT.md discretion allows this.

---

## Code Examples

Verified patterns from existing codebase:

### Creating Admin Client (HIGH confidence — from src/lib/supabase/admin.ts)
```typescript
// src/lib/supabase/admin.ts — existing file
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!  // Never prefix with NEXT_PUBLIC_
  )
}
```

### Supabase Admin User Creation (HIGH confidence — Supabase JS v2 official API)
```typescript
const admin = createAdminClient()
const { data, error } = await admin.auth.admin.createUser({
  email: 'owner@example.com',
  password: tempPassword,
  email_confirm: true,           // Bypass email confirmation
  user_metadata: { role: 'owner', display_name: 'Name' },
})
// handle_new_user trigger fires after INSERT on auth.users
// profiles row auto-created with role='owner' from user_metadata
```

### JSONB Column Pattern (HIGH confidence — matches existing codebase style)
```sql
-- Migration: JSONB per-section columns
ALTER TABLE partner_applications
  ADD COLUMN property_basics jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN capacity        jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN common_areas    jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN group_hosting   jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN logistics       jsonb NOT NULL DEFAULT '{}';
```

### RLS for Owner-Only Access (HIGH confidence — from schema_rls.sql pattern)
```sql
-- Read/write for owner-role users only
CREATE POLICY "Owners can view all applications"
  ON partner_applications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'owner'
    )
  );

CREATE POLICY "Owners can update applications"
  ON partner_applications FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
        AND profiles.role = 'owner'
    )
  );

-- Public insert — no auth required
CREATE POLICY "Anyone can submit an application"
  ON partner_applications FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);
```

### Zod Schema for Multi-Step Form (MEDIUM confidence — following existing PropertySchema style)
```typescript
// src/lib/validations/application.ts
import { z } from 'zod'

export const PropertyBasicsSchema = z.object({
  propertyName: z.string().min(2, 'Property name required'),
  location: z.string().min(2, 'Location required'),
  address: z.string().optional(),
  propertyType: z.enum(['villa', 'estate', 'boutique_hotel']),
  description: z.string().min(20, 'Please provide at least 20 characters'),
})

export const CapacitySchema = z.object({
  maxGuests: z.coerce.number().int().min(2).max(500),
  bedrooms: z.coerce.number().int().min(1),
  bathrooms: z.coerce.number().int().min(1),
  bedConfig: z.object({
    king: z.coerce.number().int().min(0).default(0),
    queen: z.coerce.number().int().min(0).default(0),
    double: z.coerce.number().int().min(0).default(0),
    twin: z.coerce.number().int().min(0).default(0),
    bunk: z.coerce.number().int().min(0).default(0),
  }),
})

// ... etc for each step

export const ApplicationSchema = z.object({
  propertyBasics: PropertyBasicsSchema,
  capacity: CapacitySchema,
  commonAreas: CommonAreasSchema,
  groupHosting: GroupHostingSchema,
  logistics: LogisticsSchema,
})
```

### Step Navigation with Back Button
```typescript
// Back nav must restore previous step's data — data is stored in parent state
// Use onBack prop pattern: each step renders Back button that calls parent's setStep(step - 1)
function PropertyBasicsStep({
  initialData,
  onComplete,
  onBack,
  isFirst,
}: {
  initialData?: PropertyBasicsData
  onComplete: (data: PropertyBasicsData) => void
  onBack?: () => void
  isFirst: boolean
}) {
  // Local state pre-populated from parent (so back nav restores values)
  const [formData, setFormData] = useState(initialData ?? defaultBasics)
  // ...
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Open owner signup | Partner application flow | Phase 14 | Curated quality control |
| `getSession()` in Server Components | `getUser()` via `verifySession()` | Project standard | Security: validates JWT server-side |
| Email confirmation on signup | `email_confirm: true` in admin.createUser | N/A | Bypass for admin-created accounts |

**Deprecated/outdated:**
- `/owner/signup` route: removed in this phase — replaced by `/apply`
- `signUpOwner` action: can be removed or left dormant (no UI path to it after PART-01)

---

## Open Questions

1. **Photo upload in Step 5 (Logistics)**
   - What we know: CONTEXT.md specifies "photo upload capability (signed URLs)" in Step 5 but marks implementation as Claude's discretion
   - What's unclear: Signed upload URLs require a storage path. For pre-auth applicants there is no user ID to scope the path. Using `anon` uploads to a public bucket has security implications.
   - Recommendation: Simplify Step 5 to accept a "Google Drive link or Dropbox URL" text field for photos. Actual photo upload can happen post-onboarding when the owner has an account. This avoids a non-trivial auth gap and is consistent with the "simple for v1.2" principle stated in PART-05. Flag this as a decision to confirm before planning.

2. **Separate "admin" role vs owner-role for application review**
   - What we know: CONTEXT.md says "accessible to owner-role users (reuse requireOwner DAL check)" and profiles.role only has 'guest' | 'owner'
   - What's unclear: In production, only specific owners (Whole-Tel staff) should review applications — not all owners. Currently all owners have the same role.
   - Recommendation: Proceed with `requireOwner()` as specified. This is a v1.2 scope decision. In practice, only Whole-Tel staff have owner accounts. A fine-grained `admin` role is future scope.

3. **Duplicate email guard for application submission**
   - What we know: An applicant could submit multiple applications with the same email
   - What's unclear: Should duplicate submissions be rejected or allowed?
   - Recommendation: Add a `UNIQUE` constraint on `applicant_email` or allow duplicates with a note. Recommend allowing duplicates (no UNIQUE constraint) so a rejected applicant can reapply later with updated information. The admin can manually handle duplicates.

---

## Validation Architecture

> `workflow.nyquist_validation` is not set in config.json — treating as enabled.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | vitest ^4.0.18 (installed, not configured) |
| Config file | None — Wave 0 gap |
| Quick run command | `pnpm vitest run` |
| Full suite command | `pnpm vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PART-01 | Login page shows apply link, not signup link | manual-only | N/A — UI text change | ❌ |
| PART-02 | Application form submits all 5 sections | manual-only | N/A — multi-step UI flow | ❌ |
| PART-03 | submitApplication inserts row with correct status | unit | `pnpm vitest run src/lib/actions/applications.test.ts` | ❌ Wave 0 |
| PART-03 | ENUM transitions validated (state machine) | unit | `pnpm vitest run src/lib/actions/applications.test.ts` | ❌ Wave 0 |
| PART-04 | updateApplicationStatus rejects invalid transitions | unit | `pnpm vitest run src/lib/actions/applications.test.ts` | ❌ Wave 0 |
| PART-05 | createOwnerFromApplication only works on approved status | unit | `pnpm vitest run src/lib/actions/applications.test.ts` | ❌ Wave 0 |

**Note:** PART-01 and PART-02 are UI/UX requirements — verified manually by walking through the UI. Core logic (PART-03, PART-04, PART-05) can be unit-tested if vitest is configured.

### Sampling Rate
- **Per task commit:** Manual smoke test — submit a test application, verify it appears in dashboard
- **Per wave merge:** Manual end-to-end — submit → admin review → approve → create owner account → login as new owner
- **Phase gate:** All 5 success criteria from phase description must be TRUE before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `src/lib/actions/applications.test.ts` — covers PART-03, PART-04, PART-05 state machine logic
- [ ] `vitest.config.ts` — framework not configured (no test script in package.json)

---

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `src/lib/supabase/admin.ts` — confirms `createAdminClient()` pattern and service_role key usage
- Codebase analysis: `src/lib/actions/auth.ts` — confirms `signUpOwner` pattern + `handle_new_user` trigger behavior
- Codebase analysis: `src/lib/actions/booking-invitations.ts` — confirms `admin.auth` pattern and cross-user operations
- Codebase analysis: `supabase/migrations/20260302000001_schema_rls.sql` — confirms `handle_new_user` trigger reads `raw_user_meta_data->>'role'`
- Codebase analysis: `src/lib/dal.ts` — confirms `requireOwner()` signature and redirect behavior
- Codebase analysis: `supabase/migrations/20260324000001_guest_registration_deadlines.sql` — migration file naming and SQL conventions
- Supabase JS v2 official docs — `auth.admin.createUser()` with `email_confirm: true` and `user_metadata`

### Secondary (MEDIUM confidence)
- Supabase PostgreSQL ENUM best practice: create ENUM before table in single migration to avoid ordering issues

### Tertiary (LOW confidence)
- None

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project, no new deps needed
- Architecture: HIGH — all patterns are direct extensions of existing codebase patterns
- Pitfalls: HIGH — all pitfalls identified from codebase inspection, not speculation
- Admin user creation API: HIGH — verified against Supabase JS v2 `auth.admin.createUser` signature

**Research date:** 2026-03-24
**Valid until:** 2026-04-24 (stable APIs, no fast-moving dependencies)
