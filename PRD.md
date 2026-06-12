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
│   ├── system-files.json
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
- Each key is an extension type. Each value is an array of extension names.
- For file-level types (`agents`, `commands`, `plugins`, `scripts`), the name is the filename without extension (e.g., `"stuck-watcher"` maps to `plugins/stuck-watcher.ts`).
- For `skills`, the name is the directory name (e.g., `"chrome"` maps to `skills/chrome/`).
- For `config`, the name is the full filename including extension (e.g., `"stuck-watcher.jsonc"` maps to `config/stuck-watcher.jsonc`). This is because config files have no consistent extension convention.
- A key may be omitted if the project needs no extensions of that type.
- An empty manifest `{}` is valid (no extensions).

## CLI

The CLI is a Bun/TypeScript script (`cli.ts`) invoked as:

```sh
bun <path-to-openext>/cli.ts <command> [options] [project-path]
```

For convenience, set a shell alias:

```sh
alias openext='bun ~/openext/cli.ts'
```

This allows natural invocation like `openext init`, `openext add skills/chrome`, etc. All examples below assume this alias.

If `project-path` is omitted, it defaults to the current working directory.

All mutating commands support `--dry-run` to preview changes without writing.

### `openext init [project-path]`

Read `.opencode/openext.json` in the project and reconcile the project's `.opencode/` directory with the manifest. This is the primary command -- idempotent, safe to run at any time.

Behavior:
1. Read the manifest. If the manifest file does not exist, report "no manifest found" and exit 0. This allows tooling (e.g., `openspec-scaffold`) to detect the absence and generate a manifest before re-running `init`, rather than requiring error-handling for the common bootstrap case. To bootstrap a new project interactively, use `openext add` (which creates the manifest if absent) or write the manifest manually.
2. For every extension listed in the manifest:
   - Verify the extension exists in the hub. Error if not found.
   - If the symlink already exists and points to the correct hub path, skip.
   - If the symlink exists but points elsewhere, or a real file exists, skip (do not overwrite) unless `--force` is given.
   - Create the symlink with an absolute path to the hub entry.
   - For `skills`, symlink at the directory level (e.g., `.opencode/skills/chrome` -> hub `skills/chrome/`).
   - For `agents`, `commands`, `plugins`, `scripts`, symlink at the file level, adding the canonical extension (e.g., `.opencode/agents/levi.md` -> hub `agents/levi.md`).
   - For `config`, symlink at the file level directly into `.opencode/` root (e.g., `.opencode/stuck-watcher.jsonc` -> hub `config/stuck-watcher.jsonc`). Config files are NOT placed inside a `config/` subdirectory -- they land at `.opencode/` alongside other OpenCode-managed files, matching where OpenCode expects to find them.
   - Create intermediate directories (e.g., `.opencode/skills/`, `.opencode/agents/`) as real directories if they do not exist.
3. For every hub-managed symlink found under `.opencode/` (across all type subdirectories and the `.opencode/` root for config files) that is NOT listed in the current manifest:
   - Remove the symlink.
   - Report the removal.
   - This happens regardless of `--force`. Removal of stale hub-managed symlinks is always safe because the manifest is the source of truth.
4. Ensure `.opencode/` is listed in the project's `.gitignore`. If `.gitignore` does not exist, create it. If the entry is already present, skip. The symlinks contain machine-local absolute paths and should not be committed.
5. Report a summary: created, skipped, removed, errors.
6. Exit code 0 if no errors occurred. Exit code 1 if any errors were reported (e.g., hub entry not found, real file blocking a symlink without `--force`). Skipped items are warnings, not errors -- they do not affect the exit code.

### `openext add <type>/<name> [project-path]`

Add an extension to the manifest and create the symlink immediately.

Behavior:
1. Verify the extension exists in the hub. Error if not found.
2. Read the manifest. If the manifest file does not exist, create it as `{}`.
3. Add the entry to the appropriate type array (create the key if absent). Skip if already present.
4. Write the updated manifest.
5. Create intermediate directories as real directories if they do not exist. Same rules as `init`.
6. Create the symlink (same rules as `init`).
7. Report the action.

Example:
```sh
openext add skills/chrome ~/my-project
openext add plugins/stuck-watcher .
openext add config/stuck-watcher.jsonc .
```

Options:
- `--dry-run`: preview without writing.

### `openext remove <type>/<name> [project-path]`

Remove an extension from the manifest and delete the symlink.

Behavior:
1. Read the manifest. Error if the manifest file does not exist or the entry is not listed.
2. Remove the entry from the manifest array. Remove the type key if the array becomes empty.
3. Write the updated manifest (always, regardless of symlink state).
4. If the symlink exists and is hub-managed, delete it. If it is not hub-managed (real file or different symlink), skip and warn. If the symlink does not exist at all, report as already absent (no error).
5. Report the action.

Options:
- `--dry-run`: preview without writing.

### `openext clean [project-path]`

Remove dead or broken symlinks under `.opencode/` that point into the hub but resolve to a missing target. Does not touch real files, non-hub symlinks, or valid hub symlinks.

Behavior:
1. Walk entries at depth 1 within each known type subdirectory of `.opencode/` (`.opencode/agents/`, `.opencode/skills/`, `.opencode/commands/`, `.opencode/plugins/`, `.opencode/scripts/`). Also check files directly in `.opencode/` root for broken config symlinks. Do not recurse deeper than one level -- this matches the symlink structure where skills are directory-level symlinks and all other types are file-level symlinks.
2. For each symlink found (file or directory):
   - Resolve the target. If the target starts with the hub's absolute path and the target does not exist on disk, remove the symlink and report.
   - Skip everything else.

This is useful after extensions are deleted from the hub but the consumer project has not run `init` to reconcile.

Options:
- `--dry-run`: preview removals.

### `openext create <type> <name>`

Create a skeleton extension in the hub. Does NOT add it to any project. The `name` argument is always a bare name without file extension -- the CLI adds the appropriate extension based on type.

Behavior:
- `agents`: creates `agents/<name>.md` with a minimal frontmatter stub.
- `commands`: creates `commands/<name>.md` with a minimal frontmatter stub.
- `plugins`: creates `plugins/<name>.ts` with a minimal plugin stub.
- `scripts`: creates `scripts/<name>.ts` with a minimal script stub.
- `skills`: creates `skills/<name>/SKILL.md` with a minimal frontmatter stub.
- `config`: creates `config/<name>` as an empty file. For config, the `name` argument IS the full filename including extension (e.g., `openext create config my-config.jsonc`), since config files have no consistent extension convention.

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
- Skills are symlinked at the directory level (the entire skill directory is one symlink). `.opencode/skills/` is always a real directory; each skill inside it is a symlink. If a skill directory internally contains subdirectories (e.g., `openspec-scaffold/` has `scripts/` and `template/` subdirs), the single directory-level symlink covers them all. The CLI never recurses into or creates individual symlinks for files inside a skill directory.
- All other types are symlinked at the file level inside their respective `.opencode/` subdirectory (e.g., `.opencode/agents/levi.md`, `.opencode/plugins/stuck-watcher.ts`).
- Config files are symlinked at the file level directly into `.opencode/` root (e.g., `.opencode/stuck-watcher.jsonc`), not into a `config/` subdirectory. This matches where OpenCode expects to find these files.
- Intermediate directories (`.opencode/skills/`, `.opencode/agents/`, etc.) are always real directories owned by the consumer project. This allows projects to mix hub-managed symlinks with local-only extensions.
- Real files are never deleted unless `--force` is given.

## File Extension Mapping

The CLI maps bare extension names to actual filenames in the hub:

| Type | Manifest name | Hub file | Symlink destination |
|---|---|---|---|
| `agents` | `levi` | `agents/levi.md` | `.opencode/agents/levi.md` |
| `commands` | `opsx-propose` | `commands/opsx-propose.md` | `.opencode/commands/opsx-propose.md` |
| `plugins` | `stuck-watcher` | `plugins/stuck-watcher.ts` | `.opencode/plugins/stuck-watcher.ts` |
| `scripts` | `session-info` | `scripts/session-info.ts` | `.opencode/scripts/session-info.ts` |
| `skills` | `chrome` | `skills/chrome/` | `.opencode/skills/chrome` |
| `config` | `stuck-watcher.jsonc` | `config/stuck-watcher.jsonc` | `.opencode/stuck-watcher.jsonc` |

For `agents`, `commands`, `plugins`, and `scripts`, the CLI auto-detects the file extension by scanning the hub directory for a matching basename. If no match or multiple matches are found, error. For `config`, the name IS the full filename.

## Migration from openspec-scaffold

The `openspec-scaffold` skill currently owns symlink creation through `opsx-scaffold.ts`. After `openext` is implemented:

1. Move all extensions from `opencode-assistance/.opencode/` into the hub.
2. Create `.opencode/openext.json` in `opencode-assistance` listing all extensions.
3. Run `openext init` to replace real files with symlinks.
4. Slim down `openspec-scaffold`: remove the symlink/copy logic from `opsx-scaffold.ts`. When scaffolding a new project, the script should first generate a default `.opencode/openext.json` with the OPSX extension set, then delegate symlink creation to `openext init`. The script retains only OPSX-specific concerns (openspec init, git init, AGENTS.md interview).

## Non-Goals

- Managing `opencode.json`. Each project owns its own config file. Copy and paste is sufficient.
- Versioning or locking extensions. The hub is a single branch; all projects use the latest state.
- Remote hub support. The hub is always a local directory on the same machine.
- Extension dependency resolution. Extensions are independent units.
- Profile or preset support. This can be a future addition or handled via conventional manifest templates in the hub.

## Design Decisions

- **Manifest is the source of truth.** Running `init` with a manifest that is missing an entry will remove the corresponding hub-managed symlink. This is intentional: the manifest reflects what the project needs, and `init` converges the project to that state. If a user accidentally removes an entry from the manifest, re-adding it with `openext add` and re-running `init` restores it.
- **No-manifest is not an error.** `init` exits 0 when no manifest exists, rather than erroring. This simplifies bootstrap workflows where tooling generates the manifest first, then calls `init`.
- **No `sync` command.** `init` already handles both adding new and removing stale symlinks in a single pass. A separate `sync` would be redundant.
