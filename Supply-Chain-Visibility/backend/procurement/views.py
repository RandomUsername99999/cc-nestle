from rest_framework import status, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from django.utils import timezone
from .models import SupplierRun, GoodsReceiptLine, InboundException, POLineItem
from .services.qr import verify_supplier_qr, verify_inbound_warehouse_qr
from firebase_admin import db as firebase_db

class SupplierQRScanView(APIView):
    """Driver scans the supplier's QR on arrival."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, run_id):
        try:
            run = SupplierRun.objects.prefetch_related('run_pos__purchase_order__line_items').get(id=run_id)
        except SupplierRun.DoesNotExist:
            return Response({'error': 'Supplier run not found'}, status=404)

        token = request.data.get('qr_token')
        
        result = verify_supplier_qr(token, expected_supplier_id=str(run.supplier.id))
        if not result['valid']:
            return Response({'error': result['reason']}, status=400)

        run.status = 'arrived'
        run.arrived_at_supplier_at = timezone.now()
        run.save(update_fields=['status', 'arrived_at_supplier_at'])

        # Aggregate all line items from all POs in this run
        line_items = []
        for run_po in run.run_pos.all():
            for li in run_po.purchase_order.line_items.all():
                line_items.append({
                    'id': str(li.id), 
                    'po_ref': li.purchase_order.po_reference, 
                    'item_code': li.item_code,
                    'description': li.description, 
                    'ordered_qty': str(li.ordered_qty), 
                    'unit': li.unit
                })

        return Response({
            'supplier_name': run.supplier.name,
            'line_items': line_items
        })

class GoodsVerificationView(APIView):
    """Driver submits actual quantities received per line item. Final step at supplier."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, run_id):
        try:
            run = SupplierRun.objects.get(id=run_id)
        except SupplierRun.DoesNotExist:
            return Response({'error': 'Supplier run not found'}, status=404)

        lines_data = request.data.get('lines', []) 
        receipt_lines = []
        exceptions = []

        for line in lines_data:
            try:
                po_line = POLineItem.objects.get(id=line['po_line_item_id'])
            except POLineItem.DoesNotExist:
                continue

            received = float(line['received_qty'])
            condition = line.get('condition', 'good')

            receipt_line = GoodsReceiptLine.objects.create(
                supplier_run=run,
                po_line_item=po_line,
                received_qty=received,
                condition=condition,
                condition_notes=line.get('condition_notes', ''),
            )
            receipt_lines.append(receipt_line)

            # Auto-flag exceptions
            if received < float(po_line.ordered_qty):
                exceptions.append(InboundException(
                    supplier_run=run, 
                    exception_type='shortfall', 
                    reported_by=request.user,
                    notes=f'Ordered {po_line.ordered_qty} {po_line.unit}, received {received}'
                ))
            if condition in ['damaged', 'rejected']:
                exceptions.append(InboundException(
                    supplier_run=run, 
                    exception_type='damaged_goods', 
                    reported_by=request.user,
                    notes=line.get('condition_notes', '')
                ))

        if exceptions:
            InboundException.objects.bulk_create(exceptions)
            # Notify dashboard (placeholder call)
            # from notifications.services import notify_dashboard_inbound_exception
            # notify_dashboard_inbound_exception(run, exceptions)

        run.status = 'en_route_warehouse'
        run.collection_finished_at = timezone.now()
        run.save(update_fields=['status', 'collection_finished_at'])

        return Response({'status': 'success', 'exceptions_raised': len(exceptions)})

class RunCompleteView(APIView):
    """Called when driver arrives back at warehouse and scans the inbound QR."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, run_id):
        try:
            run = SupplierRun.objects.get(id=run_id)
        except SupplierRun.DoesNotExist:
            return Response({'error': 'Supplier run not found'}, status=404)

        inbound_token = request.data.get('qr_token')
        
        result = verify_inbound_warehouse_qr(inbound_token, run_id=str(run_id))
        if not result['valid']:
            return Response({'error': result['reason']}, status=400)

        run.status = 'completed'
        run.completed_at = timezone.now()
        run.save(update_fields=['status', 'completed_at'])

        # Stop location tracking in Firebase
        try:
            firebase_db.reference(f'inbound_tracking/{run_id}/meta').update({'active': False})
        except Exception as e:
            print(f"Error updating Firebase: {e}")

        # Apply received quantities and reconcile statuses
        from .services.po_matching import process_run_completion
        summary = process_run_completion(run)

        return Response({'status': 'completed', 'summary': summary})

class InboundExceptionView(APIView):
    """Allows reporting custom exceptions manually."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, run_id):
        try:
            run = SupplierRun.objects.get(id=run_id)
        except SupplierRun.DoesNotExist:
            return Response({'error': 'Supplier run not found'}, status=404)

        ex_type = request.data.get('exception_type')
        notes = request.data.get('notes', '')
        
        ex = InboundException.objects.create(
            supplier_run=run,
            exception_type=ex_type,
            reported_by=request.user,
            notes=notes
        )
        return Response({'status': 'reported', 'exception_id': str(ex.id)})
