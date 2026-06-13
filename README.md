# openext

Centralized OpenCode extension manager. One hub, many consumer projects, symlinks everywhere.

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

# Materialize all symlinks at once
openext init .
```

## Commands

| Command | Description |
|---------|-------------|
| `openext init [path]` | Reconcile symlinks with manifest. Idempotent, safe to run anytime. |
| `openext add <type>/<name> [path]` | Add extension to manifest and create symlink. |
| `openext remove <type>/<name> [path]` | Remove extension from manifest and delete symlink. |
| `openext clean [path]` | Remove broken symlinks pointing to deleted hub entries. |
| `openext create <type> <name>` | Create a skeleton extension in the hub. |
| `openext list [--type <type>]` | List all available extensions in the hub. |
| `openext status [path]` | Compare manifest against actual state, report discrepancies. |

All mutating commands support `--dry-run`. The `init` command also supports `--force` to overwrite real files with symlinks.

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
  "agents": ["levi", "shalltear"],
  "skills": ["chrome", "memorize"],
  "commands": ["opsx-propose"],
  "plugins": ["stuck-watcher", "session-title"],
  "scripts": ["session-info"],
  "config": ["stuck-watcher.jsonc", "runtime-session-info.md"]
}
```

Omit any type you don't need. An empty `{}` is valid.

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
3. `openext init` creates absolute symlinks from `.opencode/` back to the hub.
4. `init` also removes any hub-managed symlinks not in the manifest and adds `.opencode/` to `.gitignore`.
5. Projects can mix hub-managed symlinks with local-only files -- only hub-managed symlinks are touched.

### Overriding a Hub Extension Locally

To customize a file for a specific project without affecting the hub:

1. Remove the symlink.
2. Create a real file at the same path and copy the content over.
3. Edit as needed.

`openext init` will skip real files with a warning. It will not overwrite them unless you pass `--force`.

## Requirements

- [Bun](https://bun.sh/) runtime
