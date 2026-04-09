import django_filters
from django.db.models import Q
from .models import Order

class DeliverySearchFilter(django_filters.FilterSet):
    # Free-text — searches order_id, delivery_address, driver name, vehicle plate
    q = django_filters.CharFilter(method='noop')

    # Date range
    date_from = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    date_to   = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')

    # Entity filters
    driver_id      = django_filters.NumberFilter(field_name='assigned_driver__driver_id')
    vehicle_id     = django_filters.NumberFilter(field_name='assigned_vehicle__vehicle_id')
    
    # Status filters
    status = django_filters.MultipleChoiceFilter(
        choices=Order.STATUS_CHOICES
    )

    # Exception filter (through theoretical relationship if we filter orders by their exceptions)
    exception_type = django_filters.MultipleChoiceFilter(
        field_name='exceptions__exception_type',
        choices=[
            ('no_answer','No answer'),
            ('address_not_found','Address not found'),
            ('refused','Customer refused'),
            ('damaged','Damaged parcel'),
            ('wrong_parcel','Wrong parcel'),
        ]
    )

    # Bounding box — filter by delivery loc
    bbox_lat_min = django_filters.NumberFilter(field_name='delivery_lat', lookup_expr='gte')
    bbox_lat_max = django_filters.NumberFilter(field_name='delivery_lat', lookup_expr='lte')
    bbox_lng_min = django_filters.NumberFilter(field_name='delivery_lng', lookup_expr='gte')
    bbox_lng_max = django_filters.NumberFilter(field_name='delivery_lng', lookup_expr='lte')

    def noop(self, queryset, name, value):
        return queryset

    class Meta:
        model = Order
        fields = ['status', 'requires_refrigeration']
