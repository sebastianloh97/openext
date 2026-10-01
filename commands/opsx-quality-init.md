---
description: Declare a repo's quality layer - comment conventions doc, VOCAB.md vocabulary, and AGENTS.md pointers. One-time, idempotent, zero source changes.
---

# Mission: Initialize the quality layer for this repository

## Purpose

Declare how this repo keeps its comment layer and vocabulary healthy so that
quality stops depending on heroic cleanup events. You create (or adopt) three
things and nothing else:

1. A **comment conventions document** — the rules comments must follow and the
   verification commands that prove them.
2. A **`VOCAB.md`** — the project's opinionated domain vocabulary.
3. An **AGENTS.md pointers section** — so every future agent session can reach
   the conventions without being told.

This mission is the soft prerequisite for the quality features
(`openspec-comment-audit`, `improve-codebase-architecture`): those skills
degrade gracefully in a repo that declares nothing, but declared repos get the
full loop. The mission is idempotent — safe to re-run; it patches only what is
missing.

## Steps

### Step 1: Survey the repository

Determine, without changing anything:

- **Languages**: read the manifests (`pyproject.toml`, `package.json`,
  `Cargo.toml`, `go.mod`) and note the toolchain (linter, formatter, type
  checker, test runner) each declares.
- **Existing conventions surfaces**: `AGENTS.md`, `CONTRIBUTING.md`, `docs/*`
  — is there already a comment or documentation conventions document?
- **Lint config** and how verification is invoked ( Makefile, package
  scripts, justfile, CI config).
- **OpenSpec presence**: does `openspec/` exist?
- **Existing quality skills**: is `openspec-comment-audit` registered in
  `.opencode/openext.json` / present under `.opencode/skills/`?

Done when: you can name the languages, the toolchain, and whether each of the
three artifacts already exists.

### Step 2: Interview the master

Use the question tool. Ask only what the survey could not answer:

1. **Conventions document**: adopt the existing document as-is, extend it with
   the missing sections from the template below, or scaffold a new one?
2. **`VOCAB.md`**: create it? For a brownfield repo, propose candidate terms
   harvested from code identifiers, enums, and docs, and let the master prune;
   never seed the file unasked with a full glossary.
3. **AGENTS.md pointers**: confirm which pointers to add (conventions doc,
   VOCAB rule, available quality skills).

Done when: the master has picked adopt/extend/scaffold, the VOCAB seed set,
and the pointer set.

### Step 3: Write only these

Create exactly the agreed artifacts; touch nothing else.

**Conventions document** — use this template, with the language-specific
verification section tailored to the surveyed toolchain. Ship fully written
Python and TypeScript modes; for any other language, write the generic
fallback pattern and flesh it out only when the repo actually needs it.

```markdown
# Comment Conventions

Comments tell the reader what the code cannot. Anything the code already says,
the comment layer must not repeat.

## Rules

- Prefer deletion. A comment that can be removed without losing information
  should not exist.
- Bare provenance tokens are banned: `ISSUE-NN`, `design DN`, `task N.N`,
  `spec §N`. The qualified form `(<change-name> ISSUE-NN)` is allowed only when
  it anchors a constraint the code cannot express.
- No review-run labels (`R-5`, "review decision", "run 3").
- No `file:line` citations; name the symbol instead.
- No author names, dates, or changelog narration; git holds history.
- No commented-out code. Delete it; git holds removed code too.
- Machine-read directives are executable configuration and stay byte-exact:
  `# noqa`, `# type: ignore`, shebangs, coding lines, and their equivalents.
  If one looks wrong, report it; never edit it silently.
- An inaccurate comment is a defect report, never a silent fix: report the
  mismatch with a recommendation instead of aligning prose to suspect code.

## Verification

Every comment-only change must prove it changed nothing else.

### Python

- `ruff check <files>`
- `ruff format --check <files>`
- `pyright <files>` (scoped to changed files)
- AST comment-only proof: `python scripts/check_comment_only.py --base HEAD <files>`
  (from the `openspec-comment-audit` skill)

### TypeScript

- `<typecheck command>` (e.g. `tsc --noEmit` / `<build command>`)
- Comment-stripped diff review: strip comments from both revisions and confirm
  the remaining diff is empty.

### Other languages

- Run the language toolchain's check command, then review the diff with
  comments stripped to confirm no code moved.
```

**`VOCAB.md`** (when agreed) — one entry per domain term, opinionated:

```markdown
# {Context Name}

{One or two sentences on what this context is and why it exists.}

## Language

**Order**: {what it IS, not what it does; one or two sentences}
_Avoid_: Purchase, transaction
```

Rules: pick one term and list the others under `_Avoid_`; definitions of one
or two sentences; only domain-specific terms, never general programming
concepts; group under subheadings when natural clusters emerge; no
implementation details in the file.

**AGENTS.md pointers section** (when agreed) — a short section pointing at:

- the conventions document (path),
- the `VOCAB.md` rule (follow it when naming things in this repo),
- the available quality skills (`openspec-comment-audit`;
  `improve-codebase-architecture` when installed).

Done when: only the agreed artifacts exist on disk.

### Step 4: Validate

- Every AGENTS.md pointer target exists on disk.
- Run the comment-audit scanner once in audit-only mode on a small scope to
  prove the toolchain, e.g.:
  `uv run python <skill>/scripts/scan_comments.py <small-dir> --summary`
  (use the project's Python runner; skip gracefully and note it if the skill
  is not installed yet).
- Legacy violations are expected and fine: delta scoping means nothing is
  blocked by old mess. Do not clean them now.

Done when: pointer targets exist and the scanner ran (or its absence is noted).

### Step 5: Report

Summarize: what was created, what was adopted, what was skipped and why, the
pointers added, and next steps — register the quality skills via
`.opencode/openext.json` and `openext init . --force` if not yet registered,
and optionally schedule a legacy whole-repo audit.

## Hard Rules

- Zero changes to source code, tests, or CI configuration.
- Ask when genuinely unclear rather than guessing.
- Safe to re-run: never duplicate an AGENTS.md section or overwrite an
  existing conventions document or `VOCAB.md` — extend only with agreement.
