---
name: openspec-spec-align
description: Align a single spec file with the live implementation codebase. Detect spec drift (stale requirements, undocumented code behaviors, behavioral mismatches) and update the spec to match what the code actually does. Use when the user wants to reconcile a spec against reality, or when they say "review and align X spec against the codebase."
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.3.0"
---
Align a single `openspec/specs/<domain>/spec.md` file against the live implementation in the codebase. Detect and fix **spec drift** — undocumented code behaviors, outdated requirements, and behavioral mismatches between what the spec says and what the code does.

**Input**: The user should specify which spec to audit, e.g. `"align basic-call-lifecycle-traces spec"`. If omitted, prompt for the spec file path or the domain name.

---

## Core Principles

1. **Code is the Functional Truth.** If the code behaves differently than the spec, assume the code represents the current intent unless a feature is visibly broken or half-implemented.
2. **Maintain OpenSpec Abstraction.** Do not pollute the specification with implementation details like class names, database schemas, raw variable declarations, or specific function signatures. Translate technical realities back into clear, user-visible capabilities or business behavioral rules.
3. **No Loss of Edge Cases.** Pay specific attention to missing error conditions, state transitions, validation limits, loops, timers, and timeouts hidden in the code that the current spec fails to mention.
4. **Respect Spec Boundaries.** Different specs in `openspec/specs/` cover different domains. If a behavior is already covered by a sibling spec, don't duplicate it. Cross-reference where appropriate.

---

## Steps

### Phase 1: Code Mapping & Discrepancy Analysis

**1. Read the target spec**

Read the spec file at `openspec/specs/<domain>/spec.md`. Understand every requirement and scenario listed.

**2. Locate the implementation**

Search the codebase to find all source files executing the logic described in the target spec. Use Glob, Grep, and Read tools. Look for:
- Functions/methods that handle the described events or actions
- Data structures or state machines that model the described entities
- Emission/export paths that produce the described outputs

If the spec references a PRD (e.g., `PRD.md section 2`), also read the PRD for context, but treat the PRD as a design document — the code is the functional truth.

**3. Read sibling specs**

Glob `openspec/specs/**/*.md` and read any sibling specs. Some behaviors the target spec appears to "miss" may be intentionally covered elsewhere. Avoid flagging them as gaps if they belong to another spec's domain.

**4. Perform gap analysis**

Compare the implementation against every requirement in the spec. Classify discrepancies into three categories:

| Category | Definition |
|:---|:---|
| **Stale Requirements** | Rules written in the spec that do not exist anywhere in the code (deprecated paths, removed features). |
| **Undocumented Logic** | Edge cases, validation checks, parameter handling, output attributes, or error scenarios present in the code but entirely missing from the spec. |
| **Behavioral Mismatches** | Requirements that exist in both places but execute differently in practice (different defaults, different error handling, different ordering). |

Also note if the spec delegates details to `PRD.md` (e.g., `"as described in PRD.md section 3"`) and whether those PRD details are still accurate against the code.

**5. Present Drift Audit Report**

Output a concise summary in this format. **Do NOT modify the spec file yet.**

```markdown
## Drift Audit Report: <spec-name>

### Matched Behaviors

| # | Requirement | Verdict |
|---|:---|:---|
| R1 | ... | MATCH |
| R2 | ... | MATCH |

### Drift Detected

#### Stale Requirements
**None.** (or list each stale requirement with the file:line proving it no longer exists)

#### Undocumented Behaviors (present in code, missing from spec)
- **U1 — <short title>**: <description>. Location: `<file>:<line>`. Severity: Low/Medium/High.
- **U2 — <short title>**: ...

#### Behavioral Mismatches
**None.** (or list each mismatch with both spec expectation and actual code behavior)
```

---

### Phase 2: Reconciliation Proposal

**DO NOT MUTATE THE SPEC FILE YET.**

Based on the Drift Audit Report, present a markdown diff proposal showing exactly what lines or sections you intend to add, modify, or remove.

```markdown
### Drift Correction Proposal

#### REMOVED / DEPRECATED
- <reason> → <target section>

#### ADDED Requirements / Scenarios
- <reason> → <target section with proposed text>

#### MODIFIED text
\`\`\`diff
- Old Spec Wording
+ New Spec Wording matching live implementation logic
\`\`\`
```

Use the **AskUserQuestion tool** if any discrepancy could plausibly be a bug rather than an intentional behavior. For example: *"The code ignores X field, but the spec says it should use it. Is this intentional?"*

**Wait for explicit user approval before proceeding to Phase 3.**

---

### Phase 3: Execution & Validation

Once authorized:

**1. Apply changes**

Edit the spec file using the Edit tool. Apply each correction from the approved proposal.

**2. Maintain formatting standards**
- Every spec must have `# <name> Specification` title, `## Purpose`, and `## Requirements`.
- Integrate changes seamlessly into the existing structure — do not leave temporary tags like `## ADDED Requirements` or change notes in the final text.
- Keep the `Scenario:` bullets consistent with existing format.

**3. Validate**

Run the strict validator:

```bash
openspec validate --specs --strict
```

If validation fails, roll back the failing edit and report the structural error. Fix and re-validate.

**4. Report**

Output a summary of changes applied:

```markdown
## Spec Aligned: <spec-name>

| Change | What |
|:---|:---|
| R1 expanded | Added span kind rules |
| New requirement | Root span attributes and status |
| ... | ... |

**Validation:** ✓ All specs passed
```

---

## Guardrails

- Do NOT mutate the spec file until the user approves the Phase 2 proposal.
- Keep specs abstract — describe user-visible behavior, not code internals.
- Do not contaminate a spec with requirements that belong in a sibling spec.
- If a behavior is already fully covered by another spec in `openspec/specs/`, note it in the drift report and skip it.
- If uncertain whether a code behavior is intentional or a bug, ask the user rather than assuming.
- Use `openspec validate --specs --strict` after every edit batch.
