---
name: openspec-test-manual
description: Generate a manual end-to-end test checklist for an OpenSpec change. Use when the user wants a human-run test plan based on proposal requirements instead of having AI execute the full E2E flow.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.2.0"
---

Generate a practical manual end-to-end testing checklist for an OpenSpec change based on the proposal requirements, spec scenarios, design risks, task status, and relevant implemented code paths.

Use this when the user wants to perform the testing manually instead of having the agent execute a full end-to-end test run.

The output should help a human tester validate the change efficiently: what to set up, what to test, how to test it, what to observe, and what evidence proves each requirement passed.

**Critical principle**: Only include test cases that a human can actually execute against the running system to verify this change's implementation. If a test case is blocked because the runtime wiring, emission path, or integration glue does not exist yet, it does NOT belong in the main test checklist. Put it in a separate "Deferred / Not Yet Testable" section so the tester is never confused into thinking a missing feature is a bug.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

1. **Select the change**

   If a name is provided, use it. Otherwise:
   - Infer from conversation context if the user mentioned a change
   - Auto-select if only one active change exists
   - If ambiguous, run `openspec list --json` to get available changes and use the **AskUserQuestion tool** to let the user select

   Always announce: "Preparing manual test checklist for: <name>" and how to override.

2. **Check change status**

   ```bash
   openspec status --change "<name>" --json
   ```

   Parse the JSON to understand:
   - `schemaName`: The workflow being used
   - Which artifacts exist for the change
   - Whether implementation appears complete enough for meaningful testing

    If the change appears partially implemented, do not stop automatically. Instead, clearly separate what is testable through the running system from what is only verified by unit tests. Pay special attention to the `design.md` "Non-Goals" section — requirements listed there may have supporting code that is intentionally not wired into the running binary. Any test case that depends on such code should go to the "Deferred / Not Yet Testable" section, not the main checklist.

3. **Load proposal artifacts**

   Use the CLI to get context files:

   ```bash
   openspec instructions apply --change "<name>" --json
   ```

   Read all available artifacts from `contextFiles`:
   - `proposal.md` (if present)
   - `design.md` (if present)
   - `tasks.md` (if present)
   - Any spec deltas in `openspec/changes/<name>/specs/**/*.md`
   - Any additional context files returned by the CLI

4. **Extract test intent from the artifacts**

   Build the checklist from explicit requirements, not guesses.

   Extract from:
   - Proposal `Why`, `What Changes`, `Capabilities`, and `Impact`
   - Design `Goals`, `Non-Goals`, `Decisions`, `Risks / Trade-offs`
   - Spec `Requirements` and `Scenarios`
   - Task completion details in `tasks.md`

   Convert these into a concrete testing model:
   - User-facing flows that should work
   - Inputs and preconditions needed for each flow
   - Expected outputs, side effects, and observability signals
   - Failure paths and edge cases worth manually checking
   - Areas that are explicitly out of scope

5. **Explore the codebase for testing context**

   Use Glob, Grep, and Read tools to understand how the change is exposed and how a human should validate it.

    Identify:
    - Entry points: UI routes, APIs, CLI commands, events, background jobs, hooks, integrations
    - **Runtime wiring**: whether the code is actually called from the running binary. If functions exist and are unit-tested but no production path invokes them, any test case depending on them must be deferred.
    - Runtime dependencies: services, databases, queues, caches, credentials, feature flags, external systems
    - Existing seed data, fixtures, helper scripts, local setup commands, or dev workflows
    - Observable outputs: UI states, API responses, files, logs, traces, metrics, DB rows, messages, notifications
    - Relevant implementation limitations or assumptions that affect manual testing

   Do not perform the manual test. Use the codebase only to make the checklist more actionable and realistic.

6. **Determine manual setup requirements**

   Produce a concise setup section for the human tester.

   Include only what is actually needed:
   - Services that must be running
   - Environment variables or config that must exist
   - Required accounts, roles, fixtures, or seed data
   - Commands to start the app or supporting services if those are discoverable
   - External dependencies or devices involved in the flow

   If a proposal involves client-side initiated test calls in this repo, mention the available dev FusionPBX server and test extensions:
   - `10.17.1.82`
   - `5851@10.17.1.82`
   - `5852@10.17.1.82`
   - `5853@10.17.1.82`

7. **Generate manual end-to-end test cases**

   Create a focused set of manual E2E test cases that a human can execute from the outside in.

   Organize them into:
   - **Smoke / Happy path**: the minimum journeys that prove the change basically works
   - **Core requirement coverage**: one or more cases per requirement or scenario
   - **Edge cases**: invalid input, empty state, duplicate state, dependency failure, retry, ordering, persistence, limits, permissions, and domain-specific risks
   - **Regression checks**: adjacent existing behavior likely to break because of this change

   For each test case include:
   - `ID`: short stable identifier such as `M1`, `M2`
   - `Title`: short description
   - `Priority`: `P0`, `P1`, or `P2`
   - `Covers`: requirement, scenario, or proposal section
   - `Preconditions`: exact state needed before starting
   - `Steps`: a numbered human-executable sequence
   - `Expected result`: what success looks like
   - `Evidence to capture`: logs, screenshots, traces, API payloads, DB rows, files, messages, metrics, or visible UI states
   - `Notes`: optional caveats, ambiguity, or implementation-specific observation points

   Prefer fewer high-value cases over a bloated checklist. Merge redundant cases when possible.

8. **Separate runnable tests from blocked/deferred ones**

    The main "Test Cases" section must ONLY contain cases a human can actually execute and observe right now. This is essential: a tester reading the checklist should never mistake a missing runtime path for a bug in this change.

    **If a test case depends on runtime wiring, emission paths, or integration glue that does not exist in the current binary** (e.g., the code is unit-tested but never called from production), do the following:
    - **Remove it from the main Test Cases section entirely**
    - **Add it to a separate "Deferred / Not Yet Testable" section** at the bottom
    - State exactly what is missing and what future change would unblock it
    - Reference the specific code that exists but is not wired (file:line)

    Cases blocked by environment, credentials, or unclear requirements follow the same rule — move them to the deferred section.

    The main checklist should only contain cases with `Status: Ready`. A clean, fully runnable checklist is more useful than a mixed list that mixes runnable and blocked tests.

9. **Provide a structured manual test output**

   Use this structure:

   ```markdown
   ## Manual E2E Test Checklist: <change-name>

   ### Scope
   [What proposal/spec behavior this checklist covers]

   ### Readiness
   - Status: Ready / Partially ready / Not ready
   - Basis: [artifacts and implementation context used]
   - Known blockers: [list or None]

   ### Setup
   - [setup item]

    ### Test Cases
    > Only cases that can be executed and observed right now. Blocked/untestable cases are listed separately below.

    #### M1 - [Title]
    - Priority: P0
    - Covers: [requirement/scenario]
    - Preconditions: [state]
    - Steps:
      1. [step]
      2. [step]
    - Expected result: [result]
    - Evidence to capture: [evidence]
    - Notes: [optional]

    ### Suggested Execution Order
    1. [case IDs in sensible order]

    ### Deferred / Not Yet Testable
    Cases that verify correct behavior but cannot be exercised through the running system yet because required runtime wiring, emission paths, or integration glue is missing.

    #### D1 - [Title]
    - Priority: P0
    - Covers: [requirement/scenario]
    - Why blocked: [exact reason — e.g., "observeChannelEvent is unit-tested but no EventHandler invokes it from main.go"]
    - What unblocks it: [e.g., "A follow-up change that wires a call-event handler to the segment state logic"]
    - Relevant code: [file:line references to existing but unwired implementation]

    ### Gaps / Clarifications
    - [missing setup, ambiguous requirement, or blocked area]

    ### Exit Criteria
    - All runnable test cases pass with captured evidence
    - If no runnable test cases exist for a core requirement, that requirement is noted as "not manually testable" with the specific blocker
   ```

10. **Keep the checklist grounded in the proposal**

   Every important requirement or scenario in the proposal/spec should be represented by at least one explicit test case or a clearly stated reason it is not testable yet.

   If a requirement appears untestable in practice, call that out directly rather than inventing a vague test.

11. **Write the checklist to file**

    After generating the checklist, write it to the change directory as `manual-test.md`:

    ```
    openspec/changes/<change-name>/manual-test.md
    ```

    Use the Write tool with the full checklist content. The file path is derived from the `changeDir` field returned by `openspec instructions apply --change "<name>" --json` (the `changeDir` value + `/manual-test.md`).

    Inform the user that the checklist has been written to this file.

**Guardrails**

- This skill generates a manual testing checklist. Do NOT execute the manual tests unless the user explicitly asks.
- Do NOT write implementation code or proposal changes.
- Do NOT invent setup steps, credentials, or environment details that were not found in artifacts or codebase context.
- Prefer real user-facing flows over internal helper calls.
- Keep the checklist concise, high-signal, and directly tied to requirements.
- **Never put a blocked test case in the main "Test Cases" section.** Blocked cases go to "Deferred / Not Yet Testable". A tester should never read the main checklist and think a missing runtime path is a bug.
- Surface unclear requirements and blocked cases explicitly in the deferred section.
- Reference specific files and artifact sections when helpful.
- Use `contextFiles` from CLI output; do not assume only standard files exist.
- Check `design.md` Non-Goals carefully. If a requirement is listed as a non-goal, any test case depending on it must be deferred — it is not a bug, it is intentionally out of scope.
- Refer to `openspec/AGENTS.md` (located inside the `openspec/` directory — run `ls openspec` or `openspec update` if you don't see it) if you need additional OpenSpec conventions or clarifications.

**Fluid Workflow Integration**

This skill supports the human-executed testing path:

- Use after openspec-apply-resume when the user wants to test manually
- Use before openspec-align if manual testing may reveal proposal drift
- Use before openspec-archive-change to confirm what should be validated by a human
- If manual testing reveals bugs, follow with openspec-fix
- If manual testing reveals intentional behavior drift, follow with openspec-align
