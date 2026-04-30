# Tramokyo Brand Guide

Quick-reference for the visual + verbal language used across the site. Pulled from
what's actually shipped in `index.html` and `admin.html`. Treat this as the
source of truth when adding new pages, copy, or marketing material.

---

## 1. Identity in one paragraph

Tramokyo is the 2026 edition of an annual, invitation-only campout in Landers,
California — a four-night gathering of friends celebrating one person's
birthday with the texture of a Japanese mountain festival. The brand is
**desert-warm + ink-disciplined + quietly Japanese.** Cream paper, ink-line
borders, a single red used like a stamp, and Japanese kana (kanji) used as
section markers — never as decoration. Voice is terse, sensory, present-tense,
and self-aware about the desert without being precious.

The yearly name follows a "tram-prefix" pattern: TramCon (2018) → Detrampression
→ Into the Tramverse → Tramlympics → Tramsformation Summit → Tramchella → A
State of Tramce → **Tramokyo** (2026). Future names should continue the pun.

---

## 2. Color

CSS variables live at the top of `index.html` and `admin.html`. Use them by
name; do not hardcode hex elsewhere.

| Token | Hex | Where it goes |
|---|---|---|
| `--oy-red` | `#E8412A` | Primary. CTA fill, accent letters in headlines, kana, the rising-sun mark, error text. |
| `--oy-red-deep` | `#C8341F` | CTA hover, admin column header. |
| `--oy-red-soft` | `#F4B8AC` | Subtle red wash; rarely used directly. |
| `--oy-cream` | `#F2E8D5` | Page card surface (paper). The "background" of the brand. |
| `--oy-cream-soft` | `#EADFC8` | Slightly cooler cream. |
| `--oy-cream-warm` | `#F7F0E0` | Slightly warmer cream — admin row highlights, soft cards. |
| `--oy-ink` | `#1C1917` | Text, hairline borders that read as black. |
| `--oy-ink-soft` | `#3B3430` | Body copy. |
| `--oy-mute` | `#6B625B` | Meta text, eyebrows, mono labels. |
| `--oy-hairline` | `#C8BCA3` | Light divider lines on cream. |

**Body background is `--oy-red`.** The cream "frame" sits inset on top with a
thin red border 10px in — that red-on-red-on-cream stack is the brand's
signature lockup.

**Don'ts.** No additional accent colors (no blue links, no green success). State
colors reuse the palette: red = error, mute = idle, ink = saved.

---

## 3. Typography

Four families, four jobs. Loaded together from Google Fonts.

| Token | Family | Used for |
|---|---|---|
| `--oy-font-display` | **Archivo Black** (Impact fallback) | All-caps headlines, day numbers, the brand wordmark. Short bursts only — never paragraphs. |
| `--oy-font-body` | **DM Sans** | All running copy, buttons, labels, navigation. The default for everything that isn't a headline, kana, or code. |
| `--oy-font-jp` | **Zen Kaku Gothic New** (Hiragino fallback) | Kanji and katakana labels (`名前`, `体験`, `約束`). Always paired with a Latin counterpart, never standalone. |
| `--oy-font-mono` | **JetBrains Mono** | Tiny meta strings: stamp text ("Form A-01"), eyebrows, the footer's `EST · 2026 · 山中湖`, admin toasts. Always uppercase, letter-spaced 1.5–2px. |

**Headline pattern.** Display caps in ink, with one accented line in red:

> **WELCOME TO THE SUN & MOON,**
> *deepening connection with our gifts,*
> **IN CELEBRATION AND CEREMONIES.**

The red line is the soul-line. Don't accent more than one line per headline.

**Headline rhythm.** Set tight: `letter-spacing: -0.5px`, `line-height: 1.05`.
Body copy breathes: `line-height: 1.55–1.6`.

---

## 4. Visual language

Six recurring motifs. Reach for these before inventing new ones.

1. **The cream frame.** Every page sits on a red body, inside a cream card with
   `border-radius: 10px` and a 1.5px red inset border 10px in. That double
   edge is the brand's "passport" feeling.

2. **Kana labels.** Section titles pair English with a kanji compound, set in
   red, weight 900, letter-spacing 4px, often above the headline.
   `名前 / Your Bearings`, `体験 / Your Experience`, `場所 / Find Us`,
   `管理 / Admin`. Don't pick kanji for vibes — match the section's actual
   meaning. When uncertain, ask a native speaker; a wrong kanji reads
   clumsy and undoes the whole effect.

3. **The stamp.** Mono-font, uppercase, ink border, tight padding. Used for
   form numbers (`Form A-01 · October 2026`), build IDs, archive markers.
   Treat it like a date stamp on official paperwork.

4. **The hero illustration.** Flat hand-drawn-feeling shapes, ink + red + cream
   only. Joshua tree silhouette, red sun, red rock cluster, heat-wave squiggles.
   Currently `assets/hero-bg.png`. Never use photographic stock imagery — it
   breaks the palette and the paper texture.

5. **CTA pair.** A solid red button with a 1.5px ink offset shadow box behind it
   (`.oy-btn`), next to a transparent ink-bordered ghost button (`.oy-btn--ghost`).
   The offset shadow is what makes the button feel printed, not digital.

6. **Perforation dividers.** Form sections separate with a dashed/perforated
   line (`.reg-perforation`), reinforcing the "this is paperwork" metaphor.
   Use them between form sections, not anywhere else.

---

## 5. Voice & tone

The whole site reads like field notes from someone who's been to this thing
seven times. Specific cadence rules:

- **Sensory and present-tense.** *"Eyes adjust. Mostly you listen."*
  *"Cast iron on coals. One long table."* Not *"You will arrive at..."*.
- **Short sentences, then a longer one for breath.** Beat the rhythm of stage
  directions. Mostly fragments are fine.
- **Self-aware about the desert.** *"the desert owes me nothing."*
  *"chickens on their own recognizance."* The humor is dry, not zany —
  observational, not punching.
- **Specific over general.** "$175 per adult" not "a small fee." "Six
  available." not "a few." "Disclosed Privately" not "TBD." Concrete numbers
  feel like they came from a real organizer.
- **Japanese texture, not cosplay.** Use kanji as section markers and the
  occasional word like *robata* or *onsen* in their natural place. Don't
  romanize whole sentences ("Konnichiwa, friend!"). Don't add 〜 or ★ or
  emoji-ish flourishes.
- **No marketing words.** No *journey*, *experience*, *unforgettable*,
  *immersive*, *curated*. The form is called an "Expedition Manifest" — that
  is the entire allowance for theming the copy.
- **Compliance copy is part of the show.** The liability section is funny on
  purpose ("drank yesterday is how hydration works") because it tells you the
  organizers are friends, not lawyers. Keep that energy if you write more.

---

## 6. Component patterns

When adding UI, prefer composing from these. They're already built and
internally consistent.

| Pattern | Class / location | Notes |
|---|---|---|
| Primary CTA | `.oy-btn` in `index.html` | Red fill + ink offset shadow. Hover deepens the red and nudges 1px up-left. |
| Secondary CTA | `.oy-btn--ghost` | Transparent + ink border. Hover turns red. Always pair with a primary. |
| Pill | `.oy-pill`, `.oy-pill--cta` | Used in nav-style filters; rounded; less weight than CTA. |
| Chip | `.oy-chip` | Small uppercase label, ink border on cream — used as inline tags. |
| Stamp | `.stamp` (in admin) / `.reg-hero-head .stamp` | The mono-font ink-bordered date marker. |
| Day card | `.oy-day-col` | Vertical column with giant red day number, kanji weekday, list of program cards inside. |
| Form section | `.reg-section` | Letter-coded (`A`/`B`/`C`...) heading on the left, kanji on the right, perforation between sections. |
| Stat block | `.oy-stats` / `.oy-stat-num` | Big-number-plus-eyebrow pattern. Numbers in display font, label in mono caps. |

---

## 7. Imagery rules

- **Allowed:** flat hand-drawn illustrations using only ink, red, and the cream
  family; the existing site map (`assets/map.jpg`); the logo (`assets/logo.png`).
- **Avoid:** photo stock, Unsplash desert photography, drone shots, glossy
  product imagery, gradient meshes, neon, AI-renders that look "rendered." If
  it would look out of place clipped onto a paper field guide, it doesn't
  belong here.
- **Aspect.** Hero scene is square-cropped (`aspect-ratio: 1/1`,
  `object-fit: contain`). The map is rectangular and lives inside its own
  framed card.

---

## 8. Don'ts

- Don't introduce new colors, fonts, or radii — extend the existing tokens.
- Don't add gradients, drop shadows beyond the existing offset-box pattern, or
  glassmorphism. The brand is paper, not glass.
- Don't use emoji in body copy or UI labels (the registration form's 🪧 is the
  one intentional exception inside an "official" sign-build callout). Admin
  uses arrows like `↑ ↓ →` for affordance — those stay.
- Don't translate the kanji into "fun" English (no "Naaaames!" — just
  "Your Bearings"). The form is a manifest, not a personality quiz.
- Don't add "Tramokyo™" or trademark/copyright cruft. The site's footer says
  `EST · 2026 · 山中湖` and that is the entire legal voice.

---

## 9. File map for the brand assets

```
/assets/
  logo.png              brand wordmark
  hero-bg.png           home hero scene (Joshua tree + red sun)
  map.jpg               site map illustration
/index.html             public site — :root is the canonical token list
/admin.html             admin dashboard — same tokens, restated locally
/BRAND.md               this file
```

When the token list in `index.html` changes, update the table in §2 here too.
