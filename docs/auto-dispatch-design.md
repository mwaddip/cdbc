# Auto-Dispatch for cdbc — Design

## Overview

A workflow extension to cdbc that lets the operator go from a brainstormed design to multiple parallel kitty-window sessions implementing per-module, with the main session retaining context for code review and discussion afterward. "Observed autonomy" — autonomous dispatch within a checkpoint-approved plan, with the operator watching and able to intervene.

The win over `superpowers:subagent-driven-development`: real Claude sessions you can watch mid-flight, interrupt if drifting, and keep talking to about the resulting code after they finish. Subagents are ephemeral and unmonitored; windows persist and are visible.

## Flow

```
cdbc:brainstorming (with module-pointers step)
        ↓
   design doc (with module pointers)
        ↓
cdbc:writing-multi-module-plans
        ↓
   N plans + execution DAG + per-plan preserve_context flag
        ↓
cdbc:dispatching-plans  (DBC bootstrap must have run; auto mode set)
        ↓
   per module (DAG order, parallel where possible):
     - kitty @ launch + ac
     - send wrapper prompt: "use cdbc:receiving-prompts to execute work in <wrapper.md>"
     - wrapper loads overrides + project CLAUDE.md + project skill + cdbc:executing-plans
     - executing-plans runs the per-module plan
     - executor reports back via coordination channel
        ↓
   all modules done → main session: 2-stage code review per module (spec, then quality)
        ↓
   fixes? → re-dispatch to same window (track via ac's session file), optional /clear
        ↓
cdbc:finishing-a-development-branch
```

## Skill Inventory

**Forked from superpowers (MIT attribution; pinned to upstream version at fork time; sync is manual and ad-hoc — operator reviews upstream periodically and merges what's worthwhile):**

- `cdbc:brainstorming` — small addition: post-design step asking about module boundaries and writing pointers into the design doc
- `cdbc:writing-multi-module-plans` — fork of `writing-plans` with module decomposition + DAG emission + `preserve_context` per-plan flag
- `cdbc:executing-plans` — fork, mostly unchanged (renamespace for cross-reference consistency)
- `cdbc:test-driven-development` — fork, unchanged
- `cdbc:requesting-code-review` — fork, unchanged
- `cdbc:finishing-a-development-branch` — fork, unchanged

**New in cdbc:**

- `cdbc:using-cdbc` — bootstrap skill, parallel to `using-superpowers`. Establishes skill availability, priority hierarchy with user-instructions winning, loads early in every session where cdbc is installed.
- `cdbc:dispatching-plans` — owns the main-session orchestration. Parallel to `cdbc:dispatching-prompts` in naming: prompts is single + gated; plans is multi (per module, DAG-ordered) + autonomous.

**Existing cdbc skills (rename to cdbc: namespace):**

- `cdbc:dispatching-prompts` (existing, gate-mode dispatch)
- `cdbc:receiving-prompts` (existing, executor identity + anti-recursion)
- `cdbc:design-by-contract-for-ai-agents` (existing, architectural foundation; gate/auto mode is set here on first invocation)

## Namespace Strategy

- All skills in cdbc use `cdbc:` prefix when referenced cross-skill
- Bare names only when a skill references its immediate sibling and ambiguity is impossible
- The wrapper prompt template uses `cdbc:executing-plans` explicitly — never bare
- Prevents accidental upstream-skill calls at the runtime level, not just by convention

## Three Decisions Already Locked

1. **Module = derived from operator's workflow / DBC bootstrap.** The auto-dispatch skill assumes DBC contracts + boundaries already exist. Preflight check: if not bootstrapped, abort and route to DBC's Bootstrap Discovery.
2. **Window-side invocation = wrapper prompt** (not bare plan path). Wrapper loads overrides + project CLAUDE.md + project-development skill + then invokes `cdbc:executing-plans` on the plan. Keeps plan files clean of bootstrap noise.
3. **Window addressing = `ac`'s session file** at `${XDG_RUNTIME_DIR:-/tmp}/ac/sessions`. Tab-separated `window_id\ttab_id\tpwd` per session. Fewer tokens than querying kitty directly.

## Failure Mode

"Observed autonomy" philosophy: no built-in failure detection. Operator watches windows; on failure or drift, operator intervenes. No timeouts, no auto-escalation, no t-of-n recovery. The whole reason for multi-window over subagents is observability — building in detection would duplicate the operator's role.

## File Structure (cdbc repo)

```
cdbc/
├── .claude-plugin/         # NEW: plugin manifest for cdbc namespace
├── skills/
│   ├── using-cdbc/
│   ├── design-by-contract-for-ai-agents/
│   ├── dispatching-prompts/
│   ├── receiving-prompts/
│   ├── brainstorming/                    # forked
│   ├── writing-multi-module-plans/
│   ├── executing-plans/                  # forked
│   ├── test-driven-development/          # forked
│   ├── requesting-code-review/           # forked
│   ├── finishing-a-development-branch/   # forked
│   └── dispatching-plans/
│       ├── SKILL.md
│       └── wrapper-prompt-template.md
├── bin/ac                  # existing
├── docs/
│   └── auto-dispatch-design.md           # this file
├── LICENSE                 # MIT (existing, mwaddip)
├── NOTICE                  # NEW: third-party attributions (Jesse Vincent / superpowers MIT)
└── README.md
```

## Implementation Order

1. **Plugin install support** in installer (research `.claude-plugin/` manifest format from superpowers cache)
2. **Rename existing cdbc skills to `cdbc:` namespace** + update cross-refs in `dispatching-prompts`, `receiving-prompts`, `design-by-contract-for-ai-agents`
3. **Write `cdbc:using-cdbc` bootstrap skill**
4. **Fork unchanged superpowers skills** with MIT/attribution headers in each SKILL.md
5. **Fork + modify `writing-plans` → `cdbc:writing-multi-module-plans`** (module decomposition + DAG + `preserve_context` flag)
6. **Fork + small mod `brainstorming`** (module-pointers post-step)
7. **Write `cdbc:dispatching-plans` skill + wrapper prompt template**
8. **README + installer + NOTICE updates**

## History

- Repo renamed from `cdbc` to `cdbc` (2026-05-26)
