---
name: using-cdbc
description: Use at session start when cdbc skills are available - establishes the Design by Contract workflow, the cdbc: skill namespace, and which cdbc skill applies to which task
---

<SUBAGENT-STOP>
If you were dispatched as a subagent to execute a specific task, skip this skill.
</SUBAGENT-STOP>

# Using cdbc

cdbc applies Bertrand Meyer's **Design by Contract** at the architecture level: shared contracts hold the source of truth, a main session writes contracts and prompts (never component code), and per-component sessions implement against contracts within their boundaries.

This skill is the bootstrap for any session where cdbc skills are available. It establishes the workflow shape and which skill applies when. It does NOT replicate the general "how to use skills" foundation from `superpowers:using-superpowers` — if you have superpowers installed, those rules still apply alongside these.

## Skill Inventory

### Architecture

- **cdbc:design-by-contract-for-ai-agents** — first skill to invoke in any multi-component project. Runs Bootstrap Discovery if no contracts exist; otherwise confirms the dispatch gate mode (`auto` / `gate`).

### Dispatch (main session)

- **cdbc:dispatching-prompts** — send a single prompt to one component session (kitty + `ac`). Operator gate per dispatch by default.
- **cdbc:dispatching-plans** — autonomous multi-window orchestration of N per-module plans. Requires DBC bootstrap with `auto` mode. Used after `cdbc:writing-multi-module-plans`.

### Dispatch (executor side)

- **cdbc:receiving-prompts** — establishes EXECUTOR identity in a dispatched session; prevents recursive dispatch chains. Loads automatically when a dispatch message names it.

### Workflow (forked from superpowers, MIT — Jesse Vincent)

- **cdbc:brainstorming** — design exploration. Includes an optional module-boundary annotation step for multi-module flows.
- **cdbc:writing-multi-module-plans** — splits a design doc with module pointers into N per-module plans + a DAG, with per-plan `preserve_context` flag.
- **cdbc:executing-plans** — implements a plan task-by-task with batch checkpoints. Used on the window side by `cdbc:dispatching-plans`.
- **cdbc:test-driven-development** — TDD discipline for component implementation work.
- **cdbc:requesting-code-review** — main session uses this for the code review phase after `cdbc:dispatching-plans` completes.
- **cdbc:finishing-a-development-branch** — wrap-up after all implementation work is verified.

## Canonical Workflow

### Single-task dispatch

```
cdbc:design-by-contract-for-ai-agents   →  bootstrap or confirm gate mode
cdbc:dispatching-prompts                →  send prompt to component session
```

### Multi-module feature work

```
cdbc:design-by-contract-for-ai-agents   →  bootstrap; pick `auto` mode
cdbc:brainstorming                      →  design doc with module pointers
cdbc:writing-multi-module-plans         →  N plans + DAG
cdbc:dispatching-plans                  →  orchestrate windows, watch for completion
cdbc:requesting-code-review             →  per-module review on main session
cdbc:finishing-a-development-branch     →  wrap up
```

## Red Flags (cdbc-specific)

| Thought | Reality |
|---|---|
| "I'll just dispatch this — no need to bootstrap DBC" | Bootstrap establishes the contract surface and dispatch gate. Skipping it means dispatching into undefined architecture. |
| "I'll auto-dispatch this — the operator hasn't confirmed but it seems fine" | Auto mode is per-project, set during DBC bootstrap. Default is `gate`. Don't assume `auto` was selected. |
| "I'll just edit the component file from the main session" | Working directory is the boundary. Write a prompt; dispatch it. |
| "There's no plan yet, but I'll `dispatching-plans` anyway" | `cdbc:dispatching-plans` requires output from `cdbc:writing-multi-module-plans`. Start there. |
| "I'll reference a sibling skill bare — same plugin, no ambiguity" | Always use the `cdbc:` prefix in cross-references. Bare names risk landing on a same-named upstream skill. |

## Instruction Priority

User instructions (CLAUDE.md, GEMINI.md, AGENTS.md, direct requests) always win over these skills. If the user says "skip the contracts dance, just edit the code", do that.

## Coexistence with other plugins

This skill assumes the general "always check skills before responding" foundation from either `superpowers:using-superpowers` (if installed) or your project's CLAUDE.md. cdbc skills focus on the architectural and workflow layer; they do not duplicate general skill-discipline rules.

## When to Use

At session start in any project where cdbc skills might apply. After this loads, invoke `cdbc:design-by-contract-for-ai-agents` to handle first-invocation setup.

## Limitations

- This skill provides an orientation; it does not replace invoking the specific cdbc skills when their triggers apply.
- The skill list above includes skills that may be added incrementally during a fresh cdbc install. If a skill named here isn't present, check the install or fall back to the closest equivalent.
