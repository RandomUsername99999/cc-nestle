from ..models import SupplierRun, POLineItem, PurchaseOrder

def process_run_completion(run):
    """
    Apply received quantities from the run to the original line items
    and reconcile status of POs.
    """
    receipt_lines = run.receipt_lines.all()
    po_ids = set()
    
    summary = {
        'total_lines': receipt_lines.count(),
        'items_received': 0,
        'shortfalls': 0,
        'damaged': 0
    }

    for receipt in receipt_lines:
        line_item = receipt.po_line_item
        line_item.received_qty += receipt.received_qty
        line_item.save()
        
        po_ids.add(line_item.purchase_order_id)
        
        summary['items_received'] += float(receipt.received_qty)
        if receipt.received_qty < line_item.ordered_qty:
            summary['shortfalls'] += 1
        if receipt.condition != 'good':
            summary['damaged'] += 1

    # Update PO statuses
    for po_id in po_ids:
        po = PurchaseOrder.objects.get(id=po_id)
        all_lines = po.line_items.all()
        
        if all(li.received_qty >= li.ordered_qty for li in all_lines):
            po.status = 'received'
        elif any(li.received_qty > 0 for li in all_lines):
            po.status = 'partially_received'
        
        po.save()

    return summary
