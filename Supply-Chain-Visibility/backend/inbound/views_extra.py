from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from django.db import transaction
from .models import SupplierDeliveryManifest, InboundCollectionAssignment

class StartCollectionView(APIView):
    """
    Management dashboard endpoint to manually initiate a collection.
    Transitions manifest to 'in_transit' and assignment to 'en_route'.
    """
    def post(self, request, manifest_id):
        try:
            manifest = SupplierDeliveryManifest.objects.get(id=manifest_id)
            # Find the associated assignment
            try:
                assignment = manifest.assignment
            except InboundCollectionAssignment.DoesNotExist:
                return Response({'error': 'no_assignment_found', 'detail': 'Manifest must be assigned to a driver first.'}, status=400)

            if manifest.status != 'assigned':
                 return Response({'error': 'invalid_status', 'detail': f'Cannot start collection from status: {manifest.status}'}, status=400)

            with transaction.atomic():
                assignment.status = 'en_route'
                assignment.departed_at = timezone.now()
                assignment.save(update_fields=['status', 'departed_at'])

                manifest.status = 'in_transit'
                manifest.save(update_fields=['status'])

            return Response({
                'status': 'in_transit',
                'manifest_id': str(manifest.id),
                'assignment_id': str(assignment.id)
            })
            
        except SupplierDeliveryManifest.DoesNotExist:
            return Response({'error': 'manifest_not_found'}, status=404)
        except Exception as e:
            return Response({'error': 'collection_start_failed', 'detail': str(e)}, status=500)
