import os
import django
import random
import uuid
from decimal import Decimal
from datetime import datetime, timedelta

# Setup Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "server.settings")
django.setup()

from inbound.models import Supplier, SupplierDeliveryManifest, InboundCollectionAssignment, SpecialHandlingType
from warehouses.models import Warehouse

def seed_suppliers(count=20):
    print(f"Seeding {count} suppliers and shipments...")
    
    # Get a warehouse to link to
    warehouse = Warehouse.objects.first()
    if not warehouse:
        warehouse = Warehouse.objects.create(
            name="Main Distribution Center",
            address="123 Logistics Way",
            lat=Decimal("40.7128"),
            lng=Decimal("-74.0060")
        )

    supplier_names = [
        "Global Foods Inc.", "Oceanic Supplies", "Precision Parts Co.", "Green Valley Farm",
        "Industrial Solutions", "Tech Logistics", "Summit Goods", "Prime Ingredients",
        "Metro Distributors", "National Wholesalers", "Apex Manufacturing", "Delta Logistics",
        "Swift Courier Services", "Blue Ribbon Dairy", "Golden Harvest", "Silver Star Parts",
        "Continental Logistics", "Pioneer Supplies", "Zenith Manufacturing", "Horizon Goods"
    ]

    for i in range(count):
        name = supplier_names[i % len(supplier_names)]
        if count > len(supplier_names):
            name = f"{name} {i+1}"
        
        # 1. Create Supplier
        supplier = Supplier.objects.create(
            name=name,
            address=f"{random.randint(100, 999)} Industrial Rd, Unit {i+1}",
            lat=Decimal(f"{40.7 + random.uniform(-0.1, 0.1):.7f}"),
            lng=Decimal(f"{-74.0 + random.uniform(-0.1, 0.1):.7f}"),
            qr_token=f"SUPPLIER_TOKEN_{uuid.uuid4().hex[:12]}"
        )

        # 2. Create Shipment (Manifest)
        # Randomly decide cooling
        needs_cooling = random.choice([True, False])
        handling = SpecialHandlingType.COOLING if needs_cooling else SpecialHandlingType.NONE

        manifest = SupplierDeliveryManifest.objects.create(
            manifest_reference=f"MANIFEST-{random.randint(100000, 999999)}",
            supplier=supplier,
            status='received',
            expected_collection=datetime.now() + timedelta(days=random.randint(1, 7)),
            warehouse=warehouse,
            special_handling=handling,
            temperature_min_c=Decimal("2.0") if needs_cooling else None,
            temperature_max_c=Decimal("8.0") if needs_cooling else None
        )

        # 3. Create Assignment with Dock Number
        InboundCollectionAssignment.objects.create(
            manifest=manifest,
            dock_number=f"D-{random.randint(1, 24)}",
            status='pending'
        )

    print(f"Successfully created {count} suppliers with shipments and dock assignments.")

if __name__ == "__main__":
    seed_suppliers(20)
