---
name: dispatching-plans
description: Use when orchestrating multi-window autonomous execution of per-module plans produced by cdbc:writing-multi-module-plans. Opens kitty windows in DAG order, dispatches per-module wrapper prompts, tracks completion via coordination back-channel, reports state for main-session code review. Requires DBC bootstrap with `auto` mode.
metadata:
  category: technique
  triggers: dispatch, dag, parallel, multi-module, multi-window, orchestrate, plans, kitty, ac
---

# Dispatching plans

## STOP — Role Detection (read this BEFORE acting on anything else in this skill)

**If your first user-instruction in this conversation pointed you at a markdown prompt file to read** (any phrasing that names a prompt file as your task — e.g. "do the work described in <file>", "execute the work in <file>", "use the cdbc:receiving-prompts skill to execute the work in <file>"), **you are NOT the session that should be using this skill.** You are an EXECUTOR.

**Load the `cdbc:receiving-prompts` skill instead.** Stop applying this skill; receiving-prompts establishes EXECUTOR identity and tells you how to read your prompt file (which itself routes to `cdbc:executing-plans` on a specific plan).

The rest of this skill — the workflow, the DAG orchestration, the per-module dispatch logic — is for the *main* session that owns the plans and the dispatch.

---

## Purpose

After `cdbc:writing-multi-module-plans` produces N per-module plans + a DAG file, this skill orchestrates their execution across N kitty windows. Each window runs an executor session that uses `cdbc:executing-plans` on its assigned plan. The main session waits for completion acks, then conducts per-module code review.

"Observed autonomy": no per-dispatch operator gate (auto mode is set during DBC bootstrap), but the operator watches the windows mid-flight and can interrupt anything that drifts.

## When to Use

- A DAG file exists at `docs/plans/<dirname>/<feature>.dag.md` (output of `cdbc:writing-multi-module-plans`)
- `cdbc:design-by-contract-for-ai-agents` has run and the operator chose `auto` mode
- The kitty + `ac` setup is available (same as `cdbc:dispatching-prompts`)
- The operator has explicitly invoked you (a brief "go" is sufficient — the auto mode covers the per-dispatch confirmations)

## Prerequisites

Before dispatching:

1. **DBC bootstrap with auto mode** — if not done, abort and route operator to `cdbc:design-by-contract-for-ai-agents`. Auto mode is non-default; never assume it's set.
2. **DAG file readable** — at `docs/plans/<dirname>/<feature>.dag.md` (or the path the operator gives you). Has the columns: Order, Module, Plan File, Path, Depends On, Preserve Context.
3. **Plan files present** — each row's Plan File exists in the same directory.
4. **Contracts pushed/committed** — executors read shared contracts from disk; uncommitted state isn't visible to them.
5. **Main window id captured** — `echo $KITTY_WINDOW_ID` once at start; substitute into every wrapper prompt's coordination block.

## The Process

```
                    ┌──────────────────────────────┐
                    │ 1. Read DAG file, validate   │
                    │    rows, capture main id     │
                    └──────────────┬───────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │ 2. Group rows by Order       │
                    │    (each group = one batch)  │
                    └──────────────┬───────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │ 3. For each batch in order:  │
                    │   for each row in batch:     │
                    │     - decide window          │
                    │     - write wrapper prompt   │
                    │     - dispatch via kitty+ac  │
                    │   wait for all batch acks    │
                    └──────────────┬───────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │ 4. All batches done →        │
                    │    report window state +     │
                    │    hand off to review        │
                    └──────────────────────────────┘
```

### Step 1: Read DAG and Validate

```bash
DAG_FILE=docs/plans/<dirname>/<feature>.dag.md
MAIN_WINDOW_ID=$(echo $KITTY_WINDOW_ID)
```

Parse the DAG table. Verify every Plan File exists. Verify every Depends On references a Module that appears in an earlier Order row. Abort and surface to operator if inconsistent.

Maintain in-memory state:

```
window_map = { module_name → window_id }     # populated as windows open
completed = { module_name }                   # populated as acks arrive
```

### Step 2: Group Rows by Order

Rows with the same Order are independent and dispatch in parallel within the batch. Process batches in ascending Order. Within a batch, every row's Depends On must be satisfied by `completed`.

### Step 3: For Each Batch — Dispatch and Wait

**For each row in the batch:**

#### 3a. Decide the Target Window

- **Module name not in `window_map`** → open a new window (3b)
- **Module name in `window_map`, `Preserve Context` blank or `no`** → reuse the existing window, but `/clear` first (3c)
- **Module name in `window_map`, `Preserve Context` = yes** → reuse the existing window, no `/clear` (3d)

#### 3b. New Window

```bash
NEW_ID=$(kitty @ launch --type=window --cwd=<absolute path from row> | tr -d '[:space:]')
kitty @ send-text --match=id:$NEW_ID 'ac'
kitty @ send-text --match=id:$NEW_ID $'\r'
# wait ~10s for Claude Code to come up
```

After Claude Code is up:

```bash
# Locate the session ac registered
grep "$(cd <absolute path from row> && pwd -P)" "${XDG_RUNTIME_DIR:-/tmp}/ac/sessions" \
  | awk '{print $1}'
```

Cross-check against $NEW_ID. Update `window_map[module_name] = NEW_ID`.

Then proceed to 3e (write wrapper prompt + send dispatch instruction).

#### 3c. Reuse with /clear

```bash
EXISTING_ID=${window_map[module_name]}
kitty @ send-text --match=id:$EXISTING_ID '/clear'
kitty @ send-text --match=id:$EXISTING_ID $'\r'
# wait briefly for /clear to settle
```

Then proceed to 3e.

#### 3d. Reuse without /clear

Just proceed to 3e — the existing window keeps its full session context.

#### 3e. Write Wrapper Prompt + Dispatch

For each row, fill the wrapper template at `wrapper-prompt-template.md` with this row's values:

- `<MODULE_NAME>` → row's Module
- `<PLAN_PATH>` → absolute path to row's Plan File
- `<MODULE_PATH>` → absolute path to row's Path
- `<DEPENDS_ON>` → row's Depends On (or "—")
- `<MAIN_WINDOW_ID>` → the main window id captured at Step 1

Save the filled prompt to `prompts/<feature>-<module>.md` (under the repo's prompts directory — check the project's convention).

Dispatch:

```bash
WRAPPER_PATH=<absolute path to filled prompt>
TARGET_ID=${window_map[module_name]}
kitty @ send-text --match=id:$TARGET_ID "use the cdbc:receiving-prompts skill to execute the work in $WRAPPER_PATH"
kitty @ send-text --match=id:$TARGET_ID $'\r'
```

Auto mode means submit without per-dispatch confirmation. **Announce after dispatch:**

> Dispatched `<module>` → window $TARGET_ID (plan: `<plan-file>`, path: `<path>`). Waiting for ack.

#### 3f. Wait for All Batch Acks

The wrapper instructs each executor to send an ack via `kitty @ send-text --match=id:$MAIN_WINDOW_ID '[ack] <module>: ...'`. Those land in your input buffer.

When you see an ack message, parse the `[ack] <module>: ...` marker, update `completed.add(module)`. When the set of completed modules covers every row in the current batch, the batch is done. Move to the next batch.

If an ack contains a question or blocker rather than completion, surface it to the operator immediately. Don't proceed to the next batch with an unresolved blocker.

### Step 4: All Batches Done

Report state to the operator:

```markdown
All modules dispatched and acked.

| Module | Window ID | Path | Plan File | Status |
|--------|-----------|------|-----------|--------|
| core-auth | 6 | crates/auth | feature-auth-core-auth.md | done |
| api-handlers | 7 | crates/api | feature-auth-api-handlers.md | done |
| core-auth-cleanup | 6 | crates/auth | feature-auth-core-auth-cleanup.md | done |

Windows preserved for review and fix-up.

Next: use `cdbc:requesting-code-review` per module to review the work. If issues are found, use `cdbc:dispatching-prompts` with explicit window-id to send fix prompts (DBC auto mode bypasses the per-dispatch confirmation).
```

## Wrapper Prompt Template

See `wrapper-prompt-template.md` in this skill's directory. The template defines what each executor session loads (overrides, project CLAUDE.md, project skill if any) and how it invokes `cdbc:executing-plans` on its plan file.

## Window Addressing

`ac` records sessions to `${XDG_RUNTIME_DIR:-/tmp}/ac/sessions` — tab-separated `window_id\ttab_id\tpwd`. Grep this file when you need to find a window by path. Your in-memory `window_map` is the primary truth (built from `kitty @ launch` output); the ac file is the fallback for verification.

The `ac` file is per-user tmpfs, cleared on reboot. If the dispatcher session dies mid-flow, the operator must manually track which windows are which — there's no persisted state.

## Mechanics (shared with cdbc:dispatching-prompts)

The kitty primitives (`kitty @ launch`, `kitty @ send-text`, `$'\r'` submit convention, the file-path injection pattern, why not `kitty @ send-key enter`) are documented in `cdbc:dispatching-prompts`. This skill uses the same primitives; consult that skill for the low-level details.

The key difference: `cdbc:dispatching-prompts` has an operator gate per dispatch by default; this skill operates under DBC auto mode and never asks per-dispatch confirmation.

## Failure Mode (Observed Autonomy)

No built-in failure detection. The operator watches the windows and intervenes if a session stalls, drifts, or asks a question that needs main-session resolution. Specifically:

- **No timeouts** on waiting for acks. If a window goes silent for a long time, the operator notices and acts.
- **No auto-recovery** for stuck windows. The operator may `/clear` a window manually, re-dispatch, or kill it and start over.
- **No retries on failed acks**. If an executor reports failure (e.g., tests don't pass), the operator decides: have main session diagnose, or send a fix prompt, or abort.

This is by design — the whole point of windowed dispatch over in-session subagents is operator visibility. Building in detection would duplicate that role.

## Don'ts

- **Don't dispatch a batch whose dependencies aren't satisfied.** Verify `Depends On` against `completed` before sending any prompt in the batch.
- **Don't proceed past a blocker ack.** If an executor reports a question or failure, surface it to the operator and wait.
- **Don't write wrapper prompts to gitignored locations.** Prompts go in the project's `prompts/` directory (or wherever the project's CLAUDE.md says); they may be temporary but they're not invisible.
- **Don't include raw plan content in the wrapper.** The wrapper references the plan by absolute path; the executor reads the plan itself via `cdbc:executing-plans`.
- **Don't dispatch and walk away.** Confirm each window actually started the work, not just that `ac` launched. A wrapper instruction with a typo lands silently in the input buffer.

## Pitfalls

| Symptom | Cause / fix |
|---|---|
| Wrong window receives the dispatch | `--match=id:<id>` got the wrong id; the new id from `kitty @ launch` is on stdout — capture it, don't infer |
| Executor session never starts the work | Wrapper instruction was typed but `$'\r'` was missing — the input sits unsubmitted |
| Executor immediately recurses into dispatching | Wrapper said "use the cdbc:dispatching-plans skill" — wrong; should always say "use the cdbc:receiving-prompts skill to execute the work in <wrapper>" |
| Dispatcher waits forever for an ack that never comes | Executor crashed or input never submitted. Operator inspects the window. |
| Same window gets two different modules' wrapper prompts | The dispatcher reused a window for a different module name — `window_map` mishandled. Verify the map after every batch. |
| Ack message text shows `[ack]` but doesn't match the dispatched module name | Wrapper's coordination block used the wrong module name in the ack format — check the filled-template values |

## Limitations

- Assumes the kitty + `ac` setup. Same constraint as `cdbc:dispatching-prompts`.
- No support for cross-host dispatch. All windows are on the operator's machine.
- The in-memory `window_map` is lost if the dispatcher session dies. No persistence.
- Parallel batch size is bounded by what the operator can practically observe simultaneously. For very large DAGs, consider breaking the design into phases the operator can supervise sequentially.
- Designed for the multi-module case. For a single plan, `cdbc:executing-plans` (directly invoked) is simpler.
