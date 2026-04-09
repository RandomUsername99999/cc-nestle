import os, sys, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'server.settings')
django.setup()
import logging
logging.basicConfig(level=logging.DEBUG)
dl = logging.getLogger('django.db.backends')
dl.setLevel(logging.DEBUG)
dl.addHandler(logging.StreamHandler())

from api.models import Vehicle
try:
    Vehicle.objects.create(plate_number='TEST999', vehicle_type='Truck', year=2026, capacity_kg=78, capacity_volume=98)
except Exception as e:
    print("FAILED", e)
