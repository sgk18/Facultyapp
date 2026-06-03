import 'package:flutter_test/flutter_test.dart';
import 'package:faculty_app/main.dart';

void main() {
  testWidgets('FacultyApp smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const FacultyApp());

    // Verify splash screen renders
    expect(find.text('CHRIST'), findsOneWidget);
  });
}
