import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import 'dart:async';

class DeliverySearchScreen extends StatefulWidget {
  final int userId;
  final String baseUrl;

  const DeliverySearchScreen({
    super.key, 
    required this.userId, 
    required this.baseUrl
  });

  @override
  State<DeliverySearchScreen> createState() => _DeliverySearchScreenState();
}

class _DeliverySearchScreenState extends State<DeliverySearchScreen> {
  final TextEditingController _searchController = TextEditingController();
  List<dynamic> _searchResults = [];
  bool _isLoading = false;
  Timer? _debounce;

  @override
  void dispose() {
    _searchController.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  Future<void> _performSearch(String query) async {
    if (query.isEmpty) {
      setState(() => _searchResults = []);
      return;
    }

    setState(() => _isLoading = true);
    try {
      final response = await http.get(
        Uri.parse("${widget.baseUrl}search/deliveries/?q=$query&driver_id=${widget.userId}"),
        headers: {'Content-Type': 'application/json'},
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() => _searchResults = data['results']);
      }
    } catch (e) {
      debugPrint("Search error: $e");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _onSearchChanged(String query) {
    if (_debounce?.isActive ?? false) _debounce!.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), () {
      _performSearch(query);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFCFBF9),
      appBar: AppBar(
        title: const Text('SEARCH DELIVERIES', 
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14, letterSpacing: 2)),
        backgroundColor: const Color(0xFF3E2723),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: Column(
        children: [
          Container(
            padding: const EdgeInsets.all(20),
            color: const Color(0xFF3E2723),
            child: TextField(
              controller: _searchController,
              onChanged: _onSearchChanged,
              style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              decoration: InputDecoration(
                hintText: "Search ID, Address, or Status...",
                hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.5)),
                prefixIcon: const Icon(Icons.search, color: Colors.white70),
                fillColor: Colors.white.withValues(alpha: 0.1),
                filled: true,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(20),
                  borderSide: BorderSide.none,
                ),
                contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 15),
              ),
            ),
          ),
          if (_isLoading)
            const LinearProgressIndicator(backgroundColor: Colors.transparent, color: Color(0xFFD32F2F)),
          Expanded(
            child: _searchResults.isEmpty 
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.search_off, size: 64, color: Colors.brown.withValues(alpha: 0.1)),
                      const SizedBox(height: 16),
                      Text("NO RESULTS FOUND", 
                        style: TextStyle(fontWeight: FontWeight.w900, color: Colors.brown.withValues(alpha: 0.2), letterSpacing: 1)),
                    ],
                  ),
                )
              : ListView.separated(
                  padding: const EdgeInsets.all(20),
                  itemCount: _searchResults.length,
                  separatorBuilder: (context, index) => const SizedBox(height: 16),
                  itemBuilder: (context, index) {
                    final item = _searchResults[index];
                    return _buildResultCard(item);
                  },
                ),
          ),
        ],
      ),
    );
  }

  Widget _buildResultCard(dynamic item) {
    final bool isCold = item['requires_refrigeration'] ?? false;
    
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: const Color(0xFFEFEBE9)),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 10, offset: const Offset(0, 4)),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(24),
        child: Column(
          children: [
            if (isCold)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 4),
                color: Colors.blue.shade500,
                child: const Text("COLD CHAIN PROTECTION ACTIVE", 
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white, fontSize: 8, fontWeight: FontWeight.w900, letterSpacing: 1)),
              ),
            Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text("#ORD-${item['order_id']}", 
                        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Color(0xFF3E2723))),
                      _buildStatusBadge(item['status']),
                    ],
                  ),
                  const SizedBox(height: 16),
                  _buildAddressRow(Icons.location_on, item['delivery_address'], "DESTINATION"),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      _buildInfoTag(Icons.scale, "${item['weight_kg']} KG"),
                      const SizedBox(width: 12),
                      _buildInfoTag(Icons.view_in_ar, "${item['volume_m3'] ?? '0.0'} M³"),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String status) {
    Color color = Colors.grey;
    if (status == 'delivered') color = Colors.green;
    if (status == 'in_transit') color = Colors.blue;
    if (status == 'pending') color = Colors.orange;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: color.withValues(alpha: 0.2)),
      ),
      child: Text(status.toUpperCase(), 
        style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.w900)),
    );
  }

  Widget _buildAddressRow(IconData icon, String address, String label) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: const Color(0xFFBCAAA4)),
        const SizedBox(width: 8),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontSize: 8, fontWeight: FontWeight.w900, color: Color(0xFFBCAAA4), letterSpacing: 1)),
              Text(address, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF5D4037))),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildInfoTag(IconData icon, String value) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: const Color(0xFFF5F5F5),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(icon, size: 12, color: Colors.brown),
          const SizedBox(width: 6),
          Text(value, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.brown)),
        ],
      ),
    );
  }
}
