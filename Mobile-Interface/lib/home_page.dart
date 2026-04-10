import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'dart:async';
import 'dart:convert';
import 'package:cc_group/shipment_assignment_view.dart';
import 'package:cc_group/login_page.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:cc_group/delivery_search_screen.dart';

class HomePage extends StatefulWidget {
  final int userId;
  const HomePage({super.key, required this.userId});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  bool _isTracking = false;
  Position? _currentPosition;
  Timer? _timer;
  Map<String, dynamic>? _activeTask;
  bool _isLoadingTask = false;
  String? _accessToken;
  
  // Use 127.0.0.1 for desktop/web testing. Change back to 10.0.2.2 for Android Emulator.
  final String _baseApiUrl = "http://127.0.0.1:8000/api/";

  Map<String, String> get _authHeaders => {
    'Content-Type': 'application/json',
    if (_accessToken != null) 'Authorization': 'Bearer $_accessToken',
  };

  @override
  void initState() {
    super.initState();
    _loadToken();
    _checkPermissions();
  }

  Future<void> _loadToken() async {
    final prefs = await SharedPreferences.getInstance();
    _accessToken = prefs.getString('access_token');
    _fetchActiveTask();
  }

  Future<void> _fetchActiveTask() async {
    setState(() => _isLoadingTask = true);
    try {
      final response = await http.get(
        Uri.parse("${_baseApiUrl}shipments/driver_active/?user_id=${widget.userId}"),
        headers: _authHeaders,
      );
      
      if (response.statusCode == 200) {
        final Map<String, dynamic> shipment = jsonDecode(response.body);
        setState(() => _activeTask = shipment);
      }
    } catch (e) {
      debugPrint("Failed to load tasks: $e");
    } finally {
      setState(() => _isLoadingTask = false);
    }
  }

  Future<void> _checkPermissions() async {
    bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
    if (!serviceEnabled) {
      debugPrint('Location services are disabled.');
      return;
    }

    LocationPermission permission = await Geolocator.checkPermission();
    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
      if (permission == LocationPermission.denied) {
        debugPrint('Location permissions are denied');
        return;
      }
    }
  }

  void _startTracking() {
    setState(() {
      _isTracking = true;
    });

    _timer = Timer.periodic(const Duration(seconds: 5), (timer) async {
      Position position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high);
      
      setState(() {
        _currentPosition = position;
      });

      _sendLocationToBackend(position);
    });
  }

  void _stopTracking() {
    setState(() {
      _isTracking = false;
    });
    _timer?.cancel();
  }

  Future<void> _sendLocationToBackend(Position position) async {
    try {
      final response = await http.post(
        Uri.parse("${_baseApiUrl}tracking/location/"),
        headers: _authHeaders,
        body: jsonEncode(<String, dynamic>{
          'driver_id': widget.userId.toString(),
          'vehicle_id': _activeTask?['assigned_vehicle']?.toString() ?? "unassigned",
          'latitude': position.latitude,
          'longitude': position.longitude,
          'timestamp': DateTime.now().toIso8601String(),
          'status': 'active',
        }),
      );

      if (response.statusCode == 200 || response.statusCode == 201 || response.statusCode == 202) {
        debugPrint('Location synced: ${position.latitude}, ${position.longitude}');
      }
    } catch (e) {
      debugPrint('Error networking: $e');
    }
  }

  Future<void> _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('userId');
    if (mounted) {
      Navigator.pushAndRemoveUntil(
        context,
        MaterialPageRoute(builder: (context) => const LoginPage()),
        (route) => false,
      );
    }
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFCFBF9), // Soft Cream background
      appBar: AppBar(
        title: const Text('Fleet Logistics OS', style: TextStyle(fontWeight: FontWeight.w900, letterSpacing: -0.5, color: Colors.white)),
        backgroundColor: const Color(0xFF3E2723), // Dark Coffee
        elevation: 0,
        centerTitle: true,
        actions: [
          IconButton(
            icon: const Icon(Icons.search, color: Colors.white),
            onPressed: () {
              Navigator.push(
                context, 
                MaterialPageRoute(builder: (context) => DeliverySearchScreen(userId: widget.userId, baseUrl: _baseApiUrl))
              );
            },
          ),
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            onPressed: _fetchActiveTask,
          ),
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.white),
            onPressed: _logout,
          )
        ],
        shape: const RoundedRectangleBorder(
          borderRadius: BorderRadius.vertical(bottom: Radius.circular(24)),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Status Card
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(32),
                border: Border.all(color: const Color(0xFFEFEBE9)),
                boxShadow: [
                  BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 20, offset: const Offset(0, 10)),
                ],
              ),
              child: Column(
                children: [
                   Icon(
                    _isTracking ? Icons.sensors : Icons.sensors_off,
                    size: 48,
                    color: _isTracking ? const Color(0xFF4CAF50) : const Color(0xFFBDBDBD),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    _isTracking ? "TRANSMISSION ACTIVE" : "TRANSMISSION PAUSED",
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      letterSpacing: 2,
                      color: _isTracking ? const Color(0xFF4CAF50) : const Color(0xFF795548),
                    ),
                  ),
                  if (_currentPosition != null && _isTracking) ...[
                    const SizedBox(height: 12),
                    Text(
                      "LAT: ${_currentPosition!.latitude.toStringAsFixed(4)} | LNG: ${_currentPosition!.longitude.toStringAsFixed(4)}",
                      style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF8D6E63)),
                    ),
                  ],
                ],
              ),
            ),

            const SizedBox(height: 24),

            // Active Task Section
            const Text(
              "ACTIVE ASSIGNMENT",
              style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFFBCAAA4), letterSpacing: 2),
            ),
            const SizedBox(height: 12),
            
            if (_isLoadingTask)
              const Center(child: Padding(padding: EdgeInsets.all(20), child: CircularProgressIndicator(color: Color(0xFF795548)))),
            
            if (!_isLoadingTask && _activeTask != null)
              GestureDetector(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => ShipmentAssignmentView(
                        userId: widget.userId,
                        baseUrl: _baseApiUrl,
                      ),
                    ),
                  );
                },
                child: Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF3E2723), Color(0xFF5D4037)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(32),
                    boxShadow: [
                      BoxShadow(color: const Color(0xFF3E2723).withValues(alpha: 0.3), blurRadius: 15, offset: const Offset(0, 8)),
                    ],
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text("ACTIVE ASSIGNMENT", style: TextStyle(color: Colors.white54, fontSize: 10, fontWeight: FontWeight.w900, letterSpacing: 2)),
                          const SizedBox(height: 8),
                          Text("#MF-${_activeTask!['shipment_id']}", style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 20)),
                        ],
                      ),
                      const Icon(Icons.chevron_right, color: Colors.white54, size: 30),
                    ],
                  ),
                ),
              )
            else if (!_isLoadingTask)
              Container(
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFEBE9).withValues(alpha: 0.3),
                  borderRadius: BorderRadius.circular(32),
                  border: Border.all(color: const Color(0xFFEFEBE9), style: BorderStyle.solid),
                ),
                child: const Column(
                  children: [
                    Icon(Icons.assignment_turned_in, color: Color(0xFFD7CCC8), size: 40),
                    SizedBox(height: 12),
                    Text("NO ACTIVE TASKS", style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: Color(0xFFBCAAA4))),
                  ],
                ),
              ),

            const SizedBox(height: 32),

            // Large Action Button
            GestureDetector(
              onTap: _isTracking ? _stopTracking : _startTracking,
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 300),
                height: 80,
                decoration: BoxDecoration(
                  color: _isTracking ? const Color(0xFFD32F2F) : const Color(0xFF4CAF50),
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(
                      color: (_isTracking ? Colors.red : Colors.green).withValues(alpha: 0.3),
                      blurRadius: 20,
                      offset: const Offset(0, 10),
                    ),
                  ],
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(_isTracking ? Icons.stop_circle : Icons.play_circle_filled, color: Colors.white, size: 28),
                    const SizedBox(width: 12),
                    Text(
                      _isTracking ? "END TRACKING" : "START TRACKING",
                      style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w900, letterSpacing: 1),
                    ),
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
