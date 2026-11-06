class AppConfig {
  const AppConfig._();

  // Android emulator: 10.0.2.2 points to the development computer.
  // Physical device: pass the computer's LAN IP with --dart-define=BASE_URL=...
  static const String baseUrl = String.fromEnvironment(
    'BASE_URL',
    defaultValue: 'http://10.0.2.2:3000',
  );

  static String get apiUrl => '$baseUrl/api/v1';
  static String get socketUrl => baseUrl;
}
