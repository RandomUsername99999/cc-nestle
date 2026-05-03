"""
Seed analytics test data for the Delivery Intelligence dashboard.

Usage (run on PythonAnywhere in the backend directory):
    python manage.py seed_analytics

What it creates:
  - 7 days of delivered/failed orders with timestamps
  - OrderException records for failure breakdown chart
  - FuelExpense records for fuel metrics
  - Completed Shipments with accepted_at/completed_at for route time calc
"""

from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta, date
import random
import decimal


class Command(BaseCommand):
    help = 'Seeds test data for the Delivery Analytics / Delivery Intelligence dashboard'

    def handle(self, *args, **options):
        self.stdout.write('Seeding analytics data...')

        self._seed_orders()
        self._seed_exceptions()
        self._seed_fuel_expenses()
        self._seed_shipment_times()

        self.stdout.write(self.style.SUCCESS('Done! Delivery Intelligence dashboard should now show data.'))

    def _seed_orders(self):
        from api.models import Order, CustomUser, Role
        from warehouses.models import Warehouse

        # Get a warehouse to attach orders to
        warehouse = Warehouse.objects.first()
        if not warehouse:
            self.stdout.write(self.style.WARNING('No warehouse found — skipping order seeding. Please create a warehouse first.'))
            return

        today = timezone.now()
        statuses_per_day = [
            # (delivered, failed) counts per day, oldest first
            (12, 1),
            (18, 2),
            (15, 0),
            (22, 3),
            (20, 1),
            (25, 2),
            (30, 1),
        ]

        created = 0
        for i, (num_delivered, num_failed) in enumerate(statuses_per_day):
            day = today - timedelta(days=(6 - i))

            for _ in range(num_delivered):
                Order.objects.create(
                    customer_name=f"Test Customer {random.randint(100, 999)}",
                    customer_phone="0711000000",
                    delivery_address=f"{random.randint(1, 100)} Analytics Street",
                    delivery_lat=-1.2920 + random.uniform(-0.05, 0.05),
                    delivery_lng=36.8219 + random.uniform(-0.05, 0.05),
                    weight_kg=random.uniform(5, 100),
                    quantity=random.randint(1, 10),
                    status='delivered',
                    warehouse_id=str(warehouse.id),
                    warehouse_name=warehouse.name,
                    warehouse_address=warehouse.address or 'Main Warehouse',
                    warehouse_lat=warehouse.lat or -1.286389,
                    warehouse_lng=warehouse.lng or 36.817223,
                    created_at=day - timedelta(hours=random.randint(1, 8)),
                    delivered_at=day,
                )
                created += 1

            for _ in range(num_failed):
                Order.objects.create(
                    customer_name=f"Failed Customer {random.randint(100, 999)}",
                    customer_phone="0722000000",
                    delivery_address=f"{random.randint(1, 100)} Fail Lane",
                    delivery_lat=-1.2920 + random.uniform(-0.05, 0.05),
                    delivery_lng=36.8219 + random.uniform(-0.05, 0.05),
                    weight_kg=random.uniform(5, 50),
                    quantity=random.randint(1, 5),
                    status='delivery_failed',
                    warehouse_id=str(warehouse.id),
                    warehouse_name=warehouse.name,
                    warehouse_address=warehouse.address or 'Main Warehouse',
                    warehouse_lat=warehouse.lat or -1.286389,
                    warehouse_lng=warehouse.lng or 36.817223,
                    created_at=day - timedelta(hours=random.randint(1, 6)),
                )
                created += 1

        self.stdout.write(f'  Created {created} test orders.')

    def _seed_exceptions(self):
        from api.models import OrderException, Order
        from drivers.models import Driver

        exception_types = [
            'address_not_found',
            'no_answer',
            'damaged',
            'refused',
            'vehicle_breakdown',
        ]
        
        driver = Driver.objects.first()
        if not driver:
            self.stdout.write(self.style.WARNING('  No driver found — skipping exceptions.'))
            return

        failed_orders = Order.objects.filter(status='delivery_failed')
        if not failed_orders.exists():
            self.stdout.write(self.style.WARNING('  No failed orders found — skipping exceptions.'))
            return

        created = 0
        for order in failed_orders:
            exc_type = random.choice(exception_types)
            OrderException.objects.get_or_create(
                order=order,
                defaults={
                    'exception_type': exc_type,
                    'notes': f'Auto-seeded: {exc_type.replace("_", " ").title()}',
                    'driver': driver,
                    'location_lat': order.delivery_lat,
                    'location_lng': order.delivery_lng,
                }
            )
            created += 1

        self.stdout.write(f'  Created {created} order exceptions.')

    def _seed_fuel_expenses(self):
        from vehicles.models import Vehicle, FuelExpense

        vehicles = list(Vehicle.objects.all()[:3])
        if not vehicles:
            self.stdout.write(self.style.WARNING('  No vehicles found — skipping fuel expenses.'))
            return

        today = date.today()
        created = 0
        for i in range(14):  # 2 weeks of fuel data
            day = today - timedelta(days=i)
            vehicle = vehicles[i % len(vehicles)]
            liters = decimal.Decimal(str(round(random.uniform(30, 80), 2)))
            cost_per_liter = decimal.Decimal('1.65')
            FuelExpense.objects.create(
                vehicle=vehicle,
                date=day,
                liters=liters,
                cost_per_liter=cost_per_liter,
                total_cost=(liters * cost_per_liter).quantize(decimal.Decimal('0.01')),
                mileage_at_refill=decimal.Decimal(str(round(random.uniform(10000, 80000), 2))),
                location='Main Depot Fuel Station',
            )
            created += 1

        self.stdout.write(f'  Created {created} fuel expense records.')

    def _seed_shipment_times(self):
        from api.models import Shipment

        shipments = Shipment.objects.filter(status='completed', accepted_at__isnull=True)[:10]
        updated = 0
        for shipment in shipments:
            base_time = timezone.now() - timedelta(days=random.randint(1, 7))
            duration_hours = random.uniform(1.5, 5.0)
            shipment.accepted_at = base_time
            shipment.completed_at = base_time + timedelta(hours=duration_hours)
            shipment.save(update_fields=['accepted_at', 'completed_at'])
            updated += 1

        self.stdout.write(f'  Updated {updated} shipments with route timing data.')
