import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class CompletionSummaryScreen extends StatefulWidget {
  final String assignmentId;
  const CompletionSummaryScreen({Key? key, required this.assignmentId}) : super(key: key);

  @override
  State<CompletionSummaryScreen> createState() => _CompletionSummaryState();
}

class _CompletionSummaryState extends State<CompletionSummaryScreen> {
  bool _isFinishing = false;

  void _finish(BuildContext context) async {
    setState(() => _isFinishing = true);
    
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('access_token');
      final baseUrl = "https://UnderpaidWorker.pythonanywhere.com/api/";

      // Mark assignment as completed
      final response = await http.post(
        Uri.parse("${baseUrl}inbound/assignments/${widget.assignmentId}/complete/"),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      );

      if (response.statusCode == 200 || response.statusCode == 201) {
          if (mounted) {
            Navigator.of(context).pushNamedAndRemoveUntil('/driver/dashboard', (route) => false);
          }
      } else {
         if (mounted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(content: Text('Finalization failed: ${response.statusCode}'))
            );
          }
      }
    } catch (e) {
       if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Sync error: $e'))
          );
        }
    } finally {
      if (mounted) setState(() => _isFinishing = false);
    }
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
        automaticallyImplyLeading: false, // Prevent going back once finished
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
                onTap: _isFinishing ? null : () => _finish(context),
                child: Container(
                  height: 70,
                  decoration: BoxDecoration(
                    color: _isFinishing ? Colors.grey.shade200 : const Color(0xFFEEEDED),
                    borderRadius: BorderRadius.circular(24),
                  ),
                  child: Center(
                    child: _isFinishing 
                      ? const CircularProgressIndicator(color: Color(0xFF3E2723))
                      : const Text('RETURN TO DASHBOARD', style: TextStyle(color: Color(0xFF3E2723), fontWeight: FontWeight.w900, letterSpacing: 1.5, fontSize: 13)),
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
