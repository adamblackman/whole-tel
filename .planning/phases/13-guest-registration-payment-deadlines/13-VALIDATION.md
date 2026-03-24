---
phase: 13
slug: guest-registration-payment-deadlines
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 13 — Validation Strategy

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
| 13-01-01 | 01 | 1 | PAY-01 | TypeScript build + manual | `npx tsc --noEmit` | N/A | pending |
| 13-01-02 | 01 | 1 | PAY-02 | TypeScript build + manual | `npx tsc --noEmit` | N/A | pending |
| 13-02-01 | 02 | 1 | PAY-05 | TypeScript build + manual | `npx tsc --noEmit` | N/A | pending |
| 13-02-02 | 02 | 1 | PAY-06 | TypeScript build + manual | `npx tsc --noEmit` | N/A | pending |
| 13-03-01 | 03 | 2 | PAY-08 | curl test + manual | `curl -s localhost:3000/api/cron/expire-bookings` | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

Existing infrastructure covers phase requirements. No test framework install needed — TypeScript strict mode and `next build` serve as primary correctness checks.

- For PAY-01/02: after extending `booking_invitations` and `acceptInvitation`, TypeScript errors surface any callers not passing new required fields.
- For PAY-05: after adding `payment_deadline` column, any booking queries referencing it will type-check via Supabase generated types.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Name/phone form on invitation accept | PAY-01 | UI interaction flow | Click invitation link, verify name/phone form appears before acceptance completes |
| Manual attendee entry by group lead | PAY-02 | UI interaction flow | On booking detail, add attendee manually with name/email/phone |
| Payment deadline countdown display | PAY-05 | Visual + timer check | Create pending booking, verify countdown shows on booking detail |
| Activity deadline display | PAY-06 | Visual check | View confirmed booking, verify activity deadline date shown |
| Expired booking auto-cancel | PAY-08 | Cron + DB check | Trigger cron route, verify pending bookings past deadline become expired |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or manual verification steps
- [ ] Sampling continuity: TypeScript check after every task
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
