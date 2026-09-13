---
name: design-draft
description: Draft frontend screens as HTML pages in design/drafts/ by understanding the codebase and applying the project's design package. Use when asked to mock up, draft, wireframe, or prototype screens and pages, to revise an existing draft, or to promote an approved draft into the canonical design system.
license: MIT
compatibility: Needs the design package and a static file server; browser tooling optional for screenshots.
metadata:
  author: sebastian
  version: "1.2"
---

# Draft screens in design/drafts/

Drafts are HTML explorations that show how a screen should look and behave before it is implemented. They live in `design/drafts/` — disposable by design, never canonical until promoted. The folder is the state: everything in `drafts/` is a live draft awaiting review; everything in `system/artifacts/` is canonical. The `design-system` skill's locate/read rules apply: if no package exists, stop and point the user at `design-init`.

## 1. Preconditions

Read, in order: `design/DESIGN.md`, `design/SKILLS.md` (the package guide wins on package-specific steps), `design/system/kit.html` (the component inventory), any scope doc under `design/ref/`, and `design/drafts/README.md` (existing drafts, statuses, and the draft conventions — the package's own docs win over this skill).

## 2. Understand the product from the codebase

Drafts are grounded in the real product, not filler. Read `README.md`/`AGENTS.md`, find the frontend's routes or screens, and find the API schemas/models/DTOs behind the entities each screen shows. Use real entity names, field labels, statuses, and copy the backend actually supports. No lorem ipsum, no invented metrics, no features the codebase does not have. Where data cannot be found, mark sample values clearly as sample.

## 3. Announce the plan

State in one message the screens you will draft and a one-line intent for each, then proceed — the user redirects mid-run if needed. Stop and ask only when scope or behavior is genuinely ambiguous.

## 4. Author each draft

- `design/drafts/<kebab-case>.html`; register every draft in the `drafts/README.md` review queue.
- Give each draft the source comment and relative CSS paths defined in `drafts/README.md`.
- Start from `system/artifacts/app-shell.html` when it fits. Link the shared CSS; never inline tokens or fork component CSS.
- Tokens only; reuse kit components before inventing. A genuinely new component goes into `components.css` **and** `kit.html` in the same change, even mid-draft.
- Every asynchronous surface gets loading, empty, and error states from the package's utilities. ARIA basics: real `<button>`/`<label>` elements, `aria-label` on icon-only buttons.
- Every declared theme must work through the package's own toggle.
- Follow the interaction patterns `DESIGN.md` documents; use the package's shared JS where it exists, otherwise minimal inline JS for toggles only.

## 5. Self-review (all items must pass)

Serve `design/` over HTTP (`python3 -m http.server 4173`, then `http://localhost:4173/drafts/<name>.html`) and open each draft in every declared theme; screenshot each if browser tooling is available.

- [ ] Scope doc respected; no deferred features drafted.
- [ ] No token values hardcoded outside the package's token files.
- [ ] Every theme rendered and checked.
- [ ] Content is real — entities, labels, and states from the codebase.
- [ ] Registered in the `drafts/README.md` review queue.

## 6. Revise

Edit drafts in place; keep the index row's summary current. Rejected or abandoned drafts are simply deleted — the folder holds only live drafts awaiting review.

## 7. Promote — on approval, before implementation

Promotion follows approval immediately — in the same turn, covering every draft the approval names — and always precedes implementation: the artifact is the canonical design that implementation and any proposal/spec cite, while drafts are disposable and are never cited as a design source. Promotion is a statement of design authority, not of build status.

1. Copy the draft to `system/artifacts/<name>.html` and adjust relative paths (`../system/` becomes `../`; `../ref/` becomes `../../ref/`).
2. Rewrite the header into artifact form: `artifact:` name, `source:`, and `approved:`/`promoted:` dates; remove "disposable"/"not canonical" wording.
3. Register it in the gallery (`system/index.html`); mention it in `DESIGN.md`'s file map if it is a primary screen.
4. Delete the draft and its index row — the folder holds only live drafts awaiting review.
5. Report what changed in the package so the user can review the promotion.

Implementation-time visual adjustments are back-ported into the artifact in the same change (the `design-system` skill's disagreement rules). A design that implementation proves fundamentally wrong returns to drafting and re-promotion — it is not patched in code alone.
