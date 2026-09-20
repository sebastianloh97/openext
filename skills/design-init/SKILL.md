---
name: design-init
description: Create or refresh a project's design workspace at design/ — the design system plus a live HTML clone of the product. Use when initializing design for a greenfield repo, capturing an existing frontend as the clone (brownfield), or re-theming, extending, or auditing an existing workspace.
license: MIT
compatibility: Needs a static file server to verify; browser tooling optional for screenshots.
metadata:
  author: sebastian
  version: "2.0"
---

# Initialize or refresh the design workspace

`design/` is the project's design workspace — framework-neutral HTML+CSS+JS
with exactly two moving parts:

- `design/system/` — the design **language**: tokens, base styles, component
  library, component kit, shared theme toggle, and framework bridges. Consumed
  by every clone page **and** by the real app through a bridge.
- `design/app/` — the **product clone**: one HTML page per route, wired
  navigation, inline sample data, `?state=` URL params for async surfaces.
  Service-free: it runs from a static file server and nothing else.

The clone **is** the design: review happens on the working diff, a pin is a
git commit (see the `design-draft` skill). Sibling skills: `design-draft`
(iterate the clone), `design-system` (implement from the clone into the real
app). Keep the workspace portable: no repo-specific paths inside `design/`.

## 0. Pick the mode

- `design/DESIGN.md` (or `**/DESIGN.md` + `brand.json`) exists:
  - `app/` already carries route pages → **refresh** (section 7).
  - `app/` is empty or capture-pending → **capture the missing clone** (sections 4B and 6; the existing system, `DESIGN.md`, and bridges stay as authored).
- No workspace, but the repo ships a frontend (routes/screens in source, or a running instance) → **capture** (sections 1, 2C, 3, 4B, 5, 6).
- Otherwise → **create** (greenfield; sections 1–6). A partial `design/` without `DESIGN.md` is adopted if consistent, otherwise re-authored.

## 1. Assess the repo

1. Inventory the inputs the user points at: reference material (mock HTML, screenshots, brand docs, scope docs) wherever it lives, or the real frontend itself.
2. Detect the frontend framework for the bridge: `pubspec.yaml` with `flutter` → Flutter; `package.json` dependencies (`react` + `tailwindcss`, `astro`, `@angular/core`, `vue`, `svelte`, `next`, ...) → that stack; backend-only or no frontend yet → no bridge now, note it for integration time.
3. Skim `README.md` / `AGENTS.md` for what the product is and who uses it.

## 2. Source the design

**A. Reference path — usable material exists.** Consume the approved source: extract palette, typography, radius and density, component idioms, and voice from the mocks/docs. Where references conflict, follow the newest approved one. Reference material is one-time input: after scaffolding, offer to delete it (git keeps the history) — it does not persist as a workspace citizen.

**B. Interview path — no references.** Ask one round, every question with a proposed default so the user can simply confirm:

1. What is the product and who uses it (operator console / consumer app / marketing / content)?
2. Tone in three adjectives?
3. Brand color or vibe (a hex, or keywords you will translate into a palette)?
4. Themes: dark default, light default, or both?
5. Density: compact or comfortable?
6. Fonts or icons to use or avoid? Any apps worth imitating?

Then present the seed (palette hex swatches, type, radius, density) and get confirmation **before** authoring. If the user would rather supply material, tell them where to put it and re-run — then stop.

**C. Capture path — the existing frontend is the source.** Extract the language from the real app: theme files, style constants, component styling (a Flutter `ThemeData`, CSS/Tailwind config, design tokens in code). Where the app is inconsistent, pick the dominant idiom and record the deviation as capture drift (section 4B, step 6). This path runs with capture mode only; the interview and reference paths are for creating language, not copying it.

## 3. Author the package

This skill's `assets/skeleton/` is a complete minimal workspace that serves and renders as-is — instantiate it, never author from blank:

1. Copy `assets/skeleton/` to `design/` verbatim.
2. Resolve every marker: `grep -rn "TODO(project)" design/` — seed values from section 2, product identity and slug, the theme persistence key in `system/assets/theme.js`, fonts if a specific font was chosen (vendor into `system/assets/fonts/`, wire in `base.css`).
3. Extend rather than rewrite: project tokens append to the bottom of `variables.css` (core token names are the cross-project contract — never rename them); project components go into `components.css` **and** `kit.html`; the JSON mirrors (`tokens.<theme>.json` per declared theme, `seed.json`, `brand.json`) must match `variables.css` exactly — see `system/tokens.example.json` for the shape.
4. Single-theme product: delete the unused theme block in `variables.css`, the toggle wiring, and update the `themes:` frontmatter.

Done when `grep -rn "TODO(project)" design/` returns nothing.

## 4. Author the clone (`design/app/`)

**4A. Greenfield — build the discussed screens.** From the interview/discussion, create the agreed screens directly in `app/`:

- One kebab-case `.html` file per route, each started from `system/app-shell.html`.
- Wire navigation between pages (real `<a href>` links).
- `app/index.html` is the route directory; keep it current as pages land.
- Every async surface gets loading/empty/error states via `?state=` URL params.
- Inline sample data marked as sample; a source comment at the top of each page records the request and any assumed contract.
- Start minimal — the `design-draft` skill iterates from here.

**4B. Brownfield — capture the existing frontend.** The input is the real app: its source (router config, screens/widgets, API DTOs) and, when runnable, the live instance through a browser. The output is a faithful clone:

1. Inventory every route/screen from the router and navigation; list them in `app/index.html` first and confirm coverage with the user before building.
2. Reproduce each route as one `app/<route>.html` using the shared system CSS and kit components — matching the real app's layout, copy, labels, and states, not an idealized version. Read the actual screen code for real entities, field names, statuses, and empty/error treatments; mark any fabricated value clearly as sample.
3. Interactive states the real app has (loading, empty, error, disabled, edit vs create) become `?state=` params on the page, same convention the `design-draft` skill uses.
4. Wire navigation exactly as the app does; the clone must be walkable end-to-end without any service running.
5. Fold any legacy artifact/design pages into their full-route pages as you reach them, then delete the leftovers.
6. Note per-page drift you had to resolve (app ≠ system tokens, missing states) in the report — those are follow-up design decisions.

Done when every route listed in `app/index.html` serves, is reachable by
navigation from another page, and passes section 6.

Capture fidelity beats beauty: the clone's first job is to be a true starting point.

## 5. Author the framework bridge

A bridge maps package tokens onto the framework's theming mechanism. Author it — an importable artifact or a generator script under `system/bridges/<framework>/` — following the rules in the freshly copied `system/BRIDGES.md` ("Adding a bridge"), and register it in that registry's table with concrete consume steps.

## 6. Verify

- Serve `design/` over HTTP and walk `app/index.html`: every link resolves, navigation is wired.
- Render `kit.html` and at least one app page in **every** declared theme; screenshot each if browser tooling is available.
- Geometry sanity: content clears fixed chrome (rails/top bars) at desktop and mobile widths — measure, don't eyeball.
- Token audit: no hex/rgb values outside `variables.css` and the token mirrors.
- JSON mirrors match `variables.css`.

## 7. Refresh mode (workspace exists)

Never blind-overwrite a maintained workspace. Offer exactly these options and wait for direction:

- **Extend** — new components or app pages from new requirements.
- **Re-theme** — token values only (`variables.css` + mirrors + `seed.json`/`brand.json`); nothing else changes.
- **Re-capture** — `app/` pages are missing or drifted from the shipped frontend; redo section 4B for those routes.
- **Audit** — run section 6 and report integrity only.
