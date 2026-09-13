# Framework bridges

How the package's tokens reach real frontend code. The package itself is
framework-neutral HTML+CSS; every framework integration goes through a
**bridge** registered here. Token names are identical across bridges, and
values derive only from `variables.css` / `tokens.*.json` — never hand-copied
into app code.

| Framework | Bridge | How to consume |
|---|---|---|
| TODO(project) | TODO(project) | TODO(project) |

## Adding a bridge

1. Create `system/bridges/<framework>/` containing either an importable
   artifact (CSS custom properties, Tailwind `@theme` block, SCSS variables, JS
   module) or a generator script that reads `tokens.*.json` and emits the
   framework's native theme code (e.g. Dart `ThemeData` for Flutter). Prefer a
   generator script — deterministic and re-runnable — over hand-written
   constants.
2. Keep token names identical to `variables.css`; derive values from the token
   files only.
3. Wire theme selection to the package's convention — the same selector/class
   and persistence key (`body.light-theme`, key in `assets/theme.js`).
4. Register it in the table above with concrete consume steps, in the same
   change.
