from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.core.cache import cache
from .views import (
    UserViewSet, VehicleViewSet, VehicleAssignmentViewSet, 
    CustomTokenObtainPairView, OrderViewSet, AuditLogViewSet, 
    dispatch_recommendations, ShipmentViewSet,
    DeliverySearchView, LiveVehicleView, OrderAuditView, ChangePasswordView,
    ProofOfDeliveryViewSet, ReportViewSet, OrderExceptionViewSet, UniversalSearchView
)
from .serializers import UserSerializer, VehicleSerializer, VehicleAssignmentSerializer
from rest_framework_simplejwt.views import TokenRefreshView
from .views import tracking_location, get_locations

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)

router = DefaultRouter()
router.register(r'users', UserViewSet, basename='users')
router.register(r'vehicles', VehicleViewSet)
router.register(r'assignments', VehicleAssignmentViewSet, basename='assignments')
router.register(r'orders', OrderViewSet)
router.register(r'shipments', ShipmentViewSet)
router.register(r'audit-logs', AuditLogViewSet)
router.register(r'pods', ProofOfDeliveryViewSet)
router.register(r'reports', ReportViewSet, basename='reports')
router.register(r'exceptions', OrderExceptionViewSet)

urlpatterns = [
    path('me/', current_user),
    path('', include(router.urls)),
    path('token/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('tracking/location/', tracking_location),
    path('tracking/locations/', get_locations),
    path('dispatch/recommendations/', dispatch_recommendations),
    path('search/deliveries/', DeliverySearchView.as_view()),
    path('search/live-vehicles/', LiveVehicleView.as_view()),
    path('search/audit/<int:order_id>/', OrderAuditView.as_view()),
    path('search/', UniversalSearchView.as_view()),
    path('change-password/', ChangePasswordView.as_view()),
]
