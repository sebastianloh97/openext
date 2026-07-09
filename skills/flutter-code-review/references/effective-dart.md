# Effective Dart & Flutter: Key Best Practices

## Formatting
- Run `dart format` for automatic, consistent formatting
- Use trailing commas for widget arguments to keep formatting stable and diffs clean
- Keep the default line length (80); rely on the formatter, not manual wrapping
- Order directives: `dart:` before package deps before relative imports; keep imports sorted (use `dart format` / linter)

## Commentary
- Use `///` doc comments for public APIs; avoid `//` for documentation
- Doc comments should describe intent and usage, not restate the code
- First sentence should be a concise, standalone summary ending with a period
- Prefer prose over block comments (`/* */`) for explanations

```dart
/// Returns the user with the given [id], or throws if not found.
///
/// Use this after authentication to load the full profile.
Future<User> fetchUser(String id) async { ... }
```

## Naming Conventions
- **Types, classes, enums, typedefs**: `UpperCamelCase` (`UserRepository`, `AuthState`)
- **Libraries, packages, directories, source files**: `lowercase_with_underscores` (`user_repository.dart`)
- **Variables, parameters, functions**: `lowerCamelCase` (`fetchUser`, `currentUser`)
- **Constants**: `lowerCamelCase` for `const` values; `UpperCamelCase` for enum-like grouped values
- Avoid abbreviations except widely understood ones (`url`, `id`, `http`)
- Name boolean getters/properties with a verb prefix: `isEmpty`, `canSubmit`, `hasData`

## Types and Null Safety
- Use sound null safety; never disable it
- Avoid `!` (null assertion operator); handle null explicitly or make types non-nullable where the value is guaranteed
- Prefer `late` only when initialization is guaranteed before use and field cannot be final; otherwise initialize eagerly or make nullable
- Use `final` for variables that won't be reassigned; `const` for compile-time constants
- Prefer type annotations on public APIs; let type inference handle locals
- Use `Object?` (not `dynamic`) when you genuinely need to accept anything

```dart
// Good
final List<User> users;
const timeout = Duration(seconds: 30);

// Avoid
var users = <User>[];  // loses intent on public API
dynamic data;          // defeats type safety
```

## Constructors
- Prefer named constructors and factory constructors for clarity (`Point.origin()`, `User.fromJson()`)
- Use `const` constructors for immutable widgets whenever possible (enables widget reuse)
- Use `this.param` initializing formals to reduce boilerplate
- Use named parameters for widgets (all widget constructors use named params)
- Use `required` for mandatory named parameters

```dart
class User {
  final String id;
  final String name;
  final String? email;

  const User({required this.id, required this.name, this.email});

  factory User.fromJson(Map<String, dynamic> json) => User(
        id: json['id'] as String,
        name: json['name'] as String,
        email: json['email'] as String?,
      );
}
```

## Functions and Closures
- Use arrow (`=>`) for single-expression functions and methods
- Capture variables intentionally in closures; be aware of async closures in loops
- Prefer top-level or static functions over nested closures when no state is needed
- Use tear-offs: `onPressed: handleSubmit` not `onPressed: () => handleSubmit()`

## Collections
- Use literal syntax for list/map/set creation: `var list = <int>[];`, `var map = <String,int>{};`
- Don't use `.length` to check emptiness; use `.isEmpty` / `.isNotEmpty`
- Use collection `for`, `if`, and spread operators for declarative transforms
- Prefer `whereType<T>()` over `.where((e) => e is T)` for filtering by type

```dart
// Good
final admins = users.where((u) => u.isAdmin).toList();
final names = [for (final u in users) u.name];
```

## Asynchrony
- Use `async`/`await` over raw `.then()` chains for readability
- Always handle errors from async operations (try/catch or callers handle)
- Use `Future<T>` as return types for async APIs; avoid returning `Future<void>` when a value is meaningful
- Prefer `Stream` for multiple async values; consume with `await for` or `listen` with proper cancellation
- Use `Completer` sparingly; most async flows are expressible with async/await

## Error Handling
- Use exceptions for error conditions, not return codes (idiomatic Dart)
- Throw typed/semantic exceptions rather than bare `Exception('msg')` strings
- Catch specific exceptions; avoid broad `catch (e)` unless you rethrow or genuinely handle all
- Use `on` clauses to differentiate exception types

```dart
// Good
try {
  await repo.save(user);
} on NetworkException catch (e) {
  // recover or surface
  rethrow;
} on FormatException {
  // handle parsing error
}
```

## Classes and OO
- Prefer composition over inheritance for reuse
- Make state immutable where possible; use `copyWith` for changes
- Implement `==` and `hashCode` for value types (or use `equatable`/Dart records where appropriate)
- Use `abstract` interfaces to define contracts; `implements` for interface, `extends`/`with` for behavior
- Use `mixin` for reusable, orthogonal behavior

## State Management
- Choose one approach per project and apply it consistently (BLoC, Riverpod, Provider, etc.)
- Keep UI widgets unaware of the data source; widgets read state and dispatch intents
- Expose immutable state; transformations happen in the state holder, not the widget
- Avoid `setState` for anything shared across widgets or beyond the immediate widget subtree

## Widgets
- Prefer composition: build complex UIs from small, focused, reusable widgets
- Use `const` widgets wherever possible to prevent unnecessary rebuilds
- Choose `StatelessWidget` unless you need local mutable state tied to the element lifecycle
- Implement `debugFillProperties` for custom widgets to aid debugging in DevTools
- Use `Key` (or `ValueKey`) only when needed for state preservation across reorders/edits

## Resource Management
- Dispose resources in `dispose()`: controllers (`TextEditingController`, `ScrollController`, `AnimationController`), `StreamSubscription`s, `FocusNode`s, timers
- Cancel listeners and subscriptions to prevent memory leaks
- Use `WidgetsBindingObserver` carefully and remove observers in dispose
