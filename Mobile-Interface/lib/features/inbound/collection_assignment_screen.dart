import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class CollectionAssignmentScreen extends ConsumerStatefulWidget {
  final Map<String, dynamic> assignment;
  const CollectionAssignmentScreen({Key? key, required this.assignment}) : super(key: key);

  @override
  ConsumerState<CollectionAssignmentScreen> createState() => _CollectionAssignmentState();
}

class _CollectionAssignmentState extends ConsumerState<CollectionAssignmentScreen> {
  bool _isAccepting = false;

  void _acceptCollection() async {
    setState(() => _isAccepting = true);
    final id = (widget.assignment['assignment_id'] ?? widget.assignment['id'])?.toString() ?? 'dummy';
    
    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('access_token');
      final baseUrl = "https://UnderpaidWorker.pythonanywhere.com/api/";
      
      // Accept assignment
      final acceptResp = await http.post(
        Uri.parse("${baseUrl}inbound/assignments/$id/accept/"),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
      );
      
      if (acceptResp.statusCode == 200) {
        // Confirm Departure
        await http.post(
          Uri.parse("${baseUrl}inbound/assignments/$id/depart/"),
          headers: {
            'Content-Type': 'application/json',
            if (token != null) 'Authorization': 'Bearer $token',
          },
        );
        
        if (mounted) {
          Navigator.pushNamed(context, '/inbound/depart', arguments: id);
        }
      } else {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Acceptance error: ${acceptResp.statusCode}'))
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Connection failed: $e'))
        );
      }
    } finally {
      if (mounted) setState(() => _isAccepting = false);
    }
  }

  Widget _buildSpecialHandlingBadge(String handling, double? tempMin, double? tempMax) {
    if (handling == 'cooling' || handling == 'frozen') {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: handling == 'frozen' ? const Color(0xFF3E2723) : const Color(0xFF5D4037).withOpacity(0.05), 
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: handling == 'frozen' ? Colors.transparent : const Color(0xFF5D4037).withOpacity(0.1)),
        ),
        child: Row(
          children: [
            Icon(Icons.ac_unit, size: 16, color: handling == 'frozen' ? Colors.white : const Color(0xFF5D4037)),
            const SizedBox(width: 12),
            Expanded(
              child: Text(
                handling == 'frozen' ? 'FROZEN CARGO: AT ${tempMax ?? "-18"}°C' : 'COOLING REQUIRED: ${tempMin}°C - ${tempMax}°C',
                style: TextStyle(color: handling == 'frozen' ? Colors.white : const Color(0xFF5D4037), fontWeight: FontWeight.w900, fontSize: 10, letterSpacing: 1),
              ),
            ),
          ],
        ),
      );
    }
    return const SizedBox();
  }

  Widget _buildInfoBox(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white, 
        borderRadius: BorderRadius.circular(24), 
        border: Border.all(color: const Color(0xFFEFEBE9))
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: color),
          const SizedBox(height: 12),
          Text(label, style: const TextStyle(fontSize: 8, fontWeight: FontWeight.w900, color: Color(0xFFBCAAA4), letterSpacing: 1)),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: Color(0xFF3E2723))),
        ],
      ),
    );
  }

  Widget _payloadStat(String value, String label) {
    return Column(
      children: [
        Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF3E2723))),
        const SizedBox(height: 4),
        Text(label, style: const TextStyle(fontSize: 8, fontWeight: FontWeight.w900, color: Color(0xFFBCAAA4), letterSpacing: 1)),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {

    final manifest = widget.assignment['manifest'] ?? {};
    final supplier = manifest['supplier'] ?? {};
    final handling = manifest['special_handling'] ?? 'none';
    final tempMin = manifest['temperature_min_c'];
    final tempMax = manifest['temperature_max_c'];

    final vehicle = widget.assignment['vehicle_details'];
    final scheduledTime = widget.assignment['scheduled_pickup_time'];
    final dockNumber = widget.assignment['dock_number'];

    return Scaffold(
      backgroundColor: const Color(0xFFFCFBF9),
      body: SafeArea(
        child: Column(
          children: [
            // Header Row — no AppBar, driver-friendly
            Container(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 20),
              color: const Color(0xFF3E2723),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white, size: 20),
                    onPressed: () => Navigator.pop(context),
                  ),
                  const SizedBox(width: 8),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text("STEP 1 / 4", style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.white54, letterSpacing: 2)),
                      const SizedBox(height: 2),
                      const Text("INBOUND COLLECTION", style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: -0.5)),
                    ],
                  ),
                ],
              ),
            ),

            Expanded(
              child: SingleChildScrollView(
                physics: const BouncingScrollPhysics(),
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Primary Mission Card — Supplier Focus
                    Container(
                      padding: const EdgeInsets.all(28),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(36),
                        border: Border.all(color: const Color(0xFFEFEBE9)),
                        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 20, offset: const Offset(0, 10))],
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            "PICKUP FROM",
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: const Color(0xFFBCAAA4), letterSpacing: 2),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            supplier['name'] ?? 'Unknown Supplier',
                            style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w900, color: Color(0xFF3E2723), letterSpacing: -0.5),
                          ),
                          const SizedBox(height: 6),
                          Text(
                            supplier['address'] ?? '',
                            style: const TextStyle(color: Color(0xFFBCAAA4), fontSize: 12, fontWeight: FontWeight.bold),
                          ),
                          const Divider(height: 32, color: Color(0xFFEFEBE9)),
                          Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(color: const Color(0xFF3E2723).withOpacity(0.05), borderRadius: BorderRadius.circular(10)),
                                child: const Icon(Icons.person_outline_rounded, size: 18, color: Color(0xFF3E2723)),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: Text(
                                  supplier['contact_name'] ?? 'No contact on file',
                                  style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: Color(0xFF3E2723)),
                                ),
                              ),
                              if (supplier['contact_phone'] != null) ...[
                                const Icon(Icons.phone_rounded, size: 16, color: Color(0xFFBCAAA4)),
                                const SizedBox(width: 8),
                                Text(supplier['contact_phone'], style: const TextStyle(color: Color(0xFF5D4037), fontWeight: FontWeight.w900, fontSize: 13)),
                              ],
                            ],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Special Handling Alert — prominent if required
                    if (handling == 'cooling' || handling == 'frozen') ...[
                      _buildSpecialHandlingBadge(handling, tempMin, tempMax),
                      const SizedBox(height: 20),
                    ],

                    // Mission Metrics Row
                    Row(
                      children: [
                        Expanded(child: _buildInfoBox('UNIT', vehicle is Map ? vehicle['plate_number'] : 'TBD', Icons.local_shipping_rounded, const Color(0xFF3E2723))),
                        const SizedBox(width: 12),
                        Expanded(child: _buildInfoBox('DOCK', dockNumber != null && dockNumber.isNotEmpty ? '#$dockNumber' : '—', Icons.meeting_room_rounded, const Color(0xFF5D4037))),
                      ],
                    ),
                    const SizedBox(height: 12),
                    _buildInfoBox(
                      'PICKUP WINDOW',
                      scheduledTime != null ? DateTime.parse(scheduledTime).toLocal().toString().substring(0, 16) : 'ASAP',
                      Icons.schedule_rounded,
                      const Color(0xFFBCAAA4),
                    ),
                    const SizedBox(height: 28),

                    // Load Summary
                    const Text("LOAD SUMMARY", style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFFBCAAA4), letterSpacing: 2)),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(24),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(28),
                        border: Border.all(color: const Color(0xFFEFEBE9)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _payloadStat('${manifest['total_weight_kg'] ?? 0} KG', 'WEIGHT'),
                          Container(width: 1, height: 28, color: const Color(0xFFEFEBE9)),
                          _payloadStat('${manifest['total_volume_m3'] ?? 0} M³', 'VOLUME'),
                          Container(width: 1, height: 28, color: const Color(0xFFEFEBE9)),
                          _payloadStat('${(manifest['line_items'] ?? []).length}', 'ITEMS'),
                        ],
                      ),
                    ),
                    const SizedBox(height: 28),

                    // Manifest Items
                    const Text("MANIFEST ITEMS", style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFFBCAAA4), letterSpacing: 2)),
                    const SizedBox(height: 12),
                    ...(manifest['line_items'] ?? []).map<Widget>((item) => Container(
                      margin: const EdgeInsets.only(bottom: 10),
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFFEFEBE9)),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                              color: const Color(0xFF3E2723).withOpacity(0.05),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: const Icon(Icons.inventory_2_outlined, size: 18, color: Color(0xFF3E2723)),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Text(
                              item['description'] ?? '',
                              style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: Color(0xFF3E2723)),
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                            decoration: BoxDecoration(
                              color: const Color(0xFF3E2723).withOpacity(0.05),
                              borderRadius: BorderRadius.circular(10),
                            ),
                            child: Text(
                              '${item['expected_qty']} ${item['unit']}',
                              style: const TextStyle(fontWeight: FontWeight.w900, color: Color(0xFF5D4037), fontSize: 12),
                            ),
                          ),
                        ],
                      ),
                    )).toList(),
                    const SizedBox(height: 20),
                  ],
                ),
              ),
            ),

            // Sticky Primary Action
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: const Color(0xFFEFEBE9))),
              ),
              child: ElevatedButton(
                onPressed: _isAccepting ? null : _acceptCollection,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF3E2723),
                  disabledBackgroundColor: const Color(0xFFBCAAA4),
                  minimumSize: const Size(double.infinity, 80),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                  elevation: 8,
                  shadowColor: const Color(0xFF3E2723).withOpacity(0.3),
                ),
                child: _isAccepting
                  ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 3)
                  : const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.local_shipping_rounded, color: Colors.white, size: 28),
                        SizedBox(width: 16),
                        Text("ACCEPT & DEPART", style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Colors.white, letterSpacing: 1)),
                      ],
                    ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
