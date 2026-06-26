---
name: openspec-spec-audit
description: Audit, clean up, and structurally refactor the openspec/specs/ directory. Use when specs have drifted, accumulated fragmentation, or stale metadata — or proactively as periodic maintenance.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.2.0"
---

Audit the `openspec/specs/` main spec tree against the architectural sync rubric, produce an inventory and change plan, and execute approved refactors.

**Input**: None required. The audit always targets `openspec/specs/`. Optionally a user may ask to audit a specific subset of specs.

**Steps**

1. **Ingest the rubric**

   Read [ARCHIVE_SYNC_RUBRIC.md](../openspec-archive-change/ARCHIVE_SYNC_RUBRIC.md) in full. All placement and sizing decisions must be anchored to its filters, guardrails, and conflict-defense rules.

2. **Map the spec tree**

   - Glob `openspec/specs/**/*.md` to discover all main specs. If that returns nothing, also check `spec/` (older project layouts use this).
   - Read every spec file in full.
   - Identify cross-references (markdown links between specs) and shared behavioral steps.
   - Check for structural violations: missing `# <name> Specification` title, missing `## Purpose`, legacy delta headers (`## ADDED Requirements`, `## MODIFIED Requirements`, `## REMOVED Requirements`), stale "TBD" boilerplate.

3. **Produce Phase 1 inventory report**

   Output a table evaluating every spec against the rubric's health categories:

   | Spec | Rules | Health | Structural Issues | Rationale |
   |:---|:---:|:---:|:---|:---|

   Health classifications:
   - **Healthy** — 3–12 rules, clear standalone domain, no violations.
   - **Fragmented** — <3 rules (needs merge unless lifecycle genuinely distinct).
   - **Bloated** — >15 rules or spanning multiple lifecycle boundaries (needs split).
   - **Orphaned/Overlapping** — >60% semantic overlap with another spec or duplicate flows.

   Also output:
   - A cross-reference and overlap analysis table.
   - A simplified dependency topology diagram.

4. **Produce Phase 2 change plan**

   Present a change plan table for human review with columns: Operation, Source File(s), Target Destination, Rationale (citing rubric), Risk & Impact.

   Supported operations: **MERGE**, **SPLIT**, **FIX** (structural repairs), **NO-OP** (keep as-is).

   **Do NOT mutate any files yet.** Wait for explicit user approval.

5. **Execute approved changes (Phase 3)**

   Once authorized:

   - **Conflict defense**: Inspect destination specs before editing. Never duplicate requirement headings. Consolidate semantically equivalent requirements under one definitive heading.
   - **Structural hygiene**: Ensure every main spec has `# <name> Specification` title (e.g., `# otel-provider-pipeline Specification`, not `## OTEL Provider Pipeline Capability`), `## Purpose`, and `## Requirements`. Strip all legacy delta markers and stale boilerplate.
   - **Link repair**: Update relative markdown cross-references if any file moves.

6. **Validate**

   After each batch of changes, run:

   ```bash
   openspec validate --specs --strict
   ```

   If validation fails, halt, roll back the problematic change, and report the failure.

**Output On Success**

```
## Audit Complete

**Specs audited:** N
**Changes executed:** N fixes, N merges, N splits
**Validation:** ✓ N passed, 0 failed

### Changes Made
| File | Change |
|:---|:---|
| ... | ... |
```

**Guardrails**

- Do NOT mutate files until the user approves the Phase 2 change plan.
- All placement decisions must cite a specific line or rule from `ARCHIVE_SYNC_RUBRIC.md`.
- Domain over implementation: organize around user-visible capabilities, not technical artifacts.
- Domain clarity over file count: a change is only correct if it sharpens business domain isolation.
- Do not invent generic standards — apply the rubric's specific filters (deletability, global-infrastructure-vs-orchestration, lifecycle/drift, size guardrails).
- Never leave delta headers (`## ADDED`, `## MODIFIED`, `## REMOVED`) in main specs.
- Main specs must always have `## Purpose` and `## Requirements`.
- If a destination already has the same requirement heading, merge or refactor — never duplicate.
- Update all relative markdown links when files move.
- Run `openspec validate --specs --strict` after every batch of changes.
