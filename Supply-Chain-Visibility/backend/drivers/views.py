from rest_framework import viewsets, permissions
from .models import TripLog
from .serializers import TripLogSerializer

class TripLogViewSet(viewsets.ModelViewSet):
    queryset = TripLog.objects.all().order_by('-start_time')
    serializer_class = TripLogSerializer
    permission_classes = [permissions.IsAuthenticated]
