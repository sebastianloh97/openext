#!/usr/bin/env bash
set -euo pipefail

HUB_REPO="git@github.com:sebastianloh97/openext.git"
HUB_DIR="${OPENEXT_HUB:-$HOME/openext}"
BIN_DIR="$HOME/.local/bin"
BIN_FILE="$BIN_DIR/openext"

# ─── Check dependencies ─────────────────────────────────────────────

if ! command -v bun &>/dev/null; then
  echo "error: bun is not installed. Install it from https://bun.sh"
  exit 1
fi

if ! command -v git &>/dev/null; then
  echo "error: git is not installed."
  exit 1
fi

# ─── Clone hub if needed ────────────────────────────────────────────

if [ -d "$HUB_DIR/.git" ]; then
  echo "Hub already exists at $HUB_DIR — pulling latest..."
  git -C "$HUB_DIR" pull
else
  if [ -d "$HUB_DIR" ]; then
    echo "error: $HUB_DIR exists but is not a git repo. Remove it or set OPENEXT_HUB."
    exit 1
  fi
  echo "Cloning hub to $HUB_DIR..."
  git clone "$HUB_REPO" "$HUB_DIR"
fi

# ─── Create wrapper script in PATH ──────────────────────────────────

mkdir -p "$BIN_DIR"

cat > "$BIN_FILE" <<EOF
#!/usr/bin/env bash
exec bun "$HUB_DIR/cli.ts" "\$@"
EOF
chmod +x "$BIN_FILE"

echo "Installed: $BIN_FILE -> $HUB_DIR/cli.ts"

# ─── Verify ─────────────────────────────────────────────────────────

if ! echo "$PATH" | tr ':' '\n' | grep -qF "$BIN_DIR"; then
  echo "warning: $BIN_DIR is not in PATH. Add it to your shell config."
fi

echo ""
echo "Done. 'openext' is now available."
