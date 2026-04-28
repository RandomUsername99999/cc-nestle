from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TripLogViewSet

router = DefaultRouter()
router.register(r'trip-logs', TripLogViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
