---
name: openspec-triage
description: Decide whether a feature, fix, or refactor request needs an OpenSpec change proposal or can be implemented directly. Use when the user describes a new work item and the proposal-vs-direct decision is unclear, or asks "do we need an OpenSpec proposal for this?".
license: MIT
compatibility: DDBrain spec-driven workflow (openspec/specs, openspec/changes)
metadata:
  author: ddbrain
  version: "1.0"
---

# OpenSpec Triage

## When to use me

Use when a feature, fix, or refactor request arrives in an OpenSpec-driven repo (like DDBrain) and the agent must decide up front: **does this need a proposal (`openspec-propose`) or a direct implementation?**

## Core rule

A proposal is about the **contract**, not the code size.

- **Spec says X, code does Y (bug)** → fix the code directly. The spec already authorizes the correct behavior; no proposal needed.
- **Spec says X, code does X, and the request changes the contract to Z** → proposal required. The spec (and every doc/test encoding it) must change together with the code in one auditable unit.

## Signals that require a proposal (any one suffices)

- [ ] The change contradicts, amends, or removes a "SHALL" line in `openspec/specs/**`
- [ ] Observable by consumers/operators: HTTP endpoints, status codes, response body shapes, error codes, WebSocket close codes, config schema, env vars, CLI flags, DB schema, event/journal shapes
- [ ] Touches contract documentation: `docs/consumer-api-integration.md`, `docs/ddbrain-spec.md`, `docs/deployment.md`, `docs/quickstart.md`
- [ ] Spans multiple layers: code + specs + docs + tests + configs move together
- [ ] Encodes a deliberate decision worth recording (e.g. "drop backward compatibility", "no warn-and-continue for secrets")
- [ ] New feature or semantic change (added/removed/changed behavior)
- [ ] Hard to reverse or production-impacting (data migrations, external system contracts)

## Signals that skip the proposal

- [ ] Bug fix where code diverges from the spec (implementation drift)
- [ ] Refactor with no observable behavior change (rename, restructure, dedupe)
- [ ] Test-only or docs-only additions describing existing behavior
- [ ] Cosmetic/formatting changes

## Rule of thumb

- If you must edit `openspec/specs/` or a contract-documenting doc → **proposal**.
- If you only edit `src/` and `tests/` → **no proposal**.

When borderline, default to a proposal: spec drift is costlier than the small ceremony of a one-page change. The proposal can be tiny — the gate is contract impact, not effort.

## Workflow

1. **Inventory the blast radius.** Grep the contract surface for the feature/fix topic:
   ```bash
   rg -l "<topic|endpoint|field|error-code>" openspec/specs/ docs/ tests/ src/
   ```
   Check `openspec/specs/` (canonical), `docs/` contract references, tests asserting the shape, and `src/` implementations.
2. **Classify the request**: bug fix, refactor, feature, or contract change.
3. **Check the SHALL lines.** Does the current spec authorize current behavior (so the request amends it), or does the code already violate the spec (so the request is a fix)?
4. **Apply the signals above** and decide.
5. **Report the verdict** with a 1–2 sentence rationale. If proposal needed → load `openspec-propose`. If direct → implement.

## Worked examples (DDBrain history)

**Proposal required — "Remove `checks.mcp_servers` from `/health/ready`."**
- `openspec/specs/tenant-health/spec.md`: "The existing top-level `checks.mcp_servers` SHALL remain populated with the default tenant's view..." — code complies.
- Removing it amends the contract → proposal required even though the code diff is ~15 lines.
- Blast radius: `openspec/specs/mcp/spec.md` scenarios (`mcp_servers.<server>.status` paths), `openspec/specs/init-project/spec.md` body shape, `docs/consumer-api-integration.md`, `tests/unit/test_health.py`, plus the readiness gate in `src/ddbrain/api/routes/health.py`.

**No proposal — required-server runtime health not blocking readiness (ISSUE-18).**
- The `mcp` spec already states required unhealthy servers must block `/health/ready` (503); the code only checked the init-time `error` field.
- The request aligns code with the spec → direct fix, no proposal.

## After the verdict

- **Proposal path**: `openspec-propose` → `openspec-review-proposal` → `openspec-apply-change` → `openspec-test` → `openspec-align` → `openspec-archive-change`.
- **Direct path**: implement, then run `uv run ruff check .`, `uv run ruff format --check .`, `uv run pyright`, and the targeted test layer.
