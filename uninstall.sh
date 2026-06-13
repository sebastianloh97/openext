#!/usr/bin/env bash
set -euo pipefail

HUB_DIR="${OPENEXT_HUB:-$HOME/openext}"
BIN_DIR="$HOME/.local/bin"
BIN_FILE="$BIN_DIR/openext"

# ─── Remove wrapper script ──────────────────────────────────────────

if [ -f "$BIN_FILE" ]; then
  rm "$BIN_FILE"
  echo "Removed $BIN_FILE"
else
  echo "openext wrapper not found at $BIN_FILE"
fi

# ─── Optionally remove hub ──────────────────────────────────────────

if [ -d "$HUB_DIR" ]; then
  read -rp "Remove hub at $HUB_DIR? [y/N] " answer
  case "$answer" in
    [yY]*)
      rm -rf "$HUB_DIR"
      echo "Hub removed."
      ;;
    *)
      echo "Hub kept at $HUB_DIR."
      ;;
  esac
fi

echo ""
echo "Done. 'openext' is no longer available."
