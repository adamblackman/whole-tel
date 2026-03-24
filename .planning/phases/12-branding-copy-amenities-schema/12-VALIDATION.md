---
phase: 12
slug: branding-copy-amenities-schema
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-23
---

# Phase 12 — Validation Strategy

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
| 12-01-01 | 01 | 1 | BRAND-01 | manual-only | — | N/A | pending |
| 12-01-02 | 01 | 1 | BRAND-02 | grep audit | `grep -r "Whole-Tel" src/ --include="*.tsx" \| grep -v "trade;"` | N/A | pending |
| 12-01-03 | 01 | 1 | BRAND-03 | manual-only | — | N/A | pending |
| 12-01-04 | 01 | 1 | BRAND-04 | manual-only | — | N/A | pending |
| 12-01-05 | 01 | 1 | BRAND-05 | manual-only | — | N/A | pending |
| 12-01-06 | 01 | 1 | BRAND-06 | manual-only | — | N/A | pending |
| 12-01-07 | 01 | 1 | BRAND-07 | grep audit | `grep -rn "Browse Hotels\|Featured Hotels" src/` | N/A | pending |
| 12-02-01 | 02 | 1 | BRAND-08 | TypeScript build | `npx tsc --noEmit` | N/A | pending |
| 12-03-01 | 03 | 2 | PAY-07 | TypeScript build | `npx tsc --noEmit` | N/A | pending |
| 12-03-02 | 03 | 2 | PAY-09 | manual-only | — | N/A | pending |
| 12-04-01 | 04 | 2 | AMEN-01 | manual DB check | Supabase Studio query | N/A | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

Existing infrastructure covers phase requirements. No test framework install needed — TypeScript strict mode and `next build` serve as primary correctness checks.

- For PAY-07: after extending `PricingInput`, both `bookings.ts` and `PricingWidget.tsx` callers will generate TypeScript errors until updated — use this as the verification signal.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Hero headline + CTA text | BRAND-01 | Visual copy check | Load homepage, verify headline text and CTA button text |
| BrandStory heading renamed | BRAND-03 | Visual copy check | Load homepage, verify "The Whole-Tel™ Experience" heading |
| 3-step section renders | BRAND-04 | Visual + icon check | Load homepage, verify 3 steps with correct icons |
| Featured section updated | BRAND-05 | Visual copy check | Load homepage, verify "Featured Whole-Tels™" heading |
| Coming Soon cards | BRAND-06 | Visual + interaction | Load homepage, verify 4 Coming Soon cards are non-clickable |
| Per-person cost display | PAY-09 | Visual check | Create booking, verify per-person line in price breakdown |
| Amenities tables exist | AMEN-01 | DB schema check | Run SQL: `SELECT * FROM amenities LIMIT 5; SELECT * FROM property_amenities LIMIT 5;` |

---

## Validation Sign-Off

- [ ] All tasks have automated verify or manual verification steps
- [ ] Sampling continuity: TypeScript check after every task
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
