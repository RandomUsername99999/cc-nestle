import os
import django
import random
import argparse
from decimal import Decimal
from datetime import date, timedelta
from django.utils import timezone

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "server.settings")
django.setup()

from api.models import CustomUser, Role, Employee, Order, VehicleAssignment
from vehicles.models import Vehicle
from drivers.models import Driver as DriverProfile

def seed_data(orders_count_target, vehicles_count_target, drivers_count_target, cleanup=True):
    print("Starting High-Quality Data Seeding...")

    # 1. Ensure Roles Exist
    roles_data = [
        ('Admin', 'Admin access'),
        ('Manager', 'Manager access'),
        ('Dispatcher', 'Dispatcher access'),
        ('Driver', 'Driver access'),
        ('Customer', 'Customer access'),
    ]
    role_objs = {}
    for name, desc in roles_data:
        role, _ = Role.objects.get_or_create(role_name=name, defaults={'role_description': desc})
        role_objs[name] = role

    # 2. Cleanup Existing Data
    if cleanup:
        print("Cleaning up existing operational data...")
        Order.objects.all().delete()
        VehicleAssignment.objects.all().delete()
        DriverProfile.objects.all().delete()
        CustomUser.objects.filter(username__startswith='driver_').delete()
        Vehicle.objects.all().delete()
    else:
        print("Adding to existing data (no cleanup).")

    # 3. Create Vehicles
    manufacturers = {
        'Freightliner': ['Cascadia', 'M2 106', '114SD'],
        'Volvo': ['VNL 860', 'VNR Electric', 'FMX'],
        'Kenworth': ['T680', 'W900', 'T880'],
        'Peterbilt': ['579', '389', '536'],
        'Mercedes-Benz': ['Actros', 'Atego', 'Sprinter'],
        'Ford': ['F-650', 'F-750', 'Transit'],
        'Isuzu': ['N-Series', 'F-Series']
    }
    
    vehicles = []
    for i in range(vehicles_count_target):
        mfg = random.choice(list(manufacturers.keys()))
        model = random.choice(manufacturers[mfg])
        v_type = 'truck' if ' Sprinter' not in model and 'Transit' not in model else 'van'
        
        is_fridge = random.choice([True, False, False]) # 33% chance
        cap_kg = random.randint(3000, 25000) if v_type == 'truck' else random.randint(1000, 3500)
        cap_vol = random.randint(10, 80) if v_type == 'truck' else random.randint(5, 12)

        v = Vehicle.objects.create(
            plate_number=f"{random.choice(['NY','CA','TX','FL'])}-{random.randint(1000, 9999)}{random.choice(['A','B','X'])}",
            vehicle_type=v_type,
            manufacturer=mfg,
            model=model,
            year=random.randint(2018, 2024),
            capacity_kg=Decimal(cap_kg),
            capacity_volume=Decimal(cap_vol),
            is_refrigerated=is_fridge,
            status='available'
        )
        vehicles.append(v)
    print(f"Created {len(vehicles)} Randomized Vehicles")

    # 4. Create Drivers
    first_names = ['James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica']
    last_names = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzales', 'Wilson', 'Anderson', 'Thomas']
    
    drivers = []
    start_idx = CustomUser.objects.filter(username__startswith='driver_').count() + 1
    for i in range(start_idx, start_idx + drivers_count_target):
        fname = random.choice(first_names)
        lname = random.choice(last_names)
        full_name = f"{fname} {lname}"
        uname = f"driver_{i}_{lname.lower()}"
        
        if CustomUser.objects.filter(username=uname).exists():
            uname = f"driver_{i}_{random.randint(100, 999)}"

        user = CustomUser.objects.create_user(
            username=uname,
            email=f"{fname.lower()}.{lname.lower()}{i}@logistics-mock.com",
            password='password123',
            role=role_objs['Driver']
        )
        
        emp = Employee.objects.create(
            user=user,
            full_name=full_name,
            national_id=f"NID-{random.randint(10000000, 99999999)}",
            contact_number=f"+1-{random.randint(200, 999)}-{random.randint(100, 999)}-{random.randint(1000, 9999)}",
            address=f"{random.randint(100, 9999)} {random.choice(['Main','Center','Second','Market','Sunset'])} Ave, {random.choice(['Austin','Denver','Seattle','Boston'])}",
            date_of_birth=date(1980, 1, 1) + timedelta(days=random.randint(0, 10000))
        )
        
        drv = DriverProfile.objects.create(
            employee=emp,
            license_number=f"DL-{random.randint(100000, 999999)}",
            license_expiry_date=date(2026, 1, 1) + timedelta(days=random.randint(100, 1500)),
            experience_years=random.randint(2, 25),
            status='available'
        )
        drivers.append(drv)
    print(f"Created {len(drivers)} Driver Profiles with randomized names")

    # 5. Create Orders (Multi-City Hubs)
    hubs = [
        {'id': 'WH-NYC-01', 'name': 'Port Newark Distribution', 'addr': '121 Corbin St, Newark, NJ', 'lat': 40.6895, 'lng': -74.1745},
        {'id': 'WH-CHI-02', 'name': 'Midwest Express Hub', 'addr': '1500 N Halsted St, Chicago, IL', 'lat': 41.9088, 'lng': -87.6477},
        {'id': 'WH-LAX-03', 'name': 'Pacific Coast Gateway', 'addr': '100 World Way, Los Angeles, CA', 'lat': 33.9416, 'lng': -118.4085},
        {'id': 'WH-HOU-04', 'name': 'Gulf South Logistics', 'addr': '7800 Airport Blvd, Houston, TX', 'lat': 29.6465, 'lng': -95.2770},
        {'id': 'WH-MIA-05', 'name': 'Southeastern Port Hub', 'addr': '1015 N America Way, Miami, FL', 'lat': 25.7781, 'lng': -80.1774}
    ]

    orders_created = 0
    streets = ['Maple', 'Oak', 'Pine', 'Cedar', 'Washington', 'Lake', 'Hill', 'Park', 'View', 'Valley', 'River', 'Sunset']
    
    for _ in range(orders_count_target):
        hub = random.choice(hubs)
        lat_off = random.uniform(-0.35, 0.35)
        lng_off = random.uniform(-0.35, 0.35)
        
        weight = random.uniform(20.0, 5000.0)
        volume = random.uniform(0.1, 15.0)
        refrig = random.choice([True, False, False, False, False])
        
        Order.objects.create(
            shipment_type=random.choice(['package', 'pallet', 'pallet', 'package']),
            quantity=random.randint(1, 15),
            weight_kg=Decimal(f"{weight:.2f}"),
            volume_m3=Decimal(f"{volume:.2f}"),
            requires_refrigeration=refrig,
            pickup_address=hub['addr'],
            delivery_address=f"{random.randint(100, 5000)} {random.choice(streets)} {random.choice(['St','Blvd','Rd','Way'])}, {hub['name'].split()[-2]} Area",
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
    print(f"Created {orders_created} Orders across {len(hubs)} geographic regions")

    # 6. Create Assignments (Randomly link some vehicles and drivers)
    assignment_count = min(len(vehicles), len(drivers))
    random.shuffle(vehicles)
    random.shuffle(drivers)
    
    for i in range(assignment_count):
        VehicleAssignment.objects.create(
            vehicle=vehicles[i],
            driver=drivers[i],
            status=random.choice(['active', 'active', 'active', 'standby']),
            assignment_start_date=date.today() - timedelta(days=random.randint(1, 30))
        )
    print(f"Created {assignment_count} Vehicle Assignments")

    # 7. Update some Orders and add Exceptions/PODs
    from api.models import OrderException, ProofOfDelivery
    all_orders = list(Order.objects.all())
    random.shuffle(all_orders)
    
    # Mark 60% as delivered and create PODs
    delivered_count = int(len(all_orders) * 0.6)
    for o in all_orders[:delivered_count]:
        o.status = 'delivered'
        o.save()
        ProofOfDelivery.objects.create(
            order=o,
            recipient_name=f"Customer {random.randint(1, 100)}",
            signature_image_url="https://via.placeholder.com/200x100?text=Signature",
            latitude=o.delivery_lat,
            longitude=o.delivery_lng
        )
    print(f"Created {delivered_count} Proof of Delivery (POD) entries")
        
    # Mark 15% as failed and create exceptions
    failed_count = int(len(all_orders) * 0.15)
    for o in all_orders[delivered_count:delivered_count+failed_count]:
        o.status = 'delivery_failed'
        o.save()
        OrderException.objects.create(
            order=o,
            exception_type=random.choice(['no_answer', 'address_not_found', 'refused', 'damaged']),
            driver=random.choice(drivers),
            location_lat=o.delivery_lat or 0,
            location_lng=o.delivery_lng or 0,
            notes="Automated test exception for report validation."
        )
    
    # 8. Create Trip Logs (Operations Feed & Driver Logs)
    from drivers.models import TripLog
    for i in range(20):
        d = random.choice(drivers)
        v = random.choice(vehicles)
        start = timezone.now() - timedelta(days=random.randint(0, 7), hours=random.randint(1, 12))
        TripLog.objects.create(
            driver=d,
            vehicle=v,
            start_time=start,
            end_time=start + timedelta(hours=random.randint(2, 8)),
            start_mileage=random.randint(10000, 50000),
            end_mileage=random.randint(50100, 60000),
            fuel_consumed=Decimal(random.uniform(10.0, 50.0)),
            notes="Automated test route through metro area."
        )
    print("Created 20 Driver Trip Logs")

    # 9. Create Stock Transfers (Warehouse Movement)
    from warehouses.models import StockTransfer, Warehouse
    
    # Ensure warehouses exist
    if Warehouse.objects.count() < 2:
        Warehouse.objects.get_or_create(name="Main Hub NYC", defaults={'address': '101 Port Way, NJ'})
        Warehouse.objects.get_or_create(name="Regional Center CHI", defaults={'address': '500 Logistics Dr, IL'})
    
    all_wh = list(Warehouse.objects.all())
    if len(all_wh) >= 2:
        for i in range(10):
            StockTransfer.objects.create(
                item_name=random.choice(['Nestle Milo 1kg', 'Maggi Noodles Pack', 'Nescafe Classic', 'KitKat Share Bag']),
                quantity=random.randint(50, 500),
                source_warehouse=all_wh[0],
                destination_warehouse=all_wh[1],
                status=random.choice(['pending', 'in_transit', 'completed']),
                remarks="Monthly replenishment"
            )
        print("Created 10 Stock Transfers")

    # 10. Create Inbound Radar (Supplier Manifests)
    from inbound.models import Supplier, SupplierDeliveryManifest
    supplier_names = ['Global Foods Inc.', 'Nestle Manufacturing', 'Daily Fresh Supplies', 'Apex Logistics']
    for name in supplier_names:
        Supplier.objects.get_or_create(
            name=name,
            defaults={
                'address': f"{random.randint(10, 500)} Industrial Way",
                'lat': Decimal(random.uniform(-90, 90)),
                'lng': Decimal(random.uniform(-180, 180)),
                'qr_token': f"TOKEN-{random.randint(1000, 9999)}"
            }
        )
    
    all_suppliers = list(Supplier.objects.all())
    for i in range(12):
        SupplierDeliveryManifest.objects.create(
            manifest_reference=f"MNF-{random.randint(10000, 99999)}",
            supplier=random.choice(all_suppliers),
            status=random.choice(['received', 'planned', 'assigned', 'in_transit', 'delivered']),
            expected_collection=timezone.now() + timedelta(days=random.randint(1, 10)),
            total_weight_kg=Decimal(random.uniform(100, 5000)),
            total_volume_m3=Decimal(random.uniform(1, 20))
        )
    print("Created 12 Inbound Supplier Manifests")

    print("Data Seeding Completed Successfully!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed high-quality test data")
    parser.add_argument("--orders", type=int, default=100, help="Number of orders")
    parser.add_argument("--vehicles", type=int, default=50, help="Number of vehicles")
    parser.add_argument("--drivers", type=int, default=25, help="Number of driver profiles")
    parser.add_argument("--no-cleanup", action="store_false", dest="cleanup")
    
    args = parser.parse_args()
    seed_data(args.orders, args.vehicles, args.drivers, args.cleanup)
