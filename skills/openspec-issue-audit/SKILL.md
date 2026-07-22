---
name: openspec-issue-audit
description: Re-evaluate existing issues to filter out false positives and refine severity. Use after openspec-test and openspec-code-review, to separate real issues from noise by applying runtime feasibility, lifecycle, scope, and convention filters without changing implementation code.
license: MIT
compatibility: Requires openspec CLI and project-specific source inspection.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.0.0"
---

# OpenSpec Issue Audit

Perform a critical self-audit on the issues previously recorded in an OpenSpec change's `issue.md`. Shift evaluation from isolated code-level linting to holistic system architecture, deciding which issues still stand and at what severity.

This skill is an auditor workflow, not a fixer workflow. It only updates `openspec/changes/<name>/issue.md`. Do not modify implementation code, tests, proposal artifacts, or task files.

## Input

Optionally specify a change name. If omitted, infer it from conversation context or select from active OpenSpec changes.

## Steps

1. **Select the change**

   If a name is provided, use it. Otherwise:
   - Infer from conversation context if the user mentioned a change.
   - Auto-select if only one active change exists.
   - If ambiguous, run `openspec list --json` and ask the user to select the change.

   Announce: `Auditing issues for change: <name>`.

2. **Check OpenSpec status and load context**

   ```bash
   openspec status --change "<name>" --json
   openspec instructions apply --change "<name>" --json
   ```

   Read all returned `contextFiles` (proposal, design, specs, tasks, issue) to understand the intended behavior, scope, implementation approach, and existing known issues.

3. **Confirm issue.md exists and has content**

   Read `openspec/changes/<name>/issue.md`. If it does not exist or contains no issues to re-evaluate, report `NOT_APPLICABLE` — there is nothing to audit.

4. **Audit each issue against four filters**

   For every issue (both unresolved `[ ]` and resolved `[x]`), re-evaluate it holistically by applying these four filters:

   1. **Runtime Feasibility & System Context:** Is this triggerable in production? Do upstream guarantees (API gateways, external queues, caller single-threading, structural guards) naturally prevent this condition from ever occurring?

   2. **Code Intent & Lifecycle Stage:** Is the flagged code an intentional placeholder, stub, or draft meant to be replaced in a subsequent change? Is the current pattern (broad try-catch, simple fallback) appropriate for this component's lifecycle?

   3. **Scope Alignment:** Is this issue out of scope for the current proposal? Would resolving it now be unnecessary scope creep?

   4. **Convention & Consistency Alignment:** Even if the issue has no functional bug today, does it flag a genuine convention violation, coding standard gap, or inconsistency with established project patterns? Would resolving it reduce developer surprise, prevent future mistakes, or align with documented practices — even though there is no crash, data loss, or incorrect behavior?

   Ground each verdict in evidence from the codebase, design, and runtime context — not intuition.

   **Distinguishing false positives from non-functional improvements:** Filters 1–3 identify *false positives* — issues that should not exist at all because the condition is unreachable, the code is intentional staging, or the change is out of scope. Filter 4 identifies *valid non-functional improvements* — issues that are real but whose impact is convention drift, developer surprise, or future maintenance risk rather than a production bug. Both categories need the audit, but their handling differs (see step 5).

5. **Merge audit results into issue.md**

   `issue.md` is a cumulative logbook for future testers and fixers. **Preserve every line of the original issue verbatim** — original evidence, reproduction steps, affected endpoints, expected behavior, and code references must remain untouched. Do not rewrite, restructure, or shorten existing issue content. Append audit notes *after* the original details using the patterns below.

   Map each audit finding to its handling:

   | Audit finding | How to update |
   |---|---|
   | Issue is NOT a bug (unreachable, intentional, out of scope) — a false positive | `[ ]` → `[x]`. Severity → `~~<old>~~ → **Not a bug.**` Append `**Re-evaluation <n>:**` with which filter(s) cleared it and evidence. Use this only when none of the four filters justify keeping the issue open. |
   | Issue is a valid non-functional improvement (convention, consistency, best-practice) — a true positive, but not a bug | Keep `[ ]`. Keep severity. Append `**Enrichment <n> (audit):**` explaining why the issue is valid despite having no functional impact — grounded in convention drift, developer surprise, future maintenance risk, or coding-standard alignment. The enrichment should cite the specific convention, the files that follow it, and the files that deviate. |
   | Issue still valid — new context found | Append `**Enrichment <n>:**` with refined root cause, narrower trigger conditions, fixer guidance, or cross-module dependency notes. Checkbox and severity unchanged. |
   | Issue still valid — severity changed | Update severity to `~~<old>~~ → <new>`. Append `**Re-evaluation <n>:**` explaining why the risk profile changed. |
   | Previously `[x]` but fix is incomplete | `[x]` → `[ ]`. Append `**Re-evaluation <n>:**` with what remains broken. |
   | Issue confirmed as-is | Leave unchanged |
   | New issue discovered during audit | File as a new `ISSUE-<n>`. |

   Never silently change a checkbox or severity. The re-evaluation or enrichment note is the audit trail.

   **Example — correct (appending):**

   ```markdown
   - [x] ISSUE-1: Widget counter overflows after 2^31 increments
     - Severity: ~~high~~ → **Not a bug.**
     - Observed crash at seq=2147483648 under synthetic load test.
     - Affected file: `src/domain/counter.py:42`
     - **Re-evaluation 1:** Not triggerable in production — upstream API gateway
       enforces a per-session sequence cap of 1 000 000. Cleared by Runtime
       Feasibility filter.
   ```

   In this example, the original evidence (observed crash, affected file) is kept exactly as filed. The checkbox change, severity strikethrough, and `**Re-evaluation 1:**` note are appended *after* the original details.

   **Example — incorrect (rewriting):**

   ```markdown
   - [x] ISSUE-1: Widget counter overflows after 2^31 increments
     - Severity: ~~high~~ → **Not a bug.**
     - **Re-evaluation 1:** Cannot occur in production — upstream API gateway
       caps sequences at 1 000 000. Cleared by Runtime Feasibility filter.
   ```

   This is wrong because the original crash detail and affected file path were deleted. The next fixer or tester has no record of what was originally observed or where.

6. **Do not fix**

   Do not modify implementation code. Do not refactor. Do not mark tasks complete. Do not align or archive. The next remediation step is `openspec-fix` (if real issues remain) or `openspec-align` (if issues are cleared).

7. **Final report**

   ```markdown
   ## Issue Audit Report: <change-name>

   ### Result
   AUDITED / NOT_APPLICABLE

    ### Findings
    - Issues cleared as false positives (Not a bug): N
    - Issues confirmed as valid non-functional improvements (convention/consistency): N
    - Issues enriched with new context: N
    - Issues with severity changed: N
    - Issues reopened (incomplete fix): N
    - Issues confirmed as-is: N
    - New issues filed: N

    ### issue.md
    - Updated: yes/no
    - Path: openspec/changes/<name>/issue.md

    ### Recommendation
    Proceed to openspec-fix / proceed to openspec-align / not applicable
    ```

    Recommendation rules:
    - If unresolved issues remain in `issue.md` — whether functional bugs or convention/consistency improvements — recommend `proceed to openspec-fix`.
    - If all issues are cleared (resolved or marked not-a-bug), recommend `proceed to openspec-align`.
    - If `issue.md` had nothing to audit, recommend `not applicable`.

## Result Semantics

- `AUDITED`: One or more issues were re-evaluated and `issue.md` was updated.
- `NOT_APPLICABLE`: No `issue.md` exists, or it contains no issues to audit.

## Guardrails

- Only update `openspec/changes/<name>/issue.md`.
- **Preserve all existing `issue.md` content verbatim; this is a cumulative logbook. Never rewrite, restructure, shorten, or delete original evidence lines.** Original reproduction steps, affected files/endpoints, observed values, expected behavior, stack traces, and code references are the audit trail for future fixers and testers. Audit notes (Re-evaluation, Enrichment) must be appended *after* the original details, not in place of them.
- Never silently change a checkbox or severity — always leave a `**Re-evaluation <n>:**` or `**Enrichment <n>:**` note as the audit trail.
- Ground every verdict in evidence (code references, design context, runtime guarantees).
- Do not fix implementation issues in this skill.
- Do not review or file issues against test scripts in `openspec/changes/<name>/test/` — those are owned by `openspec-test`.
- Do not archive, align, or commit.
