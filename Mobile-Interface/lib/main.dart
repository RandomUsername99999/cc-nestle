import 'package:cc_group/LoginPage.dart';
import 'package:cc_group/HomePage.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final prefs = await SharedPreferences.getInstance();
  final int? userId = prefs.getInt('userId');
  
  runApp(MyApp(userId: userId));
}

class MyApp extends StatelessWidget {
  final int? userId;
  const MyApp({super.key, this.userId});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Fleet Logistics OS',
      theme: ThemeData(
        fontFamily: 'Inter',
        useMaterial3: true,
      ),
      debugShowCheckedModeBanner: false,
      home: userId != null 
          ? HomePage(userId: userId!) 
          : const LoginPage(),
    );
  }
}
