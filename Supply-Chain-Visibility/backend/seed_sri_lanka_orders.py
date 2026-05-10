import os
import django
import random
from decimal import Decimal
from datetime import date, timedelta
from django.utils import timezone

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "server.settings")
django.setup()

from api.models import Order

def seed_sri_lanka_orders(count=1000):
    print(f"Starting seeding of {count} random orders in Sri Lanka...")

    hubs = [
        {'id': 'WH-COL-01', 'name': 'Colombo Port Distribution Hub', 'addr': 'Port Road, Colombo 13', 'lat': 6.9497, 'lng': 79.8536},
        {'id': 'WH-KAN-02', 'name': 'Kandy Central Hub', 'addr': 'Peradeniya Rd, Kandy', 'lat': 7.2906, 'lng': 80.6337},
        {'id': 'WH-GAL-03', 'name': 'Galle Southern Gateway', 'addr': 'Matara Rd, Galle', 'lat': 6.0535, 'lng': 80.2210},
        {'id': 'WH-KUR-04', 'name': 'Kurunegala Junction Hub', 'addr': 'Puttalam Rd, Kurunegala', 'lat': 7.4818, 'lng': 80.3609},
        {'id': 'WH-JAF-05', 'name': 'Jaffna Northern Hub', 'addr': 'Kandy Rd, Jaffna', 'lat': 9.6615, 'lng': 80.0255}
    ]

    streets = [
        'Galle Road', 'Kandy Road', 'High Level Road', 'Negombo Road', 'Duplication Road', 
        'Flower Road', 'Dharmapala Mawatha', 'Ananda Coomaraswamy Mawatha', 'Sir James Peiris Mawatha',
        'Havelock Road', 'Baseline Road', 'Marine Drive', 'Dickmans Road', 'Thurstan Road'
    ]
    
    areas = [
        'Colombo 03', 'Colombo 07', 'Dehiwala', 'Mount Lavinia', 'Rajagiriya', 
        'Nugegoda', 'Battaramulla', 'Kaduwela', 'Peliyagoda', 'Wattala',
        'Moratuwa', 'Panadura', 'Kalutara', 'Negombo', 'Gampaha'
    ]

    orders_created = 0
    
    for i in range(count):
        hub = random.choice(hubs)
        # Random offset within roughly 50km for delivery
        lat_off = random.uniform(-0.45, 0.45)
        lng_off = random.uniform(-0.45, 0.45)
        
        weight = random.uniform(5.0, 2000.0)
        volume = random.uniform(0.05, 10.0)
        refrig = random.choice([True, False, False, False, False])
        
        Order.objects.create(
            shipment_type=random.choice(['package', 'pallet', 'pallet', 'package']),
            quantity=random.randint(1, 10),
            weight_kg=Decimal(f"{weight:.2f}"),
            volume_m3=Decimal(f"{volume:.2f}"),
            requires_refrigeration=refrig,
            pickup_address=hub['addr'],
            delivery_address=f"No {random.randint(1, 500)}, {random.choice(streets)}, {random.choice(areas)}",
            pickup_lat=Decimal(f"{hub['lat']}"),
            pickup_lng=Decimal(f"{hub['lng']}"),
            delivery_lat=Decimal(f"{hub['lat'] + lat_off:.8f}"),
            delivery_lng=Decimal(f"{hub['lng'] + lng_off:.8f}"),
            warehouse_id=hub['id'],
            warehouse_name=hub['name'],
            warehouse_address=hub['addr'],
            warehouse_lat=Decimal(f"{hub['lat']}"),
            warehouse_lng=Decimal(f"{hub['lng']}"),
            status='pending'
        )
        orders_created += 1
        if orders_created % 100 == 0:
            print(f"Created {orders_created} orders...")

    print(f"Successfully created {orders_created} Orders in Sri Lanka!")

if __name__ == "__main__":
    seed_sri_lanka_orders(1000)
