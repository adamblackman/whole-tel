# Phase 7: Landing Page and Polish - Research

**Researched:** 2026-03-05
**Domain:** Landing page design, React animations, contact form email routing
**Confidence:** HIGH

## Summary

Phase 7 transforms the existing minimal homepage into a compelling marketing landing page with hero, brand story, featured properties, and destination browsing, plus adds About Us and Contact pages. The existing codebase already has all the infrastructure needed: Supabase queries for properties, PropertyListingCard components, DestinationFilter, Resend email client, react-hook-form + Zod validation, and the brand color palette (--brand-teal, --brand-amber, --brand-sand, --brand-palm).

The primary technical decision is React Bits component selection. BlurText requires framer-motion (~30KB) and SplitText requires GSAP. Since the project CLAUDE.md specifies React Bits over Framer Motion, and the brand aesthetic is "tropical chill" (not cyberpunk glitch), BlurText is the best fit for animated headings. Adding framer-motion as a dependency is acceptable because it is only used as an internal dep of the React Bits component, not as a primary animation framework. Alternatively, simpler CSS-only animations via tw-animate-css (already installed) can achieve the same brand feel without new dependencies.

The Contact page routes to adam@whole-tel.com via a Server Action using the existing Resend client. No new infrastructure needed.

**Primary recommendation:** Rewrite `src/app/page.tsx` as a sectioned landing page reusing PropertyListingCard, add `/about` and `/contact` routes, use tw-animate-css for entrance animations (already installed), and add 1-2 React Bits text animations (BlurText) for hero polish.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PAGE-01 | Homepage with hero section, brand story, featured properties, and testimonials | Existing page.tsx has basic hero + property grid. Rewrite with sectioned layout: hero (gradient + BlurText), brand story section, featured properties (reuse PropertyListingCard), destination browsing (reuse DestinationFilter pattern as visual cards linking to /properties?destination=X). Testimonials can be static placeholder content. |
| PAGE-02 | About Us page with brand story | New route at /about. Server Component, static content. Wrap in (guest) layout to get GuestNav. |
| PAGE-03 | Contact page with form routing to adam@whole-tel.com | New route at /contact. Client Component form with react-hook-form + Zod. Server Action sends email via Resend. Wrap in (guest) layout. |
</phase_requirements>

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.1.6 | App Router, Server Components, Server Actions | Project framework |
| shadcn/ui | CLI 3.8.5 | Card, Button, Input, Textarea, Label, Badge | Already in project, consistent brand |
| Tailwind CSS | v4 | Styling with brand tokens | Already configured with oklch brand palette |
| tw-animate-css | 1.4.0 | CSS entrance animations (fade-in, slide-in) | Already installed, zero new deps |
| react-hook-form | 7.71.2 | Contact form state management | Already in project |
| Zod | 4.3.6 | Contact form validation | Already in project |
| Resend | 6.9.3 | Email delivery for contact form | Already in project with lazy-init pattern |
| lucide-react | 0.576.0 | Icons | Already in project |

### New: React Bits Components (copy-paste via CLI)
| Component | Install Command | Purpose | Dependency |
|-----------|----------------|---------|------------|
| BlurText | `npx shadcn@latest add "https://reactbits.dev/r/BlurText-TS-TW"` | Hero heading animation | framer-motion |

### New Dependencies (if using BlurText)
| Library | Purpose | Size Impact |
|---------|---------|-------------|
| framer-motion | Required by BlurText component internals | ~30KB gzipped, tree-shakeable |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| BlurText (framer-motion dep) | Pure CSS animations via tw-animate-css `animate-in fade-in` | No new dependency, but less polished text reveal. Acceptable for MVP. |
| SplitText (GSAP dep) | BlurText (framer-motion dep) | GSAP adds license complexity for commercial use. BlurText achieves similar "text reveals on load" effect. |
| React Bits FadeContent | Tailwind `animate-in slide-in-from-bottom` | tw-animate-css already handles this. Don't add FadeContent just for section reveals. |

**Installation:**
```bash
# React Bits BlurText (TS + Tailwind variant)
npx shadcn@latest add "https://reactbits.dev/r/BlurText-TS-TW"

# framer-motion (auto-installed as BlurText dependency, or manually)
pnpm add framer-motion
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── app/
│   ├── page.tsx                    # Landing page (rewrite — hero, story, featured, destinations)
│   ├── (guest)/
│   │   ├── layout.tsx              # GuestNav wrapper (existing)
│   │   ├── about/
│   │   │   └── page.tsx            # About Us (new — Server Component)
│   │   └── contact/
│   │       └── page.tsx            # Contact page (new — Server Component shell)
│   └── ...
├── components/
│   ├── landing/
│   │   ├── Hero.tsx                # Hero section (Client Component if using BlurText)
│   │   ├── BrandStory.tsx          # Brand story section (Server Component)
│   │   ├── FeaturedProperties.tsx  # Featured grid (Server Component, reuses PropertyListingCard)
│   │   ├── DestinationCards.tsx    # Destination browsing cards (Server Component)
│   │   └── Testimonials.tsx        # Static testimonials (Server Component)
│   ├── contact/
│   │   └── ContactForm.tsx         # Contact form (Client Component — react-hook-form)
│   └── ...
├── lib/
│   ├── actions/
│   │   └── contact.ts              # sendContactEmail Server Action (new)
│   └── email.ts                    # Resend client (existing)
```

### Pattern 1: Sectioned Landing Page as Server Component
**What:** The landing page (page.tsx) is a Server Component that composes section components. Only interactive sections (Hero with BlurText, if used) are Client Components.
**When to use:** Always for marketing pages — Server Components render faster, are SEO-friendly, and can fetch data directly.
**Example:**
```typescript
// src/app/page.tsx — Server Component
import { Hero } from '@/components/landing/Hero'
import { BrandStory } from '@/components/landing/BrandStory'
import { FeaturedProperties } from '@/components/landing/FeaturedProperties'
import { DestinationCards } from '@/components/landing/DestinationCards'
import { Testimonials } from '@/components/landing/Testimonials'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: properties } = await supabase
    .from('properties')
    .select('*, property_photos(id, storage_path, display_order)')
    .order('nightly_rate', { ascending: true })

  return (
    <div className="min-h-screen">
      <Hero />
      <BrandStory />
      <FeaturedProperties properties={properties ?? []} />
      <DestinationCards />
      <Testimonials />
    </div>
  )
}
```

### Pattern 2: Contact Form with Server Action
**What:** Client Component form submits via Server Action that sends email through Resend.
**When to use:** For the contact page.
**Example:**
```typescript
// src/lib/actions/contact.ts
'use server'
import { z } from 'zod'
import { getResend } from '@/lib/email'

const ContactSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
})

export async function sendContactEmail(formData: FormData) {
  const parsed = ContactSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    message: formData.get('message'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message }
  }

  const { name, email, message } = parsed.data
  const resend = getResend()

  try {
    await resend.emails.send({
      from: 'Whole-Tel <noreply@whole-tel.com>',
      to: 'adam@whole-tel.com',
      replyTo: email,
      subject: `Contact form: ${name}`,
      text: `From: ${name} (${email})\n\n${message}`,
    })
    return { success: 'Message sent! We will get back to you soon.' }
  } catch {
    return { error: 'Failed to send message. Please try again.' }
  }
}
```

### Pattern 3: Homepage Nav (No GuestNav)
**What:** The landing page (`/`) is outside the `(guest)` route group, so it does NOT get GuestNav automatically. It needs its own navigation — either inline in the Hero or a dedicated landing nav component.
**When to use:** The homepage should have a more prominent, hero-integrated navigation (logo + CTA buttons) rather than the standard browse nav.
**Example:**
```typescript
// Hero nav: transparent, overlaid on gradient
<header className="absolute top-0 left-0 right-0 z-10">
  <div className="max-w-7xl mx-auto px-6 py-6 flex justify-between items-center">
    <Link href="/" className="text-white font-bold text-2xl">Whole-Tel</Link>
    <nav className="flex gap-4">
      <Button variant="ghost" className="text-white" asChild>
        <Link href="/properties">Browse Villas</Link>
      </Button>
      <Button className="bg-brand-amber text-white" asChild>
        <Link href="/login">Get Started</Link>
      </Button>
    </nav>
  </div>
</header>
```

### Anti-Patterns to Avoid
- **Making the entire landing page a Client Component:** Only the Hero (if animated) and ContactForm need `'use client'`. Keep sections as Server Components for performance and SEO.
- **Fetching property data client-side on the homepage:** Use Server Component data fetching. The homepage loads once, there is no interactivity that requires client-side refetching.
- **Duplicating PropertyListingCard logic:** Reuse the existing `PropertyListingCard` component from `src/components/browse/`. Do not create a separate "featured property card."
- **Adding React Bits components that need GSAP for a simple landing page:** GSAP adds licensing concerns (free for non-commercial, paid for commercial). Stick with framer-motion-based or CSS-only animations.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email delivery | Custom SMTP or nodemailer setup | Resend (already configured) | Deliverability, rate limiting, bounce handling |
| Contact form validation | Manual regex checking | Zod schema + react-hook-form | Type-safe, consistent with rest of project |
| Entrance animations | Custom CSS @keyframes | tw-animate-css utility classes | Already installed, tested, consistent |
| Text reveal animation | Custom IntersectionObserver + CSS | React Bits BlurText or tw-animate-css | Tested, accessible, configurable |
| Property card design | New card component for homepage | PropertyListingCard (existing) | Already styled, tested, handles missing photos |

**Key insight:** This phase is primarily a content/design phase, not a systems phase. Nearly all infrastructure exists. The work is composing existing components into a marketing-quality layout.

## Common Pitfalls

### Pitfall 1: Homepage Route vs (guest) Route Group
**What goes wrong:** Placing About/Contact pages at `/app/about/page.tsx` (root) instead of `/app/(guest)/about/page.tsx` means they don't get GuestNav.
**Why it happens:** Forgetting the route group pattern.
**How to avoid:** About and Contact pages MUST go in `(guest)` route group to inherit GuestNav layout. The homepage (`/`) is intentionally outside because it has its own hero nav.
**Warning signs:** About/Contact pages render without navigation header.

### Pitfall 2: Resend Domain Verification
**What goes wrong:** `from` address domain must be verified in Resend dashboard, or emails silently fail / go to spam.
**Why it happens:** Using `noreply@whole-tel.com` requires `whole-tel.com` domain to be verified in Resend.
**How to avoid:** Either verify `whole-tel.com` in Resend, or use Resend's default `onboarding@resend.dev` for development. The Contact form Server Action should handle errors gracefully.
**Warning signs:** Email send returns success but no email arrives.

### Pitfall 3: BlurText as Client Component in Server Page
**What goes wrong:** BlurText uses framer-motion hooks internally, requiring `'use client'`. If you try to use it directly in a Server Component page, it will error.
**Why it happens:** React Bits components with animation deps are inherently client-side.
**How to avoid:** Wrap BlurText usage in a Client Component (Hero.tsx with `'use client'`), then compose that Client Component into the Server Component page.
**Warning signs:** "useState can only be used in Client Components" error.

### Pitfall 4: Missing replyTo on Contact Emails
**What goes wrong:** Contact form emails arrive at adam@whole-tel.com but clicking "Reply" goes to `noreply@whole-tel.com` instead of the person who submitted the form.
**Why it happens:** Forgetting `replyTo` field in Resend API call.
**How to avoid:** Always set `replyTo: submitterEmail` in the Resend send call.
**Warning signs:** Can't reply to contact inquiries.

### Pitfall 5: Zod v4 API Differences
**What goes wrong:** Using `.errors` instead of `.issues` on ZodError, or `errorMap` instead of `error` on enum schemas.
**Why it happens:** Project uses Zod v4 (4.3.6) but most docs/examples show v3 API.
**How to avoid:** Use `.issues` for error access, `error` key for custom messages. This is documented in project decisions [03-01] and [05-03].
**Warning signs:** TypeScript errors on ZodError property access.

## Code Examples

### Existing Brand Palette Usage
```css
/* Already in globals.css :root */
--brand-amber: oklch(0.78 0.15 75);   /* Warm accent — CTAs, highlights */
--brand-teal: oklch(0.65 0.14 185);   /* Primary brand — nav, headings */
--brand-sand: oklch(0.92 0.04 85);    /* Light background sections */
--brand-palm: oklch(0.42 0.12 150);   /* Dark accent — footer, contrast text */
```

Usage in Tailwind: `bg-brand-teal`, `text-brand-amber`, `bg-brand-sand`, `text-brand-palm`

### Destination Cards (linking to browse with filter)
```typescript
// Server Component — static cards linking to filtered browse page
const DESTINATIONS = [
  { name: 'Cabo San Lucas', slug: 'Cabo San Lucas', image: '/images/cabo.jpg', tagline: 'Sun-soaked party paradise' },
  { name: 'Puerto Vallarta', slug: 'Puerto Vallarta', image: '/images/pv.jpg', tagline: 'Beachfront with local flavor' },
  { name: 'Miami', slug: 'Miami', image: '/images/miami.jpg', tagline: 'Where the nightlife meets the ocean' },
]

{DESTINATIONS.map(dest => (
  <Link key={dest.slug} href={`/properties?destination=${encodeURIComponent(dest.slug)}`}>
    {/* Card with background image, overlay, destination name */}
  </Link>
))}
```

### tw-animate-css Entrance Animations
```typescript
// No framer-motion needed — pure CSS via tw-animate-css (already installed)
<div className="animate-in fade-in duration-700">
  <h2>Your next adventure starts here</h2>
</div>

<div className="animate-in slide-in-from-bottom-4 duration-500 delay-200">
  <p>Featured properties</p>
</div>
```

### Contact Form with useActionState
```typescript
'use client'
import { useActionState } from 'react'
import { sendContactEmail } from '@/lib/actions/contact'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

export function ContactForm() {
  const [state, formAction, isPending] = useActionState(sendContactEmail, null)

  return (
    <form action={formAction} className="space-y-4 max-w-lg">
      <div>
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required />
      </div>
      <div>
        <Label htmlFor="message">Message</Label>
        <Textarea id="message" name="message" rows={5} required />
      </div>
      {state?.error && <p className="text-destructive text-sm">{state.error}</p>}
      {state?.success && <p className="text-brand-teal text-sm">{state.success}</p>}
      <Button type="submit" disabled={isPending} className="bg-brand-teal text-white">
        {isPending ? 'Sending...' : 'Send Message'}
      </Button>
    </form>
  )
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `tailwindcss-animate` plugin | `tw-animate-css` CSS import | March 2025 | Already migrated in this project |
| Framer Motion for all animations | React Bits copy-paste + tw-animate-css | 2025 | Smaller bundle, no monolithic animation dep |
| API route for contact form | Server Action | Next.js 14+ | Simpler, no `/api/contact` route needed |
| `useFormState` (React 18) | `useActionState` (React 19) | React 19 | Updated hook name, same functionality |

**Deprecated/outdated:**
- `useFormState`: Renamed to `useActionState` in React 19. This project uses React 19.2.
- `tailwindcss-animate`: Deprecated. Project already uses `tw-animate-css`.

## Open Questions

1. **Resend domain verification status**
   - What we know: Resend is configured for booking confirmation emails (Phase 6). The `from` address domain must match a verified domain in Resend.
   - What's unclear: Whether `whole-tel.com` is verified in Resend, or if Phase 6 used `onboarding@resend.dev`.
   - Recommendation: Check Resend dashboard. If not verified, use the same `from` address that Phase 6 booking emails use.

2. **Placeholder images for destinations**
   - What we know: Property photos come from Supabase Storage. Destination hero images (Cabo, PV, Miami) are static marketing assets.
   - What's unclear: Whether real destination images exist or need placeholders.
   - Recommendation: Use gradient overlays on placeholder divs for destination cards. When real images are available, swap to `next/image` with local files in `/public/images/`.

3. **Whether to add framer-motion for BlurText**
   - What we know: BlurText requires framer-motion. tw-animate-css can achieve simpler fade-in effects without any new dependency.
   - What's unclear: How important the polished text animation is vs. keeping deps minimal.
   - Recommendation: Start with tw-animate-css `animate-in fade-in` for the hero. If the result feels flat, add BlurText as an enhancement. This keeps the critical path dependency-free.

## Sources

### Primary (HIGH confidence)
- Project codebase inspection — `src/app/page.tsx`, `src/components/browse/PropertyListingCard.tsx`, `src/components/GuestNav.tsx`, `src/app/globals.css`, `package.json`
- Project CLAUDE.md — brand aesthetic, tech stack rules, design standards
- Project STATE.md — accumulated decisions through Phases 1-6

### Secondary (MEDIUM confidence)
- [React Bits GitHub](https://github.com/DavidHDev/react-bits) — 18.8k+ stars, component install via `npx shadcn@latest add` pattern
- [DeepWiki React Bits docs](https://deepwiki.com/DavidHDev/react-bits/8-text-animation-components) — BlurText requires framer-motion, SplitText requires GSAP
- [React Bits component list](https://reactbits.dev/) — 110+ components, text animations, backgrounds

### Tertiary (LOW confidence)
- BlurText exact install command format — verified pattern `npx shadcn@latest add "https://reactbits.dev/r/BlurText-TS-TW"` but jsrepo CLI has reported issues (GitHub issue #39). Manual copy-paste is reliable fallback.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - everything already installed in the project
- Architecture: HIGH - follows established patterns from Phases 4-6
- Pitfalls: HIGH - based on project-specific decisions and known Zod v4 / route group patterns
- React Bits integration: MEDIUM - install commands may have CLI quirks, manual copy-paste is reliable fallback

**Research date:** 2026-03-05
**Valid until:** 2026-04-05 (stable — this is primarily a content/design phase, not a moving-target library phase)
