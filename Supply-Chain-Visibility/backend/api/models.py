from django.db import models
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin

class Role(models.Model):
    role_id = models.AutoField(primary_key=True)
    role_name = models.CharField(max_length=50, unique=True)
    role_description = models.TextField(blank=True, null=True)

    class Meta:
        managed = True
        db_table = 'roles'

class CustomUserManager(BaseUserManager):
    def create_user(self, username, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = self.normalize_email(email)
        user = self.model(username=username, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, username, email, password=None, **extra_fields):
        extra_fields.setdefault('is_superuser', True)
        # Create a default admin role if it doesn't exist
        from api.models import Role
        role, _ = Role.objects.get_or_create(
            role_name='Admin',
            defaults={'role_description': 'System Administrator'}
        )
        extra_fields['role'] = role
        return self.create_user(username, email, password, **extra_fields)

class CustomUser(AbstractBaseUser, PermissionsMixin):
    user_id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=50, unique=True)
    email = models.CharField(max_length=255, unique=True)
    role = models.ForeignKey(Role, models.DO_NOTHING, db_column='role_id')
    is_active = models.BooleanField(default=True)
    
    objects = CustomUserManager()

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['email']

    class Meta:
        managed = True
        db_table = 'users'
        
    @property
    def id(self):
        return self.user_id

from vehicles.models import Vehicle
from drivers.models import Driver as DriverProfile

class Employee(models.Model):
    employee_id = models.AutoField(primary_key=True)
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='employee_profile', db_column='user_id')
    full_name = models.CharField(max_length=150)
    national_id = models.CharField(max_length=50)
    contact_number = models.CharField(max_length=20)
    address = models.TextField()
    date_of_birth = models.DateField()
    hire_date = models.DateField(auto_now_add=True)
    termination_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, default='active')
    emergency_contact_name = models.CharField(max_length=100, null=True, blank=True)
    emergency_contact_number = models.CharField(max_length=20, null=True, blank=True)

    class Meta:
        managed = True
        db_table = 'employees'

# DriverProfile is now imported from drivers.models as a proxy/link

class Customer(models.Model):
    customer_id = models.AutoField(primary_key=True)
    user = models.OneToOneField(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, related_name='customer_profile', db_column='user_id')
    business_name = models.CharField(max_length=150, null=True, blank=True)
    contact_person_name = models.CharField(max_length=100, null=True, blank=True)
    email = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20)
    alternate_phone = models.CharField(max_length=20, null=True, blank=True)
    address = models.TextField()
    latitude = models.DecimalField(max_digits=10, decimal_places=8, default=0.0)
    longitude = models.DecimalField(max_digits=11, decimal_places=8, default=0.0)
    tax_id = models.CharField(max_length=50, null=True, blank=True)
    credit_limit = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    payment_terms = models.IntegerField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        managed = True
        db_table = 'customers'

class VehicleAssignment(models.Model):
    assignment_id = models.AutoField(primary_key=True)
    driver = models.ForeignKey('drivers.Driver', on_delete=models.SET_NULL, null=True, blank=True, related_name='assignments', db_column='driver_id')
    vehicle = models.ForeignKey('vehicles.Vehicle', on_delete=models.SET_NULL, null=True, blank=True, related_name='assignments', db_column='vehicle_id')
    assignment_start_date = models.DateTimeField(auto_now_add=True)
    assignment_end_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, default='active')
    assigned_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True, db_column='assigned_by')

    class Meta:
        managed = True
        db_table = 'driver_vehicle_assignments'

class Order(models.Model):
    order_id = models.AutoField(primary_key=True)
    SHIPMENT_CHOICES = [('package', 'Package'), ('pallet', 'Pallet')]
    STATUS_CHOICES = [
        ('pending', 'Pending'), 
        ('assigned', 'Assigned'), 
        ('in_transit', 'In Transit'), 
        ('delivered', 'Delivered'), 
        ('delivery_failed', 'Delivery Failed'),
        ('cancelled', 'Cancelled')
    ]
    
    shipment_type = models.CharField(max_length=10, choices=SHIPMENT_CHOICES, default='package')
    quantity = models.IntegerField(default=1)
    weight_kg = models.DecimalField(max_digits=10, decimal_places=2)
    volume_m3 = models.DecimalField(max_digits=10, decimal_places=2)
    requires_refrigeration = models.BooleanField(default=False)
    
    pickup_address = models.TextField()
    delivery_address = models.TextField()
    pickup_lat = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    pickup_lng = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    delivery_lat = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    delivery_lng = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    
    # Warehouse Info
    warehouse_id = models.CharField(max_length=50, default='WH-001')
    warehouse_name = models.CharField(max_length=100, default='Main Distribution Center')
    warehouse_address = models.TextField(default='123 Logistics Way, Industrial Zone')
    warehouse_lat = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    warehouse_lng = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    warehouse_pickup_start = models.DateTimeField(null=True, blank=True)
    warehouse_pickup_end = models.DateTimeField(null=True, blank=True)

    # Task Assignment Links
    assigned_vehicle = models.ForeignKey('vehicles.Vehicle', on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_orders')
    assigned_driver = models.ForeignKey('drivers.Driver', on_delete=models.SET_NULL, null=True, blank=True, related_name='assigned_tasks')

    status = models.CharField(max_length=15, choices=STATUS_CHOICES, default='pending')
    
    # Delivery Confirmation
    delivered_at = models.DateTimeField(null=True, blank=True)
    delivered_by_driver_id = models.IntegerField(null=True, blank=True)
    delivery_location_lat = models.DecimalField(max_digits=10, decimal_places=8, null=True, blank=True)
    delivery_location_lng = models.DecimalField(max_digits=11, decimal_places=8, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = 'orders'

class Shipment(models.Model):
    shipment_id = models.AutoField(primary_key=True)
    vehicle = models.ForeignKey('vehicles.Vehicle', on_delete=models.SET_NULL, null=True, blank=True, related_name='shipments')
    driver = models.ForeignKey('drivers.Driver', on_delete=models.SET_NULL, null=True, blank=True, related_name='shipments')
    
    total_weight = models.DecimalField(max_digits=10, decimal_places=2)
    total_volume = models.DecimalField(max_digits=10, decimal_places=2)
    
    TYPE_CHOICES = [('package', 'Package'), ('pallet', 'Pallet'), ('mixed', 'Mixed')]
    shipment_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default='mixed')
    requires_refrigeration = models.BooleanField(default=False)
    
    status = models.CharField(max_length=20, default='planned') # planned, assigned, accepted, in_progress, completed
    
    # Scheduling & Routing
    scheduled_pickup_time = models.DateTimeField(null=True, blank=True)
    leave_by_time = models.DateTimeField(null=True, blank=True)
    route_sequence = models.JSONField(default=list, blank=True) # Ordered list of order_ids

    created_at = models.DateTimeField(auto_now_add=True)
    deployed_at = models.DateTimeField(null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    pickup_scanned_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        managed = True
        db_table = 'shipments'

class ShipmentOrder(models.Model):
    shipment = models.ForeignKey(Shipment, on_delete=models.CASCADE, related_name='order_mappings')
    order = models.ForeignKey('Order', on_delete=models.CASCADE, related_name='shipment_mappings')
    
    class Meta:
        managed = True
        db_table = 'shipment_orders'
        unique_together = ('shipment', 'order')

class GPSPersistence(models.Model):
    persistence_id = models.AutoField(primary_key=True)
    driver = models.ForeignKey('drivers.Driver', on_delete=models.CASCADE, related_name='gps_history')
    latitude = models.DecimalField(max_digits=10, decimal_places=8)
    longitude = models.DecimalField(max_digits=11, decimal_places=8)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = True
        db_table = 'gps_persistence'

class OrderStatusLog(models.Model):
    log_id = models.AutoField(primary_key=True)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='status_logs')
    from_status = models.CharField(max_length=20)
    to_status = models.CharField(max_length=20)
    changed_at = models.DateTimeField(auto_now_add=True)
    changed_by = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)
    source = models.CharField(max_length=20) # system, driver_scan, dispatcher, driver_exception

    class Meta:
        managed = True
        db_table = 'order_status_logs'

class OrderException(models.Model):
    exception_id = models.AutoField(primary_key=True)
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='exceptions')
    exception_type = models.CharField(max_length=50) # No answer, Address not found, Refused, Damaged
    reported_at = models.DateTimeField(auto_now_add=True)
    driver = models.ForeignKey('drivers.Driver', on_delete=models.CASCADE)
    location_lat = models.DecimalField(max_digits=10, decimal_places=8)
    location_lng = models.DecimalField(max_digits=11, decimal_places=8)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        managed = True
        db_table = 'order_exceptions'

class AuditLog(models.Model):
    log_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(CustomUser, on_delete=models.SET_NULL, null=True, blank=True)
    action = models.CharField(max_length=50) # e.g., 'LOGIN', 'CREATE_ORDER', 'UPDATE_VEHICLE'
    resource_type = models.CharField(max_length=50) # e.g., 'Order', 'Vehicle'
    resource_id = models.IntegerField(null=True, blank=True)
    details = models.TextField(blank=True, null=True)
    timestamp = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = True
        db_table = 'audit_logs'
