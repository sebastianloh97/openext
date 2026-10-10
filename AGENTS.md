# OpenExt

Centralized OpenCode extension hub. Consumer projects materialize shared agents, commands, skills, plugins, scripts, and config from here into their `.opencode/` via the `openext` CLI.

## Docs

- `PRD.md` — spec for `cli.ts`. Read before changing CLI behavior; update in the same change.
- `README.md` — CLI usage, manifest format, symlink/copy modes.

## Conventions

- `cli.ts` stays a single dependency-free Bun script on the Node stdlib.
- Hub edits go live instantly in symlink-mode consumer projects — treat them as cross-project changes.
- No test suite; verify CLI changes with `bun cli.ts <cmd> --dry-run` against a scratch project.
- Authoring skills/commands/agents: follow the `create-custom-*` and `writing-for-agents` skills.
