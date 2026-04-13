from rest_framework import serializers
from .models import (
    SupplierDeliveryManifest, InboundCollectionAssignment,
    CollectedLineItem, ManifestLineItem, InboundException,
    Supplier
)

class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = '__all__'

class ManifestLineItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ManifestLineItem
        fields = '__all__'

class ManifestSerializer(serializers.ModelSerializer):
    supplier = SupplierSerializer(read_only=True)
    line_items = ManifestLineItemSerializer(many=True, read_only=True)

    class Meta:
        model = SupplierDeliveryManifest
        fields = '__all__'

class AssignmentDetailSerializer(serializers.ModelSerializer):
    manifest = ManifestSerializer(read_only=True)
    vehicle_details = serializers.SerializerMethodField()
    
    class Meta:
        model = InboundCollectionAssignment
        fields = '__all__'

    def get_vehicle_details(self, obj):
        if obj.vehicle:
            return {
                'plate_number': obj.vehicle.plate_number,
                'model': f"{obj.vehicle.manufacturer} {obj.vehicle.model}" if obj.vehicle.model else obj.vehicle.manufacturer
            }
        return None


class CollectedLineItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = CollectedLineItem
        fields = '__all__'

class InboundExceptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = InboundException
        fields = '__all__'
