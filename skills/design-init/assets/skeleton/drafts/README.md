# Screen drafts

Live drafts awaiting review — **not canonical**. The design package (`DESIGN.md`,
`system/`) is the authority; a draft only shows intent for a screen not yet
promoted. The folder is the state: everything here is a draft, everything in
`system/artifacts/` is canonical. This folder is disposable and may be deleted
without touching the system.

## Conventions

- One screen per file, kebab-case (`settings-export.html`). Serve over HTTP from
  `design/`: `python3 -m http.server 4173` →
  `http://localhost:4173/drafts/<name>.html`.
- Each draft carries a source comment near the top: the request that produced it and
  any backend contract or copy it assumes.
- Link the shared system CSS — `../system/variables.css`, `../system/base.css`,
  `../system/components.css`, `../system/assets/theme.js` — never inline tokens
  or fork component styles.
- Promotion (on approval, before implementation): copy to `system/artifacts/` and
  rewrite the header into artifact form (`artifact:`, `source:`,
  `approved:`/`promoted:` dates), fix relative paths, register in
  `system/index.html`, then delete the draft and its row here.
- Rejected or abandoned drafts are simply deleted; this folder holds only live drafts.

## Review queue

| Draft | Date | Summary |
|---|---|---|
| — | — | Nothing awaiting review |
