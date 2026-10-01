---
name: openspec-comment-audit
description: Audit and clean up code comments and docstrings in a scope - delete restatements, qualify or remove provenance citations (ISSUE-NN, design D*, task N.N, spec §N), fix vague or stale prose, and align docstrings with the code while proving every edit is comment-only. Use as the post-archive comment-audit phase of an opsx-flow change, as a writer self-check on uncommitted work before finishing, or when asked to audit or clean up comments in any file, directory, or repository.
---

# Comment Audit

Improve the comment layer without changing what the code does. Audit and fix in
one pass, then report in the response. The repo's conventions document governs;
this skill is the generic procedure.

## Scope

The request selects one of three scope forms:

1. **Explicit paths or directories** — the named files and everything under a
   named directory, minus the exclusions below. Whole-repo audits use this form.
2. **Flow change scope** — when `openspec/.opsx-flow-state.json` exists, audit
   the flow's change: `git diff <baseBranch>...HEAD` minus `openspec/**`,
   generated, and vendored paths. Only comments on added or changed lines are
   in scope; pre-existing comments are left untouched unless glaring, and
   glaring ones are reported, not edited.
3. **Session worktree changes** — when invoked as a writer self-check, audit
   the uncommitted diff against HEAD under the same added-or-changed-lines rule.

**Boundaries**

- Comments and docstrings only. Refactoring, behavior changes, tests, and new
  documentation are out of scope; report them instead.
- No report files, no commits. The final response is the deliverable.
- Fix the fix-in-pass categories directly. Report inaccurate or unresolvable
  items with a recommendation; never guess and never silently align prose to
  code.
- `audit-only` mode: when the request says audit/check/report without asking
  for fixes, stop after classification and report dispositions without editing.

## Hard rules

1. A conventions document must exist (`docs/comments.md`, or whatever
   `AGENTS.md` points at). If the repo declares none, respond NOT_APPLICABLE
   with zero edits and suggest `opsx-quality-init`; do not fall back to
   defaults. When this skill and the conventions document disagree, the
   conventions document wins.
2. Machine-read directives are executable configuration. Leave them byte-exact:
   `# noqa`, `# type: ignore`, `# pyright: ignore`, `# pragma: no cover`,
   `# fmt: off/on`, shebangs, coding lines, and their equivalents in other
   languages (full list in
   [references/comment-taxonomy.md](references/comment-taxonomy.md)).
   If one looks wrong, report it; do not edit it.
3. Edit comment regions only. Do not alter code, string literals (docstrings
   are the intended exception), regexes, heredocs, or unrelated formatting.
   Do not reformat lines you are not editing.
4. Skip generated, vendored, and frozen files: `node_modules/`, `.venv/`,
   `dist/`, `build/`, lockfiles, `*.min.*`, `*_pb2.py`, and any project
   exclusions in the conventions document.
5. Never invent rationale and never add a comment that did not exist. If the
   intent is unclear, the item goes to the decision list.
6. When a citation cannot be resolved to exactly one owner, leave the comment
   untouched and add it to the decision list.
7. A file is done only when it passes verification. A failing edit is fixed or
   reverted before moving on.

## Steps

### 1. Scope and conventions

Resolve the request into one of the three scope forms and an explicit file
list; apply the project exclusions. Load the conventions document and the
linter config.

*Done when:* the file list is explicit and the governing conventions are known.

### 2. Inventory

For Python, run the skill's scanner (resolve the path from the skill
directory), directing large output outside the repo. Prefix the command with
the project's Python runner (`uv run python` in uv projects):

```bash
python scripts/scan_comments.py <paths> --output /tmp/comment-audit-inventory.json
```

Query the inventory per file as you work; do not paste it into the response.
For other languages, collect comments and docstrings with ripgrep. Then list
every provenance token in scope: `ISSUE-NN`, `design DN`, `task N.N`,
`spec §N`, review-run labels, and `file:line` references. Under scope forms 2
and 3, compute the added-or-changed line ranges from the diff first and keep
only inventory records inside those ranges.

*Done when:* every file in scope has an inventory restricted to in-scope lines,
and every provenance token is listed.

### 3. Resolve provenance

Resolve each token to exactly one owner, in this order: the active change
directory (`openspec/changes/<name>/`) when exactly one change is active; the
matching `openspec/changes/archive/*<name>/` directory when the change is
archived; otherwise `openspec/specs/**` for stable anchors. A token with no
unique owner goes to the decision list unresolved; do not qualify by guess.

*Done when:* every token is either resolved or on the decision list.

### 4. Audit and fix, file by file

Give every in-scope comment and docstring a disposition — a class and default
action from [references/comment-taxonomy.md](references/comment-taxonomy.md).
Apply the fix-in-pass actions; record the report-only findings with evidence.
Read the surrounding code before deleting or rewriting anything: the guard is
whether the comment tells the reader something the code cannot.

*Done when:* every in-scope comment and docstring has a disposition, and every
fix-in-pass disposition is applied.

### 5. Verify

Run the project's verification for each changed file. Default Python floor:
`ruff check`, `ruff format --check`, `pyright` on the changed files (the
conventions document overrides), plus the comment-only proof:

```bash
python scripts/check_comment_only.py --base HEAD <files>
```

The proof drops docstrings from both revisions and compares ASTs, so it fails
on any edit outside comments and docstrings. For non-Python files, run the
language toolchain the conventions document names, then review the diff with
comments stripped to confirm no code moved. Fix or revert failures before
continuing.

*Done when:* every changed file passes, or is reverted.

### 6. Respond

Use the response format below. Include every fixed item, every report-only
item with its recommendation, the verification result, and skipped files.

*Done when:* the response accounts for every file and every finding in scope.

## Response format

```markdown
## Comment audit — <scope>

**Fixed:** N comments/docstrings across M files
- `path:line` — <what changed> (old form → new form)

**Decision list:** K items
- `path:line` — <what the comment claims vs what the code does, or why the
  citation is ambiguous>
  Recommendation: <update the comment to match the code | fix the code to
  match the comment | confirm intent | supply the owning change>

**Verification:** <commands run and results per file>

**Skipped:** <files and reasons: generated, frozen, out of scope>
```

In `audit-only` mode, title the first section **Proposed** and list the
dispositions that would be applied. Report-only items always carry one
recommendation. Keep entries one or two lines; cite symbols, not line ranges,
for behavior.

When the scope has no conventions document, or no comment-bearing diff, respond
NOT_APPLICABLE with zero edits: state which precondition failed and, for a
missing conventions document, name `opsx-quality-init` as the fix.
