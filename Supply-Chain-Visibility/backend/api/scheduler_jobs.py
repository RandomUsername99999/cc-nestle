from datetime import timedelta
from django.utils import timezone
from .models import GPSPersistence
import logging

logger = logging.getLogger(__name__)

def cleanup_old_gps_data():
    """
    Delete GPS records older than 2 hours to maintain system performance.
    """
    now = timezone.now()
    two_hours_ago = now - timedelta(hours=2)
    
    deleted_count, _ = GPSPersistence.objects.filter(timestamp__lt=two_hours_ago).delete()
    if deleted_count > 0:
        logger.info(f"Cleanup: Deleted {deleted_count} old GPS persistence records.")
