# openext

Centralized OpenCode extension manager. One hub, many consumer projects. Each extension is materialized into a project either as a **symlink** back to the hub (default, machine-local) or as a **real file copy** (self-contained, committable).

## Setup

Clone and run the install script:

```sh
git clone git@github.com:sebastianloh97/openext.git ~/openext
bash ~/openext/install.sh
```

The install script will:
1. Clone the hub repo (or pull latest if already cloned)
2. Create a wrapper script at `~/.local/bin/openext`
3. Verify `bun` and `git` are available

No shell alias needed — `openext` is available as a PATH executable immediately.

### Custom Hub Location

By default, the hub is cloned to `~/openext`. To use a different directory, set `OPENEXT_HUB` before running the install script:

```sh
git clone git@github.com:sebastianloh97/openext.git ~/Projects/openext
OPENEXT_HUB=~/Projects/openext bash ~/Projects/openext/install.sh
```

The install script is idempotent — re-running it simply pulls latest and overwrites the wrapper script. No duplicates.

To uninstall:

```sh
bash ~/openext/uninstall.sh
```

## Quick Start

Bootstrap a new consumer project:

```sh
# From inside your project directory
openext add agents/levi .
openext add skills/chrome .
openext add plugins/stuck-watcher .
openext add config/stuck-watcher.jsonc .
openext status .        # verify everything is clean
```

Or write the manifest manually and run `init`:

```sh
# Create .opencode/openext.json
cat > .opencode/openext.json << 'EOF'
{
  "agents": ["levi", "shalltear"],
  "skills": ["chrome", "memorize"],
  "plugins": ["stuck-watcher"],
  "config": ["stuck-watcher.jsonc"]
}
EOF

# Materialize all extensions at once (symlinks by default)
openext init .

# ...or as real copies (self-contained, committable project)
openext init . --copy
```

## Commands

| Command | Description |
|---------|-------------|
| `openext init [path]` | Reconcile extensions with manifest. Idempotent, safe to run anytime. |
| `openext add <type>/<name> [path]` | Add extension to manifest and materialize it. |
| `openext remove <type>/<name> [path]` | Remove extension from manifest and delete it. |
| `openext clean [path]` | Remove broken symlinks pointing to deleted hub entries. |
| `openext create <type> <name>` | Create a skeleton extension in the hub. |
| `openext list [--type <type>]` | List all available extensions in the hub. |
| `openext status [path]` | Compare manifest against actual state, report discrepancies. |

All mutating commands support `--dry-run`. The `init` command also supports `--force` to overwrite real files (symlinks or copies) with fresh materializations. `init` and `add` support `--copy` to materialize real copies instead of symlinks.

If `path` is omitted, it defaults to the current working directory.

## Extension Types

| Type | Manifest name | Hub location | Symlink destination |
|------|--------------|--------------|-------------------|
| `agents` | bare name (`levi`) | `agents/levi.md` | `.opencode/agents/levi.md` |
| `commands` | bare name (`opsx-propose`) | `commands/opsx-propose.md` | `.opencode/commands/opsx-propose.md` |
| `plugins` | bare name (`stuck-watcher`) | `plugins/stuck-watcher.ts` | `.opencode/plugins/stuck-watcher.ts` |
| `scripts` | bare name (`session-info`) | `scripts/session-info.ts` | `.opencode/scripts/session-info.ts` |
| `skills` | directory name (`chrome`) | `skills/chrome/` | `.opencode/skills/chrome` (directory-level) |
| `config` | full filename (`stuck-watcher.jsonc`) | `config/stuck-watcher.jsonc` | `.opencode/stuck-watcher.jsonc` (at root) |

## Manifest Format

File: `.opencode/openext.json`

```json
{
  "mode": "copy",
  "agents": ["levi", "shalltear"],
  "skills": ["chrome", "memorize"],
  "commands": ["opsx-propose"],
  "plugins": ["stuck-watcher", "session-title"],
  "scripts": ["session-info"],
  "config": ["stuck-watcher.jsonc", "runtime-session-info.md"]
}
```

Omit any type you don't need. An empty `{}` is valid.

`mode` is optional and controls how extensions are materialized:
- omitted or `"symlink"` (default): create symlinks back to the hub, and add `.opencode/` to `.gitignore`.
- `"copy"`: copy real files/directories from the hub, and **do not** ignore `.opencode/` so the copies are committed and the project is self-contained.

The CLI flag `--copy` (on `init`/`add`) is just a setter for `"mode": "copy"`; once set, subsequent commands honor it automatically.

## Creating New Extensions

```sh
# Create a skeleton in the hub
openext create agents my-new-agent
openext create skills my-new-skill
openext create config my-config.jsonc

# Then add it to your project
openext add agents/my-new-agent ~/my-project
```

## How It Works

1. The hub (`~/openext`) holds all extensions as real files.
2. Each consumer project has a `.opencode/openext.json` manifest declaring what it needs.
3. `openext init` creates absolute symlinks from `.opencode/` back to the hub (or real copies in [copy mode](#copy-mode)).
4. `init` also removes any hub-managed symlinks not in the manifest and adds `.opencode/` to `.gitignore`.
5. Projects can mix hub-managed symlinks with local-only files -- only hub-managed symlinks are touched.

### Overriding a Hub Extension Locally

To customize a file for a specific project without affecting the hub:

1. Remove the symlink.
2. Create a real file at the same path and copy the content over.
3. Edit as needed.

`openext init` will skip real files with a warning. It will not overwrite them unless you pass `--force`.

## Copy Mode

By default openext materializes extensions as **symlinks** back to the hub (machine-local, never committed). For projects that should be self-contained and committable, use **copy mode** to materialize real file copies instead.

### Enabling copy mode

```sh
# Option A: from the start, per-entry
openext add agents/levi . --copy

# Option B: for a whole project (also converts existing symlinks to copies)
openext init . --copy

# Option C: hand-edit the manifest
#   { "mode": "copy", "agents": ["levi"], ... }
```

`--copy` persists `"mode": "copy"` into `.opencode/openext.json`; from then on every `init`/`add`/`remove`/`status` operates in copy mode automatically.

### Behavior in copy mode

- **`add` / `init`**: copy real files/directories from the hub into `.opencode/`.
- **Re-runs are safe**: existing copies are skipped to preserve local edits. Pass `--force` to overwrite with fresh hub content.
- **Mode switch**: running `init --copy` on a symlink-mode project converts existing symlinks into copies.
- **`remove`**: deletes the local copy (a real file/dir).
- **`status`**: expects a real file at each path; reports `CONFLICT` if a symlink is found instead.
- **`clean`**: no-op for copies (it only prunes broken symlinks).
- **`.gitignore`**: copy mode removes the `.opencode/` entry so copies get committed. Switching back to symlink mode re-adds it.

### Switching back to symlink mode

There is no CLI flag for this; edit the manifest and remove the `"mode"` line (or set it to `"symlink"`), then run `openext init .`. Existing copies are real files and will be skipped unless you delete them or pass `--force`.

## Requirements

- [Bun](https://bun.sh/) runtime
