---
phase: 14
slug: partner-application-workflow
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 14 — Validation Strategy

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
| 14-01-01 | 01 | 1 | PART-03 | TypeScript build + manual | `npx tsc --noEmit` | N/A | pending |
| 14-02-01 | 02 | 1 | PART-01 | TypeScript build + manual | `npx tsc --noEmit` | N/A | pending |
| 14-02-02 | 02 | 1 | PART-02 | TypeScript build + manual | `npx tsc --noEmit` | N/A | pending |
| 14-03-01 | 03 | 2 | PART-04 | TypeScript build + manual | `npx tsc --noEmit` | N/A | pending |
| 14-03-02 | 03 | 2 | PART-05 | TypeScript build + manual | `npx tsc --noEmit` | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

Existing infrastructure covers phase requirements. No test framework install needed — TypeScript strict mode and `next build` serve as primary correctness checks.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Multi-step form navigation and submission | PART-02 | UI interaction flow | Navigate all 5 steps, verify back/forward preserves data, submit and see confirmation |
| Owner login link replacement | PART-01 | Visual check | Visit /owner/login, verify "Apply to be a featured partner" link replaces signup link |
| Admin application list and filtering | PART-04 | UI interaction flow | Visit /dashboard/applications, verify list loads with status filters |
| Status transition buttons | PART-04 | UI + DB check | Click status transition buttons, verify state changes persist |
| Owner account creation from approved app | PART-05 | Auth flow | Approve an application, create owner account, verify login works |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or manual verification steps
- [ ] Sampling continuity: TypeScript check after every task
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
