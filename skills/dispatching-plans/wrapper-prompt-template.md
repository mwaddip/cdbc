# Wrapper Prompt Template

This template is filled in by `cdbc:dispatching-plans` per module and saved as `prompts/<feature>-<module>.md` before dispatch. The filled file is what the executor session reads via `cdbc:receiving-prompts`.

## Template

Placeholders are wrapped in `<ANGLE_BRACKETS>`. The dispatcher substitutes them with row values from the DAG file before writing the file out.

---

```markdown
/clear
Read ~/projects/OVERRIDES.md.
Read CLAUDE.md.
<LOAD_PROJECT_SKILL>

<READ_RELEVANT_CONTRACTS>

## Module: <MODULE_NAME>

**Working Directory:** <MODULE_PATH>
**Depends On:** <DEPENDS_ON>

## Task

Use `cdbc:executing-plans` to execute the implementation plan at:

<PLAN_PATH>

Implement the plan task-by-task per that skill's process. Stay within your working directory boundary. Use TDD discipline (`cdbc:test-driven-development`) for every task.

## Coordination

When done, send a single-line completion ack to the main session window:

```bash
kitty @ send-text --match=id:<MAIN_WINDOW_ID> '[ack] <MODULE_NAME>: <complete|failed|blocked> | tests: <pass|fail|n/a> | <one-line summary, ≤80 chars>'
kitty @ send-text --match=id:<MAIN_WINDOW_ID> $'\r'
```

Use the same channel for clarifying questions if blocked. Don't sit silent — the main session has no other view of your progress.

Examples:

- `[ack] core-auth: complete | tests: pass | implemented login/logout, 12 tests green`
- `[ack] api-handlers: blocked | tests: n/a | core-auth's exported Session type missing field X`
- `[ack] storage: failed | tests: fail | 3/8 tests red — migration script doesn't roll back cleanly`
```

---

## Placeholder Substitution

| Placeholder | Source | Notes |
|---|---|---|
| `<LOAD_PROJECT_SKILL>` | Read project CLAUDE.md, locate the canonical skill it names (if any), insert a `Load <skill-name>` line. Omit the line if none. | Example: `Load blockhost-development.` |
| `<READ_RELEVANT_CONTRACTS>` | List the per-component contract files this module depends on (from the project's shared-contracts directory: `facts/`, `specs/`, `contracts/`, etc.) as `Read <path>` lines. Include the module's own interface contract and any upstream module's interface it consumes. | Example: `Read facts/core-auth.md.\nRead facts/api-handlers.md.` |
| `<MODULE_NAME>` | Row's Module column | Lowercase-kebab |
| `<MODULE_PATH>` | Row's Path column (absolute path) | e.g. `/home/user/projects/myrepo/crates/auth` |
| `<DEPENDS_ON>` | Row's Depends On column (comma-separated module names, or `—` if none) | e.g. `core-auth, api-handlers` |
| `<PLAN_PATH>` | Absolute path to row's Plan File | e.g. `/home/user/projects/myrepo/docs/plans/2026-05-26-feature-auth/feature-auth-core-auth.md` |
| `<MAIN_WINDOW_ID>` | Dispatcher's `$KITTY_WINDOW_ID`, captured at start of orchestration | Numeric, e.g. `12` |

## Why this template (and not just the plan path)

A bare "use cdbc:receiving-prompts to execute the plan at <path>" doesn't establish project context. The executor session needs:

1. **User-level overrides** — global rules from `~/projects/OVERRIDES.md` (or your equivalent) referenced from your global CLAUDE.md. Survive `/clear` only if explicitly reloaded.
2. **Project CLAUDE.md** — project-specific guidance, conventions, file boundaries.
3. **Project skill** — the project's accumulated wisdom (named in CLAUDE.md, varies per project).
4. **Relevant contracts** — interface contracts for this module and its upstream dependencies. Required reading before implementation.
5. **Task definition** — the route to `cdbc:executing-plans` on the specific plan file.
6. **Coordination back-channel** — the `kitty @ send-text` ack target. Without this, the dispatcher has no completion signal.

The wrapper bundles all of this. The plan file itself stays focused on implementation tasks; project bootstrap and coordination live in the wrapper.

## Notes

- The `/clear` at the top assumes a fresh dispatch. If `Preserve Context = yes` was set for this row, the dispatcher does NOT include `/clear` (already handled before sending this wrapper).
- The ack format is fixed (`[ack] <module>: <status> | tests: <status> | <summary>`). The dispatcher parses for this exact prefix; don't reformat without coordinating.
- If your project uses a non-standard overrides path, edit the `Read ~/projects/OVERRIDES.md` line to match (or remove it if not applicable).
