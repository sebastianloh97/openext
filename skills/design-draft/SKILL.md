---
name: design-draft
description: Iterate the product clone at design/app/ to change a screen's DESIGN — what it shows, how it behaves, new screens, new states — before any app code is written. Edits land directly in the clone page (?state= URL params for states) and the decided design is pinned with a git commit. The clone is the design.
license: MIT
compatibility: Needs a static file server to preview; browser tooling for verification.
metadata:
  author: sebastian
  version: "2.0"
---

# Iterate the product clone

`design/app/` is a live, service-free HTML clone of the product — one page per
route, linked to the shared design system in `design/system/`. This skill adds
or changes screens **in the clone**, the user reviews it in a browser, and the
decided design is pinned with a git commit. The working diff is the in-review
state and git history is the pin record — a separate drafts folder would only
duplicate them. Implementation (see `design-system`) works from the pinned
clone.

## 1. Preconditions

Read, in order: `design/DESIGN.md`, `design/SKILLS.md` (the package guide wins
on package-specific steps), `design/system/kit.html` (the component inventory),
and `design/app/index.html` (the route directory). Then ground the work in the
real product: read the actual screen/route code for entities, field labels,
statuses, and copy; mark any fabricated value as sample. Stop and ask only
when scope or behavior is genuinely ambiguous.

## 2. Announce the plan

State in one message which page(s) you will touch and the intent of each
change, then proceed — the user redirects mid-run if needed.

## 3. Edit the clone

- **Existing screen:** edit `design/app/<screen>.html` in place.
- **New screen:** create `design/app/<route>.html` starting from
  `system/app-shell.html`, wire navigation to and from the related pages, and
  add the route to `app/index.html`.
- **Alternatives (A/B):** a temporary `<screen>-alt.html` sibling or a git
  branch; delete the loser.
- Each page carries a source comment near the top: the request that produced
  it and any backend contract or copy it assumes.
- One screen per file, kebab-case — its states are `?state=` URL params on
  that file, never separate files (the convention the reference screens set
  with `?step=` and `?mode=`).
- Preview states cover every state the real surface has — every asynchronous
  surface gets loading, empty, and error built from the package's utilities.
- Link the shared CSS — from `app/`: `../system/variables.css`,
  `../system/base.css`, `../system/components.css`, `../system/assets/theme.js`.
  Tokens and components come from there; layout-only inline styles and a small
  layout-only `<style>` block are fine, visual values are not.
- ARIA basics: real `<button>`/`<label>` elements, `aria-label` on icon-only
  buttons, one `<main>` per page.
- Minimal inline JS for toggles, tab/param switching, and demo interactions
  only. The clone never calls a service — data is inline and marked sample.
- Tokens only; reuse kit components before inventing. A genuinely new
  component goes into `system/components.css` **and** `system/kit.html` in the
  same change. A pattern repeated across pages graduates into the shared
  library.
- Token values and component CSS are package-level: a page iterates with
  them, never around them. A new component or a re-theme is a deliberate
  package change routed through the user.

## 4. Self-review (all items must pass)

Serve `design/` over HTTP (`python3 -m http.server 4173`, then
`http://localhost:4173/app/<name>.html`) and check the touched page(s) in
**every** declared theme through the package's own toggle.

- [ ] Scope respected; no deferred features built.
- [ ] No token values hardcoded outside the package's token files.
- [ ] Every theme rendered and checked.
- [ ] Geometry verified, not eyeballed: content clears fixed chrome (rail,
      top bar) at desktop and mobile widths; no horizontal overflow; two-column
      layouts collapse at the package's breakpoint (inline grid styles defeat
      media queries — use layout-only classes).
- [ ] Every `?state=` param works; interactions wired; console clean.
- [ ] Content is real — entities, labels, and states from the codebase;
      sample values marked.
- [ ] Navigation to/from the page works; `app/index.html` current.

## 5. Pin

When the user approves the change, pin it as a git commit in the repo
(`pin: <what was decided>`). The commit is the pin — the page itself is the
canonical design from that point, with nothing copied, registered, or
rewritten anywhere else. If implementation later forces a visual deviation,
that is a `design-system` back-port: fix the clone page in the same change so
the clone stays the truth.
