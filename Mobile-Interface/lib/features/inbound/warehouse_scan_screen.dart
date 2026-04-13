import 'package:flutter/material.dart';

class WarehouseScanScreen extends StatefulWidget {
  final String assignmentId;
  const WarehouseScanScreen({Key? key, required this.assignmentId}) : super(key: key);

  @override
  State<WarehouseScanScreen> createState() => _WarehouseScanState();
}

class _WarehouseScanState extends State<WarehouseScanScreen> {
  
  void _onScanSuccess() {
    // API Call to /assignments/:id/scan-warehouse/
    Navigator.pushReplacementNamed(context, '/inbound/summary', arguments: widget.assignmentId);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFCFBF9),
      appBar: AppBar(
        title: const Text('WAREHOUSE RETURN', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 2, color: Colors.white)),
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
                child: const Icon(Icons.warehouse, size: 64, color: Color(0xFF3E2723)),
              ),
              const SizedBox(height: 48),
              const Text(
                'SCAN RECEIVING BAY',
                style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: -0.5, fontSize: 22, color: Color(0xFF3E2723)),
              ),
              const SizedBox(height: 12),
              const Text(
                'Finalize your return by scanning the designated inbound bay QR checkpoint.',
                textAlign: TextAlign.center,
                style: TextStyle(color: Color(0xFFBCAAA4), fontWeight: FontWeight.bold, fontSize: 13, height: 1.5),
              ),
              const SizedBox(height: 60),
              GestureDetector(
                onTap: _onScanSuccess,
                child: Container(
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
                    child: Text('SIMULATE RECEIVING SCAN', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, letterSpacing: 1.5, fontSize: 13)),
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
