# Roadmap: Whole-Tel

## Milestones

- v1.0 MVP - Phases 1-7 (shipped 2026-03-06)
- v1.1 Rebrand & Owner Enhancements - Phases 8-11 (in progress)

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

<details>
<summary>v1.0 MVP (Phases 1-7) - SHIPPED 2026-03-06</summary>

- [x] **Phase 1: Foundation** - Supabase schema, RLS policies, double-booking constraint, and client infrastructure (completed 2026-03-03)
- [x] **Phase 2: Auth** - Guest and owner authentication with role-based access and route protection (completed 2026-03-03)
- [x] **Phase 3: Owner Dashboard** - Owner CRUD for properties, photos, and per-property add-on experiences (completed 2026-03-04)
- [x] **Phase 4: Guest Browsing** - Property listing pages, destination browsing, add-on display, and brand design (completed 2026-03-05)
- [x] **Phase 5: Booking Flow** - Date selection through add-on customization, price summary, and Stripe handoff (completed 2026-03-05)
- [x] **Phase 6: Payments** - Stripe Checkout (CC + ACH), webhook confirmation, and booking email
- [x] **Phase 7: Landing Page and Polish** - Homepage, about/contact pages, and final brand polish (completed 2026-03-06)

</details>

### v1.1 Rebrand & Owner Enhancements

- [ ] **Phase 8: Fixes and Rebrand** - Auth bug fixes, formatCurrency fix, and full rebrand from party villas to Whole-Tel all-inclusive hotels
- [x] **Phase 9: Owner Property Tools** - Bed configuration, location address, tiered per-person pricing for properties and experiences (completed 2026-03-08)
- [x] **Phase 10: Photo Management** - Batch upload, drag-to-reorder, photo sections, experience photos, and polished guest gallery (completed 2026-03-08)
- [ ] **Phase 11: Booking Enhancements** - Expandable booking details, guest count editing, and guest invite system

## Phase Details

### Phase 8: Fixes and Rebrand
**Goal**: Clear known bugs and establish the Whole-Tel brand identity across the entire site before building new features
**Depends on**: Phase 7 (v1.0 complete)
**Requirements**: FIX-01, FIX-02, BRAND-01, BRAND-02, BRAND-03
**Success Criteria** (what must be TRUE):
  1. A user can sign up, log in, log out, and re-log-in without encountering auth errors or broken redirects -- the full auth lifecycle works smoothly
  2. Booking prices display correctly (no divide-by-100 error) -- a $5,000 booking shows as $5,000, not $50
  3. Every user-facing page says "Whole-Tel" and "all-inclusive hotels" -- no remaining references to "party villas" in any copy, nav, hero, or footer
  4. The hero section displays the new tagline ("Your next unforgettable group trip starts with a Whole-Tel!")
  5. Browser tab titles, meta descriptions, and Open Graph tags all reflect the Whole-Tel all-inclusive hotel brand
**Plans:** 2 plans
Plans:
- [ ] 08-01-PLAN.md -- Bug fixes: formatCurrency /100 error + auth flow audit and fixes
- [ ] 08-02-PLAN.md -- Full rebrand: all copy, hero, meta tags, about page, testimonials, seed data

### Phase 9: Owner Property Tools
**Goal**: Owners can fully configure their property listing with bed details, street address, and per-person pricing tiers for both properties and experiences
**Depends on**: Phase 8
**Requirements**: PROP-09, PROP-10, PROP-11, EXP-01
**Success Criteria** (what must be TRUE):
  1. An owner can specify bed types (King, Queen, Double, Twin, Bunk) with individual counts for each, and guests see the bed configuration on the property listing page
  2. An owner can enter both a location name (e.g., "Cabo San Lucas") and a street address for their property, and the address displays on the listing
  3. An owner can set an additional per-person nightly rate above a guest threshold (e.g., "$100/night/person above 25 guests"), and the booking price calculator reflects this surcharge when guest count exceeds the threshold
  4. An owner can set tiered experience pricing (base price includes up to X people, $Y per additional person), and the booking price calculator reflects the per-person add-on surcharge
**Plans:** 3/3 plans complete
Plans:
- [ ] 09-01-PLAN.md -- Foundation: migration, types, shared pricing module, Zod schemas
- [ ] 09-02-PLAN.md -- Owner forms: PropertyForm bed config + surcharge, AddOnForm tier fields
- [ ] 09-03-PLAN.md -- Guest display: PricingWidget refactor, bed config display, booking action refactor

### Phase 10: Photo Management
**Goal**: Owners have full control over property photo presentation -- bulk upload, custom ordering, organized sections -- and guests see a polished, sectioned photo gallery
**Depends on**: Phase 8
**Requirements**: PHOTO-01, PHOTO-02, PHOTO-03, PHOTO-04, PHOTO-05
**Success Criteria** (what must be TRUE):
  1. An owner can select and upload multiple photos at once (batch) with a polished drag-and-drop or file-picker UX -- no need to upload one at a time (use /frontend-design skill for upload UI polish)
  2. An owner can drag photos to reorder them, and the new order persists and displays correctly on the guest-facing listing
  3. An owner can create photo sections (Rooms, Common Area, Pool, or custom names) and assign photos to sections -- sections display as organized groups
  4. An owner can add photos to individual add-on experiences, and those photos display alongside the experience on the property listing
  5. The guest-facing photo gallery displays photos organized by section with a polished, high-quality UI comparable to Airbnb photo tours (use /frontend-design skill for gallery design)
**Plans:** 4/4 plans complete
Plans:
- [ ] 10-01-PLAN.md — Migration + server actions + batch upload with progress and section assignment
- [ ] 10-02-PLAN.md — Experience photo upload in AddOnForm + hero image on AddOnCard
- [ ] 10-03-PLAN.md — Drag-to-reorder via @dnd-kit/react + section management UI
- [ ] 10-04-PLAN.md — Guest-facing sectioned photo gallery with Airbnb-quality photo tour

### Phase 11: Booking Enhancements
**Goal**: Guests can see full booking details, manage guest count, and invite others to join their booking for seamless group coordination
**Depends on**: Phase 9
**Requirements**: BOOK-08, BOOK-09, BOOK-10, BOOK-11
**Success Criteria** (what must be TRUE):
  1. A guest can click on a booking in their booking history to expand it and see the full price breakdown (nightly rate, nights, add-ons, processing fee, total) plus dates and selected add-ons
  2. A booking displays the correct guest count, and the guest who made the booking can edit it -- the price recalculates if tiered pricing applies
  3. A guest can invite other users to a booking by entering their email address, and the invited user receives an email with a link to view and accept/decline the invitation
  4. An invited user can accept or decline a booking invitation, and accepted guests appear in the booking's guest list visible to the booking creator
**Plans:** 1/2 plans executed
Plans:
- [ ] 11-01-PLAN.md — Foundation + expandable booking details with price breakdown + guest count editing
- [ ] 11-02-PLAN.md — Invitation system: email template, send/accept/decline actions, invitation page, guest list

## Progress

**Execution Order:**
Phases 8 first (clears bugs, establishes brand). Then 9 and 10 can proceed (independent). Phase 11 depends on 9 (needs tiered pricing for correct price display in expanded bookings).

Execution: 8 -> (9 || 10) -> 11

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 3/3 | Complete | 2026-03-03 |
| 2. Auth | v1.0 | 4/4 | Complete | 2026-03-03 |
| 3. Owner Dashboard | v1.0 | 5/5 | Complete | 2026-03-04 |
| 4. Guest Browsing | v1.0 | 5/5 | Complete | 2026-03-05 |
| 5. Booking Flow | v1.0 | 3/3 | Complete | 2026-03-05 |
| 6. Payments | v1.0 | 2/2 | Complete | 2026-03-06 |
| 7. Landing Page and Polish | v1.0 | 2/2 | Complete | 2026-03-06 |
| 8. Fixes and Rebrand | v1.1 | 0/2 | Planning | - |
| 9. Owner Property Tools | 3/3 | Complete   | 2026-03-08 | - |
| 10. Photo Management | 4/4 | Complete    | 2026-03-08 | - |
| 11. Booking Enhancements | 1/2 | In Progress|  | - |
