from django.db.models import Q, F
from django.db import connection
from .models import Order

class DeliverySearchService:
    def __init__(self, user, params):
        self.user = user
        self.params = params

    def execute(self):
        qs = Order.objects.select_related(
            'assigned_driver', 'assigned_vehicle',
            'assigned_driver__employee'
        )

        q = self.params.get('q')
        if q:
            if connection.vendor == 'postgresql':
                from django.contrib.postgres.search import SearchVector, SearchQuery, SearchRank
                search_vector = (
                    SearchVector('delivery_address', weight='A') +
                    SearchVector('assigned_driver__employee__full_name', weight='B') +
                    SearchVector('assigned_vehicle__plate_number', weight='C')
                )
                search_query = SearchQuery(q)
                qs = qs.annotate(
                    rank=SearchRank(search_vector, search_query)
                ).filter(rank__gt=0.01).order_by('-rank')
            else:
                # SQLite/MySQL fallback using icontains
                search_filter = Q(delivery_address__icontains=q) | \
                                Q(assigned_driver__employee__full_name__icontains=q) | \
                                Q(assigned_vehicle__plate_number__icontains=q) | \
                                Q(warehouse_id__icontains=q) | \
                                Q(warehouse_name__icontains=q)
                if q.isdigit():
                    search_filter |= Q(order_id=int(q))
                qs = qs.filter(search_filter).distinct()

        if self.user.role and self.user.role.role_name.lower() == 'driver':
            qs = qs.filter(assigned_driver__user=self.user)

        return qs
