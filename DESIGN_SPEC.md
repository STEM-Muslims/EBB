# Website Design Specification

A reusable design brief describing the look, feel, and structure of the **STEM Muslims** website (a university Islamic society / community organisation site). Hand this to Claude in another project to recreate a website with the same visual language and architecture. The *content* (a STEM Muslim student society at Imperial College London) can be swapped for any organisation — the design system is what matters.

---

## 1. Overall Vibe

- **Clean, calm, and professional** community/non-profit aesthetic.
- Muted **sage/teal green** as the signature brand colour (not the typical corporate blue), paired with a warm gold accent and soft stone/cream neutrals.
- **Islamic geometric patterns** used as section background imagery to give cultural identity without clutter.
- Generous whitespace, large soft-rounded cards, gentle drop shadows, and subtle motion (fade/drift-up on load, count-up numbers, hover scaling).
- Elegant decorative serif for headings contrasted with a clean sans-serif for body text.

---

## 2. Tech Stack

| Concern | Choice |
|---|---|
| Framework | **Next.js 14** (App Router, `src/app` directory) |
| Language | TypeScript (some `.jsx`/`.js` files mixed in) |
| Styling | **Tailwind CSS** + **SCSS Modules** (`*.module.scss`) per page/component |
| Fonts | `next/font/google` — **Inter** (body) + **Cinzel Decorative** (headings) |
| Icons | Font Awesome, Heroicons, Lucide React |
| Animation | Framer Motion, `react-countup`, `react-intersection-observer` (animate on scroll into view) |
| Misc UI | Headless UI, `react-responsive-masonry` (photo grids), `react-player`, Recharts |
| Hosting | Vercel and/or Cloudflare (OpenNext) |

> If recreating from scratch, the essential combo is **Next.js App Router + Tailwind + SCSS modules + Google Fonts (one decorative serif + Inter) + scroll-triggered animations**.

---

## 3. Colour Palette

Defined as SCSS variables and surfaced to Tailwind via CSS custom properties.

```scss
// Brand — sage/teal greens (the signature colour)
$stemm-blue:         #6a928d;  // primary brand (despite the name, it's a muted green-teal)
$stemm-light-blue:   #85ada6;  // hover / lighter accent
$stemm-lighter-blue: #a0ceca;  // lightest accent / gradients
$stemm-darker-blue:  #567a75;  // darker shade

// Accent
$isoc-gold:          #917849;  // warm gold accent
$link-blue:          #1a5978;  // link text

// Neutrals
$stone:              #DCD5C3;  // warm stone (hover backgrounds)
$light-stone:        #F9F4EF;  // cream (card / icon backgrounds)
$background-color:   #FFFFFF;  // page background
$text-color:         #333333;  // body text
```

Tailwind exposes them as `stemm-blue`, `stemm-lighter-blue`, `stemm-darker-blue`, `isoc-gold`.
Body default: white background, `text-gray-800`.

> **To re-theme:** pick ONE muted brand colour + a lighter/darker variant of it, ONE warm accent (gold), and a cream + stone neutral pair. Keep white backgrounds and dark-grey text.

---

## 4. Typography

```scss
// Headings: decorative serif (Cinzel Decorative), weights 400/700/900
// Body: Inter (sans-serif)

$h1-size: clamp(2rem, 4vw, 3rem);     $h1-weight: 700;
$h2-size: clamp(1.5rem, 3vw, 2.5rem); $h2-weight: 600;
$h3-size: clamp(1.25rem, 2.5vw, 2rem);$h3-weight: 500;
$text-size: clamp(0.7rem, 2vw, 1.2rem); $text-weight: 400;
```

- All major headings use the **decorative serif** (`var(--font-cinzel-decorative), serif`) and brand-green colour.
- Body and UI use **Inter**.
- Font sizes are **fluid** with `clamp()` for responsiveness, with separate slightly smaller mobile scales.

---

## 5. Layout & Structure

Root layout (`app/layout.tsx`) wraps every page with:

```
<Navbar />        // fixed top
{children}         // page content
<Footer />         // bottom
<ScrollIndicator/> // scroll progress / back-to-top affordance
```

- **Content max-width:** `1200px`, centred, with `0 1.5rem` horizontal padding (`1rem` on mobile).
- **Section vertical rhythm:** `5rem 0` desktop → `3rem 0` tablet → `2rem 0` mobile.
- **Responsive grid helper:** `repeat(auto-fill, minmax(300px, 1fr))`, `2rem` gap, collapsing to single column on small screens.
- Mobile breakpoints used throughout: `1024px`, `768px`, `480px` (plus a `$mobile-bp: 845px`).
- Touch targets enforced to min `44px` on mobile.

---

## 6. Navbar

- **Fixed** to top, full width, brand-green background, white text, `z-index: 1000`, subtle bottom shadow + a faint white 3px underline strip.
- **Logo on the left:** SVG logo image + "STEM Muslims" wordmark (wordmark hides under 480px).
- **Scroll behaviour:** shrinks padding and deepens shadow after scrolling 20px (`scrolled` state).
- **Desktop:** horizontal links with hover background tint (`rgba(255,255,255,0.1)`); active link gets a stronger tint. Dropdown menus appear on hover as white rounded cards with shadow (green text items, hover grey, active item filled green).
- **Mobile (≤1024px):** animated hamburger (three bars → X), slide-in drawer from the right (300px wide), body scroll-locked when open, tap-outside to close, submenus expand inline (accordion), auto-closes on route change.
- Example nav structure (top-level with nested dropdowns):
  `Home · About · Our Committee · Careers ▸ · Quarter Zip · Education ▸ · Outreach ▸ · Contact`

---

## 7. Footer

- Brand-green background, white centred text, thin top border.
- `© {year} {Org Name}. All rights reserved.`
- Row of links below: Privacy Policy · Terms of Service · Contact (mailto).
- Max-width 1200px, centred.

---

## 8. Home Page Sections (in order)

1. **Hero / Intro** (`min-height: 70vh`)
   - Full-bleed **Islamic geometric pattern** background image (`cover`, centred).
   - Centred decorative SVG graphic on top (e.g. an Arabic greeting / "Salaam").
   - Decorative-serif `<h1>` ("Welcome to …") + tagline subheading, both in white.
   - Text **drifts up + fades in** on load (staggered: heading at 0.5s, subheading at 1s) via a `driftUp` keyframe.

2. **Mission** — centred white section, max-width 800px, decorative-serif green heading + body paragraph. On desktop becomes a 50/50 two-column layout.

3. **Stats** — geometric-pattern background, white text, row of 4 stat blocks. Big **count-up numbers** (animate from 0 when scrolled into view) with a `+` suffix, a bold label, and a short description. e.g. "950+ Attendees", "15+ Events".

4. **Social Media** — centred. Circular icon buttons (120px, cream background, soft shadow) that **scale up and darken to stone** on hover. Links to Instagram / LinkedIn / Linktree.

5. **Prayer Rooms / Location info** — two-column grid (image + text), image framed with a thick brand-green outline offset and rounded corners; right-aligned info text with map/direction links.

> Other section pattern seen elsewhere: an **events carousel** — rounded 12px card (`box-shadow: 0 10px 30px rgba(0,0,0,0.1)`) split 50/50 into a poster image (with gradient overlay, hover zoom) and details (title, date, description, pill "Read more" button), with circular prev/next buttons and pagination dots.

---

## 9. Reusable Component Patterns

- **Buttons:** pill-shaped (`border-radius: 30px`), brand-green fill, white text, bold; hover lightens to `stemm-lighter-blue` and lifts with a coloured shadow. A `<Button>` component supports `primary | secondary | tertiary` themes, optional `href` (renders as link), and a fluid `width` default of `clamp(300px, 20vw, 400px)`.
- **Cards:** white, `border-radius: 8–12px`, soft shadow `0 4px 12px rgba(0,0,0,0.15)`, image-on-top or image-on-side.
- **Circular media/icon chips:** cream fill, shadow, scale-on-hover.
- **Masonry image galleries** for photo-heavy pages.
- **Scroll indicator** component (progress / back-to-top).
- **Photo framing:** thick coloured `outline` with `outline-offset` + rounded corners for a "matted" look.

---

## 10. Motion & Interaction

- `html { scroll-behavior: smooth; }`
- On-load: `driftUp` (translateY 30px + fade) and `fadeIn` keyframes for hero text.
- On-scroll-into-view: count-up stats, fade/slide sections (via `react-intersection-observer`, `triggerOnce`).
- Hover: scale (`1.05–1.1`), background tint shifts, image zoom, animated underline grow on text links.
- A custom `float` Tailwind animation (`translateY(-5px)` loop, 3s) is available for gentle bobbing elements.
- Transitions are consistently `0.2s–0.3s ease`.

---

## 11. Assets

- Logo as **SVG** (plus white & PNG variants).
- Section backgrounds: a tiling/large **geometric Islamic pattern PNG**.
- Decorative greeting SVG for the hero.
- Social icons as SVGs.
- Favicon + Open Graph metadata (`title`, `description`) set in the layout `metadata` export.

---

## 12. Quick Recreation Checklist

- [ ] Next.js 14 App Router project, `src/app` structure, Tailwind + SCSS modules.
- [ ] Load Inter + one decorative serif via `next/font/google`; expose serif as a CSS variable.
- [ ] Define the colour palette as SCSS vars + Tailwind theme extension via CSS custom properties.
- [ ] Fluid typography with `clamp()` and decorative-serif green headings.
- [ ] Fixed shrink-on-scroll navbar with hover dropdowns (desktop) and slide-in hamburger drawer (mobile).
- [ ] Brand-green footer with copyright + legal/contact links.
- [ ] Home page: geometric-pattern hero with drift-up text → mission → animated count-up stats on patterned bg → circular social links → image+text info section.
- [ ] Pill buttons, rounded soft-shadow cards, circular hover-scale icon chips, masonry galleries.
- [ ] Scroll-into-view animations + smooth scrolling + a scroll indicator.
- [ ] 1200px max content width; breakpoints at 1024 / 768 / 480px; 44px min touch targets.
```
