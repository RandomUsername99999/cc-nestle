import uuid
from django.db import models

class SpecialHandlingType(models.TextChoices):
    NONE        = 'none',        'None'
    COOLING     = 'cooling',     'Requires cooling'
    FROZEN      = 'frozen',      'Requires freezing'
    FRAGILE     = 'fragile',     'Fragile'
    HAZARDOUS   = 'hazardous',   'Hazardous material'
    DRY_STORAGE = 'dry_storage', 'Dry storage only'

class Supplier(models.Model):
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name            = models.CharField(max_length=255)
    address         = models.TextField()
    lat             = models.DecimalField(max_digits=10, decimal_places=7)
    lng             = models.DecimalField(max_digits=10, decimal_places=7)
    contact_name    = models.CharField(max_length=255, blank=True)
    contact_phone   = models.CharField(max_length=30, blank=True)
    qr_token        = models.CharField(max_length=512, unique=True)  # signed JWT for location scan
    created_at      = models.DateTimeField(auto_now_add=True)

class SupplierDeliveryManifest(models.Model):
    """
    Created when the warehouse receives a supplier's notice of what
    they are ready to dispatch. This is the inbound equivalent of a
    customer order — it describes what is coming before the driver is sent.
    """
    STATUS = [
        ('received',   'Manifest received'),
        ('planned',    'Collection planned'),
        ('assigned',   'Driver assigned'),
        ('in_transit', 'Driver in transit'),
        ('collected',  'Collected — returning'),
        ('delivered',  'Delivered to warehouse'),
        ('discrepancy','Delivered with discrepancy'),
        ('cancelled',  'Cancelled'),
    ]
    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4)
    manifest_reference  = models.CharField(max_length=64, unique=True)
    supplier            = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name='manifests')
    status              = models.CharField(max_length=32, choices=STATUS, default='received')
    expected_collection = models.DateTimeField()
    destination         = models.CharField(max_length=32, choices=[
        ('warehouse',   'Main warehouse'),
        ('production',  'Production floor'),
    ], default='warehouse')
    warehouse           = models.ForeignKey(
        'warehouses.Warehouse', on_delete=models.SET_NULL, null=True
    )
    # Totals from line items — denormalised for quick vehicle matching
    total_weight_kg     = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_volume_m3     = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    special_handling    = models.CharField(
        max_length=32, choices=SpecialHandlingType.choices, default=SpecialHandlingType.NONE
    )
    temperature_min_c   = models.DecimalField(
        max_digits=5, decimal_places=1, null=True, blank=True,
        help_text='Required if special_handling is cooling or frozen'
    )
    temperature_max_c   = models.DecimalField(
        max_digits=5, decimal_places=1, null=True, blank=True
    )
    supplier_notes      = models.TextField(blank=True)
    created_at          = models.DateTimeField(auto_now_add=True)
    updated_at          = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        # Recalculate totals from line items before saving
        if self.pk:
            agg = self.line_items.aggregate(
                tw=models.Sum('total_weight_kg'),
                tv=models.Sum('total_volume_m3'),
            )
            self.total_weight_kg = agg['tw'] or 0
            self.total_volume_m3 = agg['tv'] or 0
        super().save(*args, **kwargs)

class ManifestLineItem(models.Model):
    id               = models.UUIDField(primary_key=True, default=uuid.uuid4)
    manifest         = models.ForeignKey(
        SupplierDeliveryManifest, on_delete=models.CASCADE, related_name='line_items'
    )
    item_code        = models.CharField(max_length=64)
    description      = models.CharField(max_length=255)
    unit             = models.CharField(max_length=32)       # kg, units, crates, etc.
    expected_qty     = models.DecimalField(max_digits=10, decimal_places=3)
    received_qty     = models.DecimalField(max_digits=10, decimal_places=3, default=0) # Added this based on reconciliation code
    unit_weight_kg   = models.DecimalField(max_digits=8, decimal_places=3, default=0)
    unit_volume_m3   = models.DecimalField(max_digits=8, decimal_places=4, default=0)
    total_weight_kg  = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    total_volume_m3  = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    special_handling = models.CharField(
        max_length=32, choices=SpecialHandlingType.choices, default=SpecialHandlingType.NONE
    )
    qr_code          = models.CharField(max_length=255, blank=True)  # item-level QR if available
    barcode          = models.CharField(max_length=128, blank=True)

    def save(self, *args, **kwargs):
        self.total_weight_kg = float(self.expected_qty) * float(self.unit_weight_kg)
        self.total_volume_m3 = float(self.expected_qty) * float(self.unit_volume_m3)
        super().save(*args, **kwargs)

class InboundCollectionAssignment(models.Model):
    """
    The actual driver + vehicle assignment for collecting a manifest.
    One assignment per manifest (one supplier per trip).
    """
    STATUS = [
        ('pending',     'Pending'),
        ('assigned',    'Assigned'),
        ('accepted',    'Accepted by driver'),
        ('en_route',    'En route to supplier'),
        ('at_supplier', 'At supplier'),
        ('verifying',   'Verifying goods'),
        ('returning',   'Returning to warehouse'),
        ('completed',   'Completed'),
        ('failed',      'Failed'),
    ]
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4)
    manifest        = models.OneToOneField(
        SupplierDeliveryManifest, on_delete=models.PROTECT, related_name='assignment'
    )
    driver          = models.ForeignKey('drivers.Driver', on_delete=models.SET_NULL, null=True)
    vehicle         = models.ForeignKey('vehicles.Vehicle', on_delete=models.SET_NULL, null=True)
    status          = models.CharField(max_length=32, choices=STATUS, default='pending')
    tracking_mode   = models.CharField(max_length=32, default='full')
    # Vehicle capability check results — stored for audit
    vehicle_capacity_ok  = models.BooleanField(default=False)
    vehicle_cooling_ok   = models.BooleanField(default=False)
    # Key timestamps
    assigned_at     = models.DateTimeField(null=True, blank=True)
    accepted_at     = models.DateTimeField(null=True, blank=True)
    departed_at     = models.DateTimeField(null=True, blank=True)
    arrived_at_supplier = models.DateTimeField(null=True, blank=True)
    collection_completed_at = models.DateTimeField(null=True, blank=True)
    arrived_at_warehouse = models.DateTimeField(null=True, blank=True)
    completed_at    = models.DateTimeField(null=True, blank=True)
    scheduled_pickup_time = models.DateTimeField(null=True, blank=True)
    dock_number     = models.CharField(max_length=10, blank=True)


class CollectedLineItem(models.Model):
    """Actual quantity and condition recorded by driver at supplier."""
    CONDITION = [
        ('good',     'Good'),
        ('damaged',  'Damaged'),
        ('rejected', 'Rejected — not loaded'),
    ]
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4)
    assignment      = models.ForeignKey(
        InboundCollectionAssignment, on_delete=models.CASCADE, related_name='collected_items'
    )
    manifest_line   = models.ForeignKey(ManifestLineItem, on_delete=models.PROTECT)
    collected_qty   = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    condition       = models.CharField(max_length=32, choices=CONDITION, default='good')
    condition_notes = models.TextField(blank=True)
    scanned_qr      = models.CharField(max_length=255, blank=True)
    photo_urls      = models.JSONField(default=list)
    verified_at     = models.DateTimeField(auto_now_add=True)

    @property
    def shortfall(self):
        return max(float(self.manifest_line.expected_qty) - float(self.collected_qty), 0)

class InboundException(models.Model):
    TYPES = [
        ('shortfall',         'Shortfall'),
        ('damaged_goods',     'Damaged goods'),
        ('wrong_goods',       'Wrong goods received'),
        ('supplier_absent',   'Supplier not present'),
        ('cooling_breach',    'Temperature/cooling issue'),
        ('vehicle_mismatch',  'Vehicle not suitable'),
        ('delay',             'Delay in transit'),
        ('refused',           'Collection refused'),
    ]
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4)
    assignment      = models.ForeignKey(
        InboundCollectionAssignment, on_delete=models.CASCADE, related_name='exceptions'
    )
    manifest_line   = models.ForeignKey(
        ManifestLineItem, on_delete=models.SET_NULL, null=True, blank=True
    )
    exception_type  = models.CharField(max_length=32, choices=TYPES)
    reported_by     = models.ForeignKey('api.CustomUser', on_delete=models.SET_NULL, null=True, related_name='inbound_exceptions_reported')
    reported_at     = models.DateTimeField(auto_now_add=True)
    location_lat    = models.DecimalField(max_digits=10, decimal_places=7, null=True)
    location_lng    = models.DecimalField(max_digits=10, decimal_places=7, null=True)
    notes           = models.TextField(blank=True)
    photo_urls      = models.JSONField(default=list)
    resolved        = models.BooleanField(default=False)
    resolved_notes  = models.TextField(blank=True)
    resolved_at     = models.DateTimeField(null=True, blank=True)
