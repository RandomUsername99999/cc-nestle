import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class SupplierScanScreen extends StatefulWidget {
  final String assignmentId;
  const SupplierScanScreen({Key? key, required this.assignmentId}) : super(key: key);

  @override
  State<SupplierScanScreen> createState() => _SupplierScanState();
}

class _SupplierScanState extends State<SupplierScanScreen> {
  bool _isVerifying = false;

  void _onScanSuccess(String scannedValue) async {
    setState(() => _isVerifying = true);
    
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('access_token');
      final baseUrl = "https://UnderpaidWorker.pythonanywhere.com/api/";
      
      final response = await http.post(
        Uri.parse("${baseUrl}inbound/assignments/${widget.assignmentId}/scan-supplier/"),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'qr_token': scannedValue}),
      );
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (mounted) {
          Navigator.pushReplacementNamed(
            context, 
            '/inbound/verify', 
            arguments: {
              'assignmentId': widget.assignmentId,
              'lineItems': data['line_items'] ?? [],
              'supplier': data['supplier']
            }
          );
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Verification failed: ${response.statusCode}'))
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Scanner synchronization failed: $e'))
        );
      }
    } finally {
      if (mounted) setState(() => _isVerifying = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFCFBF9),
      appBar: AppBar(
        title: const Text('SUPPLIER ARRIVAL', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 2, color: Colors.white)),
        backgroundColor: const Color(0xFF3E2723),
        centerTitle: true,
        iconTheme: const IconThemeData(color: Colors.white),
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(bottom: Radius.circular(24)),
        ),
      ),
      body: Center(
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
              child: const Icon(Icons.qr_code_scanner_rounded, size: 64, color: Color(0xFF3E2723)),
            ),
            const SizedBox(height: 40),
            const Text(
              'SCAN SUPPLIER QR',
              style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: -0.5, fontSize: 24, color: Color(0xFF3E2723)),
            ),
            const SizedBox(height: 12),
            const Text('Verify your physical location at the pickup point.', textAlign: TextAlign.center, style: TextStyle(color: Color(0xFFBCAAA4), fontWeight: FontWeight.bold, fontSize: 13)),
            const SizedBox(height: 60),
            
            if (_isVerifying)
              const CircularProgressIndicator(color: Color(0xFF3E2723))
            else
              GestureDetector(
                onTap: () => _onScanSuccess("MF-${widget.assignmentId}"),
                child: Container(
                  width: 280,
                  height: 70,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF3E2723), Color(0xFF5D4037)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(color: const Color(0xFF3E2723).withOpacity(0.3), blurRadius: 15, offset: const Offset(0, 8)),
                    ],
                  ),
                  child: const Center(
                    child: Text('CONFIRM ARRIVAL', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, letterSpacing: 1.5, fontSize: 14)),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
