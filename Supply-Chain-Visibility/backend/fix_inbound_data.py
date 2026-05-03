import os
import django
import random
from decimal import Decimal

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')
django.setup()

from inbound.models import SupplierDeliveryManifest, ManifestLineItem, SpecialHandlingType

def fix_data():
    manifests = SupplierDeliveryManifest.objects.all()
    print(f"Checking {manifests.count()} manifests...")
    
    items_created = 0
    manifests_updated = 0

    for manifest in manifests:
        # 1. Check if it has items
        if manifest.line_items.count() == 0:
            print(f"Manifest {manifest.manifest_reference} has 0 items. Adding test items...")
            
            # Create 2-5 random items
            num_items = random.randint(2, 5)
            for j in range(num_items):
                item_names = [
                    'Nestle Milo 1kg', 'Maggi Noodles 10pk', 'Nescafe Classic 200g', 
                    'KitKat Share Bag', 'Nido Milk Powder 2kg', 'Cerelac Wheat 400g'
                ]
                name = random.choice(item_names)
                qty = random.randint(10, 100)
                u_weight = random.uniform(0.5, 2.5)
                
                ManifestLineItem.objects.create(
                    manifest=manifest,
                    item_code=f"ITM-{random.randint(1000, 9999)}",
                    description=name,
                    unit='pcs',
                    expected_qty=qty,
                    unit_weight_kg=Decimal(f"{u_weight:.2f}"),
                    unit_volume_m3=Decimal(f"{u_weight/1000:.4f}"),
                    special_handling=manifest.special_handling
                )
                items_created += 1
            
            manifests_updated += 1
        else:
            # Just trigger a refresh of totals in case they were 0
            manifest.update_totals()
            print(f"Manifest {manifest.manifest_reference} already has items. Totals refreshed.")

    print(f"Finished! Created {items_created} items across {manifests_updated} manifests.")

if __name__ == "__main__":
    fix_data()
