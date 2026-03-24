---
phase: 16
slug: itinerary-builder
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None (TypeScript strict mode + Next.js build) |
| **Config file** | tsconfig.json |
| **Quick run command** | `npx tsc --noEmit` |
| **Full suite command** | `npx next build` |
| **Estimated runtime** | ~30 seconds (tsc), ~90 seconds (build) |

---

## Sampling Rate

- **After every task commit:** Run `npx tsc --noEmit`
- **After every plan wave:** Run `npx next build`
- **Before `/gsd:verify-work`:** Full build must be green + manual browser check
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 16-01-01 | 01 | 1 | ITIN-01 | TypeScript build + manual | `npx tsc --noEmit` | N/A | pending |
| 16-02-01 | 02 | 1 | ITIN-02, ITIN-03 | TypeScript build + manual | `npx tsc --noEmit` | N/A | pending |
| 16-02-02 | 02 | 1 | ITIN-04, ITIN-05 | TypeScript build + manual | `npx tsc --noEmit` | N/A | pending |
| 16-02-03 | 02 | 2 | ITIN-06, ITIN-07 | TypeScript build + manual | `npx tsc --noEmit` | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

Existing infrastructure covers phase requirements. No test framework install needed — TypeScript strict mode and `next build` serve as primary correctness checks. FullCalendar v6.1.20 install is part of Plan 01/02, not Wave 0.

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

- [ ] All tasks have automated verify or manual verification steps
- [ ] Sampling continuity: TypeScript check after every task
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
