# PRD: openext — Centralized OpenCode Extension Manager

## Problem

OpenCode extensions (skills, commands, plugins, agents, scripts, config fragments) are currently duplicated across projects. The `openspec-scaffold` skill manages symlinking a subset of extensions into target projects, but the template only covers OPSX-specific entries. Most extensions live only inside `opencode-assistance` as real files and are never propagated.

This leads to:
- Manual copying when a new project needs an existing extension.
- Drift between copies when an extension is updated in one project but not others.
- No single source of truth for what extensions exist or which projects use them.

## Solution

`openext` is a standalone repository that holds every reusable OpenCode extension. Each consumer project declares what it needs via a manifest file (`.opencode/openext.json`). A CLI tool (`openext`) reads the manifest and materializes extensions as absolute symlinks pointing back to the hub.

## Terminology

- **Hub**: The `openext` repository itself. The canonical location of all extensions.
- **Extension type**: One of `agents`, `skills`, `commands`, `plugins`, `scripts`, `config`.
- **Extension entry**: A single item within a type. For file-level types (`agents`, `commands`, `plugins`, `scripts`, `config`), this is a file. For `skills`, this is a directory.
- **Consumer project**: Any project that uses `openext` to symlink extensions into its `.opencode/` directory.
- **Manifest**: A JSON file (`.opencode/openext.json`) in a consumer project that declares which extensions the project needs.

## Hub Repository Structure

```
openext/
├── agents/
│   ├── levi.md
│   ├── sebastian.md
│   └── shalltear.md
├── commands/
│   ├── opsx-propose.md
│   ├── write-diary.md
│   └── ...
├── plugins/
│   ├── stuck-watcher.ts
│   ├── session-title.ts
│   └── ...
├── scripts/
│   ├── session-info.ts
│   ├── agent-collab.ts
│   └── ...
├── skills/
│   ├── chrome/
│   │   └── SKILL.md
│   ├── memorize/
│   │   └── SKILL.md
│   └── ...
├── config/
│   ├── stuck-watcher.jsonc
│   ├── runtime-session-info.md
│   └── ...
├── cli.ts                     # CLI entrypoint
└── README.md
```

Each type directory holds extensions at the leaf level:
- `agents/` — individual `.md` files.
- `commands/` — individual `.md` files.
- `plugins/` — individual `.ts` files.
- `scripts/` — individual files (`.ts`, `.sh`, `.js`).
- `skills/` — directories, each containing at minimum a `SKILL.md`.
- `config/` — individual files (`.jsonc`, `.md`, `.json`).

## Manifest Format

File: `.opencode/openext.json` in the consumer project.

```json
{
  "agents": ["levi", "shalltear"],
  "skills": ["chrome", "memorize", "openspec-propose"],
  "commands": ["opsx-propose", "generate-commit"],
  "plugins": ["stuck-watcher", "session-title"],
  "scripts": ["session-info", "agent-collab"],
  "config": ["stuck-watcher.jsonc", "runtime-session-info.md"]
}
```

Rules:
- Each key is an extension type. Each value is an array of extension names (filenames without extension for file-level types; directory names for skills).
- A key may be omitted if the project needs no extensions of that type.
- An empty manifest `{}` is valid (no extensions).

## CLI

The CLI is a Bun/TypeScript script (`cli.ts`) invoked as:

```sh
bun <path-to-openext>/cli.ts <command> [options] [project-path]
```

If `project-path` is omitted, it defaults to the current working directory.

All mutating commands support `--dry-run` to preview changes without writing.

### `openext init [project-path]`

Read `.opencode/openext.json` in the project and reconcile the project's `.opencode/` directory with the manifest.

Behavior:
1. Read the manifest. Error if the manifest file does not exist.
2. For every extension listed in the manifest:
   - Verify the extension exists in the hub. Error if not found.
   - If the symlink already exists and points to the correct hub path, skip.
   - If the symlink exists but points elsewhere, or a real file exists, skip (do not overwrite) unless `--force` is given.
   - Create the symlink with an absolute path to the hub entry.
   - For `skills`, symlink at the directory level (e.g., `.opencode/skills/chrome` -> `/home/user/openext/skills/chrome`).
   - For all other types, symlink at the file level (e.g., `.opencode/agents/levi.md` -> `/home/user/openext/agents/levi.md`).
   - Create intermediate directories (e.g., `.opencode/skills/`, `.opencode/agents/`) as real directories if they do not exist.
3. For every hub-managed symlink in `.opencode/` that is NOT listed in the manifest:
   - Remove the symlink.
   - Report the removal.
4. Report a summary: created, skipped, removed, errors.

This command is idempotent. Run it after editing the manifest, after moving the project, or at any time to converge to the manifest state.

Options:
- `--dry-run`: preview changes.
- `--force`: overwrite existing files/symlinks that conflict with hub-managed entries.

### `openext add <type>/<name> [project-path]`

Add an extension to the manifest and create the symlink immediately.

Behavior:
1. Verify the extension exists in the hub. Error if not found.
2. Read the manifest. Add the entry to the appropriate type array (create the key if absent). Skip if already present.
3. Write the updated manifest.
4. Create the symlink (same rules as `init`).
5. Report the action.

Example:
```sh
bun ~/openext/cli.ts add skills/chrome ~/my-project
bun ~/openext/cli.ts add plugins/stuck-watcher .
```

Options:
- `--dry-run`: preview without writing.

### `openext remove <type>/<name> [project-path]`

Remove an extension from the manifest and delete the symlink.

Behavior:
1. Read the manifest. Error if the entry is not listed.
2. Remove the entry from the manifest array. Remove the type key if the array becomes empty.
3. Write the updated manifest.
4. If the symlink exists and is hub-managed, delete it. If it is not hub-managed (real file or different symlink), skip and warn.
5. Report the action.

Options:
- `--dry-run`: preview without writing.

### `openext clean [project-path]`

Remove dead or broken symlinks under `.opencode/` that point into the hub but resolve to a missing target. Does not touch real files, non-hub symlinks, or valid hub symlinks.

Behavior:
1. Walk `.opencode/` recursively.
2. For each symlink found:
   - Resolve the target. If the target starts with the hub's path and the target does not exist on disk, remove the symlink and report.
   - Skip everything else.

This is useful after extensions are deleted from the hub but the consumer project has not been updated.

Options:
- `--dry-run`: preview removals.

### `openext create <type> <name>`

Create a skeleton extension in the hub. Does NOT add it to any project.

Behavior:
- `agents`: creates `agents/<name>.md` with a minimal frontmatter stub.
- `commands`: creates `commands/<name>.md` with a minimal frontmatter stub.
- `plugins`: creates `plugins/<name>.ts` with a minimal plugin stub.
- `scripts`: creates `scripts/<name>.ts` with a minimal script stub.
- `skills`: creates `skills/<name>/SKILL.md` with a minimal frontmatter stub.
- `config`: creates `config/<name>` as an empty file (no template assumption for config).

Error if the entry already exists.

Options:
- `--dry-run`: preview creation.

### `openext list [--type <type>]`

List all available extensions in the hub. Optionally filter by type.

Output format:
```
agents:
  levi, sebastian, shalltear
skills:
  chrome, memorize, openspec-propose, ...
commands:
  opsx-propose, generate-commit, ...
...
```

### `openext status [project-path]`

Compare the manifest against the actual state of `.opencode/` and report discrepancies.

Reports:
- **Missing**: Listed in manifest but symlink does not exist.
- **Broken**: Symlink exists but target is missing (hub entry deleted).
- **Unexpected**: Hub-managed symlink exists but not listed in the manifest.
- **Conflicting**: Path is a real file, not a symlink, but manifest expects it.
- **OK**: Correctly symlinked and resolves.

Exit code 0 if everything is clean, 1 if discrepancies found.

## Hub-Managed Symlink Detection

A symlink is considered "hub-managed" if its resolved absolute target path starts with the absolute path of the hub repository. This convention allows `init` and `clean` to safely distinguish hub-managed symlinks from project-local real files or user-created symlinks without additional metadata.

## Symlink Rules

- All symlinks use absolute paths.
- Skills are symlinked at the directory level (the entire skill directory is one symlink).
- All other types are symlinked at the file level.
- Intermediate directories (`.opencode/skills/`, `.opencode/agents/`, etc.) are always real directories owned by the consumer project. This allows projects to mix hub-managed symlinks with local-only extensions.
- Real files are never deleted unless `--force` is given.

## Migration from openspec-scaffold

The `openspec-scaffold` skill currently owns symlink creation through `opsx-scaffold.ts`. After `openext` is implemented:

1. Move all extensions from `opencode-assistance/.opencode/` into the hub.
2. Create `.opencode/openext.json` in `opencode-assistance` listing all extensions.
3. Run `openext init` to replace real files with symlinks.
4. Slim down `openspec-scaffold`: remove the symlink/copy logic from `opsx-scaffold.ts`. The script should call `openext init` instead and only handle OPSX-specific concerns (openspec init, git init, AGENTS.md interview).
5. The scaffold skill can generate a default `openext.json` with the OPSX extension set when scaffolding a new project.

## Non-Goals

- Managing `opencode.json`. Each project owns its own config file. Copy and paste is sufficient.
- Versioning or locking extensions. The hub is a single branch; all projects use the latest state.
- Remote hub support. The hub is always a local directory on the same machine.
- Extension dependency resolution. Extensions are independent units.
- Profile or preset support. This can be a future addition or handled via conventional manifest templates in the hub.
