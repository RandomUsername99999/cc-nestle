from ..models import SupplierRun, RunPurchaseOrder
import shortuuid

def create_supplier_run(purchase_orders, driver, vehicle, scheduled_date):
    # Enforce one supplier rule
    if not purchase_orders:
        raise ValueError("At least one purchase order must be provided.")
        
    supplier = purchase_orders[0].supplier
    if any(po.supplier != supplier for po in purchase_orders):
        raise ValueError("A single run can only be assigned to one supplier.")

    run = SupplierRun.objects.create(
        run_reference=f'RUN-{shortuuid.uuid()[:8].upper()}',
        supplier=supplier,
        driver=driver,
        vehicle=vehicle,
        scheduled_date=scheduled_date,
        status='assigned',
    )

    for po in purchase_orders:
        RunPurchaseOrder.objects.create(supplier_run=run, purchase_order=po)
        po.status = 'assigned'
        po.save(update_fields=['status'])

    # Send push notification to driver
    try:
        from notifications.services import send_supplier_run_notification
        send_supplier_run_notification(driver, run)
    except ImportError:
        print("Notification service not found, skipping push notification.")
    except Exception as e:
        print(f"Error sending notification: {e}")
        
    return run
