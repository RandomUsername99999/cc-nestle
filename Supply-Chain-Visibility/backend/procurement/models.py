import uuid
from django.db import models
from django.conf import settings

class Supplier(models.Model):
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name            = models.CharField(max_length=255)
    address         = models.TextField()
    lat             = models.DecimalField(max_digits=10, decimal_places=7)
    lng             = models.DecimalField(max_digits=10, decimal_places=7)
    contact_name    = models.CharField(max_length=255, blank=True)
    contact_phone   = models.CharField(max_length=30, blank=True)
    qr_token        = models.CharField(max_length=512, unique=True)  # signed JWT
    created_at      = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name

class PurchaseOrder(models.Model):
    STATUS = [
        ('draft','Draft'), ('confirmed','Confirmed'),
        ('assigned','Assigned'), ('in_transit','In transit'),
        ('partially_received','Partially received'),
        ('received','Received'), ('cancelled','Cancelled'),
    ]
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4)
    po_reference    = models.CharField(max_length=64, unique=True)
    supplier        = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name='purchase_orders')
    created_by      = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    status          = models.CharField(max_length=32, choices=STATUS, default='draft')
    expected_pickup = models.DateTimeField()
    destination     = models.CharField(max_length=32, choices=[
        ('warehouse','Warehouse'), ('production','Production floor')
    ], default='warehouse')
    warehouse       = models.ForeignKey('warehouses.Warehouse', on_delete=models.SET_NULL, null=True, blank=True)
    notes           = models.TextField(blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)

class POLineItem(models.Model):
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4)
    purchase_order  = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='line_items')
    item_code       = models.CharField(max_length=64)
    description     = models.CharField(max_length=255)
    unit            = models.CharField(max_length=32)
    ordered_qty     = models.DecimalField(max_digits=10, decimal_places=3)
    received_qty    = models.DecimalField(max_digits=10, decimal_places=3, default=0)
    
    @property
    def shortfall(self):
        return max(self.ordered_qty - self.received_qty, 0)

class SupplierRun(models.Model):
    """
    One driver trip strictly to ONE supplier to collect one or multiple PurchaseOrders.
    """
    STATUS = [
        ('pending','Pending'), ('assigned','Assigned'),
        ('accepted','Accepted'), ('en_route_supplier','En route to supplier'),
        ('arrived','Arrived'), ('verifying','Verifying Goods'),
        ('en_route_warehouse','En route to warehouse'), 
        ('completed','Completed'), ('cancelled','Cancelled'),
    ]
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4)
    run_reference   = models.CharField(max_length=64, unique=True)
    supplier        = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name='runs')
    driver          = models.ForeignKey('drivers.Driver', on_delete=models.SET_NULL, null=True, related_name='supplier_runs')
    vehicle         = models.ForeignKey('vehicles.Vehicle', on_delete=models.SET_NULL, null=True)
    status          = models.CharField(max_length=32, choices=STATUS, default='pending')
    scheduled_date  = models.DateField()
    
    # Timestamps for tracking the single-trip lifecycle
    accepted_at     = models.DateTimeField(null=True, blank=True)
    departed_for_supplier_at = models.DateTimeField(null=True, blank=True)
    arrived_at_supplier_at   = models.DateTimeField(null=True, blank=True)
    collection_finished_at   = models.DateTimeField(null=True, blank=True)
    completed_at    = models.DateTimeField(null=True, blank=True)
    created_at      = models.DateTimeField(auto_now_add=True)

class RunPurchaseOrder(models.Model):
    """Mapping table linking the run to the specific POs being collected from that supplier."""
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4)
    supplier_run    = models.ForeignKey(SupplierRun, on_delete=models.CASCADE, related_name='run_pos')
    purchase_order  = models.ForeignKey(PurchaseOrder, on_delete=models.PROTECT)

class GoodsReceiptLine(models.Model):
    """Actual quantity received per line item — recorded by driver at supplier."""
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4)
    supplier_run    = models.ForeignKey(SupplierRun, on_delete=models.CASCADE, related_name='receipt_lines')
    po_line_item    = models.ForeignKey(POLineItem, on_delete=models.PROTECT)
    received_qty    = models.DecimalField(max_digits=10, decimal_places=3)
    condition       = models.CharField(max_length=32, choices=[
        ('good','Good'), ('damaged','Damaged'), ('rejected','Rejected')
    ], default='good')
    condition_notes = models.TextField(blank=True)
    photo_urls      = models.JSONField(default=list)
    scanned_at      = models.DateTimeField(auto_now_add=True)

class InboundException(models.Model):
    TYPES = [
        ('shortfall','Shortfall'), ('damaged_goods','Damaged goods'),
        ('supplier_absent','Supplier absent'), ('wrong_goods','Wrong goods'),
        ('vehicle_issue','Vehicle issue'), ('delay','Delay'),
    ]
    id              = models.UUIDField(primary_key=True, default=uuid.uuid4)
    supplier_run    = models.ForeignKey(SupplierRun, on_delete=models.CASCADE, related_name='exceptions')
    exception_type  = models.CharField(max_length=32, choices=TYPES)
    reported_by     = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    reported_at     = models.DateTimeField(auto_now_add=True)
    notes           = models.TextField(blank=True)
    photo_urls      = models.JSONField(default=list)
    resolved        = models.BooleanField(default=False)
