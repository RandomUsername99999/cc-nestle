from django.urls import path
from .views import (
    SupplierQRScanView, GoodsVerificationView, 
    InboundExceptionView, RunCompleteView,
)

urlpatterns = [
    # Driver flow
    path('supplier-runs/<uuid:run_id>/scan-arrival/', SupplierQRScanView.as_view()),
    path('supplier-runs/<uuid:run_id>/verify-goods/', GoodsVerificationView.as_view()),
    path('supplier-runs/<uuid:run_id>/exception/', InboundExceptionView.as_view()),
    
    # Warehouse receipt
    path('supplier-runs/<uuid:run_id>/complete/', RunCompleteView.as_view()),
]
