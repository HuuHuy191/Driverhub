import 'package:driver_mobile/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('DriverHub app starts', (tester) async {
    await tester.pumpWidget(const ProviderScope(child: DriverHubApp()));

    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
