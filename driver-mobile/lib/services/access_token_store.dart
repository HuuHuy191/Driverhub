import 'package:flutter_riverpod/flutter_riverpod.dart';

final accessTokenStoreProvider = Provider<AccessTokenStore>(
  (ref) => AccessTokenStore(),
);

/// Holds the short-lived access token only for the current app process.
/// See ARCHITECTURE.md section 8 and BR-13.
class AccessTokenStore {
  String? _token;

  String? get token => _token;

  void save(String token) => _token = token;

  void clear() => _token = null;
}
