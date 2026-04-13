import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';

class GoodsVerificationScreen extends StatefulWidget {
  final Map<String, dynamic> data;
  const GoodsVerificationScreen({Key? key, required this.data}) : super(key: key);

  @override
  State<GoodsVerificationScreen> createState() => _GoodsVerificationState();
}

class _GoodsVerificationState extends State<GoodsVerificationScreen> {
  final Map<String, Map<String, dynamic>> _verificationData = {};
  double _collectedWeightKg = 0;
  bool _isSubmitting = false;

  List<dynamic> get lineItems => widget.data['line_items'] ?? widget.data['lineItems'] ?? [];
  String get assignmentId => widget.data['assignmentId']?.toString() ?? 'dummy';

  bool _allLinesVerified() {
    return _verificationData.length >= lineItems.length && lineItems.isNotEmpty;
  }

  void _submitVerification() async {
    setState(() => _isSubmitting = true);
    
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('access_token');
      final baseUrl = "https://UnderpaidWorker.pythonanywhere.com/api/";

      final List<Map<String, dynamic>> lines = [];
      _verificationData.forEach((id, data) {
        lines.add({
          'manifest_line_id': id,
          'collected_qty': double.tryParse(data['collected_qty'].toString()) ?? 0.0,
          'condition': data['condition'],
          'condition_notes': data['condition_notes'] ?? ''
        });
      });

      final response = await http.post(
        Uri.parse("${baseUrl}inbound/assignments/$assignmentId/verify-goods/"),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode({'lines': lines}),
      );

      if (response.statusCode == 200) {
        if (mounted) {
          Navigator.pushReplacementNamed(context, '/inbound/warehouse-scan', arguments: assignmentId);
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Submission failed: ${response.statusCode}'))
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
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  void _onLineDataChanged(String id, Map<String, dynamic> data) {
    setState(() {
      _verificationData[id] = data;
      _collectedWeightKg = _verificationData.values.fold(0.0, (sum, item) {
        return sum + (double.tryParse(item['collected_qty'].toString()) ?? 0.0);
      });
    });
  }

  @override
  Widget build(BuildContext context) {
    double expectedTotal = lineItems.fold(0.0, (sum, li) => sum + (double.tryParse(li['expected_qty'].toString()) ?? 0.0));

    return Scaffold(
      backgroundColor: const Color(0xFFFCFBF9),
      appBar: AppBar(
        title: const Text('VERIFY GOODS', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 2, color: Colors.white)),
        backgroundColor: const Color(0xFF3E2723),
        centerTitle: true,
        iconTheme: const IconThemeData(color: Colors.white),
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(bottom: Radius.circular(24)),
        ),
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(24),
            decoration: BoxDecoration(
              color: Colors.white,
              border: const Border(bottom: BorderSide(color: Color(0xFFEFEBE9))),
              boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4))]
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('COLLECTED TOTAL', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFFBCAAA4), letterSpacing: 1)),
                    const SizedBox(height: 4),
                    Text('${_collectedWeightKg.toStringAsFixed(1)} units', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 20, color: Color(0xFF3E2723))),
                  ],
                ),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    const Text('EXPECTED', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFFBCAAA4), letterSpacing: 1)),
                    const SizedBox(height: 4),
                    Text('${expectedTotal.toStringAsFixed(1)} units', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Color(0xFF3E2723))),
                  ],
                ),
              ],
            ),
          ),
          Expanded(
            child: lineItems.isEmpty 
              ? const Center(child: Text("No items found on manifest.", style: TextStyle(color: Color(0xFFBCAAA4), fontWeight: FontWeight.bold)))
              : ListView.builder(
                padding: const EdgeInsets.all(20),
                itemCount: lineItems.length,
                itemBuilder: (ctx, i) {
                  final item = lineItems[i];
                  final itemId = item['id'].toString();
                  return Container(
                    margin: const EdgeInsets.only(bottom: 20),
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(32),
                      border: Border.all(color: const Color(0xFFEFEBE9)),
                      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 15, offset: const Offset(0, 8))]
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(item['description'], style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Color(0xFF3E2723))),
                            Text(item['item_code'] ?? '', style: const TextStyle(color: Color(0xFFBCAAA4), fontSize: 11, fontWeight: FontWeight.bold)),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text('EXPECTED: ${item['expected_qty']} ${item['unit']}', style: const TextStyle(color: Color(0xFFBCAAA4), fontSize: 11, fontWeight: FontWeight.w900, letterSpacing: 1)),
                        const SizedBox(height: 24),
                        Row(
                          children: [
                            Expanded(
                              flex: 2,
                              child: TextFormField(
                                cursorColor: const Color(0xFF3E2723),
                                decoration: InputDecoration(
                                  labelText: 'QTY', 
                                  labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFFBCAAA4)),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: Color(0xFF3E2723), width: 2)),
                                  prefixIcon: const Icon(Icons.inventory_2_outlined, color: Color(0xFF3E2723), size: 18),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                                ),
                                style: const TextStyle(fontWeight: FontWeight.w900, color: Color(0xFF3E2723)),
                                keyboardType: TextInputType.number,
                                onChanged: (val) {
                                  _onLineDataChanged(itemId, {
                                    'collected_qty': val,
                                    'condition': _verificationData[itemId]?['condition'] ?? 'good'
                                  });
                                },
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              flex: 3,
                              child: DropdownButtonFormField<String>(
                                value: _verificationData[itemId]?['condition'] ?? 'good',
                                iconEnabledColor: const Color(0xFF3E2723),
                                items: const [
                                  DropdownMenuItem(value: 'good', child: Text('GOOD')),
                                  DropdownMenuItem(value: 'damaged', child: Text('DAMAGED')),
                                  DropdownMenuItem(value: 'rejected', child: Text('REJECTED')),
                                ],
                                onChanged: (val) {
                                  _onLineDataChanged(itemId, {
                                    'collected_qty': _verificationData[itemId]?['collected_qty'] ?? '0',
                                    'condition': val
                                  });
                                },
                                style: const TextStyle(fontWeight: FontWeight.w900, color: Color(0xFF3E2723), fontSize: 13),
                                decoration: InputDecoration(
                                  labelText: 'CONDITION', 
                                  labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFFBCAAA4)),
                                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                                  focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: const BorderSide(color: Color(0xFF3E2723), width: 2)),
                                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                                ),
                              ),
                            ),
                          ],
                        )
                      ],
                    ),
                  );
                },
              ),
          ),
        ],
      ),
      bottomNavigationBar: Container(
        padding: const EdgeInsets.all(24),
        decoration: const BoxDecoration(
          color: Colors.white,
          border: Border(top: BorderSide(color: Color(0xFFEFEBE9)))
        ),
        child: GestureDetector(
          onTap: (_allLinesVerified() && !_isSubmitting) ? _submitVerification : null,
          child: Container(
            height: 70,
            decoration: BoxDecoration(
              gradient: (_allLinesVerified() && !_isSubmitting) 
                ? const LinearGradient(colors: [Color(0xFF3E2723), Color(0xFF5D4037)]) 
                : LinearGradient(colors: [Colors.grey.shade300, Colors.grey.shade300]),
              borderRadius: BorderRadius.circular(24),
              boxShadow: (_allLinesVerified() && !_isSubmitting) 
                ? [BoxShadow(color: const Color(0xFF3E2723).withOpacity(0.3), blurRadius: 15, offset: const Offset(0, 8))]
                : [],
            ),
            child: Center(
              child: _isSubmitting 
                ? const CircularProgressIndicator(color: Colors.white) 
                : const Text('SUBMIT VERIFICATION', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, letterSpacing: 1.5)),
            ),
          ),
        ),
      ),
    );
  }
}
