from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import WarehouseViewSet, StockTransferViewSet

router = DefaultRouter()
router.register(r'warehouses', WarehouseViewSet)
router.register(r'transfers', StockTransferViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
