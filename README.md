# cdbc

A Claude Code plugin (`cdbc`) for multi-agent orchestration applying Bertrand Meyer's **Design by Contract** at the architecture level: a shared-contracts directory holds the source of truth, the main session writes contracts and prompts (never component code), and per-component sessions implement against the contracts within their boundaries.

The plugin includes original skills for the DBC pattern itself plus workflow skills forked from [superpowers](https://github.com/obra/superpowers) (MIT, Jesse Vincent), renamed and adapted for the cdbc multi-window dispatch model. See `NOTICE` for attributions.

## Observed Autonomy

The defining idea of this plugin: autonomous multi-session work with the operator watching. The main session designs and dispatches; executor sessions in kitty windows implement; the operator sees every step happen in real time and can interrupt, course-correct, or ask questions about the resulting code afterward.

This is the visibility win over `superpowers:subagent-driven-development`, which runs implementation in ephemeral in-session subagents you can't watch mid-flight and can't talk to about their output after they finish. Subagents are fast and clean; windows are observable and persistent. The cdbc dispatch model picks observability — `dispatching-plans` opens N kitty windows in DAG order, each running its own Claude session on its own per-module plan, with the main session retaining context for review and discussion when the work comes back.

Concretely:

- **Watch.** Every executor session lives in a visible window; you see its output as it happens, not after the fact.
- **Interrupt.** Notice drift, stop the window, send corrective instruction, or `/clear` and re-dispatch.
- **Course-correct.** The wrapper prompt can be rewritten mid-flight if you spot a bad framing.
- **Ask later.** After the executor reports done, you can keep talking to it about decisions it made — the session stays alive.
- **No detection layer.** The operator IS the failure detection. No timeouts, no auto-retry, no t-of-n recovery — that's by design.

The auto/gate distinction in `design-by-contract-for-ai-agents` is the operator's opt-in to this model. Gate mode preserves per-dispatch confirmation (for one-off prompts you want to inspect before submit). Auto mode lets `dispatching-plans` orchestrate a whole DAG without per-call interruption — the visibility through the windows is what keeps you in the loop instead.

## Canonical Workflow

For multi-module feature work in a project where `design-by-contract-for-ai-agents` has already established contracts:

```
cdbc:brainstorming                      →  design doc (with Module Decomposition table)
cdbc:writing-multi-module-plans         →  N plans + DAG file
cdbc:dispatching-plans                  →  N windows in DAG order, autonomous dispatch
cdbc:requesting-code-review             →  per-module review on main session
cdbc:finishing-a-development-branch     →  merge / PR / discard
```

For single-task work, use `cdbc:dispatching-prompts` (gated per dispatch) to send one prompt to one component session.

## Skills

### Architecture
- **`design-by-contract-for-ai-agents`** — first skill to invoke in any multi-component project. Architecture, roles, contract format, anti-patterns, and Bootstrap Discovery for greenfield projects.

### Bootstrap
- **`using-cdbc`** — session-start orientation: skill inventory, the cdbc workflow shape, when to invoke which skill.

### Dispatch
- **`dispatching-prompts`** — main-session skill for sending a single prompt to one component session via kitty + `ac`. Operator gate per dispatch by default.
- **`dispatching-plans`** — main-session orchestrator for multi-module work. Reads a DAG produced by `writing-multi-module-plans`, opens N kitty windows in dependency order, dispatches per-module wrapper prompts, tracks completion via the coordination back-channel. Requires DBC bootstrap with `auto` mode.
- **`receiving-prompts`** — executor side. Establishes EXECUTOR identity at load time, prevents recursive dispatch. Loads automatically when a dispatch message names it (`use the cdbc:receiving-prompts skill to execute the work in <file>`).

### Workflow (forked from superpowers)
- **`brainstorming`** — design exploration. Includes an optional Module Decomposition step that emits a table consumed by `writing-multi-module-plans`.
- **`writing-multi-module-plans`** — splits a design doc with module pointers into N per-module plans + a DAG. For single-plan flows, use upstream `superpowers:writing-plans` instead.
- **`executing-plans`** — implements a plan task-by-task with batch checkpoints. Used on the window side by `dispatching-plans`, or directly for a single-plan flow.
- **`test-driven-development`** — TDD discipline.
- **`requesting-code-review`** — dispatch a code reviewer subagent to catch issues before they cascade.
- **`finishing-a-development-branch`** — completion guidance: verify tests, present merge / PR / discard options, execute choice.

## Install

cdbc ships as a Claude Code plugin. Add the marketplace and install:

```
/plugin marketplace add mwaddip/cdbc
/plugin install cdbc@cdbc-marketplace
```

Skills become available under the `cdbc:` namespace (e.g., `cdbc:dispatching-prompts`). Restart Claude Code if skills don't appear after install.

## Updating

```
/plugin update cdbc@cdbc-marketplace
```

## Optional: example global config

`extras/CLAUDE.md` and `extras/OVERRIDES.md` are sanitized versions of the author's own Claude Code global config — 20 cross-project working rules (communication style, brainstorming discipline, verification standards, project boundaries, observability) and 8 mechanical overrides (dead-code-first refactoring, phased execution, context-decay awareness, edit integrity, exhaustive rename search, truncation suspicion). They're starting points you can copy and customize:

```
cp extras/CLAUDE.md ~/.claude/CLAUDE.md         # Claude Code's global instructions
cp extras/OVERRIDES.md ~/projects/OVERRIDES.md  # referenced from CLAUDE.md
```

Both files have a placeholder for your own domain-specific additions (a Background section in CLAUDE.md, a Domain-Specific section in OVERRIDES.md).

## Recommended: `rtk` (token-saving proxy)

For long-running multi-session work, [`rtk`](https://github.com/rtk-ai/rtk) (Rust Token Killer) is essential for keeping token usage manageable. It transparently filters and summarizes CLI output (60–90% savings on common operations like `git status`, `ls`, `grep`, `find`, etc.) via a Claude Code hook — so commands you type unchanged get rewritten to `rtk <cmd>` behind the scenes.

cdbc skills do not depend on `rtk`, but if you're running multi-window dispatch flows (`cdbc:dispatching-plans`) where N sessions each consume tool output, the savings compound quickly across the windows. The author considers it essential for the workflow this plugin enables.

Install from: <https://github.com/rtk-ai/rtk>

## Optional: `ac` (kitty session launcher)

The `dispatching-prompts` and `dispatching-plans` skills assume you can launch agent sessions in named terminal windows that other sessions can find. The author uses kitty + a small bash script called `ac` (Auto Claude), shipped at the top of this repo. `ac` runs `claude` in the current kitty tab and writes a row to a flat session-registry file — so a parent Claude session can `grep <component> ${XDG_RUNTIME_DIR:-/tmp}/ac/sessions` instead of parsing the kilobytes of JSON `kitty @ ls` returns. Token savings add up across a long session.

### Requirements

- [kitty](https://sw.kovidgoyal.net/kitty/) with remote control enabled (`allow_remote_control yes` in `~/.config/kitty/kitty.conf`)
- [Claude Code](https://claude.com/claude-code) CLI on `PATH` as `claude`
- bash, python3 (one inline `kitty @ ls` JSON parse), GNU coreutils

### Install

Clone this repo once and symlink `ac` from somewhere on your `PATH`:

```
git clone https://github.com/mwaddip/cdbc.git ~/projects/cdbc
ln -s ~/projects/cdbc/ac ~/.local/bin/ac     # or anywhere on PATH
```

To update: `cd ~/projects/cdbc && git pull`. The symlink follows.

### Usage

In any kitty tab:

```
ac                # start a new Claude Code session in this tab
ac -r             # resume the previous Claude Code session
ac -o "<opts>"    # pass extra flags to claude (must be the last argument)
```

`ac` registers `(window_id, tab_id, pwd)` in the sessions file before launching, and removes its row on Claude Code exit.

### Sessions file

```
${XDG_RUNTIME_DIR:-/tmp}/ac/sessions
```

Per-user tmpfs path. Tab-separated, no headers: `<window_id>\t<tab_id>\t<pwd>`. Cleared on reboot — the kitty windows the entries refer to are also gone after a reboot, so persisting them would only produce broken references.

### Caveats

- Kitty-only. Won't work in tmux, screen, or vanilla terminals (relies on `KITTY_WINDOW_ID`).
- Multi-user safety in the `/tmp` fallback: if `XDG_RUNTIME_DIR` is unset on your system (rare on modern Linux desktops, possible on macOS or minimal containers), two users on the same machine collide on `/tmp/ac/sessions`. Set `XDG_RUNTIME_DIR` per-user, or don't use the fallback.

If you're not on kitty, the `dispatching-prompts` and `dispatching-plans` skills still apply as *concepts* (file-path prompt injection and DAG-driven multi-window orchestration in any terminal multiplexer that supports cross-window text injection) but the kitty-specific commands won't work as-is.

## Skill format

Skills follow the [agentskills.io specification](https://agentskills.io/specification): YAML frontmatter (`name`, `description`, optional `metadata`) followed by a markdown body, in `skills/<skill-name>/SKILL.md`. This is the format Claude Code and other compliant harnesses load.

## License

MIT for the original content (see `LICENSE`). See `NOTICE` for the forked content's MIT attribution (Copyright © 2025 Jesse Vincent / superpowers).
