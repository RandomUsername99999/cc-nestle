import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:geolocator/geolocator.dart';
import 'QRScannerView.dart';
import 'package:shared_preferences/shared_preferences.dart';

class ShipmentAssignmentView extends StatefulWidget {
  final int userId;
  final String baseUrl;

  const ShipmentAssignmentView({
    super.key,
    required this.userId,
    required this.baseUrl,
  });

  @override
  State<ShipmentAssignmentView> createState() => _ShipmentAssignmentViewState();
}

class _ShipmentAssignmentViewState extends State<ShipmentAssignmentView> {
  Map<String, dynamic>? _data;
  bool _isLoading = true;
  String? _error;
  Timer? _acceptanceTimer;
  int _secondsRemaining = 900; // 15 minutes timeout
  StreamSubscription<Position>? _locationSubscription;
  final FirebaseDatabase _database = FirebaseDatabase.instance;
  String? _accessToken;

  Map<String, String> get _authHeaders => {
    'Content-Type': 'application/json',
    if (_accessToken != null) 'Authorization': 'Bearer $_accessToken',
  };

  @override
  void initState() {
    super.initState();
    _loadTokenAndFetch();
  }

  Future<void> _loadTokenAndFetch() async {
    final prefs = await SharedPreferences.getInstance();
    _accessToken = prefs.getString('access_token');
    _fetchAssignment();
  }

  @override
  void dispose() {
    _acceptanceTimer?.cancel();
    _locationSubscription?.cancel();
    super.dispose();
  }

  void _startAcceptanceTimer() {
    _acceptanceTimer?.cancel();
    _secondsRemaining = 900;
    _acceptanceTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsRemaining > 0) {
        setState(() => _secondsRemaining--);
      } else {
        timer.cancel();
        _handleTimeout();
      }
    });
  }

  void _handleTimeout() {
    setState(() => _error = "Assignment Timeout: Escalating to dispatcher.");
    // In a real app, notify backend here
  }

  Future<void> _fetchAssignment() async {
    setState(() => _isLoading = true);
    try {
      final response = await http.get(
        Uri.parse("${widget.baseUrl}shipments/assignment_view/?user_id=${widget.userId}"),
        headers: _authHeaders,
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        setState(() {
          _data = data;
          _error = null;
        });
        if (data['status'] == 'dispatched') {
          _startAcceptanceTimer();
        } else if (data['status'] == 'in_transit') {
          _startLocationTracking(data['shipment_id']);
        }
      } else if (response.statusCode == 404) {
        setState(() {
          _data = null;
          _error = "No active assignments located for your ID.";
        });
      } else {
        setState(() => _error = "Network Error: Bridge status ${response.statusCode}");
      }
    } catch (e) {
      setState(() => _error = "Connection Sync Failure: Backend unreachable.");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _startLocationTracking(String shipmentId) async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) return;

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) return;
    }

    _locationSubscription?.cancel();
    _locationSubscription = Geolocator.getPositionStream(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: 30, // 30 meters
      ),
    ).listen((Position position) {
      _database.ref("tracking/$shipmentId/current").set({
        "lat": position.latitude,
        "lng": position.longitude,
        "accuracy": position.accuracy,
        "timestamp": DateTime.now().toIso8601String(),
        "driver_id": widget.userId,
        "active": true,
      });
    });
  }

  Future<void> _stopTracking(String shipmentId) async {
    await _locationSubscription?.cancel();
    _locationSubscription = null;
    await _database.ref("tracking/$shipmentId/current").update({"active": false});
  }

  Future<void> _acceptAssignment() async {
    if (_data == null) return;
    final id = _data!['shipment_id'];
    setState(() => _isLoading = true);
    try {
      final resp = await http.post(
        Uri.parse("${widget.baseUrl}shipments/$id/accept_assignment/"),
        headers: _authHeaders,
        body: jsonEncode({"user_id": widget.userId}),
      );
      if (resp.statusCode == 200) {
        _acceptanceTimer?.cancel();
        _fetchAssignment();
      }
    } catch (e) {
      _showError("Acceptance Failure: $e");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _confirmPickup(String qrCode) async {
    if (_data == null) return;
    final id = _data!['shipment_id'];
    setState(() => _isLoading = true);
    try {
      final resp = await http.post(
        Uri.parse("${widget.baseUrl}shipments/$id/scan_pickup/"),
        headers: _authHeaders,
        body: jsonEncode({
          "qr_token": qrCode,
          "user_id": widget.userId
        }),
      );
      if (resp.statusCode == 200) {
        _fetchAssignment();
      } else {
        _showError(jsonDecode(resp.body)['error'] ?? "Invalid QR");
      }
    } catch (e) {
      _showError("Pickup Failure: $e");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _completeDelivery(String orderId, String qrCode) async {
    if (_data == null) return;
    final id = _data!['shipment_id'];
    Position pos = await Geolocator.getCurrentPosition();
    
    setState(() => _isLoading = true);
    try {
      final resp = await http.post(
        Uri.parse("${widget.baseUrl}shipments/$id/scan_delivery/"),
        headers: _authHeaders,
        body: jsonEncode({
          "order_id": orderId,
          "qr_token": qrCode,
          "lat": pos.latitude,
          "lng": pos.longitude,
          "user_id": widget.userId
        }),
      );
      if (resp.statusCode == 200) {
        final result = jsonDecode(resp.body);
        if (result['is_completed']) {
          _stopTracking(id);
        }
        _fetchAssignment();
      } else {
        _showError(jsonDecode(resp.body)['error'] ?? "Verification Error");
      }
    } catch (e) {
      _showError("Delivery Finalization Failure: $e");
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _showError(String msg) {
    ScaffoldMessenger.of(context).showSnackBar(SnackBar(
      content: Text(msg),
      backgroundColor: Colors.redAccent,
    ));
  }

  _launchNavigation(String address) async {
    final url = "google.navigation:q=${Uri.encodeComponent(address)}&mode=d";
    if (await canLaunchUrl(Uri.parse(url))) {
      await launchUrl(Uri.parse(url));
    } else {
      final webUrl = "https://www.google.com/maps/dir/?api=1&destination=${Uri.encodeComponent(address)}";
      await launchUrl(Uri.parse(webUrl));
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        backgroundColor: Color(0xFF111111),
        body: Center(child: CircularProgressIndicator(color: Colors.amber)),
      );
    }

    if (_error != null || _data == null) {
      return _buildErrorState();
    }

    final status = _data!['status'];
    
    return Scaffold(
      backgroundColor: const Color(0xFF111111),
      appBar: AppBar(
        title: Text("ASSIGNMENT MF-${_data!['shipment_id']}", style: const TextStyle(fontWeight: FontWeight.w900, letterSpacing: 2, fontSize: 14)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          IconButton(icon: const Icon(Icons.refresh), onPressed: _fetchAssignment)
        ],
      ),
      body: _buildBody(status),
    );
  }

  Widget _buildBody(String status) {
    switch (status) {
      case 'dispatched': return _buildAcceptanceScreen();
      case 'accepted': return _buildPickupScreen();
      case 'in_transit': return _buildActiveRouteScreen();
      case 'completed': return _buildCompletionScreen();
      default: return _buildActiveRouteScreen();
    }
  }

  Widget _buildAcceptanceScreen() {
    final minutes = _secondsRemaining ~/ 60;
    final seconds = (_secondsRemaining % 60).toString().padLeft(2, '0');
    
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.assignment_ind, size: 80, color: Colors.amber),
          const SizedBox(height: 24),
          const Text("SHIPMENT PENDING ACCEPTANCE", style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text("${_data!['warehouse']['name']} ➔ ${_data!['route_summary']['total_stops']} STOPS", style: const TextStyle(color: Colors.white38)),
          const SizedBox(height: 48),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
            decoration: BoxDecoration(color: Colors.amber.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
            child: Text("AUTO-ESCALATION IN: $minutes:$seconds", style: const TextStyle(color: Colors.amber, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(height: 48),
          ElevatedButton(
            onPressed: _acceptAssignment,
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.amber, minimumSize: const Size(double.infinity, 60),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            child: const Text("ACCEPT AND START", style: TextStyle(color: Colors.black, fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildPickupScreen() {
    final wh = _data!['warehouse'];
    return Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("STEP 1: ARRIVE AT WAREHOUSE", style: TextStyle(color: Colors.amber, fontWeight: FontWeight.bold)),
          const SizedBox(height: 16),
          _buildInfoCard(wh['name'], wh['address'], Icons.warehouse),
          const SizedBox(height: 24),
          Row(
            children: [
              Expanded(child: ElevatedButton.icon(
                onPressed: () => _launchNavigation(wh['address']),
                icon: const Icon(Icons.navigation),
                label: const Text("NAVIGATE"),
                style: ElevatedButton.styleFrom(backgroundColor: Colors.white10, foregroundColor: Colors.white),
              )),
              const SizedBox(width: 16),
              Expanded(child: ElevatedButton.icon(
                onPressed: () {
                  Navigator.push(context, MaterialPageRoute(builder: (c) => QRScannerView(
                    title: "Scan Warehouse QR",
                    onScan: (code) => _confirmPickup(code),
                  )));
                },
                icon: const Icon(Icons.qr_code_scanner),
                label: const Text("SCAN PICKUP"),
                style: ElevatedButton.styleFrom(backgroundColor: Colors.amber, foregroundColor: Colors.black),
              )),
            ],
          )
        ],
      ),
    );
  }

  Widget _buildActiveRouteScreen() {
    final stops = _data!['stops'] as List;
    final summary = _data!['route_summary'];

    return ListView(
      padding: const EdgeInsets.all(24),
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _statTile("${summary['total_stops']}", "STOPS"),
            _statTile("${summary['total_distance_km']}", "KM"),
            _statTile("${summary['estimated_duration_minutes']}", "MIN"),
          ],
        ),
        const SizedBox(height: 32),
        const Text("DELIVERY SEQUENCE", style: TextStyle(color: Colors.white30, fontWeight: FontWeight.bold, fontSize: 12)),
        const SizedBox(height: 16),
        ...stops.map((stop) => _buildStopCard(stop)).toList(),
      ],
    );
  }

  Widget _buildStopCard(Map<String, dynamic> stop) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(color: const Color(0xFF1A1A1A), borderRadius: BorderRadius.circular(20), border: Border.all(color: Colors.white.withOpacity(0.05))),
      child: ExpansionTile(
        iconColor: Colors.amber,
        collapsedIconColor: Colors.white24,
        title: Text(stop['address'], style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
        subtitle: Text("ETA: ${stop['estimated_arrival'].split('T')[1].substring(0, 5)}", style: const TextStyle(color: Colors.white38, fontSize: 12)),
        leading: CircleAvatar(backgroundColor: Colors.amber.withOpacity(0.1), child: Text("${stop['sequence']}", style: const TextStyle(color: Colors.amber, fontSize: 12, fontWeight: FontWeight.bold))),
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
            child: Column(
              children: [
                const Divider(color: Colors.white10),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text("Parcels: ${stop['parcels']}", style: const TextStyle(color: Colors.white54, fontSize: 12)),
                    Text("Weight: ${stop['weight_kg']} KG", style: const TextStyle(color: Colors.white54, fontSize: 12)),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(child: TextButton.icon(
                      onPressed: () => _launchNavigation(stop['address']),
                      icon: const Icon(Icons.directions, size: 18),
                      label: const Text("NAVIGATE"),
                      style: TextButton.styleFrom(foregroundColor: Colors.blueAccent),
                    )),
                    Expanded(child: ElevatedButton.icon(
                      onPressed: () {
                        Navigator.push(context, MaterialPageRoute(builder: (c) => QRScannerView(
                          title: "Confirm Delivery",
                          onScan: (code) => _completeDelivery(stop['order_id'], code),
                        )));
                      },
                      icon: const Icon(Icons.check_circle_outline, size: 18),
                      label: const Text("DELIVER"),
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.amber, foregroundColor: Colors.black),
                    )),
                  ],
                )
              ],
            ),
          )
        ],
      ),
    );
  }

  Widget _buildCompletionScreen() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(40),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.task_alt, size: 100, color: Colors.greenAccent),
            const SizedBox(height: 24),
            const Text("ROUTE COMPLETED", style: TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            const Text("Tracking successfully stopped. Manifest finalized.", textAlign: TextAlign.center, style: TextStyle(color: Colors.white38)),
            const SizedBox(height: 48),
            ElevatedButton(
              onPressed: () => Navigator.pop(context),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.white10, minimumSize: const Size(double.infinity, 60)),
              child: const Text("CLOSE SUMMARY", style: TextStyle(color: Colors.white)),
            )
          ],
        ),
      ),
    );
  }

  Widget _buildErrorState() {
    return Scaffold(
      backgroundColor: const Color(0xFF111111),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(40),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.cloud_off, size: 60, color: Colors.white10),
              const SizedBox(height: 24),
              Text(_error ?? "Awaiting Assignments...", textAlign: TextAlign.center, style: const TextStyle(color: Colors.white38)),
              const SizedBox(height: 40),
              ElevatedButton(onPressed: _fetchAssignment, child: const Text("RETRY SYNC")),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildInfoCard(String title, String subtitle, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(color: const Color(0xFF1A1A1A), borderRadius: BorderRadius.circular(16)),
      child: Row(
        children: [
          Icon(icon, color: Colors.amber, size: 30),
          const SizedBox(width: 20),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            Text(subtitle, style: const TextStyle(color: Colors.white38, fontSize: 12)),
          ]))
        ],
      ),
    );
  }

  Widget _statTile(String value, String label) {
    return Column(
      children: [
        Text(value, style: const TextStyle(color: Colors.white, fontSize: 24, fontWeight: FontWeight.w900, fontStyle: FontStyle.italic)),
        Text(label, style: const TextStyle(color: Colors.white24, fontSize: 10, fontWeight: FontWeight.bold, letterSpacing: 1)),
      ],
    );
  }
}
