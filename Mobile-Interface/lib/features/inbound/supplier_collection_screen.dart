import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

// Placeholder model
class POLineItem {
  final String id;
  final String poRef;
  final String itemCode;
  final String description;
  final String orderedQty;
  final String unit;

  POLineItem({
    required this.id,
    required this.poRef,
    required this.itemCode,
    required this.description,
    required this.orderedQty,
    required this.unit,
  });
}

// Placeholder Notifier
class SupplierRunNotifier extends StateNotifier<AsyncValue<List<POLineItem>>> {
  SupplierRunNotifier() : super(const AsyncValue.loading());

  void scanArrival(String runId, String qrToken) {
    // API call simulation
    state = const AsyncValue.loading();
    // Logic to fetch items after verification...
  }
}

final supplierRunNotifier = StateNotifierProvider<SupplierRunNotifier, AsyncValue<List<POLineItem>>>((ref) {
  return SupplierRunNotifier();
});

class SupplierCollectionScreen extends ConsumerStatefulWidget {
  final String runId;
  const SupplierCollectionScreen({super.key, required this.runId});

  @override
  ConsumerState<SupplierCollectionScreen> createState() => _SupplierCollectionScreenState();
}

class _SupplierCollectionScreenState extends ConsumerState<SupplierCollectionScreen> {
  int _currentStep = 0;
  final Map<String, double> _receivedQtys = {};
  final Map<String, String> _conditions = {};

  void _updateQty(String id, double qty) {
    setState(() => _receivedQtys[id] = qty);
  }

  void _submitVerification() {
    // Logic to submit to backend
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Collection complete. Routing to Warehouse...')),
    );
  }

  void _capturePhoto(String id) {
    // Logic for camera capture
  }

  @override
  Widget build(BuildContext context) {
    final lineItemsAsync = ref.watch(supplierRunNotifier);

    return Scaffold(
      appBar: AppBar(title: const Text('Supplier Collection')),
      body: Stepper(
        currentStep: _currentStep,
        onStepContinue: () {
          if (_currentStep == 0) {
            // Logic to verify and move to next step
            setState(() => _currentStep++);
          }
        },
        steps: [
          Step(
            title: const Text('Verify Arrival'),
            content: _buildScanStep(),
            isActive: _currentStep == 0,
          ),
          Step(
            title: const Text('Verify Goods'),
            content: lineItemsAsync.when(
              data: (items) => _buildVerifyStep(items),
              loading: () => const Center(child: CircularProgressIndicator()),
              error: (err, stack) => Text('Error: $err'),
            ),
            isActive: _currentStep == 1,
          ),
        ],
      ),
    );
  }

  Widget _buildScanStep() {
    return Column(children: [
      const Padding(
        padding: EdgeInsets.symmetric(vertical: 16.0),
        child: Text('Scan the QR code at the supplier entrance to verify your arrival.'),
      ),
      SizedBox(
        height: 300,
        child: MobileScanner(
          onDetect: (capture) {
            final barcode = capture.barcodes.first;
            if (barcode.rawValue != null) {
              ref.read(supplierRunNotifier.notifier)
                 .scanArrival(widget.runId, barcode.rawValue!);
            }
          },
        ),
      ),
    ]);
  }

  Widget _buildVerifyStep(List<POLineItem> lineItems) {
    return Column(children: [
      ListView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: lineItems.length,
        itemBuilder: (ctx, i) {
          final item = lineItems[i];
          return Card(
            margin: const EdgeInsets.only(bottom: 12),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text('${item.poRef} - ${item.description}', style: const TextStyle(fontWeight: FontWeight.w500)),
                Text('Ordered: ${item.orderedQty} ${item.unit}', style: const TextStyle(color: Colors.grey)),
                const SizedBox(height: 8),
                Row(children: [
                  Expanded(
                    child: TextFormField(
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Received qty',
                        border: OutlineInputBorder(),
                      ),
                      onChanged: (v) => _updateQty(item.id, double.tryParse(v) ?? 0),
                    ),
                  ),
                  const SizedBox(width: 12),
                  DropdownButton<String>(
                    value: _conditions[item.id] ?? 'good',
                    items: ['good','damaged','rejected']
                        .map((c) => DropdownMenuItem(value: c, child: Text(c)))
                        .toList(),
                    onChanged: (v) => setState(() => _conditions[item.id] = v!),
                  ),
                ]),
                if ((_conditions[item.id] ?? 'good') != 'good')
                  Padding(
                    padding: const EdgeInsets.only(top: 8.0),
                    child: TextButton.icon(
                      onPressed: () => _capturePhoto(item.id),
                      icon: const Icon(Icons.camera_alt),
                      label: const Text('Add photo proof'),
                    ),
                  ),
              ]),
            ),
          );
        },
      ),
      const SizedBox(height: 16),
      ElevatedButton(
        style: ElevatedButton.styleFrom(
          minimumSize: const Size.fromHeight(50),
          backgroundColor: Colors.indigo,
          foregroundColor: Colors.white,
        ),
        onPressed: _submitVerification,
        child: const Text('Complete Collection & Return to Warehouse'),
      )
    ]);
  }
}
