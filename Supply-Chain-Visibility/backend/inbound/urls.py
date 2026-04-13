from django.urls import path
from .views import (
    ManifestListCreateView, ManifestDetailView,
    AssignmentCreateView, AssignmentAcceptView,
    DepartureConfirmView, SupplierArrivalScanView,
    GoodsVerificationView, ItemScanView,
    WarehouseArrivalScanView,
    AssignmentCompleteView, LiveInboundView,
    DockAvailabilityView,
)


urlpatterns = [
    # Management
    path('manifests/',                         ManifestListCreateView.as_view()),
    path('manifests/<uuid:pk>/',               ManifestDetailView.as_view()),
    path('manifests/<uuid:manifest_id>/assign/', AssignmentCreateView.as_view()),
    path('docks/availability/',                DockAvailabilityView.as_view()),


    # Driver flow
    path('assignments/<uuid:pk>/accept/',             AssignmentAcceptView.as_view()),
    path('assignments/<uuid:pk>/depart/',             DepartureConfirmView.as_view()),
    path('assignments/<uuid:pk>/scan-supplier/',      SupplierArrivalScanView.as_view()),
    path('assignments/<uuid:pk>/verify-goods/',       GoodsVerificationView.as_view()),
    path('assignments/<uuid:pk>/scan-item/',          ItemScanView.as_view()),
    path('assignments/<uuid:pk>/scan-warehouse/',     WarehouseArrivalScanView.as_view()),
    path('assignments/<uuid:pk>/complete/',           AssignmentCompleteView.as_view()),

    # Dashboard live view
    path('assignments/live/',                         LiveInboundView.as_view()),
]
