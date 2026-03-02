# Whole-Tel — Development Guidelines

## Project Overview

Party villa booking platform (Airbnb for large villas with add-on experiences). Next.js 16 + Supabase + Stripe + shadcn/ui + React Bits.

## Core Principles

- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

## Tech Stack Rules

- **Next.js 16**: App Router only. `params` and `cookies()` must be awaited. Turbopack is default. Server Components by default — only use `'use client'` for interactive widgets.
- **Supabase Auth**: Two separate client factories — `createServerClient()` for Server Components/Actions, `createBrowserClient()` for Client Components. Never mix them. Never call `getSession()` in Server Components — use `getClaims()`.
- **Supabase RLS**: Every table must have Row Level Security policies. Never expose `service_role` key to client code. Never prefix it with `NEXT_PUBLIC_`.
- **Stripe**: Server-side pricing only — never trust client-submitted prices. Webhook (`checkout.session.completed`) is the authoritative booking signal, not success URL redirects. Preserve raw body for signature verification.
- **Styling**: Tailwind v4 + shadcn/ui + React Bits. No `tailwindcss-animate` (deprecated) — use `tw-animate-css`.

## Security Non-Negotiables

- Three-layer auth: Middleware (optimistic UX) + DAL `verifySession()` in Server Components/Actions + Supabase RLS at database.
- Booking date exclusion constraint (GiST index) in PostgreSQL — application-level checks alone are not safe.
- Signed URL uploads for property images — never route through Next.js server (1MB Server Action limit).
- Credit card surcharge: use "processing fee" language, exclude debit cards (Durbin Amendment), exclude prohibited states (CA, CT, ME, MA).

## Workflow Orchestration

### 1. Plan Mode Default

- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions).
- If something goes sideways, STOP and re-plan immediately — don't keep pushing.
- Use plan mode for verification steps, not just building.
- Write detailed specs upfront to reduce ambiguity.

### 2. Subagent Strategy

- Use subagents to keep main context window clean.
- Offload research, exploration, and parallel analysis to subagents.
- One task per subagent for focused execution.
- **Limit**: Spawn a maximum of 3 subagents concurrently per task to prevent context bloat.

### 3. Self-Improvement Loop

- After ANY correction from the user: update `tasks/lessons.md` with the pattern.
- Write rules for yourself that prevent the same mistake.
- Ruthlessly iterate on these lessons until mistake rate drops.
- Review lessons at session start for relevant project.

### 4. Verification Before Done

- Never mark a task complete without proving it works.
- Diff behavior between main and your changes when relevant.
- Run tests, check logs, demonstrate correctness.
- Before completing a task, write a 2-sentence "Staff Engineer Review" defending why this is the most efficient and robust approach. Output it in the chat.

### 5. Demand Elegance (Balanced)

- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution."
- Skip this for simple, obvious fixes — don't over-engineer.
- Challenge your own work before presenting it.

### 6. Autonomous Bug Fixing

- When given a bug report: just fix it. Don't ask for hand-holding.
- Point at logs, errors, failing tests — then resolve them.
- Zero context switching needed from the user.
- Go fix failing CI tests without being told how.
- **Circuit breaker**: If you fail to resolve a bug after 3 attempts, STOP. Do not guess. Summarize the blockers, what you tried, and ask the user for direction.

## Task Management

1. **Plan First**: Write plan to `tasks/todo.md` with checkable items.
2. **Verify Plan**: Check in before starting implementation.
3. **Track Progress**: Mark items complete as you go. Batch updates to `tasks/todo.md` at major milestones — don't rewrite the file after every checkbox.
4. **Explain Changes**: High-level summary at each step.
5. **Document Results**: Add review section to `tasks/todo.md`.
6. **Capture Lessons**: Update `tasks/lessons.md` after corrections.

## Design Standards

- **Airbnb-level polish**: Clean typography, smooth transitions, mobile-responsive.
- **Brand**: Tropical chill with a fun party side — relaxed luxury, not Vegas loud.
- **UI Libraries**: shadcn/ui for components, React Bits for animations and micro-interactions.
- **Images**: Use placeholder content until real photos are provided. Optimize with next/image.

## File Structure Conventions

- `src/app/` — Next.js App Router pages and layouts
- `src/components/` — Reusable UI components
- `src/lib/` — Utilities (Supabase clients, Stripe helpers, DAL)
- `src/types/` — TypeScript type definitions
- `.env.local` — Environment variables (never commit)
