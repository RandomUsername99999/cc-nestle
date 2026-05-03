import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')
django.setup()

from inbound.models import SupplierDeliveryManifest, ManifestLineItem

manifests = SupplierDeliveryManifest.objects.all()
print(f"Total Manifests: {manifests.count()}")

for m in manifests:
    items = m.line_items.all()
    print(f"Manifest {m.manifest_reference} (ID: {m.id}): {items.count()} items, Total Weight: {m.total_weight_kg}")
    for item in items:
        print(f"  - {item.description}: {item.expected_qty} {item.unit} ({item.weight_kg}kg)")
