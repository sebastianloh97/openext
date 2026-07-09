# Common Flutter/Dart Mistakes and Antipatterns

## Async & Lifecycle

### Unhandled Async Errors (Fire-and-Forget)
**Problem**: Calling an async function without awaiting or handling errors drops exceptions silently
```dart
// Bad: Error swallowed, UI may break
@override
void initState() {
  super.initState();
  loadData();
}

Future<void> loadData() async {
  final data = await repo.fetch();
  setState(() => _data = data);
}

// Good: Handle errors and guard against unmounted state
@override
void initState() {
  super.initState();
  _loadData();
}

Future<void> _loadData() async {
  try {
    final data = await repo.fetch();
    if (!mounted) return;
    setState(() => _data = data);
  } catch (e, st) {
    // route to error state / logging
    if (!mounted) return;
    setState(() => _error = e);
  }
}
```

### Using BuildContext After Async Gaps
**Problem**: `BuildContext` may be invalid after an `await`; using it (e.g., `Navigator`, `ScaffoldMessenger`) can throw
```dart
// Bad: context may be invalid after await
Future<void> save() async {
  await repo.save(item);
  Navigator.of(context).pop();          // may throw if widget unmounted
  ScaffoldMessenger.of(context).showSnackBar(...);
}

// Good: Capture references / check mounted before use
Future<void> save() async {
  await repo.save(item);
  if (!mounted) return;
  Navigator.of(context).pop();
  ScaffoldMessenger.of(context).showSnackBar(...);
}

// Better: capture navigator/messenger before await, or use a router that doesn't depend on context
```

### Not Disposing Controllers/Subscriptions
**Problem**: Memory leaks from undisposed controllers, streams, listeners
```dart
// Bad: TextEditingController leaks
class _MyFieldState extends State<MyField> {
  late final TextEditingController _controller;
  // no dispose
}

// Good: dispose in dispose()
class _MyFieldState extends State<MyField> {
  late final TextEditingController _controller;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }
}
```

### Performing Side Effects in build()
**Problem**: `build()` can run many times; network/db writes or heavy work there causes bugs and jank
```dart
// Bad: side effect during build
@override
Widget build(BuildContext context) {
  fetchData();  // runs on every rebuild
  return ...;
}

// Good: side effects in initState or event handlers; build only composes UI
@override
void initState() {
  super.initState();
  _loadData();
}
```

## Widget & Rebuild Pitfalls

### Rebuilding the Whole Tree (Unnecessary Rebuilds)
**Problem**: Putting all state high in the tree causes large subtrees to rebuild on every change
```dart
// Bad: Counter change rebuilds the entire app body
class MyApp extends StatefulWidget { ... }
class _MyAppState extends State<MyApp> {
  int _count = 0;
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: HugeWidgetTree(),         // rebuilds when _count changes
      floatingActionButton: FloatingActionButton(
        onPressed: () => setState(() => _count++),
        child: Text('$_count'),
      ),
    );
  }
}

// Good: Isolate state near where it's used (dedicated widget / state management)
class CounterButton extends StatefulWidget { ... }
```

### Missing const Constructors
**Problem**: Reconstructing identical immutable widgets on each rebuild wastes work
```dart
// Bad: new instances each build
return Padding(padding: EdgeInsets.all(8), child: Text('Hi'));

// Good: const where possible
return const Padding(padding: EdgeInsets.all(8), child: Text('Hi'));
```

### Using ListView/Column With All Children Instead of Builder
**Problem**: Building all list items eagerly consumes memory and time for large lists
```dart
// Bad: instantiates every child
ListView(
  children: items.map((i) => ItemTile(i)).toList(),
)

// Good: lazily builds visible items
ListView.builder(
  itemCount: items.length,
  itemBuilder: (_, i) => ItemTile(items[i]),
)
```

### Choosing StatefulWidget Unnecessarily
**Problem**: Using `StatefulWidget` + `setState` when state is static or computed from props
```dart
// Bad: StatefulWidget for a derived value
class TotalWidget extends StatefulWidget {
  final List<int> items;
  ...
}
// computes sum in state with setState

// Good: derive in build (StatelessWidget)
class TotalWidget extends StatelessWidget {
  final List<int> items;
  const TotalWidget({super.key, required this.items});

  @override
  Widget build(BuildContext context) {
    final total = items.fold(0, (a, b) => a + b);
    return Text('$total');
  }
}
```

## Null Safety

### Abusing `!` (Null Assertion)
**Problem**: Using `!` asserts non-null but will throw at runtime if null; defeats null safety
```dart
// Bad: will throw if user is null
final name = user!.name;

// Good: handle null explicitly
final name = user?.name ?? 'Unknown';
// or
if (user == null) return Placeholder();
final name = user.name;
```

### Misusing `late`
**Problem**: `late` defers initialization but throws `LateInitializationError` if accessed too early
```dart
// Bad: accessed before initialized
class _State extends State<X> {
  late String label;
  @override
  Widget build(BuildContext context) => Text(label);  // throws if never set
}

// Good: initialize at declaration or in initState, or make nullable
late final TextEditingController _c;
@override
void initState() {
  super.initState();
  _c = TextEditingController();
}
```

## State Management

### Mixing setState With Global State
**Problem**: Local `setState` that should be shared state leads to inconsistent UI
```dart
// Bad: auth state local to a widget
class _LoginPageState extends State<LoginPage> {
  bool _loggedIn = false;
  // other widgets can't see this
}

// Good: lift state to a scoped holder (Provider/Riverpod/BLoC)
```

### Business Logic in Widgets
**Problem**: Network/db/validation logic inside widgets is untestable and un-reusable
```dart
// Bad: network call + JSON parsing + state mutation live inside the widget
@override
void initState() {
  super.initState();
  _fetchUser();  // async fire-and-forget; logic tied to the widget
}

Future<void> _fetchUser() async {
  final res = await http.get(Uri.parse('...'));
  setState(() => _user = User.fromJson(jsonDecode(res.body)));
}

// Good: delegate to a repository + state holder (BLoC/Provider/Riverpod)
```

## Collections & Types

### Using `.length` to Check Empty
**Problem**: `.length == 0` may be O(n) for some collections; `.isEmpty` is clearer and faster
```dart
// Bad
if (list.length == 0) ...
while (list.length > 0) ...

// Good
if (list.isEmpty) ...
while (list.isNotEmpty) ...
```

### Type Filtering With `where` + Cast
**Problem**: Verbose and loses type info
```dart
// Bad
final strings = things.where((e) => e is String).cast<String>().toList();

// Good
final strings = things.whereType<String>().toList();
```

## Error Handling

### Catching Everything and Swallowing
**Problem**: Broad `catch (e)` hides bugs and masks real failures
```dart
// Bad
try {
  await doWork();
} catch (e) {
  // silently ignored
}

// Good: catch specific types, log, and rethrow or surface
try {
  await doWork();
} on NetworkException catch (e, st) {
  log.warning('Network failure', e, st);
  rethrow;
}
```

## Equality

### Missing Value Equality on Models
**Problem**: Reference equality makes comparisons/dedup/diffing fail
```dart
// Bad: two identical User instances are not equal
class User {
  final String id;
  User(this.id);
}

// Good: implement == and hashCode (or use equatable / records)
class User {
  final String id;
  User(this.id);

  @override
  bool operator ==(Object other) => other is User && other.id == id;

  @override
  int get hashCode => id.hashCode;
}
```

## Testing

### Only Testing the Happy Path
**Problem**: Missing coverage for error/edge cases
```dart
// Bad
test('parse', () {
  expect(parse('1'), 1);
});

// Good: success, boundary, and error cases
test('parse valid', () => expect(parse('1'), 1));
test('parse empty throws', () => expect(() => parse(''), throwsA(isA<FormatException>())));
```

### Global Mutable State in Tests
**Problem**: Tests interfere with each other via shared singletons
```dart
// Bad
var cache = <String,int>{};
test('a', () { cache['x'] = 1; });
test('b', () { expect(cache['x'], isNull); });  // depends on order

// Good: fresh setup per test, inject dependencies
setUp(() { cache = <String,int>{}; });
```

### Forgetting to Pump Frames in Widget Tests
**Problem**: Assertions/animations don't settle; reads stale state
```dart
// Bad
await tester.pumpWidget(MyApp());
expect(find.text('Done'), findsOneWidget);  // not built yet

// Good
await tester.pumpWidget(MyApp());
await tester.pumpAndSettle();
expect(find.text('Done'), findsOneWidget);
```

## Dependency & Build

### Importing Flutter (UI) in Domain/Data Layer
**Problem**: Domain code importing `package:flutter/...` breaks layer purity and testability
```dart
// Bad (in domain entity/use case)
import 'package:flutter/material.dart';

// Good: keep Flutter out of domain; inject abstractions (e.g., for assets via interface)
```

### Hardcoded Strings for Routing/Keys
**Problem**: Stringly-typed routes/keys cause typos and refactoring pain
```dart
// Bad
Navigator.pushNamed(context, '/userDetail');

// Better: centralize route names / use typed routes or go_router with typed screens
```
