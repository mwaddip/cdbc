---
name: design-by-contract-for-ai-agents
description: Use when coordinating multiple AI coding agent sessions across a multi-component or multi-repository codebase, when bootstrapping a new project that will involve more than one component, when establishing interface contracts between components, when interface documentation is missing or thin and components are about to be built, or when agents in a multi-component project keep silently overwriting each other's work. Bertrand Meyer's Design by Contract applied at the architecture level — covers the shared-contracts directory, contract-first workflow, prompt-as-spec dispatch, the operator-as-gate pattern, and a bootstrap discovery flow for greenfield projects.
metadata:
  category: pattern
---

# Design by Contract for AI Agents

Multi-component, multi-agent orchestration. A shared-contracts directory (commonly named `facts/`, `specs/`, or `contracts/`) holds the interface contracts: preconditions, postconditions, invariants, and architecture overview. The main session writes contracts and prompts — it never writes component code. Component sessions own one component each, read the contracts, implement, and push their own work. The contract leads; code follows.

Borrowed from Bertrand Meyer's Design by Contract — applied at the *architecture* level, not the function level.

## On First Invocation

Before applying this methodology, do these three things in order:

### 1. Check whether contracts already exist

Look for a shared-contracts directory (`facts/`, `specs/`, `contracts/`, or similar) containing per-component interface specifications.

- **Contracts exist and cover the work ahead** → proceed to step 2.
- **No contracts found** OR **contracts are thin / partial / outdated for the work ahead** → STOP. Notify the operator and run **Bootstrap Discovery** (below) before any code-touching work begins.

This check is non-negotiable. Skipping it means you'll write code that becomes the contract by accident.

### 2. Confirm the dispatch gate

Ask the operator one question and remember the answer for the rest of the session:

> "Auto-dispatch prompts to component sessions when ready, or require explicit `y/n` approval per dispatch? (auto / gate)"

- **`gate`** (default if unclear) — every dispatch requires `[DISPATCH] <component>: <description> — send? (y/n)` confirmation.
- **`auto`** — operator authorizes dispatching without per-call approval. This explicitly overrides any "always confirm before submitting" rule in the project's dispatch tooling. Always announce after dispatching what was sent.

### 3. Confirm session role

You are the **main session** — you own contracts and prompts and do not edit component code. If the operator wants you to act as a component session instead, this skill doesn't apply; close it.

## Bootstrap Discovery

Triggered when no contracts exist or they're insufficient for the work ahead. Goal: design the initial interface set *before* code is written.

Walk the operator through these questions, in order:

1. **What components / domains does (or will) the project have?**
   A "component" is anything large enough to warrant its own session and boundary. Examples: a network layer, a storage layer, a business-logic layer, a UI, a CLI, an external API client, an indexer, a scheduler. List them.

2. **For each component, what does it own?**
   Internal state, files, modules, external resources it talks to. This becomes its scope. Anything not owned by anyone is a gap — flag it.

3. **For each pair of adjacent components, what is the minimal data exchanged?**
   Aim for the *least* surface that lets each component run agnostic of how its neighbor works internally. If component B knows component A's internal data shapes, that's a coupling smell — what's the abstracted form? Push for the smallest interface that supports the use case, not the most expressive one.

4. **What does each component require to run?** (preconditions)
   Dependencies installed, services available, config files present with required keys, environment variables set, network reachable.

5. **What does each component guarantee after it runs?** (postconditions)
   Files written with a specified schema, services enabled, signals emitted in a defined format, state transitions made.

6. **What invariants must hold at boundaries?**
   Shared schema definitions, naming conventions (role-descriptive, not domain-specific), units, encoding, identifier formats.

The discovery output is a set of interface contract files — one per component — plus an `ARCHITECTURE.md` overview. These become the project's contract set. **Code starts only after contracts exist.**

If the operator pushes to start coding before contracts are sketched, push back. Code without contracts is architecture by accident — and undoing accidental architecture is much more expensive than spending an hour on contracts up front.

## Architecture

```
project/
├── <shared-contracts>/             # Naming: facts/, specs/, contracts/, interfaces/, etc.
│   ├── ARCHITECTURE.md             # System overview
│   ├── COMPONENT_A_INTERFACE.md    # Pre/post/invariants for component A
│   └── COMPONENT_B_INTERFACE.md
├── component-a/                    # Owned by component-a session (subdir, submodule, or sibling repo)
├── component-b/                    # Owned by component-b session
├── prompts/                        # Markdown prompt files for dispatch
│   └── <component>-<task>.md
└── README.md
```

The shared-contracts directory may be a subdirectory, a git submodule, or a sibling repository — pick whichever fits the project's release cadence. Submodule if contracts version independently from any component; subdirectory if they evolve in lockstep.

## Roles

| Role | Owns | Touches |
|------|------|---------|
| Human operator | The dispatch gate | Approves dispatches when gated; participates in Bootstrap Discovery |
| Main session | Shared contracts + prompts | Never edits component source code |
| Component session | One component, one boundary | Reads contracts, implements, pushes; never edits files outside its scope |

## Workflow (steady state)

1. **Update the contract first** in the shared-contracts directory. Edits to specs precede edits to code, always.
2. **Push the contract** so component sessions can pull it.
3. **Write a prompt** as markdown in `prompts/<component>-<task>.md`. Spec, not code: state the goal, the contract section that defines expected behavior, and verification criteria. Do NOT include implementation details — the component session knows its own code.
4. **Dispatch the prompt** to the appropriate component session. Honor the operator's gate/auto choice from first invocation.
5. **Component session implements** against the contract, pushes to its scope.
6. **Main session pulls** the component, verifies integration, records the new state (e.g. submodule pointer bump, version tag).

## Contract Format

Markdown, dense, structured, no prose. Each component's interface contract typically contains:

- **CLI commands** — table of command, args, stdout, exit codes (if the component exposes a CLI)
- **API endpoints** — methods, paths, request/response schemas (if the component exposes an HTTP/RPC API)
- **Config files** — file path, owner (who writes vs reads), schema
- **Preconditions** — what must be true before this component runs
- **Postconditions** — what must be true after
- **Invariants** — what must remain true (shared schemas defined by the contract not by any component, naming conventions, units, role-descriptive field names)

## Prompt Format

```markdown
Before starting, load this project's CLAUDE.md (if present) and any user-level overrides.
Read the relevant interface contract: <path-to>/COMPONENT_INTERFACE.md.

---

# <component>: <task title>

## Observable problem
<error messages, test failures, current broken behavior — for refactor tasks: "current state">

## Target state
<what should be true after this change>

## Verification
<commands to run, what to check against the contract>

## Deliverables
<numbered list — code change, tests, push, report identifier (commit hash, version tag, etc.)>
```

The prompt is the *what*. The component session decides the *how*. A prompt that prescribes implementation details is a code dump, not a spec.

## Six Core Principles

1. **The contract is the interface.** Define what the boundary requires, not what the code does. Investment in the contract saves investment in the prompt.
2. **Working directory is the boundary.** Bidirectional. Main never edits component code; component never edits main. Crossings go through prompts, not direct edits.
3. **The human is the gate.** (gate mode only.) Every cross-session dispatch goes through approval — even when "obviously" correct. Especially then.
4. **Presence as state.** If a component exists, the feature is supported. If a contract section exists, the component must implement it. Don't configure what you can observe; don't coordinate what you can derive.
5. **Interface integrity.** When two components disagree, the contract is wrong or one implementation is wrong. Never wrap the disagreement in adapter glue. Trace the error to its source and fix it there.
6. **Derivation over configuration.** If both sides can compute a value from shared inputs, don't configure it. Configured values drift; derived values can't.

## Anti-Patterns

| Excuse | Reality |
|--------|---------|
| "I'll just fix both sides" | Component session has no knowledge of your edit; next pull overwrites silently. Write a prompt. |
| "This is too small to need approval" (gate mode) | The smaller it seems, the more important the ask — boundaries erode through small exceptions. |
| "The contract uses the wrong term for my domain" | The contract defines vocabulary. Implement under contract terms; if the contract needs updating, update it FIRST through main. |
| "I'll add a wrapper to make it work" | Now three things can be wrong instead of one, and the adapter needs maintenance forever. Find which side is wrong, fix it, delete the adapter. |
| "Contract first is too slow" | The contract is the architecture. Code that runs ahead of the contract becomes the architecture by accident. |
| "I'll add this prompt detail as code" | Prompts are specs. Code in a prompt is the wrong session writing the wrong layer. |
| "We can sketch contracts after the first cut works" | The first cut becomes the contract. By the time you "sketch" it, you're documenting accidents. |
| "There's only one component right now, no contracts needed" | Then this skill doesn't apply yet — close it. The moment a second component is on the table, run Bootstrap Discovery. |

## Red Flags — STOP and Reset

- About to edit a file outside the main session's scope → STOP, write a prompt
- About to write executable code in the contract → STOP, contract is spec only
- About to dispatch without approval (gate mode) → STOP, ask first
- About to translate a contract field name to match a component's local vocabulary → STOP, that's vocabulary drift
- About to commit code changes before the contract change → STOP, contract leads
- About to write detailed implementation in a prompt → STOP, the receiving session knows its own code
- About to start coding in a multi-component project with no contracts → STOP, run Bootstrap Discovery first

## Verification

Every component delivery checks against three sources of truth:

1. **The contract** — does the implementation match the spec?
2. **The reference implementation** (if one exists) — does it behave the same as the existing system?
3. **Reality** — does it work with real data, not just test fixtures?

Two-against-the-third is a finding. Reality is the tiebreaker.

## Scaling

This methodology scales by adding sessions, not by making sessions larger. Each new component gets its own session, contract, and boundary. Main session work doesn't grow with component count — only contract surface and integration verification grow.

## Origin

Discovered, not designed. Each rule exists because its absence caused a specific failure: agents editing each other's repos and silently overwriting work, components agreeing on data formats verbally then drifting, adapters multiplying when one side could have just been fixed, fields renamed to match local vocabulary breaking every consumer that read the original name. The contracts are not documentation — they are the architecture.
