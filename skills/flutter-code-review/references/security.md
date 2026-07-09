# Flutter/Dart Security Best Practices

## Input Validation and Sanitization

### Validate External Data at Boundaries
**Problem**: Trusting network/API/feature-flag payloads leads to type confusion or crashes
```dart
// Bad: assumes shape and types
final name = json['name'] as String;
final age = json['age'] as int;

// Good: validate and handle unexpected shapes
final raw = json['name'];
if (raw is! String || raw.isEmpty) {
  throw FormatException('Invalid name');
}
final age = (json['age'] as num?)?.toInt();
```

### Command/Platform Channel Injection
**Problem**: Passing unsanitized input through platform channels to native shell/SQL
```dart
// Bad: passing raw input to native that may run shell or SQL
await platform.invokeMethod('runQuery', {'q': userInput});

// Good: use parameterized queries on the native side and validate input on Dart side
// Validate/whitelist before sending across channel
final id = int.tryParse(userInput);
if (id == null || id <= 0) throw ArgumentError('invalid id');
await platform.invokeMethod('findById', {'id': id});
```

### SQL Injection (via local DB / sqflite / drift)
**Problem**: String concatenation into local SQL queries
```dart
// Bad
final rows = await db.rawQuery("SELECT * FROM users WHERE email = '$email'");

// Good: use parameter binding
final rows = await db.rawQuery(
  'SELECT * FROM users WHERE email = ?',
  [email],
);
```

## Authentication and Authorization

### Insecure Password/Token Storage
**Problem**: Storing credentials in plaintext or non-encrypted storage
```dart
// Bad: plaintext in SharedPreferences (not encrypted)
final prefs = await SharedPreferences.getInstance();
await prefs.setString('token', token);

// Good: use platform-backed secure storage
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

const storage = FlutterSecureStorage(
  aOptions: AndroidOptions(encryptedSharedPreferences: true),
);
await storage.write(key: 'token', value: token);
```

### Weak or Predictable Tokens
**Problem**: Generating tokens client-side with weak randomness
```dart
// Bad: predictable, client-controlled id
final token = DateTime.now().millisecondsSinceEpoch.toString();

// Good: tokens are issued by the server; never mint auth tokens client-side.
// If a local nonce is truly needed, use a cryptographically strong source.
import 'dart:math';
import 'dart:convert';
import 'dart:typed_data';

String secureNonce(int bytes) {
  final random = Random.secure();
  final values = Uint8List(bytes);
  for (var i = 0; i < bytes; i++) {
    values[i] = random.nextInt(256);
  }
  return base64Url.encode(values);
}
```

### Insufficient Authorization Checks
**Problem**: Performing sensitive actions without verifying the user can do them
```dart
// Bad
void deleteUser(String id) => repo.delete(id);

// Good: verify current user permission (and enforce on server too)
Future<void> deleteUser(User actor, String id) async {
  if (!actor.canDelete(id)) throw UnauthorizedException();
  await repo.delete(id);
}
```

### Improper Token Refresh / Expiry Handling
**Problem**: Using expired tokens or failing to refresh silently breaks auth
```dart
// Bad: reuse token forever
client.setAuthToken(token);

// Good: refresh on 401, handle refresh failure (force re-login)
// Implement an interceptor that catches 401, refreshes, and retries once.
```

## Cryptography

### Weak Randomness for Security
**Problem**: `Random()` default constructor is not cryptographically secure
```dart
// Bad
final code = Random().nextInt(999999);

// Good
final code = Random.secure().nextInt(900000) + 100000;
```

### Hardcoded Secrets
**Problem**: Embedding API keys, secrets, or passwords in source/assets
```dart
// Bad
const apiKey = 'sk-1234567890abcdef';

// Good: inject via --dart-define / environment at build, fetch from backend, or store in secure storage
// main.dart
const apiKey = String.fromEnvironment('API_KEY');
// run: flutter run --dart-define=API_KEY=...
```
> Never ship long-lived secrets in client apps. Clients are not trusted environments; proxy sensitive calls through your backend.

## Network Security

### Disabling Certificate Verification
**Problem**: Turning off TLS verification to "fix" cert errors enables MITM
```dart
// Bad
final client = HttpClient()..badCertificateCallback = (_, __, ___) => true;

// Good: keep verification on; use certificate pinning for high-security apps
final client = HttpClient();
// Optionally pin certificates for your domains
```

### Plain HTTP / Mixed Content
**Problem**: Sending sensitive data over HTTP
```dart
// Bad
final res = await http.get(Uri.parse('http://api.example.com/login'));

// Good
final res = await http.get(Uri.parse('https://api.example.com/login'));
```

### Certificate Pinning
**Problem**: Without pinning, a compromised CA or installed root can MITM your app
```dart
// Good (with a pinning plugin / native config):
// - Pin SPKI hashes for your hosts
// - Use network security config on Android and ATS on iOS
// - Fail closed on pin mismatch
```

## Sensitive Data Exposure

### Logging Sensitive Data
**Problem**: Passwords/tokens/PII leaking into logs and crash reports
```dart
// Bad
debugPrint('login: email=$email password=$password');
debugPrint('token=$token');

// Good
debugPrint('login attempt: email=$email');
// never log secrets; scrub crash reports
```

### Leaving Sensitive Data in UI / Backstack
**Problem**: Passwords visible in `TextField`, screenshots expose data in app switcher
```dart
// Good
TextField(
  obscureText: true,
  enableSuggestions: false,
  autocorrect: false,
)

// For highly sensitive screens, blur/cover content in lifecycle inactive state
// (use WidgetsBindingObserver on AppLifecycleState.inactive)
```

### Clipboard & Screen Capture
**Problem**: Copying secrets to clipboard or allowing screenshots of sensitive data
```dart
// Consider: clear clipboard after a timeout; block screenshots on sensitive screens
// (platform-specific: FLAG_SECURE on Android, private fields on iOS)
```

## WebView / Deep Links / Universal Links

### Unvalidated WebView Content
**Problem**: Loading arbitrary URLs or executing JS bridges without validation
```dart
// Bad
WebViewController()..loadRequest(Uri.parse(userUrl));

// Good: validate host whitelist; restrict JavaScript; don't expose sensitive bridges
final uri = Uri.parse(userUrl);
if (!allowedHosts.contains(uri.host)) {
  throw ArgumentError('Blocked host');
}
```

### Open Redirect via Deep Links
**Problem**: Deep links redirect to attacker-controlled screens/URLs
```dart
// Good: validate and constrain deep-link targets; do not blindly navigate to link params
```

## Dependency Management

### Vulnerable or Unpinned Dependencies
Check regularly:
```bash
flutter pub deps                            # full dependency tree
flutter pub outdated                         # outdated direct/transitive deps
dart pub global activate dependency_validator # find unused/missing declared deps
```
- Pin exact versions for releases; review transitive deps and any native code added by plugins
- Prefer well-maintained, popular packages; review advisories for the packages you depend on
- Dart has no first-party vulnerability database, so rely on `pub outdated`, platform advisories, and code review of native additions

### Requesting Overly Broad Permissions
**Problem**: Asking for permissions/capabilities that aren't needed
```dart
// Good: request only the permissions you need, when you need them, with clear rationale
// Audit AndroidManifest.xml and Info.plist for unused permissions/hardware
```

## Platform Channel Data Validation

### Trusting Native Input Unconditionally
**Problem**: Data from native side can be malformed; treat it like any external input
```dart
// Good: validate types/values returned from platform channels
final result = await platform.invokeMethod('getProfile');
if (result is! Map) throw FormatException('bad profile');
```

## Rate Limiting & Abuse Prevention (Client + Server)

### Client-Side Throttling & Server Enforcement
**Problem**: Expensive client actions (OTP resend, login) abused for enumeration or DoS
```dart
// Good: throttle on client AND enforce limits server-side; never rely on client alone
// Show countdowns; backoff on failures
```
