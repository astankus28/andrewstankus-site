# Design rules — read before changing anything

The owner likes this site exactly as it looks. **Any change must keep the existing
look and feel.** When asked to add or fix something, reuse what is already here.
Do not redesign, "modernize", restyle or tidy up the visual design unless the owner
explicitly asks for a design change.

## Never change (unless the owner asks in so many words)

- **Colors.** Only these, from the `:root` variables in `index.html` and `assets/event.css`:
  - `--ink #0b0b0b` (background), `--ink2 #121212` and `--ink3 #1b1b1b` (alternate sections, hover)
  - `--paper #f3efe8` (text), `--muted #8b877f` (secondary text)
  - `--accent #c9a96e` (gold: labels, italics in headlines, buttons, hover)
  - `--line rgba(243,239,232,0.12)` (all borders and dividers)
  - No new colors, no gradients beyond the existing photo overlays, no light mode.
- **Fonts.** Cormorant Garamond (serif) for section headlines, names and numbers; Inter (sans) for
  body and labels; **Jost** (bold, uppercase) only for the homepage slideshow headline (`--display`),
  chosen by the owner for readability over photos. All from the existing Google Fonts link. No other fonts.
- **Typography style:**
  - Headlines are light serif (weight 300–400) with **one italic gold word** (`<em>`),
    e.g. "Selected <em>work</em>"
  - Small labels are uppercase Inter, ~0.68rem, letter-spacing ~0.2–0.28em, gold (`.label`)
  - Body text is light Inter (300), muted or paper color
- **Layout:**
  - Dark, editorial, lots of space. Section padding is `clamp(5rem, 10vw, 8rem) var(--pad)`.
  - Thin 1px `--line` borders.
  - Square corners everywhere: **no border-radius**, no drop shadows, no rounded cards.
- **Buttons:** only `.btn .btn-gold` (solid gold) and `.btn .btn-line` (thin outline).
  Uppercase, letter-spaced, square.
- **Photos** sit in `.slot` containers (handles empty/missing images). Galleries use the existing
  masonry and lightbox. Never add watermarks, filters or rounded image corners.
- **Motion:** only the existing subtle fade-up `.reveal` and slow image zoom. No new animations,
  carousels, parallax or popups.
- **Wordmark:** "Andrew Stankus" in serif with "AGENCY" small, spaced and gold underneath.
- **Voice:** confident, editorial and short, in the style of World Red Eye, BFA or Patrick
  McMullan recaps. Event recaps open with a dateline ("Cleveland, OH – November 12, 2026 – …").

## How to build new things

- Copy an existing section or component and change its content, rather than inventing new styles.
- New CSS goes next to similar rules in the same file and uses the variables above.
  Never hard-code new hex colors or font sizes that don't match the existing scale.
- **No frameworks or build tools:** no Tailwind, Bootstrap, React or npm packages.
  The site is plain HTML, CSS and JS plus `tools/build.py`.
- Keep it fast: no new third-party scripts or trackers without asking.
- Always check the result on mobile (≈390px wide) and desktop (≈1440px wide).

## Files

- Edit: `index.html`, `assets/event.css`, `assets/event.js`, `tools/build.py` (event page
  templates), `content/events/*.md` (posts), `data/site.json` (homepage content).
- Category pages (`/gala-photography/` etc.) come from `data/categories.json`; a post appears on the
  page whose `match` list includes its "Type of coverage".
- **Generated, never edit by hand** (overwritten on every build): `events/*/index.html`, the category
  pages (`gala-photography/index.html` and the others listed in `data/categories.json`),
  `events/events.js`, `data/site.js`, `sitemap.xml`, `robots.txt`.
  Run `python3 tools/build.py` after changing content or templates.
- Photos live in Cloudflare R2 (`photos.andrewstankus.com`), not in this repo.
- Content is also edited through Pages CMS (`.pages.yml`). Keep field names in `.pages.yml`,
  `data/site.json` and `tools/build.py` in sync.
