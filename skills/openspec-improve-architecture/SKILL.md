---
name: openspec-improve-architecture
description: Turn architectural friction into staged, behavior-frozen refactor proposals - scope a direction or git-history hot spots, explore for shallow modules and missing seams, present candidates, run a hands-off design-it-twice in an agent-collab room, stop at a mandatory master review gate, and write the stage-1 OpenSpec proposal. Use when asked to improve the codebase architecture, find deep-module refactor candidates, untangle hot files, or plan a staged refactor.
---

# Improve Codebase Architecture

Convert architectural friction into staged, safe refactors that opsx-flow can
execute. The deliverable of this skill is an **approved OpenSpec proposal for
stage 1** — launching the flow is the master's action, never yours.

Vocabulary and principles live in
[references/deep-modules.md](references/deep-modules.md); use its terms
exactly (module, interface, implementation, depth, shallow, seam, adapter,
leverage, locality — never component, service, or boundary).

**Attribution**: adapted from Matt Pocock's `improve-codebase-architecture`
skill; the deep-module vocabulary credits Ousterhout, "A Philosophy of
Software Design", via that skill.

## Non-negotiables

- **Master review gate (mandatory stop condition)**: no proposal artifact is
  written until the master approves the plan. Requested changes loop back to
  the design step. This is a hard gate, not a suggestion.
- **Behavior freeze**: every stage must end with the full offline test suite
  green and observable behavior identical.
- **Hands-off design**: you self-answer frontier questions with recorded
  recommendations; escalate only genuine cost or risk judgment calls via the
  question tool.

## Steps

### 1. Scope

Take the direction the master names, or derive hot spots from git history
(files and areas repeatedly changed; exclude generated code, config, and
docs). Then read the context that shapes judgment: `AGENTS.md`, `VOCAB.md`,
`docs/decisions/` (if present), relevant docs pages and openspec specs, plus
recent comment-audit decision lists. The decisions log is context for you,
never a filter on exploration.

Done when: the scoped area is a concrete file/directory set and the context is
read.

### 2. Explore

Spawn exactly one subagent. It walks the scoped area organically — reading
callers, following data, running the deletion test on suspects — and returns a
friction list: shallow modules (interface nearly as complex as the
implementation), understanding one concept requires bouncing across many small
files, logic tested past its interface, coupling leaking across seams,
hard-to-test areas. Every claim carries evidence (files and symbols).

Done when: the friction list is in hand with evidence for every claim.

### 3. Present

Plain conversational text; diagrams only on request. Per candidate: the files,
a one-sentence problem, a one-sentence direction, expected wins in
leverage/locality/testability, rough size, and a strength rating — **strong /
worth exploring / speculative** — plus your single top recommendation.

Decision-log interaction: skip re-presenting rejections whose recorded reason
still holds; a candidate whose rejection premise appears expired is re-surfaced
with the expired premise named.

Ask the master via the question tool: pick a candidate, request more evidence,
or stop.

Done when: the master has picked one candidate (or stopped).

### 4. Design (hands-off)

Frame the problem space yourself: constraints, the candidate's dependency
category (in-process / local-substitutable / remote-but-owned / true external),
and a rough sketch.

Run **design-it-twice** for the top candidate by default; small clear-cut
candidates skip it, with the reason noted. Three divergent briefs by default —
minimize the interface / maximize flexibility / optimize the common caller —
and the ports-and-adapters brief joins as a fourth only when the candidate's
dependency category calls for it. Each brief is one archetype from
[references/deep-modules.md](references/deep-modules.md).

Run the briefs in one agent-collab room, one isolated session per brief, under
this protocol (verified against the collab server's injection semantics):

- Each brief session posts findings **`@planner` only**, with
  `--kind completion`. No bare `send`, and no `ask`/`answer` exchanges during
  the design phase — both drain to every idle member and would cross-pollinate
  the designs.
- Each design is mirrored to
  `.output/design-it-twice/<candidate>-<alias>.md` so the discussion reads
  files instead of relying on transcript recall.
- After all designs are mirrored, open discussion (`@everyone`); members read
  the mirrored files; you moderate. Self-answer frontier questions with
  recorded recommendations; bring the master in via the question tool only for
  genuine cost or risk judgment calls.
- Close the room. Report the chosen approach, decisions with rationale,
  rejected alternatives, and risks.

Done when: the room is closed and the report is delivered.

### 5. Master review gate

Present the plan and stop. No proposal artifact exists yet. If the master
requests changes, loop back to step 4. Proceed only on explicit approval.

### 6. Create the stage-1 proposal and record decisions

Write the stage-1 proposal under `openspec/changes/<name>/`, record durable
decisions in `docs/decisions/` (below), and end by naming the launch command —
running opsx-flow is the master's action.

**Stage semantics**: a *stage* is a refactor chunk packaged as its own
OpenSpec change — its own flow run, feature branch, and merge (not git
staging). One stage per flow run; flows run serially. Every stage ends with
the full offline test suite green and observable behavior identical, while
moving the code one step toward the approved target. Stage 1's proposal is
written now, with the remaining stage roadmap in its design.md; stage N+1 is
proposed only after stage N merges, because reality after a merge usually
adjusts the plan.

**Proposal contents (stage 1)**:

- `proposal.md`: why, what changes, impact, capabilities affected (the repo's
  normal propose format).
- `design.md`: behavior-freeze statement; seam placement and interface;
  dependency category and adapter strategy; the test oracle (which suites
  prove behavior; which shallow tests are deleted versus replaced — replace,
  don't layer); docs pages to update in-task; spec impact (refactors freeze
  behavior, so normally none; any intentional spec change is explicit);
  later-stage roadmap; the refactor contract: no public API changes unless
  listed and justified.
- `tasks.md`: move-level tasks ("extract X into module Y; update imports; run
  <suite>"), each group with its verification.

**Writing guidance**: openspec proposals hold change-specific intent,
alternatives considered, and why-now; `docs/` holds current truth — docs
state the rule, the proposal states the why, and the deciding change updates
docs as a task in itself. Prefer updating an existing page over creating a new
one.

## Decision Log: `docs/decisions/`

Create the directory lazily, here or in `opsx-quality-init` when the master
opts in. One small file per decision, date-based names per repo convention
(`20260930-collapse-pricing-seam.md`). A few sentences: context, decision or
rejection, reason, and — mandatory for rejections — a revisit condition
("revisit when X"). No numbering, no status fields, no template ceremony.

**Admission filter (all three required)**: hard to reverse; surprising to a
future reader without context; a genuine tradeoff with real alternatives.
Ephemeral rejections ("not now", "low priority") are never recorded — this is
what keeps the log from becoming stale doctrine.

**Usage rules**:

1. The log is input, not constraint. Exploration is never filtered by it.
2. Presentation skips only rejections whose reason still holds; expired-premise
   candidates are re-surfaced, naming the expired premise.
3. Design respects accepted decisions unless the plan explicitly proposes
   revisiting one — which the master review gate then covers.
4. The change that invalidates a recorded premise updates or removes the entry
   as one of its docs tasks.
