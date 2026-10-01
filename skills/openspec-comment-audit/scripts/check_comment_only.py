#!/usr/bin/env python3
"""Prove that Python edits changed only comments and docstrings.

Compares each target file's working-tree content against a git revision. Both
revisions are parsed with ``ast`` and stripped of documentation — docstrings
and bare string expression statements (attribute docstrings) — before
comparison, so the edit is proven comment-only when the remaining trees are
identical: comments never appear in an AST, and documentation edits are
expected during a comment audit.

Exit codes: 0 all pass; 1 any code change; 2 unverifiable only.
"""

from __future__ import annotations

import argparse
import ast
import difflib
import subprocess
import sys
from pathlib import Path

_STRING_STATEMENT_ATTRS = ("body", "orelse", "finalbody")
MAX_DIFF_LINES = 40


def repo_root(start: Path) -> Path:
    result = subprocess.run(
        ["git", "-C", str(start), "rev-parse", "--show-toplevel"],
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        raise SystemExit(f"not a git repository: {start}")
    return Path(result.stdout.strip())


def git_show(root: Path, revision: str, path: str) -> str | None:
    result = subprocess.run(
        ["git", "-C", str(root), "show", f"{revision}:{path}"],
        capture_output=True,
        text=True,
        check=False,
    )
    return result.stdout if result.returncode == 0 else None


def changed_python_files(root: Path, base: str) -> list[str]:
    result = subprocess.run(
        ["git", "-C", str(root), "diff", "--name-only", base, "--", "*.py"],
        capture_output=True,
        text=True,
        check=False,
    )
    return [line for line in result.stdout.splitlines() if line.strip()]


def _is_bare_string_statement(stmt: ast.stmt) -> bool:
    """True for a statement whose only content is a string constant."""
    return isinstance(stmt, ast.Expr) and isinstance(stmt.value, ast.Constant) and isinstance(stmt.value.value, str)


def strip_documentation(tree: ast.AST) -> ast.AST:
    """Drop docstrings and attribute docstrings (bare string statements).

    A string statement is a runtime no-op wherever it appears: as the first
    statement of a module/class/function body, or after a dataclass attribute
    as an attribute docstring. Both revisions are stripped, so a
    documentation-only edit passes while any other AST difference still fails
    the proof.
    """
    for node in ast.walk(tree):
        for attr in _STRING_STATEMENT_ATTRS:
            body = getattr(node, attr, None)
            if isinstance(body, list):
                setattr(node, attr, [stmt for stmt in body if not _is_bare_string_statement(stmt)])
    return tree


def normalized_dump(source: str) -> str:
    return ast.dump(strip_documentation(ast.parse(source)), include_attributes=False, indent=2)


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Prove Python edits are comment-only against a git revision.")
    parser.add_argument("files", nargs="*", help="files to check (default: changed .py files)")
    parser.add_argument("--base", default="HEAD", help="git revision to compare against (default: HEAD)")
    parser.add_argument("--repo", type=Path, default=Path.cwd(), help="path inside the repository")
    parser.add_argument("--quiet", action="store_true", help="print the summary only")
    args = parser.parse_args(argv)

    root = repo_root(args.repo)
    files = args.files or changed_python_files(root, args.base)
    if not files:
        print("no files to check")
        return 0

    passed = failed = unverifiable = 0
    for raw in files:
        path = Path(raw)
        try:
            relative = path.resolve().relative_to(root).as_posix()
        except ValueError:
            unverifiable += 1
            print(f"UNVERIFIABLE {raw}: outside the repository")
            continue

        working_path = root / relative
        if not working_path.is_file():
            unverifiable += 1
            print(f"UNVERIFIABLE {relative}: missing in the working tree")
            continue
        base_source = git_show(root, args.base, relative)
        if base_source is None:
            unverifiable += 1
            print(f"UNVERIFIABLE {relative}: no {args.base} revision")
            continue

        try:
            base_dump = normalized_dump(base_source)
            working_dump = normalized_dump(working_path.read_text(encoding="utf-8"))
        except (SyntaxError, UnicodeDecodeError) as exc:
            unverifiable += 1
            print(f"UNVERIFIABLE {relative}: cannot parse ({exc})")
            continue

        if base_dump == working_dump:
            passed += 1
            if not args.quiet:
                print(f"PASS {relative}")
            continue

        failed += 1
        print(f"FAIL {relative}: code changed outside comments/docstrings")
        if not args.quiet:
            diff = difflib.unified_diff(
                base_dump.splitlines(),
                working_dump.splitlines(),
                fromfile=f"{args.base}:{relative}",
                tofile=f"working:{relative}",
                lineterm="",
                n=1,
            )
            for index, line in enumerate(diff):
                if index >= MAX_DIFF_LINES:
                    print(f"  ... diff truncated after {MAX_DIFF_LINES} lines")
                    break
                print(f"  {line}")

    print(f"summary: {passed} pass, {failed} fail, {unverifiable} unverifiable")
    if failed:
        return 1
    return 2 if unverifiable else 0


if __name__ == "__main__":
    sys.exit(main())
