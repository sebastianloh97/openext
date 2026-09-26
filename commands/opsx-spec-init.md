---
description: Initialize OpenSpec for a brownfield project - survey the codebase, propose a capability map, and write as-built baseline specs after approval.
---


# Mission: Initialize OpenSpec specs for this brownfield project

## What OpenSpec Is

OpenSpec is an AI-native, spec-driven development system. It lives in a single
`openspec/` directory at the project root and has three layers:

- `openspec/specs/<capability>/spec.md` — the source of truth for what the
  system DOES today. Each spec covers one capability and contains
  `## Purpose` plus `## Requirements`. Every requirement is a
  `### Requirement: <Name>` heading whose body states normative behavior
  with SHALL, followed by one or more `#### Scenario: <Name>` blocks using
  **WHEN**/**THEN** bullets.
- `openspec/changes/<change-id>/` — proposed modifications (proposal, tasks,
  spec deltas). After implementation, `openspec archive` merges the deltas
  into the main specs. Today you will NOT create any changes.
- `openspec/config.yaml` — workflow schema and project context shown to AI
  when creating artifacts.

The value: future work starts from a change proposal against the specs, so
the AI (and the human) can reason over documented behavior first before
reverse-engineering the codebase.

## The Key Principle: As-Built Only

This is a brownfield initialization. The specs you write describe CURRENT
reality as the code implements it — including quirks and limitations. Aspirations,
refactor wishes, and intended-but-missing behavior do not belong here. Every
requirement must be traceable to actual code; when a requirement is non-obvious,
cite the supporting file paths in the spec's Purpose section.

## Steps

### Step 1: Survey the codebase

Read the project systematically: README, entry points, routes/controllers,
domain modules, data models, background jobs, configuration, and tests.
Build an internal inventory of distinct capabilities the system provides
(an API surface, a job, an auth flow, an export pipeline are each capabilities).

Done when: you have a capability inventory where every major module, route
group, or subsystem maps to at least one capability.

### Step 2: Present the capability map and wait for approval

Before writing anything, present the proposed capability breakdown:
one line per capability (name in kebab-case + a one-sentence scope
statement), plus which code areas each covers. Flag anything ambiguous.
Wait for the user's confirmation or corrections.

Done when: the user approves the capability map.

### Step 3: Write the baseline specs

For each approved capability, write `openspec/specs/<capability>/spec.md`
following the format above. Rules:

- One capability per spec file; kebab-case names.
- Requirements state WHAT the system does, not HOW it is implemented;
  keep implementation references to Purpose citations.
- Cover the main paths AND the meaningful edge behavior (validation,
  error handling, authorization, idempotency) where the code actually
  implements them.
- Scenarios must be concrete: WHEN describes a trigger, THEN describes the
  observable outcome.

Done when: every capability from the approved map has a spec file.

### Step 4: Validate

```sh
openspec validate --specs --strict
openspec list --specs
```

Fix every validation error. Done when: all specs pass strict validation.

### Step 5: Report

Summarize: the capability list with requirement counts, a coverage map
(code area -> spec), any behavior you found ambiguous or undocumented,
and anything that seemed intended by the authors but is not implemented
(record these in your report only, not in the specs).

## Hard Rules

- Make zero changes to source code, tests, or CI configuration.
- Create zero entries under `openspec/changes/`.
- Ask the user when behavior is genuinely unclear rather than guessing.
