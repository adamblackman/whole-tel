---
phase: 17
slug: split-payments
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-24
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.0.18 + TypeScript strict mode + Next.js build |
| **Config file** | vitest.config.ts (exists from Phase 16) |
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
| 17-01-00 | 01 | 0 | N/A | Vitest scaffold | `npx vitest run` | Created in task | pending |
| 17-01-01 | 01 | 1 | PAY-03 | Unit (cents validation) | `npx vitest run src/lib/validations/split.test.ts` | Created in 01-00, assertions in 01-01 | pending |
| 17-01-02 | 01 | 1 | PAY-03 | TypeScript build | `npx tsc --noEmit` | N/A | pending |
| 17-02-01 | 02 | 2 | PAY-04 | Unit (webhook routing) | `npx vitest run src/lib/actions/split.test.ts` | Created in 01-00, assertions in 02-01 | pending |
| 17-02-02 | 02 | 2 | PAY-03, PAY-04 | TypeScript build + manual | `npx tsc --noEmit && npx vitest run` | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

Existing vitest.config.ts from Phase 16 covers framework. Wave 0 creates test stubs:
- [ ] `src/lib/validations/split.test.ts` — stubs for PAY-03 (cents equality, sum validation)
- [ ] `src/lib/actions/split.test.ts` — stubs for PAY-04 (webhook routing logic)

---

## Unit Test Coverage

| Test File | Covers | Key Assertions |
|-----------|--------|----------------|
| `src/lib/validations/split.test.ts` | PAY-03 | centsEqual handles float edge cases; split sum must equal booking total; rejects negative amounts; rejects zero-length splits |
| `src/lib/actions/split.test.ts` | PAY-04 | Webhook metadata routing: invitation_id present → split fulfillment, absent → booking confirmation |

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Group lead sees attendees with amount inputs and unallocated balance | PAY-03 | UI interaction flow | Open confirmed booking, navigate to split payments, verify attendee list with input fields and remaining balance display |
| Split amounts adjust and balance updates in real-time | PAY-03 | Visual + interaction | Change amount inputs, verify running unallocated total updates |
| Payment link generated and displayed for each attendee | PAY-04 | Stripe API integration | Save valid splits, click "Generate Link", verify Stripe link URL appears |
| Attendee can pay via Stripe Payment Link | PAY-04 | External service flow | Open generated link, complete test payment, verify webhook marks split as paid |
| Paid status badge appears after webhook fires | PAY-04 | End-to-end flow | After payment, refresh split page, verify "Paid" badge on attendee row |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or manual verification steps
- [ ] Sampling continuity: TypeScript check + vitest after every task
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
