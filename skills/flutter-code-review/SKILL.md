---
name: flutter-code-review
description: Comprehensive Flutter/Dart code review skill for PR reviews, architecture assessment, and test quality analysis. Use when reviewing Flutter or Dart code to ensure adherence to Dart best practices, Flutter widget/state management standards, performance guidelines, and project-specific patterns. Applies to full PR reviews, single file/widget reviews, architecture evaluation, and test code quality checks.
---

# Flutter Code Review

Perform thorough Flutter/Dart code reviews incorporating both external best practices and project-specific patterns.

## Review Process

### 1. Run Automated Tooling First

Run the project's deterministic checks before reading code. They surface a large class of issues mechanically and reveal which lint rules the project actually enforces:

```bash
flutter analyze                        # static analysis + lint rules (analysis_options.yaml)
dart format --set-exit-if-changed .    # formatting check (non-mutating)
flutter test                           # test suite
flutter pub outdated                   # stale/vulnerable dependencies (feeds the security review)
```

- Note `analyze` violations and formatting diffs at a high level, but don't re-list what the linter already flags one-by-one.
- If the project uses `riverpod_lint`, `custom_lint`, or similar, run those too.
- If the repo lacks an `analysis_options.yaml`, disables core lint rules, or has failing tests, flag it as an architecture-level finding.

### 2. Understand the Context

Before reviewing, gather context:
- Read the PR description or understand the change purpose
- Identify the feature/layer being modified (UI, state, data, domain)
- Check if this affects core business logic, navigation, platform channels, or tests
- Note the state management approach used in the project (BLoC, Riverpod, Provider, etc.)

### 3. Load Relevant References

Based on the review type, read appropriate references:

- **Always read**: `references/flutter-patterns.md` for architecture conventions (treat them as defaults; override with the reviewed repo's own conventions where they differ)
- **For general code quality**: `references/effective-dart.md` for Dart/Flutter best practices
- **For bug prevention**: `references/common-mistakes.md` for antipatterns
- **For security-sensitive code** (auth, payments, user input, secure storage, network, platform channels): `references/security.md`

### 4. Review Scope by Type

**Full PR Review**: Check all aspects - architecture, implementation, tests, security, performance

**Architecture Review**: Focus on layer separation (presentation/domain/data), state management boundaries, dependency direction, feature structure

**Test Review**: Focus on test quality, coverage, behavior vs implementation testing, widget vs unit tests

**Single Widget/File**: Focus on implementation quality, widget composition, naming, error handling, rebuild efficiency

### 5. Provide Structured Feedback

Organize feedback by priority:

#### Critical Issues
Security vulnerabilities, data loss risks, memory leaks, unhandled async errors, broken navigation/state

#### Important Issues
Architecture violations, missing error handling, incorrect lifecycle usage, performance regressions, test gaps

#### Suggestions
Code clarity, rebuild optimizations, idiomatic Dart patterns, accessibility improvements

#### Positive Feedback
Well-designed patterns, good test coverage, clear naming, proper separation of concerns

### 6. Code Examples

For each issue, provide:
- **What**: Describe the problem
- **Why**: Explain the risk or impact
- **How**: Show code example of the fix

## Key Review Areas

### Project-Specific Patterns

Check adherence to the project's architecture and conventions (see `references/flutter-patterns.md`):
- Proper layer separation: presentation (widgets/state) -> domain (use cases/entities) -> data (repos/datasources)
- Dependency direction flows inward (domain has no Flutter/UI imports)
- State management used consistently with the project's chosen approach
- Models/entities are immutable with `copyWith` and value equality
- Repositories abstract data sources (API, DB, secure storage)
- Comments explain why, not what

### Dart & Flutter Best Practices

- Proper async/await usage with error handling
- Correct `StatelessWidget` vs `StatefulWidget` choice
- Widget lifecycle correctness (`initState`, `dispose`, `didChangeDependencies`)
- Dependency injection and testability
- Null safety usage (no unnecessary `!`, proper `late` usage)
- Idiomatic naming and structure per Effective Dart

### Performance

- Avoid unnecessary rebuilds (move state down the tree, use `const` widgets, `Selector`/`Consumer`)
- Dispose controllers, streams, subscriptions, and listeners
- Lazy initialization of expensive resources
- Avoid `setState` for cross-widget state; use the project's state management
- Use `ListView.builder`/`GridView.builder` for large lists (not `Column` with `List<Widget>` or `ListView` with `children`)
- Image caching and sizing

### Security

For auth, payments, user input, secure storage, network, and platform channel code:
- Input validation and sanitization
- Secure storage for tokens/credentials (flutter_secure_storage / Keychain/Keystore)
- No secrets hardcoded in source or assets
- Certificate pinning and HTTPS for network calls
- Proper token refresh and expiry handling
- Authorization checks before sensitive operations
- Validate data crossing platform channels

### Testing

- Test both success and error/edge cases
- Isolated test state (no global mutable state, reset between tests)
- Behavior verification not implementation details
- Widget tests for UI behavior; unit tests for logic; integration tests for flows
- Mock/fake external dependencies at boundaries, not internals
- Clear test names describing what is tested
- Pump the widget tree properly and await async frames (`await tester.pumpAndSettle()`)

### Accessibility

- Provide `semanticLabel` on `Icon`s and `Image`s that convey meaning
- Label interactive widgets (`Semantics`, `tooltip`) so assistive tech announces purpose
- Ensure minimum tap-target sizes (>= 48x48 dp on mobile)
- Don't rely on color alone to convey state/errors; pair with text or icons
- Keep layouts resilient to font scaling / `textScaleFactor` (no clipped or overflowed text)
- Use `excludeSemantics` / `mergedSemantics` deliberately, not to silence warnings

## Review Output Format

Structure your review as:

```
## Critical Issues
[Issues that must be fixed before merge]

## Important Issues
[Issues that should be fixed]

## Suggestions
[Optional improvements]

## Positive Feedback
[What was done well]
```

For each issue:
```
### [Area]: [Brief description]

**Problem**: [What's wrong and why it matters]

**Current code**:
```dart
[Show problematic code]
```

**Suggested fix**:
```dart
[Show corrected code]
```

**Reference**: [Link to specific pattern/practice]
```

## Example Review Snippets

See [EXAMPLES.md](EXAMPLES.md) for worked examples in the review format above, covering:
- **Widget design**: business logic embedded in a `StatefulWidget`
- **Async error handling**: fire-and-forget `Future` with `BuildContext`-after-`await` risk
- **Security**: auth token stored in plain `SharedPreferences`

## When NOT to Comment

Avoid feedback on:
- Trivial formatting issues (`dart format` handles this)
- Personal style preferences not in project patterns
- Nitpicks that don't affect functionality, maintainability, or performance
- Issues already addressed in other comments

## Multi-file Review Strategy

For PRs with many files:
1. Start with architecture overview (new features, major changes, layer changes)
2. Review domain layer (entities, use cases) first
3. Review data layer (repositories, datasources, models)
4. Review presentation layer (state classes, then widgets)
5. Review tests for each layer
6. Summarize overall assessment

## After Review

If significant issues found:
- Summarize the most important themes
- Suggest whether changes are required before merge
- Offer to explain any patterns or practices in detail
