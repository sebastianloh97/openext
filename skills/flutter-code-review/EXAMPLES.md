# Example Review Snippets

Worked examples of the review format defined in `SKILL.md`. Each follows the **Problem / Current code / Suggested fix / Reference** structure.

## Widget Design Issue

```
### Widget Design: Logic mixed into widget (StatefulWidget bloat)

**Problem**: Business logic and network calls are placed directly in build/initState, making the widget hard to test and reuse

**Current code**:
```dart
class UserScreen extends StatefulWidget {
  @override
  _UserScreenState createState() => _UserScreenState();
}

class _UserScreenState extends State<UserScreen> {
  User? user;

  @override
  void initState() {
    super.initState();
    fetchUser();  // Network call inside widget
  }

  Future<void> fetchUser() async {
    final res = await http.get(Uri.parse('https://api.example.com/user'));
    setState(() {
      user = User.fromJson(jsonDecode(res.body));
    });
  }
  // ...
}
```

**Suggested fix**:
```dart
// Move logic into a repository + use the project's state management
abstract class UserRepository {
  Future<User> getUser();
}

class HttpUserRepository implements UserRepository {
  final http.Client client;
  HttpUserRepository(this.client);

  @override
  Future<User> getUser() async {
    final res = await client.get(Uri.parse('https://api.example.com/user'));
    if (res.statusCode != 200) {
      throw Exception('Failed to load user');
    }
    return User.fromJson(jsonDecode(res.body) as Map<String, dynamic>);
  }
}

// Widget consumes state from BLoC/Provider/Riverpod instead of fetching directly
```

**Reference**: See `references/flutter-patterns.md` - Layer Separation
```

## Async Error Handling Issue

```
### Async: Unhandled Future / missing error handling

**Problem**: Calling an async function without await or error handling can drop errors and leave the UI in a broken state

**Current code**:
```dart
@override
void initState() {
  super.initState();
  loadData();  // Fire-and-forget, errors swallowed
}

Future<void> loadData() async {
  final data = await repo.fetch();
  setState(() => _data = data);
}
```

**Suggested fix**:
```dart
@override
void initState() {
  super.initState();
  _loadData();  // Private, clearly fire-and-forget
}

Future<void> _loadData() async {
  try {
    final data = await repo.fetch();
    if (!mounted) return;
    setState(() => _data = data);
  } catch (e, st) {
    // Surface error to state management / logging
    if (!mounted) return;
    setState(() => _error = e);
  }
}
```

**Reference**: See `references/common-mistakes.md` - Async & Lifecycle
```

## Security Issue

```
### Security: Token stored in plain SharedPreferences

**Problem**: Auth tokens stored in non-encrypted storage can be read on rooted/jailbroken devices

**Current code**:
```dart
await SharedPreferences.getInstance()
    .then((p) => p.setString('token', token));
```

**Suggested fix**:
```dart
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const storage = FlutterSecureStorage(
  aOptions: AndroidOptions(encryptedSharedPreferences: true),
);

await storage.write(key: 'token', value: token);
```

**Reference**: See `references/security.md` - Secure Storage
```
