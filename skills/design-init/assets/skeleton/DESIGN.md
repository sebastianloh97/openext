---
name: "TODO(project): product name"
slug: todo-project
category: Product
surface: web
themes: [dark, light]
colors:
  background: "#141415"
  foreground: "#f2f2f2"
  accent: "#ffb000"
  surface: "#1c1c1c"
  muted: "#808080"
  border: "#333333"
---

# TODO(project): product name

> TODO(project): one line — what this surface is and who it serves.

This workspace is the single source of truth for the product's design:
`system/` is the visual language and `app/` is the live HTML clone of the
product — the screens to match. The implementation (source and API) is the
truth for features and behavior; the UI reflects it, and shipped reality is
back-ported into the clone.

## 1. Identity

TODO(project): 2-4 sentences — operator tool / consumer app / marketing? Primary
audience? Tone of UI copy? Scope guardrails and deferred features.

## 2. Color palette

Tokens live in `system/variables.css` (`:root` = first declared theme,
`body.light-theme` = light). Never hardcode a value in markup; use the token.
The starter set: surfaces (`--bg`, `--surface`, `--surface-raised`, `--border`,
`--border-soft`), text (`--text`, `--text2`, `--muted`), brand (`--primary`,
`--primary-ink`, `--primary-dim`), status (`--error`/`--error-bg`,
`--success`/`--success-bg`, `--disabled`/`--disabled-bg`). TODO(project): add
project tokens (e.g. data-series accents) at the bottom of the token file and
document them here.

## 3. Typography

System stack by default (`--font-sans`), `--font-mono` for identifiers, config
values, log lines. Base 16px; 13.5px controls; 12px metadata. TODO(project):
vendored font? Document family, weights, and where it is wired.

## 4. Layout and density

Radius 8/10/14px (`--radius-sm`/`--radius`/`--radius-lg`); 1px borders;
4px spacing baseline; `--speed` transitions. Shell: 220px sidebar + scrollable
main (see `system/app-shell.html`). TODO(project): the product's layout
patterns (list-detail, editor grid, docks...).

## 5. Components

`system/components.css` is the library; `system/kit.html` is the showcase —
copy markup from there, never restyle per page. Starter set: `.primary-btn`
`.ghost-btn` `.danger-btn`, `.card`, `.badge.ok|.err|.disabled`,
`.status-banner.ok|.err`, form fields, `.data-table`, `.empty-state`, `.toast`.
TODO(project): list primary components as the library grows.

## 6. Interaction patterns

TODO(project): the product's recurring workflows (edit-and-save, list-detail,
tenant switching...) and how the UI behaves in each.

## 7. Voice and tone

TODO(project): adjectives to use, words to use, words to avoid.

## 8. Rules for generated work

1. Read this file and `SKILLS.md` before producing any page.
2. Link the shared CSS — never inline tokens, never fork component CSS.
3. Respect the `themes:` frontmatter; render and check every theme.
4. Identifiers, config values, and log text are monospace.
5. Every asynchronous surface needs loading, empty, and error states — as
   `?state=` URL params on the clone page.
6. New component? `components.css` + `kit.html` in the same change.
7. Stay in scope; ask before touching deferred items.
8. The clone is the design: pin decisions as git commits, and back-port
   shipped reality into the clone page in the same change that ships it.

## 9. File map

| Path | What it is |
|---|---|
| `DESIGN.md` | This file |
| `SKILLS.md` | How an AI agent applies the workspace |
| `brand.json` | Machine-readable brand |
| `app/` | The product clone — one HTML page per route; `app/index.html` is the route directory |
| `system/variables.css` | Token source of truth |
| `system/base.css` | Reset, fonts, shell, utilities |
| `system/components.css` | Component library |
| `system/kit.html` | Component showcase with theme toggle |
| `system/app-shell.html` | Shared page shell new clone pages start from |
| `system/BRIDGES.md` | Framework bridge registry |
| `system/assets/theme.js` | Shared theme toggle |
