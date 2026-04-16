import os
import django
import random
from decimal import Decimal

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "server.settings")
django.setup()

from api.models import CustomUser, Role, Vehicle, Employee, Order, VehicleAssignment
from drivers.models import Driver as DriverProfile

def seed_data():
    print("🚀 Starting Data Seeding...")

    # 1. Ensure Roles Exist
    roles_data = [
        ('admin', 'Admin access'),
        ('manager', 'Manager access'),
        ('dispatcher', 'Dispatcher access'),
        ('driver', 'Driver access'),
        ('customer', 'Customer access'),
    ]
    role_objs = {}
    for name, desc in roles_data:
        role, _ = Role.objects.get_or_create(role_name=name, defaults={'role_description': desc})
        role_objs[name] = role

    # 2. Cleanup Existing Data (Operational tables)
    print("🧹 Cleaning up existing data (Vehicles, Drivers, Orders)...")
    Order.objects.all().delete()
    VehicleAssignment.objects.all().delete()
    DriverProfile.objects.all().delete()
    # Note: We keep administrative users but add new test drivers
    CustomUser.objects.filter(username__startswith='driver_').delete()
    Vehicle.objects.all().delete()

    # 3. Create Vehicles
    vehicle_configs = [
        {'type': 'truck', 'count': 4, 'kg': 18000, 'vol': 45.0, 'fridge': False},
        {'type': 'van', 'count': 6, 'kg': 3500, 'vol': 12.0, 'fridge': False},
        {'type': 'truck', 'count': 2, 'kg': 24000, 'vol': 80.0, 'fridge': True},
    ]
    
    vehicles = []
    v_idx = 1
    for config in vehicle_configs:
        for _ in range(config['count']):
            plate = f"TRK-{random.randint(1000, 9999)}"
            v = Vehicle.objects.create(
                plate_number=plate,
                vehicle_type=config['type'],
                manufacturer=random.choice(['Volvo', 'Mercedes', 'Scania', 'Ford', 'Isuzu']),
                model=random.choice(['Alpha', 'Beta', 'Prime', 'X-Series', 'Transit']),
                year=random.randint(2018, 2024),
                capacity_kg=config['kg'],
                capacity_volume=config['vol'],
                is_refrigerated=config['fridge'],
                status='available'
            )
            vehicles.append(v)
            v_idx += 1
    print(f"✅ Created {len(vehicles)} Vehicles")

    # 4. Create Drivers
    drivers = []
    for i in range(1, 16):
        uname = f"driver_{i}"
        email = f"driver{i}@logistics.test"
        user = CustomUser.objects.create_user(
            username=uname,
            email=email,
            password='password123',
            role=role_objs['driver']
        )
        
        emp = Employee.objects.create(
            user=user,
            full_name=f"Test Driver {i}",
            national_id=f"NID-{random.randint(100000, 999999)}",
            contact_number=f"+1800{random.randint(1000000, 9999999)}",
            address=f"{random.randint(1, 999)} Driver St, Transit City",
            date_of_birth="1990-01-01"
        )
        
        drv = DriverProfile.objects.create(
            employee=emp,
            license_number=f"LIC-{random.randint(10000, 99999)}",
            license_expiry_date="2030-12-31",
            experience_years=random.randint(1, 15),
            status='available'
        )
        drivers.append(drv)
    print(f"✅ Created {len(drivers)} Driver Profiles")

    # 5. Create Orders (Clustered)
    hubs = [
        {
            'id': 'WH-NYC-01', 
            'name': 'North Distribution Hub', 
            'addr': '100 Warehouse Row, NY', 
            'lat': 40.7128, 'lng': -74.0060,
            'clients': ['Acme Corp', 'Globex Inc', 'Initech', 'Hooli']
        },
        {
            'id': 'WH-NJ-02', 
            'name': 'South Coastal Port', 
            'addr': 'Terminal 4, NJ', 
            'lat': 40.6895, 'lng': -74.1745,
            'clients': ['Umbrella Co', 'Soylent Corp', 'Vandelay Ind', 'Waystar']
        }
    ]

    orders_count = 0
    for hub in hubs:
        # Create 30 orders per hub
        for i in range(1, 31):
            # Cluster tightly around hub (0.01 to 0.08 variance)
            lat_off = random.uniform(-0.06, 0.06)
            lng_off = random.uniform(-0.06, 0.06)
            
            w = random.uniform(50, 4500)
            v = random.uniform(0.5, 15.0)
            
            Order.objects.create(
                shipment_type=random.choice(['package', 'pallet']),
                quantity=random.randint(1, 10),
                weight_kg=Decimal(f"{w:.2f}"),
                volume_m3=Decimal(f"{v:.2f}"),
                requires_refrigeration=random.choice([True, False, False, False]), # 25% chance
                pickup_address=hub['addr'],
                delivery_address=f"{random.randint(10, 999)} {random.choice(['Main', 'Oak', 'Pine', 'Maple', 'Cedar'])} St, Delivery Zone",
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
            orders_count += 1
            
    print(f"✅ Created {orders_count} Pending Orders (Clustered)")
    print("🏁 Seeding Completed Successfully!")

if __name__ == "__main__":
    seed_data()
