# Comment Taxonomy And Rewrite Patterns

Reference for the `openspec-comment-audit` skill. Load when classifying or rewriting:
this file owns the class list, the recognition signals, and the rewrite
patterns; the main skill owns the steps and the fix/report policy.

## Disposition classes

### Fix in pass

| Class | Recognize by | Do |
| --- | --- | --- |
| Redundant | Restates syntax: `i += 1  # increment i`, `# Count query` | Delete. If deleting loses nothing, delete. |
| Narrative/changelog | Dates, author names, "changed this to...", commit summaries | Delete; history lives in git. |
| Ownerless archaeology | `(R-5)`, `(run 3)`, "review decision", `file.py:229-253` | Delete the label; name the symbol for file refs; keep the rationale sentence. |
| Unqualified citation | `(ISSUE-7)`, `(design D9)`, `(task 7.2)`, `(spec §80)` | Resolve to one owner, then qualify per project conventions. Unresolved → decision list. |
| Vague but correct | `# timeout`, `# handle errors`, `# filter` | Rewrite with the specifics the code shows: units, defaults, which errors. Never invent. |
| Docstring style | Missing summary period, prose restating the signature, missing `Args`/`Returns`/`Raises` on a contract | Rewrite in the project's docstring dialect. |
| Grammar/typo | Identifiers misspelled, sentences broken | Fix. |
| Commented-out code | Disabled code, often with `#` per line | Delete; flag if it looks like a preserved reference implementation. |
| Duplicated rationale | Same explanation in two places | Keep the better one, point or delete the other only if they cannot drift apart in meaning. |

### Report only (never edit)

| Class | Recognize by | Report as |
| --- | --- | --- |
| Inaccurate | Comment says X, code does Y (wrong units, wrong error, wrong order, removed symbol) | Claim vs code, evidence, and one recommendation: align comment, fix code, or confirm intent. |
| Unresolvable citation | ID matches multiple changes and topic matching stays ambiguous | The candidates found and what evidence is missing. |
| Orphan rationale | Comment explains a constraint that no longer exists anywhere in the code or docs | "Rationale refers to <X>, which does not exist; confirm whether the guard is still needed." |
| Load-bearing commented-out code | Disabled block that appears intentional (feature flag, reference implementation) | Ask before deletion. |
| Missing rationale | Non-obvious ordering, race, magic number, or workaround with no comment | Note the symbol and what needs explaining; do not write the comment. |
| Suspicious directive | `# noqa`/`# type: ignore` that seems to hide a real defect | The directive and why it looks wrong; do not touch. |

### Never touch

Machine-read directives (next section), license headers, `DO NOT EDIT` headers,
generated files, frozen archive directories.

## Rewrite patterns

**Restate → remove.**

```
- count += 1  # increment count
+ count += 1
```

**Vague → specific.**

```
- # timeout
+ # Request timeout in milliseconds; 0 disables it.
```

**Code-speak → intent.**

```
- # loop over users and check active
+ # Skip inactive users; billing already reconciled them.
```

**Ownerless label → plain rationale.**

```
- # Do not retry here (review decision, R-5).
+ # The call is not idempotent; retrying would double-charge.
```

**Provenance → qualified citation (only when the anchor is needed).**

```
- # Order matters here (ISSUE-7).
+ # Order matters here: the status write must land before the event is
+ # published (reply-gate-and-silence ISSUE-7).
```

**Citation that stands alone → delete the citation.**

```
- # Best-effort: a failure here must not fail the turn (ISSUE-42).
+ # Best-effort: a failure here must not fail the turn.
```

**File:line → symbol.**

```
- # See manager.py:229-253 for the teardown gap.
+ # See `_discard_tenant_state` for the teardown gap.
```

**Workaround → cause + removal condition.**

```
- # HACK: sleep before retry
+ # HACK: iOS Safari drops the first request after a tab resume (WebKit
+ # bug 12345); 250ms is empirically enough. Remove when iOS 15 is dropped.
```

**Hidden contract → docstring.**

```
- def charge(amount, currency):
-     # amount is positive, currency is ISO-4217
+ def charge(amount, currency):
+     """Charge the customer.
+
+     Args:
+         amount: Positive decimal in major units (for example 10.50).
+         currency: ISO-4217 alphabetic code.
+
+     Raises:
+         ValueError: If amount <= 0 or currency is unknown.
+     """
```

## Machine-read directives by language

Leave each of these byte-exact; report only if it looks wrong.

- **Python:** `# noqa`, `# type: ignore`, `# pyright: ignore`, `# pragma: no cover`, `# fmt: off`/`# fmt: on`, `# isort: skip`, `# ruff: noqa`, shebang `#!/usr/bin/env ...`, `# -*- coding: ... -*-`, `# noqa: E501`.
- **TypeScript/JavaScript:** `// @ts-ignore`, `// @ts-expect-error`, `// @ts-nocheck`, `// eslint-disable`, `// eslint-disable-next-line`, `// eslint-disable-line`, `// prettier-ignore`, `/* istanbul ignore next */`, `/* webpackIgnore: true */`.
- **Go/Rust/C:** `//go:build`, `// +build`, `//nolint`, `//nolint:gosec`, `#[allow(...)]`, `#pragma`, `#include` guards.
- **Shell/YAML/Docker/CI:** `# shellcheck disable=SC1234`, `# yamllint disable-line`, `# checkov:skip=`, `# trivy:ignore`, `# syntax=docker/dockerfile:1`, `# renovate:`, `# kics-scan ignore`.
- **Markdown/HTML:** `<!-- prettier-ignore -->`, `<!-- markdownlint-disable -->`, `<!-- cSpell:disable -->`.
- **License/copyright blocks and `DO NOT EDIT` headers:** never delete.

## Decision-list criteria

Send these to the decision list instead of editing:

1. The comment contradicts the code (possible code bug).
2. The citation has more than one possible owner after ID and topic matching.
3. The rationale cannot be reconstructed without inventing facts.
4. Deletion would lose context about a preserved implementation or a security
   or compliance constraint.
5. The correct action needs a product or API decision, not a wording decision.

## Auditor anti-patterns

- Rewriting a comment to sound nicer without adding information.
- Expanding a terse-but-clear comment into a paragraph.
- Adding docstrings to private helpers just to have them.
- Translating code into prose (restating the signature or the branch).
- Deleting a comment you do not understand instead of reporting it.
- Imposing a doc style that contradicts the repo's existing dialect.
- Batching unrelated edits into one pass so the diff stops being reviewable.
