---
name: openspec-sync-specs
description: Audit the main spec tree for drift against the repo, identify merge/isolation opportunities, and propose and apply a reorganization. Use when the user asks to review, audit, clean up, reorganize, or sync the spec tree — or when the spec tree looks messy with inconsistent naming, stale file counts, or overlapping responsibilities. Also use when the agent suspects spec drift after multiple archived changes have accumulated.
license: MIT
compatibility: Requires openspec CLI and the ARCHIVE_SYNC_RUBRIC.md at .opencode/skills/openspec-archive-change/ARCHIVE_SYNC_RUBRIC.md.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.2.0"
---

# OpenSpec Sync Specs

Audit the main spec tree at `openspec/specs/` for drift, redundancy, and organizational debt. Compare each spec against the actual repo files it references, surface discrepancies, then — if the tree is messy — design and apply a reorganization following [ARCHIVE_SYNC_RUBRIC.md](../openspec-archive-change/ARCHIVE_SYNC_RUBRIC.md). If the tree is already clean, report that and stop.

This skill is a maintenance workflow for the main spec tree itself, not a change-level workflow. It operates across all specs simultaneously.

## When to use me

- User says "review the specs," "audit the spec tree," "clean up specs," "reorganize specs," or "sync specs with the repo"
- Spec tree looks messy: inconsistent naming, overlapping responsibilities, stale file counts in requirement headers
- Multiple archived changes have accumulated and specs may have drifted from actual config
- As a periodic hygiene step before starting new changes

## Rules

- Read every spec under `openspec/specs/*/spec.md` before drawing conclusions.
- Read the actual repo files each spec references — not just the spec text.
- Never assume the spec is correct and the repo is wrong; flag both directions.
- All merge/isolation decisions MUST apply the filters and guardrails in [ARCHIVE_SYNC_RUBRIC.md](../openspec-archive-change/ARCHIVE_SYNC_RUBRIC.md).
- Present the full audit + reorganization plan together before mutating any files. Get a single confirmation, then apply everything in one pass.
- Modified specs MUST follow the rubric format: `## Purpose` followed by `## Requirements`.
- Never leave delta headers (`## ADDED Requirements`, `## MODIFIED Requirements`) in main specs.
- Remove old spec directories when they are merged elsewhere or renamed.
- Unify naming: all spec directory names must be `kebab-case` and follow a consistent pattern.
- Cross-cutting specs (patterns that apply to many domains) should be principle-based, not enumerate every file in individual scenarios. Use collector-type or deployment-type groupings instead.

## Workflow

### Phase 1: Audit

1. **Inventory the spec tree**

   List all spec directories under `openspec/specs/` and read every `spec.md` file.

2. **Read the ARCHIVE_SYNC_RUBRIC**

   Read `.opencode/skills/openspec-archive-change/ARCHIVE_SYNC_RUBRIC.md` to load the merge/isolation filters, size guardrails, and conflict defense rules.

3. **Map specs to repo files**

   For each spec, identify every file path it references (config files, CI files, k8s manifests, etc.). Read those actual repo files.

4. **Diff spec vs reality**

   For each requirement and scenario, check whether the actual repo file satisfies it. Record:

   - **Drift A: Spec says X, repo has Y** — the spec is correct but the repo diverged
   - **Drift B: Spec says X, repo has Z** — the repo evolved and the spec is stale
   - **Structural mismatch** — spec claims N files but repo has M; scenarios cover only a subset
   - **Missing coverage** — repo files exist with behavior not described by any spec

5. **Identify organizational issues**

   Flag: inconsistent naming patterns, overlapping responsibilities, specs with fewer than 3 requirements, cross-spec dependency breakage, per-file scenario enumeration that's brittle to changes.

### Phase 2: Propose and reorganize

6. **Evaluate each spec against the rubric**

   Apply the four filters from the rubric in order: (1) Deletability and Dependency, (2) Global Infrastructure vs Orchestration, (3) Lifecycle and Drift, (4) Size Guardrails. Decide for each spec: keep as-is, merge into another, split, rewrite (de-enumerate to principle-based), rename, or delete and replace.

7. **Design the target tree and present the full plan**

   Deliver a structured report with everything the user needs to say yes:

   - **Drift found** — spec-by-spec, with exact file:line references. Distinguish "config missing from repo" from "spec stale, repo evolved."
   - **Organizational issues** — naming inconsistency, coverage gaps, stale file counts, brittle per-file enumeration.
   - **Recommended target tree** — before → after directory tree, with a per-spec actions table showing each spec's fate and the rubric rationale.
   - **What will change** — a concrete list: "I will rewrite spec A to be principle-based (~40 lines), merge specs B and C into one spec with two sections (~120 lines), create spec D for uncovered domain (~80 lines), rename spec E, delete old directories B and C."
   - **If no changes needed** — state clearly: "The spec tree is clean. No reorganization recommended." and stop.

   Present this report to the user with a single confirmation prompt. Do NOT modify files yet.

8. **Apply the reorganization**

   After receiving user confirmation, execute all changes as a single pass:

   - **Principle-based rewrites**: collapse per-file enumerated scenarios into requirements grouped by collector type or deployment pattern. "Deployment-based collectors MUST..." instead of "services dev MUST..., services prod MUST..., client dev MUST..., client prod MUST...". Group VM collectors by shared pipeline skeleton.
   - **Merge**: consolidate small specs (2-3 reqs) that share a lifecycle into a parent spec with clearly separated `### Section:` blocks. Each section must be independently removable per rubric rule 1.
   - **Create**: if repo files exist with no corresponding spec, write one.
   - **Rename**: unify all spec directory names to `kebab-case`. Fix inconsistent suffixes.
   - **Delete**: remove directories for specs that were merged or renamed.
   - **Fix cross-references**: update any spec that referenced a deleted or renamed spec to use the new name. Use `replaceAll` across all remaining spec files for renamed spec names.

9. **Verify the result**

   After all changes are applied:
   - Confirm every `spec.md` has exactly one `## Purpose` and one `## Requirements`.
   - Grep for `## ADDED Requirements` / `## MODIFIED Requirements` / `## REMOVED Requirements` — none should remain.
   - Grep for old spec names across the entire `openspec/specs/` tree — no stale references.
   - Confirm cross-cutting specs reference other specs by name rather than enumerating files.
    - Run `ls openspec/specs/` and confirm the final directory listing matches the planned target tree.
    - Run `openspec validate --all` and confirm all specs pass. If validation fails, inspect the JSON output (`--json`) for the exact heading-level errors and fix them before reporting success.

## Guardrails

- Present the full audit + reorganization plan BEFORE touching any files. One confirmation, then apply everything.
- If the spec tree is already clean (no drift, no organizational issues), say so and stop. Do not reorganize for its own sake.
- Fix service name references when they don't match actual docker-compose / Helm config.
- Do not modify archived changes in `openspec/changes/archive/` — those are historical records.
- Do not modify actual config files (values.yaml, docker-compose.yaml, etc.) — this skill fixes the specs, not the config drift. The drift findings are reported so they can be addressed separately.
- Keep the final spec count reasonable. Avoid creating tiny orphan specs.
- All cross-references between specs must be updated when specs are renamed or merged. Use `replaceAll` across the entire `openspec/specs/` tree.
- Always finish by running `openspec validate --all`. If any spec fails, inspect the JSON output, fix the issues, and re-validate until all pass.
