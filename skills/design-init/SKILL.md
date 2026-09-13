---
name: design-init
description: Create or refresh a project's design package at design/. Derives the design system from reference material in design/ref/ or a short seed interview when no references exist, then authors DESIGN.md, tokens, a starter component kit, gallery, drafts folder, and a framework bridge (Tailwind, Flutter, Astro, Angular, ...). Use when initializing design for a repo, re-theming, extending, auditing, or importing new approved references.
license: MIT
compatibility: Needs a static file server to verify; browser tooling optional for screenshots.
metadata:
  author: sebastian
  version: "1.3"
---

# Initialize or refresh the design package

`design/` is the project's design package — framework-neutral HTML+CSS+tokens. This skill **creates** it from reference material or an interview, or **refreshes** an existing one. Sibling skills: `design-system` (consume the package), `design-draft` (fill it with screens). Keep the package portable: no repo-specific paths inside `design/`.

## 0. Pick the mode

- `design/DESIGN.md` (or `**/DESIGN.md` + `brand.json`) exists → **refresh**: section 7 only.
- Otherwise → **create**: sections 1–6. A partial `design/` without `DESIGN.md` is adopted if consistent, otherwise re-authored.

## 1. Assess the repo

1. Inventory `design/ref/`: read `ref/README.md` if present, else classify every file (mock HTML, screenshots, brand docs, scope docs, competitor links).
2. Detect the frontend framework for the bridge: `pubspec.yaml` with `flutter` → Flutter; `package.json` dependencies (`react` + `tailwindcss`, `astro`, `@angular/core`, `vue`, `svelte`, `next`, ...) → that stack; backend-only or no frontend yet → no bridge now, note it for integration time.
3. Skim `README.md` / `AGENTS.md` for what the product is and who uses it.

## 2. Source the design

**A. Reference path — `ref/` has usable material.** Consume the approved source: extract palette, typography, radius and density, component idioms, and voice from the mocks/docs. Where references conflict, follow the newest approved one and record provenance in `ref/README.md`. A scope doc in `ref/` bounds V1; carry its boundaries into `DESIGN.md`. Proceed and report — the source is already approved.

**B. Interview path — `ref/` is empty or unusable.** Ask one round, every question with a proposed default so the user can simply confirm:

1. What is the product and who uses it (operator console / consumer app / marketing / content)?
2. Tone in three adjectives?
3. Brand color or vibe (a hex, or keywords you will translate into a palette)?
4. Themes: dark default, light default, or both?
5. Density: compact or comfortable?
6. Fonts or icons to use or avoid? Any apps worth imitating?

Then present the seed (palette hex swatches, type, radius, density) and get confirmation **before** authoring. If the user would rather supply material, tell them to place it in `design/ref/` and re-run this skill — then stop.

## 3. Author the package (create mode)

This skill's `assets/skeleton/` is a complete minimal package that serves and renders as-is — instantiate it, never author from blank:

1. Copy `assets/skeleton/` to `design/` verbatim.
2. Resolve every marker: `grep -rn "TODO(project)" design/` — seed values from section 2, product identity and slug, the theme persistence key in `system/assets/theme.js`, fonts if a specific font was chosen (vendor into `system/assets/fonts/`, wire in `base.css`), plus `ref/README.md` rows for the reference material.
3. Extend rather than rewrite: project tokens append to the bottom of `variables.css` (core token names are the cross-project contract — never rename them); project components go into `components.css` **and** `kit.html`; the JSON mirrors (`tokens.<theme>.json` per declared theme, `seed.json`, `brand.json`) must match `variables.css` exactly — see `system/tokens.example.json` for the shape.
4. Single-theme product: delete the unused theme block in `variables.css`, the toggle wiring, and update the `themes:` frontmatter.

## 4. Author the framework bridge

A bridge maps package tokens onto the framework's theming mechanism. Author it — an importable artifact or a generator script under `system/bridges/<framework>/` — following the rules in the freshly copied `system/BRIDGES.md` ("Adding a bridge"), and register it in that registry's table with concrete consume steps.

## 5. Verify

- Serve `design/` over HTTP and open `system/index.html`; every link resolves.
- Render `kit.html` in **every** declared theme; screenshot each if browser tooling is available.
- Token audit: no hex/rgb values outside `variables.css` and the token mirrors.
- JSON mirrors match `variables.css`.

## 6. Report

File map, preview URL, the seed summary, and the next step: draft screens with the `design-draft` skill.

## 7. Refresh mode (package exists)

Never blind-overwrite a maintained package. Offer exactly these options and wait for direction:

- **Extend** — new components or artifacts from new requirements.
- **Re-theme** — token values only (`variables.css` + mirrors + `seed.json`/`brand.json`); nothing else changes.
- **Import references** — reconcile new `ref/` material into the package; update `ref/README.md`.
- **Audit** — run section 5 and report integrity only.
