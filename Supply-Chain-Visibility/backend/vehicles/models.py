from django.db import models

class Vehicle(models.Model):
    vehicle_id = models.AutoField(primary_key=True)
    plate_number = models.CharField(max_length=20, unique=True)
    vehicle_type = models.CharField(max_length=15)
    manufacturer = models.CharField(max_length=50, blank=True, null=True)
    model = models.CharField(max_length=50, blank=True, null=True)
    year = models.IntegerField(blank=True, null=True)
    capacity_kg = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    capacity_volume = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    is_refrigerated = models.BooleanField(default=False)
    fuel_type = models.CharField(max_length=10, default='diesel')
    status = models.CharField(max_length=14, blank=True, null=True)
    insurance_expiry = models.DateField(blank=True, null=True)
    registration_expiry = models.DateField(blank=True, null=True)
    
    # New Fleet Mgmt Fields
    purchase_date = models.DateField(null=True, blank=True)
    current_mileage = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    next_service_mileage = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    next_service_date = models.DateField(null=True, blank=True)
    fuel_consumption_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0) # L/100km

    @property
    def licensePlate(self):
        return self.plate_number

    @property
    def storageCapacity(self):
        return float(self.capacity_kg) if self.capacity_kg else 0

    @property
    def volumeCapacity(self):
        return float(self.capacity_volume) if self.capacity_volume else 0

    @property
    def current_load_weight(self):
        # Note: This property will need to be updated since it references 'api.Order'
        # For now, we'll leave it as a placeholder or import it inside the property
        from api.models import Order
        return sum(float(o.weight_kg) for o in self.assigned_orders.filter(status='assigned'))

    @property
    def current_load_volume(self):
        from api.models import Order
        return sum(float(o.volume_m3) for o in self.assigned_orders.filter(status='assigned'))

    @property
    def hasFridge(self):
        return self.is_refrigerated
        
    @property
    def assignedDriver(self):
        # This will also need update if VehicleAssignment is moved
        from api.models import VehicleAssignment
        assignment = VehicleAssignment.objects.filter(vehicle=self, status='active').first()
        if assignment:
            return assignment.driver.id
        return None

    def __str__(self):
        return f"{self.plate_number} ({self.manufacturer} {self.model})"

    class Meta:
        managed = True
        db_table = 'vehicles'

class MaintenanceLog(models.Model):
    SERVICE_TYPES = [
        ('engine_oil', 'Engine Oil Change'),
        ('tire_rotation', 'Tire Rotation'),
        ('brake_service', 'Brake Service'),
        ('transmission', 'Transmission Flush'),
        ('general_check', 'General Inspection'),
        ('repair', 'Repair/Mechanical')
    ]
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='maintenance_logs')
    service_type = models.CharField(max_length=50, choices=SERVICE_TYPES)
    date = models.DateField()
    mileage_at_service = models.DecimalField(max_digits=12, decimal_places=2)
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    technician_notes = models.TextField(blank=True, null=True)
    next_service_due_mileage = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)

    class Meta:
        managed = True
        db_table = 'vehicle_maintenance_logs'

class FuelExpense(models.Model):
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='fuel_expenses')
    date = models.DateField()
    liters = models.DecimalField(max_digits=10, decimal_places=2)
    cost_per_liter = models.DecimalField(max_digits=10, decimal_places=2)
    total_cost = models.DecimalField(max_digits=10, decimal_places=2)
    mileage_at_refill = models.DecimalField(max_digits=12, decimal_places=2)
    location = models.CharField(max_length=200, blank=True, null=True)

    class Meta:
        managed = True
        db_table = 'vehicle_fuel_expenses'
