---
phase: 16
slug: itinerary-builder
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-03-24
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 + TypeScript strict mode + Next.js build |
| **Config file** | vitest.config.ts (created in Plan 01 Task 0) |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run && npx next build` |
| **Estimated runtime** | ~10 seconds (vitest), ~30 seconds (tsc), ~90 seconds (build) |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit && npx vitest run`
- **After every plan wave:** Run `npx next build`
- **Before `/gsd:verify-work`:** Full build must be green + manual browser check + all vitest tests green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 16-01-00 | 01 | 0 | N/A | Vitest scaffold | `npx vitest run` | Created in task | pending |
| 16-01-01 | 01 | 1 | ITIN-01, ITIN-06 | Unit (Zod validation) | `npx vitest run src/lib/validations/activity.test.ts` | Created in 01-00, assertions in 01-01 | pending |
| 16-01-02 | 01 | 1 | ITIN-01 | TypeScript build | `npx tsc --noEmit` | N/A | pending |
| 16-01-03 | 01 | 1 | ITIN-01 | TypeScript build | `npx tsc --noEmit` | N/A | pending |
| 16-02-01 | 02 | 2 | ITIN-07 | Unit (validation helpers) | `npx vitest run src/lib/actions/itinerary.test.ts` | Created in 01-00, assertions in 02-01 | pending |
| 16-02-02 | 02 | 2 | ITIN-02, ITIN-03, ITIN-04, ITIN-05, ITIN-06 | TypeScript build + manual | `npx tsc --noEmit && npx vitest run` | N/A | pending |
| 16-02-03 | 02 | 2 | ITIN-02 | TypeScript build + Next.js build | `npx tsc --noEmit && npx next build` | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

Wave 0 is handled by Plan 01 Task 0:
- [x] `vitest.config.ts` — Vitest configuration with path aliases
- [x] `src/lib/validations/activity.test.ts` — stub file, real assertions added in Plan 01 Task 1
- [x] `src/lib/actions/itinerary.test.ts` — stub file, real assertions added in Plan 02 Task 1

---

## Unit Test Coverage

| Test File | Covers | Key Assertions |
|-----------|--------|----------------|
| `src/lib/validations/activity.test.ts` | ITIN-01, ITIN-06 | TimeSlotSchema rejects end < start; ActivitySchema rejects empty name, duration < 15, empty slots |
| `src/lib/actions/itinerary.test.ts` | ITIN-07 | isEventDateInRange rejects outside booking dates (checkout exclusive); isDeadlinePassed enforces activity deadline |

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Owner can configure activities with time slot windows | ITIN-01 | UI interaction flow | Open property dashboard, add activity with multiple time slots, save, reload, verify persistence |
| Guest calendar scoped to booking dates | ITIN-02 | Visual + interaction | View itinerary for a booking, verify calendar only shows booked date range |
| Guest adds property activity to time slot | ITIN-03 | UI interaction flow | Click time slot, select activity, verify it appears on calendar |
| Guest adds custom event | ITIN-04 | UI interaction flow | Click time slot, create custom event with title and time, verify display |
| Calendar displays full itinerary | ITIN-05 | Visual check | Add multiple events, verify all visible in calendar view |
| Time slots respect availability windows | ITIN-06 | Logic + visual | Try to add activity outside configured window, verify it's not selectable |
| Auto-save and persistence | ITIN-07 | Interaction flow | Add events, navigate away, return, verify all events persisted |

---

## Validation Sign-Off

- [x] All tasks have automated verify or manual verification steps
- [x] Sampling continuity: TypeScript check + vitest after every task
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
