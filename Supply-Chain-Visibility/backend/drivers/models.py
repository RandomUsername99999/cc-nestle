from django.db import models

# Safety Proxy to prevent framework circular import crashes
class Vehicle:
    pass

class Driver(models.Model):
    driver_id = models.AutoField(primary_key=True)
    employee = models.OneToOneField('api.Employee', on_delete=models.CASCADE, related_name='driver_profile', db_column='employee_id')
    license_number = models.CharField(max_length=50)
    license_expiry_date = models.DateField()
    license_type = models.CharField(max_length=20, default='heavy_vehicle')
    experience_years = models.DecimalField(max_digits=4, decimal_places=1, default=0.0)
    medical_certificate_expiry = models.DateField(null=True, blank=True)
    last_training_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, default='available')

    def __str__(self):
        return f"{self.employee.full_name if self.employee else 'Unknown'} ({self.license_number})"

    @property
    def id(self):
        return self.driver_id

    class Meta:
        managed = True
        db_table = 'drivers'

class TripLog(models.Model):
    log_id = models.AutoField(primary_key=True)
    driver = models.ForeignKey(Driver, on_delete=models.CASCADE, related_name='trip_logs')
    vehicle = models.ForeignKey('vehicles.Vehicle', on_delete=models.CASCADE, related_name='trip_logs', db_column='vehicle_id')
    start_time = models.DateTimeField()
    end_time = models.DateTimeField(null=True, blank=True)
    start_mileage = models.DecimalField(max_digits=10, decimal_places=2)
    end_mileage = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    fuel_consumed = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        managed = True
        db_table = 'driver_trip_logs'
