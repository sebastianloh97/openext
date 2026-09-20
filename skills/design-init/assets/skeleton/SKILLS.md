# How to use this design workspace

Hand this folder to any AI coding agent together with `DESIGN.md` and it can
produce consistent work without further art direction.

## How to apply it

1. Read `DESIGN.md` first.
2. Changing a design? Edit the clone page in `app/<route>.html` in place
   (start new pages from `system/app-shell.html`, wire navigation, keep
   `app/index.html` current). Review over HTTP, pin with a git commit.
3. Link the shared CSS; never inline tokens or fork component styles. From
   `app/`: `../system/variables.css`, `../system/base.css`,
   `../system/components.css`, `../system/assets/theme.js`. From `system/`
   itself (e.g. `kit.html`): drop the `../`.
4. Serve the folder over HTTP — external assets do not work reliably over
   `file://`:
   ```bash
   cd design && python3 -m http.server 4173
   ```
5. Implementing in the real app? Tokens reach code only through the bridge
   registered in `system/BRIDGES.md` — never hand-copied — and the UI matches
   the pinned clone page. Back-port shipped reality into the clone.

## Rules that keep iterations consistent

- **Tokens only.** No color/radius/shadow/font values outside
  `system/variables.css`; no component CSS inside a page.
- **Every declared theme verified** through the workspace's toggle.
- **Reuse kit markup.** If the component exists in `system/kit.html`, copy its
  markup exactly; new components go into `components.css` **and** `kit.html` in
  the same change.
- **Real states.** Loading, empty, and error on every asynchronous surface, as
  `?state=` URL params on the clone page.
- **One screen per file**, kebab-case, with a source comment recording the
  request and any assumed contract; sample data is inline and marked.
- **Git is the workflow.** The working diff is the in-review state; pin
  decisions as commits (`pin: <decision>`).
- **Framework integration** goes through `system/BRIDGES.md` — token values
  are never hand-copied into app code.
