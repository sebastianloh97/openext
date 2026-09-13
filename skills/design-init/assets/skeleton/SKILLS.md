# How to use this design package

Hand this folder to any AI coding agent together with `DESIGN.md` and it can
produce consistent pages without further art direction.

## How to apply it

1. Read `DESIGN.md` first.
2. Start a new page from `system/artifacts/app-shell.html` — copy it and fill
   the main region.
3. Link the shared CSS; never inline tokens or fork component styles. From
   `system/artifacts/`: `../variables.css`, `../base.css`, `../components.css`,
   `../assets/theme.js`. From `system/` itself (e.g. `kit.html`): drop the
   `../`.
4. Serve the folder over HTTP — external assets do not work reliably over
   `file://`:
   ```bash
   cd design && python3 -m http.server 4173
   ```
5. New screens are drafted in `drafts/` first (see `drafts/README.md`) and
   promoted to `system/artifacts/` only on approval.

## Rules that keep iterations consistent

- **Tokens only.** No color/radius/shadow/font values outside
  `system/variables.css`; no component CSS inside a page.
- **Every declared theme verified** through the package's toggle.
- **Reuse kit markup.** If the component exists in `system/kit.html`, copy its
  markup exactly; new components go into `components.css` **and** `kit.html` in
  the same change.
- **Real states.** Loading, empty, and error on every asynchronous surface.
- **Framework integration** goes through `system/BRIDGES.md` — token values are
  never hand-copied into app code.
