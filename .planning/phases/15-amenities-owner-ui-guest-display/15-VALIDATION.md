---
phase: 15
slug: amenities-owner-ui-guest-display
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 15 — Validation Strategy

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
| 15-01-01 | 01 | 1 | AMEN-02 | TypeScript build + manual | `npx tsc --noEmit` | N/A | pending |
| 15-02-01 | 02 | 1 | AMEN-03 | TypeScript build + manual | `npx tsc --noEmit` | N/A | pending |
| 15-02-02 | 02 | 1 | AMEN-04 | TypeScript build + manual | `npx tsc --noEmit` | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

Existing infrastructure covers phase requirements. No test framework install needed — TypeScript strict mode and `next build` serve as primary correctness checks.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Owner checkbox grid saves and reloads amenities | AMEN-02 | UI interaction flow | Open property form, toggle amenities on/off, save, reload page, verify selections persist |
| Property detail page shows top amenities + "See all" modal | AMEN-03 | Visual + modal interaction | Visit property detail, verify inline amenities, click "See all", verify categorized modal |
| Property cards show amenity highlights | AMEN-04 | Visual check | Browse properties page, verify cards show pool/hot tub/etc. badges from structured IDs |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or manual verification steps
- [ ] Sampling continuity: TypeScript check after every task
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
