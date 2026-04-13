import 'package:flutter/material.dart';

class CompletionSummaryScreen extends StatelessWidget {
  final String assignmentId;
  const CompletionSummaryScreen({Key? key, required this.assignmentId}) : super(key: key);

  void _finish(BuildContext context) {
    // Return to dashboard
    Navigator.of(context).pushNamedAndRemoveUntil('/driver/dashboard', (route) => false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFCFBF9),
      appBar: AppBar(
        title: const Text('SUMMARY', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 2, color: Colors.white)),
        backgroundColor: const Color(0xFF3E2723),
        centerTitle: true,
        iconTheme: const IconThemeData(color: Colors.white),
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(bottom: Radius.circular(24)),
        ),
      ),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(40),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(40),
                  border: Border.all(color: const Color(0xFFEFEBE9)),
                  boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 20, offset: const Offset(0, 10))]
                ),
                child: const Icon(Icons.check_circle, size: 80, color: Color(0xFF4CAF50)),
              ),
              const SizedBox(height: 48),
              const Text(
                'COLLECTION COMPLETE',
                style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: -0.5, fontSize: 24, color: Color(0xFF3E2723)),
              ),
              const SizedBox(height: 12),
              const Text(
                'All manifest items have been verified and synchronized with central dispatch. Safe travels back to terminal.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Color(0xFFBCAAA4), fontWeight: FontWeight.bold, fontSize: 13, height: 1.5),
              ),
              const SizedBox(height: 60),
              GestureDetector(
                onTap: () => _finish(context),
                child: Container(
                  height: 70,
                  decoration: BoxDecoration(
                    color: const Color(0xFFEEEDED),
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: const Center(
                    child: Text('RETURN TO DASHBOARD', style: TextStyle(color: Color(0xFF3E2723), fontWeight: FontWeight.w900, letterSpacing: 1.5, fontSize: 13)),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
