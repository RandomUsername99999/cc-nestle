from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import CustomUser, Vehicle, Order, AuditLog, VehicleAssignment

@receiver(post_save, sender=CustomUser)
@receiver(post_save, sender=Vehicle)
@receiver(post_save, sender=Order)
@receiver(post_save, sender=VehicleAssignment)
def log_create_or_update(sender, instance, created, **kwargs):
    action = 'CREATE' if created else 'UPDATE'
    resource_type = sender.__name__
    resource_id = getattr(instance, f"{resource_type.lower()}_id", getattr(instance, 'id', None))
    
    # Try to find the user who performed the action 
    # (Note: In a signals context, we don't have access to the request object directly.
    # For a truly robust audit log, we'd use middleware or pass the user-id explicitly.
    # However, for this implementation, we will log the action. If it's a User, we can log who was changed.)
    
    AuditLog.objects.create(
        action=f"{action}_{resource_type.upper()}",
        resource_type=resource_type,
        resource_id=resource_id,
        details=f"{resource_type} {resource_id} was {action.lower()}d."
    )

@receiver(post_delete, sender=CustomUser)
@receiver(post_delete, sender=Vehicle)
@receiver(post_delete, sender=Order)
def log_delete(sender, instance, **kwargs):
    resource_type = sender.__name__
    resource_id = getattr(instance, f"{resource_type.lower()}_id", getattr(instance, 'id', None))
    
    AuditLog.objects.create(
        action=f"DELETE_{resource_type.upper()}",
        resource_type=resource_type,
        resource_id=resource_id,
        details=f"{resource_type} {resource_id} was deleted."
    )
