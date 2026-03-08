import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'firebase_options.dart';
import 'app_theme.dart';
import 'models/party_model.dart';
import 'services/auth_service.dart';
import 'screens/login_screen.dart';
import 'screens/main_shell.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp(
    options: DefaultFirebaseOptions.currentPlatform,
  );
  final savedParty = await AuthService.getSession();
  runApp(MyApp(initialParty: savedParty));
}

class MyApp extends StatelessWidget {
  final Party? initialParty;
  const MyApp({super.key, this.initialParty});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Jay Jalaram Jari',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.theme,
      home: initialParty != null
          ? MainShell(party: initialParty!)
          : const LoginScreen(),
    );
  }
}
