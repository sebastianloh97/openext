#!/usr/bin/env python3
"""Inventory Python comments and docstrings for a comment audit.

Stdlib only. Emits a JSON object with one record per comment block or
docstring:

    {"file", "kind", "line", "end_line", "symbol", "directive", "text"}

Redirect large inventories outside the repository, for example
``--output /tmp/comment-audit-inventory.json``, then query them per file.
Non-Python files are out of scope; collect those with ripgrep.
"""

from __future__ import annotations

import argparse
import ast
import inspect
import io
import json
import re
import sys
import tokenize
from dataclasses import asdict, dataclass
from pathlib import Path

EXCLUDED_DIRS = frozenset(
    {
        ".git",
        ".hg",
        ".mypy_cache",
        ".pytest_cache",
        ".ruff_cache",
        ".svn",
        ".tox",
        ".venv",
        "__pycache__",
        "build",
        "dist",
        "node_modules",
        "site-packages",
        "vendor",
        "venv",
    }
)

DIRECTIVE_RE = re.compile(
    r"(noqa\b|type:\s*ignore\b|pyright:\s*ignore\b|pragma:\s*no\s?cover\b"
    r"|fmt:\s*(?:off|on)\b|isort:\s*skip\b|ruff:\s*noqa\b"
    r"|coding[:=]\s*[-.\w]+|shellcheck\s+disable|yamllint\s+disable"
    r"|checkov:skip|trivy:ignore)",
    re.IGNORECASE,
)


@dataclass(frozen=True)
class Item:
    """One comment block or docstring."""

    file: str
    kind: str
    line: int
    end_line: int
    symbol: str
    directive: bool
    text: str


def iter_python_files(paths: list[Path]) -> list[Path]:
    files: list[Path] = []
    for raw in paths:
        path = raw.resolve()
        if path.is_file():
            if path.suffix == ".py":
                files.append(path)
            else:
                print(f"skipping non-Python file: {path}", file=sys.stderr)
            continue
        for candidate in sorted(path.rglob("*.py")):
            parts = candidate.relative_to(path).parts
            if any(part in EXCLUDED_DIRS for part in parts[:-1]):
                continue
            files.append(candidate)
    return files


def symbol_map(tree: ast.AST) -> list[tuple[int, int, str]]:
    spans: list[tuple[int, int, str]] = []

    def visit(node: ast.AST, prefix: str) -> None:
        for child in ast.iter_child_nodes(node):
            name = getattr(child, "name", None)
            if isinstance(child, (ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)) and name:
                qualified = f"{prefix}.{name}" if prefix else name
                spans.append((child.lineno, child.end_lineno or child.lineno, qualified))
                visit(child, qualified)
            else:
                visit(child, prefix)

    visit(tree, "")
    return spans


def symbol_for_line(spans: list[tuple[int, int, str]], line: int) -> str:
    matches = [(end - start, name) for start, end, name in spans if start <= line <= end]
    return min(matches)[1] if matches else "<module>"


def iter_docstrings(tree: ast.AST) -> list[tuple[ast.stmt, str]]:
    found: list[tuple[ast.stmt, str]] = []
    for node in ast.walk(tree):
        if not isinstance(node, (ast.Module, ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
            continue
        if not node.body:
            continue
        first = node.body[0]
        if isinstance(first, ast.Expr) and isinstance(first.value, ast.Constant) and isinstance(first.value.value, str):
            found.append((first, first.value.value))
    return found


def iter_comment_blocks(source: str) -> tuple[list[tuple[int, int, str]], str | None]:
    """Return (blocks, token_error) where blocks group contiguous full-line comments."""
    blocks: list[tuple[int, int, str]] = []
    lines: list[str] = []
    start: int | None = None
    end: int | None = None
    full_line = False
    token_error: str | None = None

    def flush() -> None:
        nonlocal lines, start, end, full_line
        if lines and start is not None and end is not None:
            blocks.append((start, end, "\n".join(lines)))
        lines = []
        start = None
        end = None
        full_line = False

    try:
        for token in tokenize.generate_tokens(io.StringIO(source).readline):
            if token.type != tokenize.COMMENT:
                continue
            text = token.string.lstrip("#").strip()
            is_full_line = token.start[1] == 0
            if is_full_line and full_line and end is not None and token.start[0] == end + 1:
                lines.append(text)
                end = token.end[0]
            else:
                flush()
                lines = [text]
                start = token.start[0]
                end = token.end[0]
            full_line = is_full_line
    except (tokenize.TokenError, IndentationError) as exc:
        token_error = f"tokenize error: {exc}"
    finally:
        flush()
    return blocks, token_error


def scan_file(path: Path, root: Path) -> tuple[list[Item], str | None]:
    try:
        source = path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as exc:
        return [], f"read error: {exc}"
    try:
        tree = ast.parse(source)
    except SyntaxError as exc:
        return [], f"syntax error: {exc}"

    try:
        display = str(path.relative_to(root))
    except ValueError:
        display = str(path)

    spans = symbol_map(tree)
    items: list[Item] = []
    for statement, text in iter_docstrings(tree):
        items.append(
            Item(
                file=display,
                kind="docstring",
                line=statement.lineno,
                end_line=statement.end_lineno or statement.lineno,
                symbol=symbol_for_line(spans, statement.lineno),
                directive=False,
                text=inspect.cleandoc(text),
            )
        )

    blocks, token_error = iter_comment_blocks(source)
    for start, end, text in blocks:
        items.append(
            Item(
                file=display,
                kind="comment",
                line=start,
                end_line=end,
                symbol=symbol_for_line(spans, start),
                directive=bool(DIRECTIVE_RE.search(text)),
                text=text,
            )
        )
    return sorted(items, key=lambda item: item.line), token_error


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Inventory Python comments and docstrings.")
    parser.add_argument("paths", nargs="*", type=Path, default=[Path(".")])
    parser.add_argument("--output", type=Path, help="write JSON to this path instead of stdout")
    parser.add_argument("--comments-only", action="store_true")
    parser.add_argument("--docstrings-only", action="store_true")
    parser.add_argument("--summary", action="store_true", help="print counts only")
    args = parser.parse_args(argv)

    if args.comments_only and args.docstrings_only:
        parser.error("--comments-only and --docstrings-only are mutually exclusive")

    root = Path.cwd()
    files = iter_python_files(args.paths)
    if not files:
        print("no Python files matched", file=sys.stderr)
        return 2

    records: list[dict[str, object]] = []
    errors: list[dict[str, str]] = []
    for path in files:
        items, error = scan_file(path, root)
        if error:
            errors.append({"file": str(path), "error": error})
        if args.comments_only:
            items = [item for item in items if item.kind == "comment"]
        elif args.docstrings_only:
            items = [item for item in items if item.kind == "docstring"]
        records.extend(asdict(item) for item in items)

    payload = {
        "scanned_files": len(files),
        "record_count": len(records),
        "error_count": len(errors),
        "records": records,
        "errors": errors,
    }
    if args.summary:
        print(f"files={len(files)} records={len(records)} errors={len(errors)}")
        for error in errors:
            print(f"  {error['file']}: {error['error']}", file=sys.stderr)
    else:
        text = json.dumps(payload, indent=2)
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(text, encoding="utf-8")
        else:
            print(text)
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
