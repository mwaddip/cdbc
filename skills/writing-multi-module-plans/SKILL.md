---
name: writing-multi-module-plans
description: "Use when you have a brainstormed design with module boundary annotations - produces N per-module implementation plans plus an execution DAG for cdbc:dispatching-plans. For single-module work, use upstream writing-plans (or superpowers:writing-plans) instead."
---

<!--
Derived from superpowers:writing-plans (MIT, Copyright (c) 2025 Jesse Vincent).
Upstream: https://github.com/obra/superpowers
Modifications by mwaddip:
- Renamed (this skill produces N plans + a DAG, not one plan)
- New "Input: Module Pointers in the Design Doc" section
- New DAG file output for cdbc:dispatching-plans consumption
- Per-plan Preserve Context flag
- Plan header gains Module / Working Directory / Depends On fields
- Execution Handoff points at cdbc:dispatching-plans + cdbc:executing-plans
- Cross-skill references updated to cdbc: namespace
-->

# Writing Multi-Module Plans

## Overview

Given a design doc with module boundary annotations (from `cdbc:brainstorming` or hand-marked), produce N per-module implementation plans plus an execution DAG. Each plan is assumable-zero-context — the executor just needs the plan, its working directory, and the project's contracts. The DAG tells `cdbc:dispatching-plans` the execution order and per-plan context-preservation flags.

**Announce at start:** "I'm using the writing-multi-module-plans skill to produce per-module plans."

**Context:** Run this in the main session of a cdbc-managed multi-component project. Contracts should already exist (via `cdbc:design-by-contract-for-ai-agents` bootstrap).

**Save plans to:** `docs/plans/<YYYY-MM-DD>-<feature-name>/`
- `<feature-name>-<module>.md` for each plan
- `<feature-name>.dag.md` for the execution DAG

## Input: Module Pointers in the Design Doc

The design doc (from `cdbc:brainstorming` or hand-marked) is expected to end with a Module Decomposition section:

```markdown
## Module Decomposition

| Order | Module | Path | Depends On | Preserve Context |
|-------|--------|------|------------|------------------|
| 1 | core-auth | `crates/auth` | — | — |
| 2 | api-handlers | `crates/api` | core-auth | — |
| 3 | core-auth-cleanup | `crates/auth` | api-handlers | yes |
```

Column meanings:

- **Order**: execution sequence number. Rows with the same Order may run in parallel.
- **Module**: a short name for the dispatched work. Used as the window identifier. Same module name across rows = same logical window (when Preserve Context is set).
- **Path**: working directory the executor session will `cd` into (relative to repo root).
- **Depends On**: prior modules whose completion is a prerequisite. Comma-separated module names. The dispatcher waits for each named upstream module to ack completion before sending this plan.
- **Preserve Context**: `yes` = dispatch into the existing window for this module without `/clear` (executor keeps prior session context). Blank or `no` = `/clear` first or open a fresh window. Only meaningful when a module name repeats in a later row.

**If the design doc has no Module Decomposition section**, this is the wrong skill — fall back to upstream `superpowers:writing-plans` for a single-plan flow.

## Output

For a design doc named `feature-auth.md`, produce a plans directory:

```
docs/plans/2026-05-26-feature-auth/
├── feature-auth.dag.md
├── feature-auth-core-auth.md
├── feature-auth-api-handlers.md
└── feature-auth-core-auth-cleanup.md
```

## DAG File Format

```markdown
# feature-auth — Execution DAG

| Order | Module | Plan File | Path | Depends On | Preserve Context |
|-------|--------|-----------|------|------------|------------------|
| 1 | core-auth | feature-auth-core-auth.md | crates/auth | — | — |
| 2 | api-handlers | feature-auth-api-handlers.md | crates/api | core-auth | — |
| 3 | core-auth-cleanup | feature-auth-core-auth-cleanup.md | crates/auth | api-handlers | yes |
```

`cdbc:dispatching-plans` reads this file to drive per-window dispatch. The dispatcher resolves plan file paths relative to the DAG file's directory.

## Per-Plan Structure

Each per-module plan file follows the upstream `writing-plans` format with two header additions: **Module** and **Working Directory** (so the executor session can confirm its scope) and **Depends On** (so it knows what prior work it can rely on as already committed).

### Plan Document Header

```markdown
# [Feature Name] — [Module Name] Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use cdbc:executing-plans to implement this plan task-by-task.

**Module:** [module-name]
**Working Directory:** [path relative to repo root]
**Goal:** [One sentence describing what this module builds in this phase]
**Architecture:** [2-3 sentences about approach, scoped to this module]
**Tech Stack:** [Key technologies/libraries used by this module]
**Depends On:** [Prior modules whose completion is prerequisite; their outputs are committed and readable by this executor]

---
```

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

## Task Structure

```markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

**Step 1: Write the failing test**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

**Step 2: Run test to verify it fails**

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

**Step 3: Write minimal implementation**

```python
def function(input):
    return expected
```

**Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

**Step 5: Commit**

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```
```

## Splitting a Module Across Multiple Plans

A module appears in multiple rows when its work has interleaved dependencies — e.g., module A's first phase produces an interface module B consumes, and module A's follow-up depends on B existing. The brainstorm step should have surfaced this and emitted multiple rows with the same Module name.

Each row gets its own plan file with a suffix:
- `feature-auth-core-auth.md` (Order 1)
- `feature-auth-core-auth-cleanup.md` (Order 3, depends on api-handlers, preserve_context=yes)

The Preserve Context flag determines whether the executor session running plan 1 stays alive (kept window, no /clear) for plan 3, or gets a fresh context. Same-context preserves discussion history (useful for "remember what we settled on for X?"); fresh context avoids drift but loses memory.

## Remember

- Exact file paths always (relative to the module's working directory)
- Complete code in plan (not "add validation")
- Exact commands with expected output
- Reference cdbc skills with explicit `cdbc:` prefix
- DRY, YAGNI, TDD, frequent commits
- For modules with "Depends On" — assume those upstream modules' work is already committed and available to read (the dispatcher waits for upstream completion before sending this plan)
- Each plan must be standalone: an executor with only this plan + the project's contracts + their working directory must be able to complete the work without consulting the main session

## Execution Handoff

After saving the plans + DAG, offer execution choice:

**"Plans complete. Saved to `docs/plans/<dirname>/`. Two execution options:**

**1. Auto-dispatched (recommended for multi-module)** — `cdbc:dispatching-plans` opens N kitty windows in DAG order, dispatches each plan, watches for completion, reports back for main-session review.

**2. Parallel Session (manual)** — Open a new kitty session per plan yourself, each running `cdbc:executing-plans` on its plan file. You handle DAG ordering and ack tracking.

**Which approach?"**

**If Auto-dispatched chosen:**
- **REQUIRED SUB-SKILL:** Use `cdbc:dispatching-plans`
- It reads the DAG file and orchestrates window opens, prompt dispatch, and completion tracking

**If Parallel Session chosen:**
- Guide your human partner to open new sessions per plan in DAG order
- Each new session uses `cdbc:executing-plans` on its assigned plan file
- The main session does code review when each plan reports back

## When to Use

This skill applies when the brainstormed design has a Module Decomposition section indicating multi-module work. For a single-feature plan with no module split, use upstream `superpowers:writing-plans` instead.

## Limitations

- Use only when the task clearly involves multi-module work with module pointers in the design doc.
- Do not produce a DAG more complex than the design supports — if module dependencies are unclear, surface that to the operator and let them clarify before splitting.
- Stop and ask for clarification if the design doc's Module Decomposition section is missing required columns or has ambiguous dependencies.
