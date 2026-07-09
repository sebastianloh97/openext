# Flutter Project Patterns

This document captures widely-used Flutter/Dart architecture and coding patterns. It is intentionally project-agnostic so it can be applied to any Flutter codebase. **Customize the sections below to match your project's specific conventions** (state management, folder structure, naming, analytics).

> When this skill is used against a specific repo, prefer reading the repo's own conventions (README, ARCHITECTURE.md, lint rules, existing code) and override the generic guidance here with project-specific patterns.

## Architecture: Layered Structure

Apply a layered architecture with dependencies pointing inward (domain has no Flutter/UI dependencies):

```
lib/
├── main.dart
├── app/                      # App bootstrap, router, theme
├── core/                     # Shared utils, errors, constants, network client
├── features/                 # Feature-first slices
│   └── <feature>/
│       ├── domain/           # Entities, repository interfaces, use cases
│       │   ├── entities/
│       │   ├── repositories/
│       │   └── usecases/
│       ├── data/             # Repository impls, datasources (api/db), DTOs/models
│       │   ├── datasources/
│       │   ├── models/
│       │   └── repositories/
│       └── presentation/     # Widgets, pages, state (BLoC/Cubit/Riverpod/Provider)
│           ├── pages/
│           ├── widgets/
│           └── controllers/ (or blocs/, providers/)
└── shared/                   # Reusable design-system widgets
```

### Layer Separation Rules
- **Domain layer**: pure Dart. No `package:flutter`, no IO. Defines entities, repository *interfaces* (abstract classes), and use cases.
- **Data layer**: implements domain repository interfaces; talks to API/DB/secure storage; maps DTOs <-> entities.
- **Presentation layer**: reads state and dispatches intents; no direct network/db access.

```dart
// domain/repositories/user_repository.dart (pure Dart, abstract)
abstract class UserRepository {
  Future<User> getUser(String id);
}

// data/repositories/user_repository_impl.dart
class UserRepositoryImpl implements UserRepository {
  final UserApi api;
  UserRepositoryImpl(this.api);

  @override
  Future<User> getUser(String id) async {
    final dto = await api.fetch(id);
    return dto.toEntity();
  }
}
```

## State Management

Pick ONE primary approach and use it consistently. Common choices:

- **BLoC / Cubit** (`flutter_bloc`): events/states or functions->states; great for complex flows and testability.
- **Riverpod** (`flutter_riverpod`): compile-safe providers; flexible scoping.
- **Provider** (`provider`): lightweight `ChangeNotifier`; good for simpler apps.

### Conventions
- Widgets consume state and dispatch intents; they never fetch data directly.
- State classes are immutable with `copyWith`; never mutate in place.
- One state-holder per feature screen or cohesive concern; don't create a global "god" state.
- Expose failures as part of state (e.g., `Idle | Loading | Success(data) | Failure(error)`), not via thrown exceptions reaching the UI.

```dart
// Example with a sealed result state (framework-agnostic)
sealed class UserState {}
class UserInitial extends UserState {}
class UserLoading extends UserState {}
class UserLoaded extends UserState { final User user; UserLoaded(this.user); }
class UserError extends UserState { final Object error; UserError(this.error); }
```

## Models & Entities

- Entities and models are **immutable** (`final` fields).
- Provide a `copyWith` method for updates.
- Implement value equality (`==` + `hashCode`) for models used in lists/diffing (or use `equatable`/Dart records).
- Map between DTOs (raw network shapes) and domain entities; keep snake_case JSON keys in mappers, not in entities.
- Use factory constructors (`fromJson`) for parsing; centralize parsing failures.

```dart
class User {
  final String id;
  final String name;
  final String? email;

  const User({required this.id, required this.name, this.email});

  User copyWith({String? name, String? email}) => User(
        id: id,
        name: name ?? this.name,
        email: email ?? this.email,
      );

  @override
  bool operator ==(Object other) =>
      other is User && other.id == id && other.name == name && other.email == email;

  @override
  int get hashCode => Object.hash(id, name, email);
}
```

## Data Sources & Repositories

- Abstract remote and local data behind repository interfaces defined in domain.
- Inject an HTTP client (interface) so it can be faked in tests.
- Centralize base URLs, headers, timeouts, and auth token injection in a configured client / interceptor.
- Map HTTP status codes to typed exceptions (`NetworkException`, `UnauthorizedException`, `NotFoundException`).

## Dependency Injection

- Wire dependencies at the root (e.g., in `main.dart` or an `injection_container.dart`).
- Inject repository and use-case dependencies into state holders.
- Inject interfaces, not concretions, to keep code testable.

```dart
// injection_container.dart
final getIt = GetIt.instance;

Future<void> initDependencies() async {
  // External
  getIt.registerLazySingleton<http.Client>(() => http.Client());
  // Data
  getIt.registerFactory<UserApi>(() => UserApi(getIt<http.Client>()));
  getIt.registerFactory<UserRepository>(() => UserRepositoryImpl(getIt<UserApi>()));
  // Domain
  getIt.registerFactory(() => FetchUserUseCase(getIt<UserRepository>()));
}
```

## Error Handling

- Throw typed, semantic exceptions from data/domain layers.
- Presentation layer translates failures into user-facing state/messages (don't leak raw exception text to users).
- Distinguish retryable (network) vs non-retryable (validation/authorization) failures.

## Comment Guidelines

Write comments that explain **WHY**, not **WHAT**:

### Keep Necessary Comments
- Doc comments (`///`) on public APIs
- Complex business logic where intent isn't obvious
- Invariants, assumptions, and "gotchas"
- TODOs with context (what + why + link/owner)

### Avoid Unnecessary Comments
- Comments restating obvious code
- Step-by-step narration of simple operations
- Redundant inline comments in straightforward methods

```dart
// Good: explains why
// The API returns dates in the school's timezone; convert to UTC here
// so sorting and dedup are consistent across regions.
DateTime toUtc(String raw) => DateTime.parse(raw).toUtc();

// Bad: describes what
// Parse the string and convert to UTC
DateTime toUtc(String raw) => DateTime.parse(raw).toUtc();
```

## Navigation & Routing

- Centralize route definitions (named routes or a typed router like `go_router`).
- Avoid hardcoded route strings scattered in widgets.
- Pass IDs (not whole objects) when possible, and load details in the destination; large objects shouldn't ride in route args.
- Handle deep links securely (validate hosts/params, see `references/security.md`).

## Analytics & Event Tracking

If the project tracks analytics:
- Define all event names as constants in a single location (e.g., `analytics_events.dart`).
- Use a consistent naming convention (e.g., `Entity:action` or `entity_action`).
- Track from the presentation/state layer (after a successful action), not from widgets directly.
- Never include PII or secrets in event payloads.

```dart
// analytics_events.dart
abstract final class AnalyticsEvent {
  static const signInSuccess = 'auth:signInSuccess';
  static const templateUsed = 'template:used';
}

// In a controller, after success
await analytics.log(AnalyticsEvent.signInSuccess, params: {'method': method});
```

## Feature Flags & Config

- Read flags/config through an interface so behavior can vary by environment.
- Never hardcode environment-specific values (URLs, keys) in source; inject them.

## Testing Patterns

### Test What, Not How
- Verify outcomes/state, not internal method-call counts (prefer fakes over strict mocks).
- Unit-test use cases and repositories with faked data sources.
- Widget-test user-visible behavior (`find.byType`, `tap`, `enterText`), not private methods.

### Organization
- Mirror `lib/` structure under `test/`.
- Name tests by behavior: `'returns user when id exists'`, not `'test1'`.
- Group with `group(...)`; keep setup minimal and isolated per test.

```dart
// Good: behavior-driven, faked dependency
class FakeUserRepository implements UserRepository {
  User? user;
  @override
  Future<User> getUser(String id) async => user ?? (throw Exception('not found'));
}

void main() {
  group('FetchUserUseCase', () {
    test('returns user when repository has data', () async {
      final repo = FakeUserRepository()..user = User(id: '1', name: 'A');
      final usecase = FetchUserUseCase(repo);

      final result = await usecase('1');

      expect(result.name, 'A');
    });

    test('throws when user missing', () async {
      final repo = FakeUserRepository(); // no user
      final usecase = FetchUserUseCase(repo);

      expect(() => usecase('1'), throwsException);
    });
  });
}
```

## Multi-tenancy / Scoped Data (if applicable)

If the app is multi-tenant (e.g., per-org/per-school/per-workspace):
- Include tenant context in all remote/local queries.
- Enforce tenant scoping at the repository/data layer.
- Verify authorization before reading/writing tenant data.

## Customization Notes

When applying this skill to a specific project, override this file with:
- The project's actual folder structure
- The chosen state management library and conventions
- Naming patterns for events/states/routes
- Any project-specific lint rules (`analysis_options.yaml`)
- Analytics/event taxonomy
