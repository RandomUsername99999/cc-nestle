from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, JSONParser
from rest_framework.generics import ListCreateAPIView, RetrieveAPIView
from django.utils import timezone
# Bytecode refresh: 2026-04-16-11:10

from django.db import transaction
from django.db import models
from .models import (
    SupplierDeliveryManifest, InboundCollectionAssignment,
    CollectedLineItem, ManifestLineItem, InboundException,
)
from vehicles.models import Vehicle
from drivers.models import Driver
from .services.vehicle_matching import find_eligible_vehicles, validate_assignment
from .services.qr import verify_supplier_qr, verify_item_qr, verify_warehouse_inbound_qr
from .services.storage import upload_photo
from .services.reconciliation import reconcile_manifest
from .serializers import (
    ManifestSerializer, AssignmentDetailSerializer,
    CollectedLineItemSerializer, InboundExceptionSerializer,
)
from notifications.services import (
    notify_driver_inbound_assignment, notify_dashboard_inbound_exception,
    notify_dashboard_assignment_complete,
)

# Optional firebase handling
try:
    from firebase_admin import db as firebase_db
    HAS_FIREBASE = True
except ImportError:
    HAS_FIREBASE = False

class ManifestListCreateView(ListCreateAPIView):
    queryset = SupplierDeliveryManifest.objects.all()
    serializer_class = ManifestSerializer

class ManifestDetailView(RetrieveAPIView):
    queryset = SupplierDeliveryManifest.objects.all()
    serializer_class = ManifestSerializer

class AssignmentCreateView(APIView):
    """Management assigns a vehicle and driver to collect a manifest."""
    def post(self, request, manifest_id):
        try:
            manifest = SupplierDeliveryManifest.objects.get(id=manifest_id)
        except SupplierDeliveryManifest.DoesNotExist:
            return Response({'error': 'manifest_not_found'}, status=404)

        vehicle_id = request.data.get('vehicle_id')
        driver_id  = request.data.get('driver_id')
        scheduled_pickup_time = request.data.get('scheduled_pickup_time')
        dock_number = request.data.get('dock_number')

        try:
            vehicle = Vehicle.objects.get(id=vehicle_id)
            driver  = Driver.objects.get(id=driver_id)
        except (Vehicle.DoesNotExist, Driver.DoesNotExist):
            return Response({'error': 'invalid_vehicle_or_driver'}, status=400)

        # Validate capability
        check = validate_assignment(vehicle, manifest)
        if not check['capacity_ok']:
            return Response({'error': 'vehicle_capacity_insufficient'}, status=400)
        if not check['cooling_ok']:
            return Response({'error': 'vehicle_cooling_not_suitable',
                             'detail': f'Manifest requires {manifest.special_handling} but vehicle does not support it.'}, status=400)

        with transaction.atomic():
            assignment = InboundCollectionAssignment.objects.create(
                manifest=manifest,
                driver=driver,
                vehicle=vehicle,
                status='assigned',
                assigned_at=timezone.now(),
                vehicle_capacity_ok=check['capacity_ok'],
                vehicle_cooling_ok=check['cooling_ok'],
                scheduled_pickup_time=scheduled_pickup_time,
                dock_number=dock_number,
            )
            manifest.status = 'assigned'
            manifest.save(update_fields=['status'])

        notify_driver_inbound_assignment(driver, assignment)
        return Response(AssignmentDetailSerializer(assignment).data, status=201)

class DockAvailabilityView(APIView):
    def get(self, request):
        dock_number = request.query_params.get('dock_number')
        pickup_time = request.query_params.get('pickup_time')
        
        if not dock_number or not pickup_time:
            return Response({'available': True})

        # Simple overlap check: +/- 1 hour
        try:
            time_obj = timezone.datetime.fromisoformat(pickup_time.replace('Z', '+00:00'))
            start_window = time_obj - timezone.timedelta(hours=1)
            end_window = time_obj + timezone.timedelta(hours=1)
            
            conflict = InboundCollectionAssignment.objects.filter(
                dock_number=dock_number,
                scheduled_pickup_time__range=(start_window, end_window)
            ).exists()
            
            return Response({'available': not conflict})
        except Exception:
            return Response({'error': 'invalid_time_format'}, status=400)


class AssignmentAcceptView(APIView):
    def post(self, request, pk):
        # Depending on how authentication is bound
        try:
            driver_profile = request.user.driver_profile
        except AttributeError:
            driver_profile = Driver.objects.first() # mock fallback 

        assignment = InboundCollectionAssignment.objects.get(
            id=pk, driver=driver_profile
        )
        if assignment.status != 'assigned':
            return Response({'error': 'not_assignable'}, status=400)
        assignment.status     = 'accepted'
        assignment.accepted_at = timezone.now()
        assignment.save(update_fields=['status', 'accepted_at'])
        return Response(AssignmentDetailSerializer(assignment).data)

class DepartureConfirmView(APIView):
    """Driver confirms they are leaving for the supplier — tracking starts."""
    def post(self, request, pk):
        assignment = InboundCollectionAssignment.objects.get(id=pk)
        assignment.status     = 'en_route'
        assignment.departed_at = timezone.now()
        assignment.save(update_fields=['status', 'departed_at'])

        if HAS_FIREBASE:
            try:
                firebase_db.reference(f'inbound_tracking/{str(pk)}/meta').set({
                    'active':     True,
                    'driver_id':  str(assignment.driver_id),
                    'vehicle_id': str(assignment.vehicle_id),
                    'manifest_id': str(assignment.manifest_id),
                    'departed_at': assignment.departed_at.isoformat(),
                })
            except Exception as e:
                pass # Ignoring firebase error safely

        return Response({'status': 'en_route'})

class SupplierArrivalScanView(APIView):
    """Driver scans the supplier QR on arrival to confirm they are at the right location."""
    def post(self, request, pk):
        # Wait, the user had 'manifest_supplier' in select_related which isn't valid, the field is 'manifest__supplier'
        assignment = InboundCollectionAssignment.objects.select_related(
            'manifest__supplier'
        ).prefetch_related('manifest__line_items').get(id=pk)

        token = request.data.get('qr_token', '')
        result = verify_supplier_qr(
            token,
            expected_supplier_id=str(assignment.manifest.supplier_id)
        )
        if not result['valid']:
            return Response({'error': result['reason']}, status=400)

        assignment.status              = 'at_supplier'
        assignment.arrived_at_supplier = timezone.now()
        assignment.save(update_fields=['status', 'arrived_at_supplier'])

        line_items = assignment.manifest.line_items.all()
        return Response({
            'assignment_id': str(assignment.id),
            'supplier':      {'name': assignment.manifest.supplier.name,
                              'contact': assignment.manifest.supplier.contact_phone},
            'special_handling': assignment.manifest.special_handling,
            'temperature_range': {
                'min': str(assignment.manifest.temperature_min_c),
                'max': str(assignment.manifest.temperature_max_c),
            } if assignment.manifest.special_handling in ['cooling', 'frozen'] else None,
            'line_items': [
                {
                    'id':           str(li.id),
                    'item_code':    li.item_code,
                    'description':  li.description,
                    'expected_qty': str(li.expected_qty),
                    'unit':         li.unit,
                    'has_qr':       bool(li.qr_code),
                    'has_barcode':  bool(li.barcode),
                    'special_handling': li.special_handling,
                }
                for li in line_items
            ],
        })

class ItemScanView(APIView):
    def post(self, request, pk):
        scanned_value = request.data.get('scanned_value', '')
        assignment    = InboundCollectionAssignment.objects.get(id=pk)

        line = assignment.manifest.line_items.filter(
            models.Q(qr_code=scanned_value) | models.Q(barcode=scanned_value)
        ).first()

        if not line:
            return Response({
                'error':   'item_not_found',
                'detail':  'This item is not on the manifest. Do not load it.',
                'scanned': scanned_value,
            }, status=404)

        return Response({
            'line_item_id':  str(line.id),
            'item_code':     line.item_code,
            'description':   line.description,
            'expected_qty':  str(line.expected_qty),
            'unit':          line.unit,
            'special_handling': line.special_handling,
        })

class GoodsVerificationView(APIView):
    def post(self, request, pk):
        assignment = InboundCollectionAssignment.objects.select_related(
            'manifest'
        ).get(id=pk)
        lines_data = request.data.get('lines', [])

        assignment.status = 'verifying'
        assignment.save(update_fields=['status'])

        collected_items = []
        exceptions_to_create = []

        for entry in lines_data:
            manifest_line = ManifestLineItem.objects.get(
                id=entry['manifest_line_id'],
                manifest=assignment.manifest,
            )
            collected_qty = float(entry.get('collected_qty', 0))
            condition     = entry.get('condition', 'good')

            item = CollectedLineItem(
                assignment    = assignment,
                manifest_line = manifest_line,
                collected_qty = collected_qty,
                condition     = condition,
                condition_notes = entry.get('condition_notes', ''),
                scanned_qr    = entry.get('scanned_qr', ''),
            )
            collected_items.append(item)

            if collected_qty < float(manifest_line.expected_qty):
                exceptions_to_create.append(InboundException(
                    assignment     = assignment,
                    manifest_line  = manifest_line,
                    exception_type = 'shortfall',
                    reported_by    = request.user if request.user.is_authenticated else None,
                    notes=(
                        f'Expected {manifest_line.expected_qty} {manifest_line.unit}, '
                        f'collected {collected_qty}.'
                    ),
                ))

            if condition in ['damaged', 'rejected']:
                exceptions_to_create.append(InboundException(
                    assignment     = assignment,
                    manifest_line  = manifest_line,
                    exception_type = 'damaged_goods',
                    reported_by    = request.user if request.user.is_authenticated else None,
                    notes          = entry.get('condition_notes', ''),
                ))

        with transaction.atomic():
            CollectedLineItem.objects.bulk_create(collected_items)
            if exceptions_to_create:
                InboundException.objects.bulk_create(exceptions_to_create)
                notify_dashboard_inbound_exception(assignment, exceptions_to_create)

        return Response({
            'items_recorded':   len(collected_items),
            'exceptions_raised': len(exceptions_to_create),
            'next_step':        'return_to_warehouse',
        })

class WarehouseArrivalScanView(APIView):
    def post(self, request, pk):
        assignment = InboundCollectionAssignment.objects.get(id=pk)
        token = request.data.get('qr_token', '')

        result = verify_warehouse_inbound_qr(token, assignment_id=str(pk))
        if not result['valid']:
            return Response({'error': result['reason']}, status=400)

        assignment.status               = 'returning'
        assignment.arrived_at_warehouse = timezone.now()
        assignment.save(update_fields=['status', 'arrived_at_warehouse'])

        return Response({'status': 'warehouse_arrived',
                         'next_step': 'confirm_complete'})

class AssignmentCompleteView(APIView):
    def post(self, request, pk):
        assignment = InboundCollectionAssignment.objects.prefetch_related(
            'collected_items__manifest_line', 'exceptions'
        ).get(id=pk)

        with transaction.atomic():
            assignment.status       = 'completed'
            assignment.completed_at = timezone.now()
            assignment.save(update_fields=['status', 'completed_at'])

            summary = reconcile_manifest(assignment)
            manifest = assignment.manifest
            manifest.status = (
                'delivered' if summary['all_received']
                else 'discrepancy'
            )
            manifest.save(update_fields=['status'])

        if HAS_FIREBASE:
            try:
                firebase_db.reference(f'inbound_tracking/{str(pk)}/meta').update(
                    {'active': False, 'completed_at': assignment.completed_at.isoformat()}
                )
            except Exception as e:
                pass

        notify_dashboard_assignment_complete(assignment, summary)
        return Response({'status': 'completed', 'summary': summary})

class LiveInboundView(APIView):
    def get(self, request):
        if HAS_FIREBASE:
            try:
                data = firebase_db.reference('inbound_tracking').get()
                return Response(data if data else {})
            except Exception as e:
                return Response({'error': str(e)}, status=500)
        return Response({'error': 'Firebase disabled'}, status=503)
