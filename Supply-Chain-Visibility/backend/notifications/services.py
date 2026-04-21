def notify_driver_inbound_assignment(driver, assignment):
    """
    Triggers a notification to the driver about a new collection assignment.
    """
    from django.apps import apps
    AuditLog = apps.get_model('api', 'AuditLog')
    
    print(f"NOTIFICATION: Alerting Driver {driver.employee.full_name} for Pickup MS-{assignment.manifest.manifest_reference}")
    
    # Audit log entry for visibility in the management console
    AuditLog.objects.create(
        user=driver.employee.user,
        action='INBOUND_NOTIFICATION_SENT',
        resource_type='InboundAssignment',
        resource_id=None, # resource_id is an IntegerField, so we store the UUID in details instead
        details=f"Push notification dispatched to driver regarding Supplier pickup {assignment.manifest.manifest_reference}. Assignment ID: {assignment.id}"
    )

def notify_dashboard_inbound_exception(assignment, exceptions):
    """Notify dashboard managers of an exception during collection."""
    print(f"DASHBOARD ALERT: {len(exceptions)} exceptions reported for pickup {assignment.manifest.manifest_reference}")

def notify_dashboard_assignment_complete(assignment, summary):
    """Notify dashboard that a pickup has been completed and returned to hub."""
    print(f"DASHBOARD UPDATE: Pickup {assignment.manifest.manifest_reference} completed by {assignment.driver.employee.full_name if assignment.driver else 'system'}")
