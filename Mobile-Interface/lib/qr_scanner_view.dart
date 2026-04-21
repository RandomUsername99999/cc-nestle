import 'package:flutter/material.dart';
import 'package:camera/camera.dart';
import 'package:image/image.dart' as img;
import 'package:zxing_lib/zxing.dart';
import 'package:zxing_lib/common.dart';
import 'package:zxing_lib/qrcode.dart';
import 'dart:async';
import 'dart:typed_data';

class QRScannerView extends StatefulWidget {
  final String title;
  final Function(String) onScan;

  const QRScannerView({
    super.key,
    required this.title,
    required this.onScan,
  });

  @override
  State<QRScannerView> createState() => _QRScannerViewState();
}

class _QRScannerViewState extends State<QRScannerView> {
  bool isScanCompleted = false;
  CameraController? _cameraController;
  
  bool _isCameraInitialized = false;
  String _status = "Initializing Hardware...";
  Timer? _analysisTimer;
  bool _isAnalyzing = false;

  @override
  void initState() {
    super.initState();
    _setupHardware();
  }

  Future<void> _setupHardware() async {
    try {
      final cameras = await availableCameras();
      if (cameras.isEmpty) {
        setState(() => _status = "No camera found.");
        return;
      }

      // Default to back camera, fallback to first available
      final camera = cameras.firstWhere(
        (c) => c.lensDirection == CameraLensDirection.back,
        orElse: () => cameras.first,
      );

      _cameraController = CameraController(
        camera,
        ResolutionPreset.high,
        enableAudio: false,
      );

      await _cameraController!.initialize();
      
      if (mounted) {
        setState(() {
          _isCameraInitialized = true;
          _status = "System Ready - Scanning for QR";
        });
        _startPureDartAnalysis();
      }
    } catch (e) {
      if (mounted) {
        setState(() => _status = "Hardware Access Denied: $e");
      }
    }
  }

  void _startPureDartAnalysis() {
    _analysisTimer = Timer.periodic(const Duration(milliseconds: 1500), (timer) async {
      if (isScanCompleted || _cameraController == null || !_cameraController!.value.isInitialized || _isAnalyzing) return;

      try {
        _isAnalyzing = true;
        if (mounted) setState(() => _status = "Analyzing frame...");

        final XFile file = await _cameraController!.takePicture();
        final Uint8List bytes = await file.readAsBytes();

        final img.Image? bitmap = img.decodeImage(bytes);
        if (bitmap == null) {
          _isAnalyzing = false;
          return;
        }

        final LuminanceSource source = RGBLuminanceSource(
          bitmap.width,
          bitmap.height,
          _convertToPixels(bitmap),
        );
        
        final binarizer = HybridBinarizer(source);
        final BinaryBitmap binaryBitmap = BinaryBitmap(binarizer);

        // Corrected Hints for ZXing-Dart 1.1.4
        const DecodeHint hints = DecodeHint(
          tryHarder: true,
          possibleFormats: [BarcodeFormat.qrCode],
        );

        try {
          final Result result = QRCodeReader().decode(binaryBitmap, hints);
          final String code = result.text;

          if (code.isNotEmpty && !isScanCompleted) {
            isScanCompleted = true;
            _analysisTimer?.cancel();
            widget.onScan(code);
            if (mounted) Navigator.pop(context);
          }
        } catch (e) {
          // No QR found in this snapshot
        }

        if (mounted) setState(() => _status = "Align code in frame");
        _isAnalyzing = false;
      } catch (e) {
        _isAnalyzing = false;
        debugPrint("Analysis cycle error: $e");
      }
    });
  }

  // Corrected pixel conversion for Image 4.x
  Int32List _convertToPixels(img.Image image) {
    final int width = image.width;
    final int height = image.height;
    final Int32List pixels = Int32List(width * height);
    
    int index = 0;
    for (final pixel in image) {
      // Accessing r,g,b directly for image 4.x
      final int r = pixel.r.toInt();
      final int g = pixel.g.toInt();
      final int b = pixel.b.toInt();
      
      pixels[index++] = 0xFF000000 | (r << 16) | (g << 8) | b;
    }
    return pixels;
  }

  @override
  void dispose() {
    _analysisTimer?.cancel();
    _cameraController?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        title: Text(widget.title, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
      ),
      body: Stack(
        children: [
          if (_isCameraInitialized)
            Center(
              child: AspectRatio(
                aspectRatio: _cameraController!.value.aspectRatio,
                child: CameraPreview(_cameraController!),
              ),
            )
          else
            Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const CircularProgressIndicator(color: Colors.indigo),
                  const SizedBox(height: 24),
                  Text(_status, style: const TextStyle(color: Colors.white70)),
                ],
              ),
            ),

          IgnorePointer(
            child: Center(
              child: Container(
                width: 280,
                height: 280,
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.indigo.withOpacity(0.5), width: 2),
                  borderRadius: BorderRadius.circular(24),
                ),
                child: const _OverlayEffect(),
              ),
            ),
          ),

          Positioned(
            bottom: 50,
            left: 20,
            right: 20,
            child: Center(
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 10),
                decoration: BoxDecoration(
                  color: Colors.black87,
                  borderRadius: BorderRadius.circular(30),
                  border: Border.all(color: Colors.white10),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (_isAnalyzing)
                      const SizedBox(
                        width: 12,
                        height: 12,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.indigoAccent),
                      ),
                    if (_isAnalyzing) const SizedBox(width: 12),
                    Text(
                      _status,
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _OverlayEffect extends StatefulWidget {
  const _OverlayEffect();

  @override
  State<_OverlayEffect> createState() => _OverlayEffectState();
}

class _OverlayEffectState extends State<_OverlayEffect> with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(duration: const Duration(seconds: 2), vsync: this)..repeat(reverse: true);
    _animation = Tween<double>(begin: 20, end: 260).animate(_controller);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _animation,
      builder: (context, child) {
        return Stack(
          children: [
            Positioned(
              top: _animation.value,
              left: 15,
              right: 15,
              child: Container(
                height: 2,
                decoration: BoxDecoration(
                  color: Colors.indigo,
                  boxShadow: [
                    BoxShadow(color: Colors.indigo.withOpacity(0.4), blurRadius: 10, spreadRadius: 2),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }
}
