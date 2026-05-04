# claude-dbc

Skills for AI coding agent harnesses (Claude Code, Codex) that apply Bertrand Meyer's **Design by Contract** at the architecture level: a shared-contracts directory holds the source of truth, the main session writes contracts and prompts (never component code), and per-component subagent sessions implement against the contracts in their own boundaries.

Two skills:

- **`design-by-contract-for-ai-agents`** — multi-component, multi-agent orchestration. Architecture, roles, workflow, contract format, prompt format, anti-patterns, and a Bootstrap Discovery flow that fires when you start (or join) a project that doesn't have contracts yet.
- **`dispatching-prompts`** — companion skill: how to send a prompt from the main session to a component session running in another terminal window. Covers the file-path injection pattern and the kitty + `ac` setup the author uses.

## Install

Direct from GitHub, no npm publish in the loop:

```
npx github:mwaddip/claude-dbc
```

That runs the installer interactively and asks which harness to target.

Non-interactive forms:

```
npx github:mwaddip/claude-dbc install --harness=claude-code
npx github:mwaddip/claude-dbc install --harness=codex
npx github:mwaddip/claude-dbc install --harness=claude-code --skill=design-by-contract-for-ai-agents
npx github:mwaddip/claude-dbc install --harness=claude-code --project
npx github:mwaddip/claude-dbc list
```

| Flag | Effect |
|------|--------|
| `--harness=<name>` | `claude-code` or `codex` |
| `--skill=<name>` | install one skill instead of all |
| `--project` | install to `./.claude/skills/` or `./.agents/skills/` (project-level) instead of user-level |

After install, restart your harness so it picks up the new skills.

## Updating

Just rerun `npx github:mwaddip/claude-dbc` — `npx` re-clones the repo each invocation. The installer overwrites the skill files in place.

## Optional: `ac` (kitty session launcher)

The `dispatching-prompts` skill assumes you can launch new agent sessions in named terminal windows. The author uses kitty + a tiny shell script called `ac` (Auto Claude). It saves significant tokens compared to invoking `kitty @ ls` every time you need to find a session — `ac` maintains a small flat session-registry file the agent can `grep` instead of parsing kitty's JSON.

`ac` lives in its own repo. To use:

```
git clone https://github.com/mwaddip/ac.git ~/projects/ac
ln -s ~/projects/ac/ac ~/.local/bin/ac     # or anywhere on your PATH
```

It's about 90 lines of bash, kitty-only, no dependencies. Read it before you trust it.

If you're not on kitty, the `dispatching-prompts` skill still applies as a *concept* (file-path prompt injection between agent sessions) but the kitty-specific commands won't work directly.

## Skill format

Both skills follow the [agentskills.io specification](https://agentskills.io/specification): YAML frontmatter (`name`, `description`, optional `metadata`) followed by a markdown body, in `<harness-skills-dir>/<skill-name>/SKILL.md`. This is the format Claude Code, Codex, and other compliant harnesses load.

Adapters for other harnesses (Cursor's `.cursor/rules/*.mdc`, Aider's `CONVENTIONS.md`-style references) are not implemented; PRs welcome.

## License

MIT.
