---
name: audit-docs
description: Recurring full audit of docs/, AGENTS.md, README.md, and root-level markdown docs for coherence, structure, scannability, agent accessibility, and writing-for-agents load economics. Use when docs feel messy, scattered, or drifted, or for a periodic docs check. Works on any repo with a docs/ folder, AGENTS.md, and README.md.
---

Run the recurring documentation audit for this repository. Scope: every markdown file under `docs/`, plus `AGENTS.md`, `README.md`, and any other root-level markdown docs (e.g. a PRD or CONTRIBUTING). Extra focus for this run (optional): $ARGUMENTS

This command makes no assumptions about the repo's docs conventions. Discover them first: does `docs/` have a navigation hub (a `README.md`/`index.md`/`SUMMARY.md` at its root)? A retired/archive area? An audience-based subfolder taxonomy? Audit against what this repo actually does, and judge structural findings relative to the size of the docs tree — a three-doc repo needs no hub, taxonomy, or retirement machinery.

## Standard

Load the `writing-for-agents` skill before auditing. Its levers are the standard for Pass 3 — context pointers, information hierarchy, single source of truth, co-location, sprawl, negation, completion criteria. Passes 1–2 are structural.

## Step 1 — Mechanical checks

Run this checker from the repository root before reading anything; it catches drift cheaply. It adapts to the repo: link and anchor checks always run; the orphan check starts from the repo's real entry points (`AGENTS.md`, `README.md`, and the docs hub if one exists) instead of assuming a particular index format.

```bash
python3 - <<'EOF'
import re, os, glob, sys
from collections import deque

docs = sorted(glob.glob("docs/**/*.md", recursive=True))
root_extra = sorted(p for p in glob.glob("*.md") if p not in ("AGENTS.md", "README.md"))
files = docs + [f for f in ("AGENTS.md", "README.md") if os.path.exists(f)] + root_extra

hubs = [h for h in ("docs/README.md", "docs/index.md", "docs/SUMMARY.md", "docs/_index.md", "docs/Home.md") if os.path.exists(h)]
retired_areas = tuple(a for a in ("docs/retired/", "docs/archive/") if os.path.isdir(a))

fail = []

def slug(h):
    return re.sub(r"[^\w\s-]", "", h.lower()).replace(" ", "-")

def resolve(f, path):
    for base in (os.path.dirname(f), ""):
        r = os.path.normpath(os.path.join(base, path))
        if os.path.exists(r):
            return r
    return None

# pass 1: read everything, collect headings and raw references
heads, links, ticks = {}, {}, {}
for f in files:
    text = open(f).read()
    heads[f] = {slug(h) for h in re.findall(r"^#+ (.+)$", text, re.M)}
    links[f], ticks[f] = [], []
    for m in re.finditer(r"\[[^\]]*\]\(([^)]+)\)", text):
        t = m.group(1)
        if t.startswith(("http", "mailto:")):
            continue
        path, _, anchor = t.partition("#")
        links[f].append((path, anchor))
    # backtick doc paths containing a slash (e.g. `docs/foo.md` in routing tables)
    ticks[f] = re.findall(r"`([A-Za-z0-9_.-]+(?:/[A-Za-z0-9_.-]+)+\.md)`", text)

# pass 2: check references, build the doc-to-doc graph
refs = {}
for f in files:
    out = set()
    for path, anchor in links[f]:
        if not path:
            if anchor and anchor not in heads[f]:
                fail.append(f"broken anchor: {f} -> #{anchor}")
            continue
        r = resolve(f, path)
        if not r:
            fail.append(f"broken link: {f} -> {path}")
            continue
        if anchor and r in heads and anchor not in heads[r]:
            fail.append(f"broken anchor: {f} -> {path}#{anchor}")
        if r in heads:
            out.add(r)
    for p in ticks[f]:
        r = resolve(f, p)
        if not r:
            fail.append(f"broken doc path: {f} -> {p}")
        elif r in heads:
            out.add(r)
    refs[f] = out

# reachability: every active doc must be reachable from an entry point
sources = [s for s in ("AGENTS.md", "README.md") if os.path.exists(s)] + hubs
seen = set(sources)
queue = deque(sources)
while queue:
    for r in refs.get(queue.popleft(), ()):
        if r not in seen:
            seen.add(r)
            queue.append(r)

def retired(p):
    return p.startswith(retired_areas)

for p in docs:
    if not retired(p) and p not in hubs and p not in seen:
        fail.append(f"orphan doc (not reachable from AGENTS.md, README.md, or docs hub): {p}")
for h in hubs:
    if not any(h in refs.get(s, ()) for s in ("AGENTS.md", "README.md")):
        fail.append(f"docs hub not linked from README.md or AGENTS.md: {h}")

print("\n".join(fail) if fail else "docs checks: clean")
print(f"({len(docs)} docs files checked)")
sys.exit(1 if fail else 0)
EOF
```

Record the failures; fix their causes after Step 2, not before.

## Step 2 — Read everything

Read every file in scope in full — all of `docs/` (including any retired/archive area), `AGENTS.md`, `README.md`, and other root-level markdown docs. Complete this step before judging: audit the current tree, never memory of a previous session.

Role expectations: `README.md` is written for human developers and users — what the project is, why it exists, and how to get started; it orients and routes (project summary, workflow pointers, stack summary) and carries only the minimal quick-start, with longer sequences in their canonical homes behind pointers. `AGENTS.md` is the agent entry point — operational rules, deterministic build/test commands, do-not-touch paths, and architectural constraints, referring out to `docs/`. If a docs hub exists, it is the navigation layer for `docs/`.

## Step 3 — Audit passes

**Pass 1 — Structure and scannability.**

- Audience grouping: once `docs/` is too large to scan flat, docs are grouped by audience or purpose (e.g. product, development, operations, reference) with a shallow, stable, guessable taxonomy — a reader can predict where a doc lives and where a new one goes. Flat `docs/` is correct while the set is small.
- Retired separation: if the repo has a retired/archive area, superseded or unsupported docs live there (with their own index) instead of being deleted. If it has none, fold superseded content into its successor doc and leave a pointer — do not build retirement machinery for a small docs tree.
- Navigation integrity: every active doc is reachable from the repo's entry points (`README.md`, `AGENTS.md` routing, and the docs hub if present); no orphans and no dead routing rows; `AGENTS.md` routing and the hub agree with each other. When `docs/` outgrows what `README.md` can route, a hub is warranted.
- New or moved content follows the repo's own stated conventions (a conventions section in the hub, a contributing guide, or equivalent) where present.

**Pass 2 — Freshness.**

Verify environment claims against the environment, and fix stale claims at their source: declared commands vs the package manifest, Makefile/justfile, scripts, and CI workflows; app/module lists vs the actual source tree; script, overlay, and config names vs their actual directories; every referenced path vs the actual files. The environment is a source of truth; a doc restating it is a cache that must not drift.

**Pass 3 — Load economics (writing-for-agents).**

- `AGENTS.md` is always-loaded: every meaning stated exactly once, duplicated policy and commands disclosed behind pointers, hard guardrails and the always-needed canonical commands kept inline.
- One canonical home per meaning; other files point, they do not copy. Map this repo's canonical homes before judging — typically: `AGENTS.md` for core commands and always-loaded rules, a testing doc for the full test-command policy, a local-verification doc for the verification workflow, deployment/runbook docs for release sequences, and a conventions doc for doc-writing rules.
- Co-location: content sits with its peers — test patterns with test-writing guidance, runbooks with operations docs, contracts and system reference material together.
- Sprawl: any doc beyond ~600 lines gets progressive disclosure — split by branch or sequence, cross-pointers both ways, routing entries updated. Versioned requirement documents (e.g. a PRD) are exempt.
- Negation: prohibitions stay only as hard guardrails; rephrase behavior targets positively.
- Pointers: routing rows front-load the task/trigger word; section references name the exact heading.
- Accepted caches (do not "fix" these): onboarding/quickstart docs may cache setup commands; docs written as self-contained handoffs (e.g. for agents) may keep their unique procedures inline.

**Pass 4 — Change safety.**

- Preserve unrelated uncommitted user changes; `AGENTS.md` and docs may carry them — edit around them.
- Never modify historical records (`docs/retired/**`, `openspec/changes/archive/**`, operation or audit records) except for cross-reference fixes; when in doubt, leave them.
- Moves use `git mv`; edits to retired docs are limited to cross-reference fixes.
- No commits, pushes, or deletes unless explicitly requested.

## Step 4 — Fix and verify

Apply the smallest correct fix for each finding. Then re-run the Step 1 checker until it reports clean, and confirm every heading reference you added or moved (markdown anchors and named-heading pointers) resolves to a real heading in its target file.

## Step 5 — Report

Report findings grouped by pass with counts, changed files and why, the final checker output, accepted tradeoffs (caches kept, splits declined, conventions left as-is), and remaining risks. This is a documentation-only change: no automated tests beyond the checker, review the diff before finishing.
