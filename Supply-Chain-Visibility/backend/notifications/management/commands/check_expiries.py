import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone
from vehicles.models import Vehicle
from drivers.models import Driver
from api.models import AuditLog

class Command(BaseCommand):
    help = 'Checks for upcoming driver license, vehicle registration, and insurance expiries (30 days from now)'

    def handle(self, *args, **options):
        today = timezone.now().date()
        target_date = today + datetime.timedelta(days=30)
        
        # Check Driver Licenses
        drivers = Driver.objects.filter(license_expiry_date=target_date)
        for driver in drivers:
            self.stdout.write(self.style.WARNING(f"Driver {driver.id} license expires in 30 days ({target_date})."))
            AuditLog.objects.create(
                user=driver.employee.user if (driver.employee and hasattr(driver.employee, 'user')) else None,
                action='EXPIRY_NOTIFICATION_SENT',
                resource_type='Driver',
                resource_id=driver.id,
                details=f"Push notification dispatched: License for driver {driver.employee.full_name if driver.employee else 'Unknown'} expires in 30 days."
            )
            
        # Check Vehicle Registration
        vehicles_reg = Vehicle.objects.filter(registration_expiry=target_date)
        for vehicle in vehicles_reg:
            self.stdout.write(self.style.WARNING(f"Vehicle {vehicle.vehicle_id} registration expires in 30 days ({target_date})."))
            AuditLog.objects.create(
                action='EXPIRY_NOTIFICATION_SENT',
                resource_type='Vehicle',
                resource_id=vehicle.vehicle_id,
                details=f"Push notification dispatched: Registration for vehicle {vehicle.plate_number} expires in 30 days."
            )
            
        # Check Vehicle Insurance
        vehicles_ins = Vehicle.objects.filter(insurance_expiry=target_date)
        for vehicle in vehicles_ins:
            self.stdout.write(self.style.WARNING(f"Vehicle {vehicle.vehicle_id} insurance expires in 30 days ({target_date})."))
            AuditLog.objects.create(
                action='EXPIRY_NOTIFICATION_SENT',
                resource_type='Vehicle',
                resource_id=vehicle.vehicle_id,
                details=f"Push notification dispatched: Insurance for vehicle {vehicle.plate_number} expires in 30 days."
            )
            
        # Check Vehicle Maintenance
        vehicles_maint = Vehicle.objects.filter(next_service_date=target_date)
        for vehicle in vehicles_maint:
            self.stdout.write(self.style.WARNING(f"Vehicle {vehicle.vehicle_id} requires maintenance in 30 days ({target_date})."))
            AuditLog.objects.create(
                action='EXPIRY_NOTIFICATION_SENT',
                resource_type='Vehicle',
                resource_id=vehicle.vehicle_id,
                details=f"Push notification dispatched: Maintenance for vehicle {vehicle.plate_number} is scheduled in 30 days."
            )
            
        self.stdout.write(self.style.SUCCESS('Successfully checked expiries.'))
