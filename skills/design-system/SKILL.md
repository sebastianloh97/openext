---
name: design-system
description: Find and apply the project's own design system in design/ (Open Design layout — DESIGN.md + system/). Use when building or changing UI — HTML artifacts, frontend components, themes, or tokens — in a repo that ships a design/ folder.
license: MIT
compatibility: Reading a package needs no tooling; previewing HTML artifacts needs a static file server.
metadata:
  author: sebastian
  version: "1.0"
---

# Consume the project's design system

`design/` at the repository root is the project's **design package** — the source of truth for one product surface. This skill ships no visual rules of its own; it tells you how to find the package, read it, and enforce it. Trust the package in front of you over this skill or generic defaults.

## Authority

- **Behavior and features:** the implementation (source and API) is the truth; the UI reflects it.
- **Design:** the package is the truth for visual language, components, and tokens.
- **`ref/`:** approved sources, scope boundaries, and provenance — input and constraint, not design authority.
- **Conflicts:** where the package and a reference differ, the package wins; a reference shows intent where the package is silent.

## 1. Locate the package

1. Check `design/` at the repo root.
2. If it is missing, search for an entrypoint before giving up: `**/DESIGN.md` and `**/brand.json` (usually still under `design/`). The project's `AGENTS.md` or `README.md` may name the folder explicitly — follow that.
3. If no package exists, **stop and tell the user**. Do not invent colors, fonts, or components; either they point you at the package or they ask you to create one.

## 2. Read it before producing anything

| File | What it gives you |
|---|---|
| `design/DESIGN.md` | Entrypoint: identity, tokens, typography, layout, components, interaction patterns, and the package's own rules for generated work. YAML frontmatter carries machine-readable fields (`themes`, `colors`, `surface`). |
| `design/SKILLS.md` | The package's own agent guide. When present, it wins over this skill for package-specific steps. |
| `design/ref/` | Project-specific references — scope/boundary docs, visual source, provenance. Read `ref/README.md` first. |
| `design/brand.json` | Machine-readable brand: token values, typography, layout metrics, voice, asset paths. |
| `design/system/BRAND-SYSTEM.md` | File map, theme convention, re-theming and add-component/add-artifact procedures. |
| `design/system/kit.html`, `design/system/index.html` | Live component showcase and gallery — the fastest way to see canonical markup. |

Read all of `DESIGN.md` plus whichever entries your task touches. Any scope, boundary, or deferred-features document bounds what you may build.

## 3. Rules that hold across packages

1. **The package is the only source of truth for design.** Read tokens, components, and copy guidance from it; reference them rather than restating them in code or docs.
2. **Tokens only.** Reference the package's token variables/classes. No hardcoded color, radius, shadow, or font values outside the token files it designates.
3. **Respect the theme convention.** Check the `themes` frontmatter and the token file: which theme is default and how the variant is selected. Render and check **every** supported theme before calling UI work done.
4. **Reuse before invent.** Find the closest component in the showcase and copy its markup or idiom. A genuinely new component belongs in the package's shared component source **and** its showcase in the same change.
5. **Show real states.** Every asynchronous surface ships loading, empty, and error states built from the package's own utilities.
6. **Typography and copy follow the package.** Use its type roles and voice; no marketing language, emojis, or invented metrics beyond what it sanctions.
7. **Stay in scope.** Build only what the package's scope document allows; ask before touching deferred items.

## 4. Workflow A — HTML artifact or prototype

1. Start from the package's canonical shell/template artifact (e.g. `system/artifacts/app-shell.html`), not a blank page.
2. Link the shared CSS and assets with paths relative to your page; never inline or fork tokens/components.
3. Serve the package over HTTP and inspect it — `file://` often breaks external SVG sprites and font loading:
   ```bash
   cd design && python3 -m http.server 4173
   # open the gallery (e.g. http://localhost:4173/system/index.html), then the target page
   ```
4. Check every supported theme through the package's own toggle.
5. Register a new page in the gallery/index the package provides.
6. Add new components to the shared library and showcase.

## 5. Workflow B — app integration (React/Vue/etc.)

1. Look for a consume/copy script in the package (e.g. `system/scripts/*.mjs`) and prefer it over manual copying.
2. If the package ships a framework bridge (for example a Tailwind `@theme` token file), import token CSS in the documented order, then the bridge.
3. Port components from the showcase into the app's idiom (e.g. shadcn/Radix), keeping token names and theme wiring identical to the package.
4. Use the framework's utilities for layout and spacing; use the package's classes/tokens for chrome so the app and the HTML artifacts match.
5. Wire the theme toggle to the same selector/class and persistence key the package documents.

## 6. Verify before reporting done

- [ ] `DESIGN.md` and `SKILLS.md` (when present) read; any conflict resolved in favor of the package.
- [ ] Every supported theme rendered and checked.
- [ ] No token values hardcoded outside the package's token files.
- [ ] New components live in the shared library **and** the showcase.
- [ ] Loading, empty, and error states exist on every async surface.
- [ ] Scope/boundary document respected.
- [ ] The project's build/lint/typecheck/tests pass (see its `AGENTS.md`); otherwise serve the artifact and inspect it.

## 7. When package and code disagree

Split by domain: design conflicts resolve to the package; behavior or feature conflicts resolve to the implementation, and the UI is fixed to match. Surface the divergence either way. Update the package only when the user asks — it is a maintained artifact, not generated scratch.
