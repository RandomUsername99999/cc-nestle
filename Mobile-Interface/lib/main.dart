import 'package:cc_group/login_page.dart';
import 'package:cc_group/home_page.dart';
import 'package:cc_group/features/inbound/collection_assignment_screen.dart';
import 'package:cc_group/features/inbound/supplier_scan_screen.dart';
import 'package:cc_group/features/inbound/goods_verification_screen.dart';
import 'package:cc_group/features/inbound/warehouse_scan_screen.dart';
import 'package:cc_group/features/inbound/completion_summary.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:firebase_core/firebase_core.dart';



void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  try {
    await Firebase.initializeApp();
  } catch (e) {
    debugPrint("Firebase initialization failed: $e");
  }

  final prefs = await SharedPreferences.getInstance();

  final int? userId = prefs.getInt('userId');
  
  runApp(
    const ProviderScope(
      child: MyApp(),
    ),
  );
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer(
      builder: (context, ref, child) {
        return MaterialApp(
          title: 'Fleet Logistics OS',
          theme: ThemeData(
            fontFamily: 'Inter',
            useMaterial3: true,
          ),
          debugShowCheckedModeBanner: false,
          home: FutureBuilder<int?>(
            future: SharedPreferences.getInstance().then((p) => p.getInt('userId')),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Scaffold(body: Center(child: CircularProgressIndicator()));
              }
              return (snapshot.data != null) 
                  ? HomePage(userId: snapshot.data!) 
                  : const LoginPage();
            },
          ),
          onGenerateRoute: (settings) {
            if (settings.name == '/inbound/assignment') {
                final assignment = (settings.arguments as Map<String, dynamic>?) ?? {};
                return MaterialPageRoute(builder: (_) => CollectionAssignmentScreen(assignment: assignment));
            }
            if (settings.name == '/inbound/depart') {
                final assignmentId = settings.arguments as String? ?? 'dummy';
                return MaterialPageRoute(builder: (_) => SupplierScanScreen(assignmentId: assignmentId));
            }
            if (settings.name == '/inbound/verify') {
                final data = settings.arguments as Map<String, dynamic>? ?? {};
                return MaterialPageRoute(builder: (_) => GoodsVerificationScreen(data: data));
            }
            if (settings.name == '/inbound/warehouse-scan') {
                final assignmentId = settings.arguments as String? ?? 'dummy';
                return MaterialPageRoute(builder: (_) => WarehouseScanScreen(assignmentId: assignmentId));
            }
            if (settings.name == '/inbound/summary') {
                final assignmentId = settings.arguments as String? ?? 'dummy';
                return MaterialPageRoute(builder: (_) => CompletionSummaryScreen(assignmentId: assignmentId));
            }
            if (settings.name == '/driver/dashboard') {
                return MaterialPageRoute(
                  builder: (_) => FutureBuilder<int?>(
                    future: SharedPreferences.getInstance().then((p) => p.getInt('userId')),
                    builder: (context, snapshot) {
                      if (snapshot.connectionState == ConnectionState.waiting) {
                        return const Scaffold(body: Center(child: CircularProgressIndicator()));
                      }
                      if (snapshot.data != null) {
                        return HomePage(userId: snapshot.data!);
                      }
                      return const LoginPage();
                    },
                  ),
                );
            }
            return null;
          },
        );
      },
    );
  }
}


