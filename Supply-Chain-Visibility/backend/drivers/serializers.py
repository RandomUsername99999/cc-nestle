from rest_framework import serializers
from .models import Driver, TripLog

class TripLogSerializer(serializers.ModelSerializer):
    driver_name = serializers.CharField(source='driver.employee.full_name', read_only=True)
    vehicle_plate = serializers.CharField(source='vehicle.plate_number', read_only=True)
    
    class Meta:
        model = TripLog
        fields = '__all__'
