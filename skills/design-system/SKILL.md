---
name: design-system
description: Apply the project's design workspace (design/) when writing or changing real frontend CODE that implements the design — the pinned design/app/ clone is the canonical screen design, reached through system/ tokens and bridges. Use when building app UI from a pinned clone page, resolving design-versus-behavior conflicts, or back-porting shipped reality into the clone.
license: MIT
compatibility: Reading a package needs no tooling; previewing clone pages needs a static file server.
metadata:
  author: sebastian
  version: "2.0"
---

# Consume the design workspace

`design/` at the repository root is the project's **design workspace**:
`design/app/` is a live HTML clone of the product (one page per route,
`?state=` params for async states) and `design/system/` is the design language
(tokens, components, kit, bridges). This skill ships no visual rules of its
own; it tells you how to find the workspace, read it, implement from it, and
keep it true. Trust the workspace in front of you over this skill or generic
defaults.

## Authority

- **Behavior and features:** the implementation (source and API) is the truth; the UI reflects it.
- **Screens:** the **pinned clone** (`design/app/` at the cited commit) is the canonical screen design. Proposals and specs cite clone pages; implementation matches them.
- **Language:** `system/` is the truth for tokens, components, and markup idioms.
- **Decisions:** pin commits in git history. The working diff is in-review work, not decided design.
- **Conflicts:** design conflicts resolve to the clone; behavior/feature conflicts resolve to the implementation — and then the clone is updated to match (see Back-port).

## 1. Locate the workspace

1. Check `design/` at the repo root.
2. If it is missing, search for an entrypoint before giving up: `**/DESIGN.md` and `**/brand.json` (usually still under `design/`). The project's `AGENTS.md` or `README.md` may name the folder explicitly — follow that.
3. If no workspace exists, **stop and tell the user**. Do not invent colors, fonts, or components; either they point you at the workspace, or they ask you to create one (the `design-init` skill does that — create or brownfield capture).

## 2. Read it before producing anything

| File | What it gives you |
|---|---|
| `design/DESIGN.md` | Entrypoint: identity, tokens, typography, layout, components, interaction patterns, and the workspace's own rules. YAML frontmatter carries machine-readable fields (`themes`, `colors`, `surface`). |
| `design/SKILLS.md` | The workspace's own agent guide. When present, it wins over this skill for package-specific steps. |
| `design/app/` | The clone — the screens to match. Read `app/index.html` for the route directory, the target page, and a neighbor for shell conventions; `?state=` params enumerate its states. |
| `design/brand.json` | Machine-readable brand: token values, typography, layout metrics, voice, asset paths. |
| `design/system/kit.html` | Live component showcase — the fastest way to see canonical markup. |
| `design/system/BRIDGES.md` | Registry of framework bridges — how tokens reach real app code. |
| `design/system/app-shell.html` | The shared page shell new clone pages start from. |

Read all of `DESIGN.md`, the target clone page(s), and whichever entries your
task touches.

## 3. Rules that hold across workspaces

1. **The workspace is the only source of truth for design.** Reference tokens, components, and clone pages rather than restating them in code or docs.
2. **Tokens only.** In the real app, token values reach code exclusively through the registered bridge — never hand-copied hex/radius/font values. In clone pages, reference the token variables/classes.
3. **Respect the theme convention.** Check the `themes` frontmatter; render and check **every** supported theme before calling UI work done.
4. **Match the pinned page.** Layout, copy, states, and empty/error treatments follow the clone page — including its `?state=` variants. A state that exists in the clone must exist in the app and vice versa.
5. **Reuse before invent.** Find the closest component in the showcase and copy its markup or idiom. A genuinely new component belongs in `components.css` **and** `kit.html` in the same change.
6. **Stay in scope.** Build only what the workspace's scope allows; ask before touching deferred items.

## 4. Workflow A — changing the design itself

Design changes happen in the clone, not in app code: use the `design-draft`
skill to edit `design/app/` in place, review over HTTP, and pin with a commit.
Only then implement.

## 5. Workflow B — implement from the clone (any framework)

1. Identify the app's frontend framework from the repo (dependency manifests, source layout). Ask only if genuinely ambiguous or there are several.
2. Read `system/BRIDGES.md` and follow the matching bridge's consume steps exactly (import order, scripts, token mapping).
3. If no bridge exists for the framework, author one in the same change under `system/bridges/<framework>/`, following `BRIDGES.md` ("Adding a bridge"), and register it there.
4. Port the pinned clone page into the app's idiom: same layout, copy, states, and interaction patterns; same token names and theme wiring the workspace documents.
5. Use the framework's utilities for layout and spacing; use the workspace's tokens/classes for chrome so the app and the clone match.

## 6. Back-port — keep the clone true

The clone is only useful if it reflects the shipped product:

- **After implementing a pinned design,** reconcile in the same change: whatever reality forced (a copy tweak, a different state treatment, a dropped control) goes back into the clone page. Reality wins — fix the clone, not just the code.
- **When the app changes without design involvement** (feature built straight in code, refactor, copy fix), the clone page for that route is now stale: update it in the same change, or flag the drift to the user and schedule a re-capture (`design-init` refresh, re-capture mode).
- **Disagreement:** if implementation proves the pinned design wrong, do not silently diverge — either fix the app to match the pinned design, or change the design first (`design-draft`, new pin) and then implement. Re-themes and new visual language always require explicit user approval.

## 7. Verify before reporting done

- [ ] `DESIGN.md` and `SKILLS.md` (when present) read; conflicts resolved per Authority above.
- [ ] The implemented UI matches the pinned clone page — layout, copy, and every `?state=` variant.
- [ ] Every supported theme rendered and checked.
- [ ] No token values hardcoded outside the bridge/token files.
- [ ] New components live in the shared library **and** the showcase.
- [ ] Loading, empty, and error states exist on every async surface.
- [ ] Clone pages touched by this work updated (back-port) or drift flagged.
- [ ] The project's build/lint/typecheck/tests pass (see its `AGENTS.md`).
