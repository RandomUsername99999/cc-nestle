def reconcile_manifest(assignment) -> dict:
    """
    Compares collected items against manifest expected quantities.
    Updates ManifestLineItem.received_qty.
    Returns a summary for the dashboard notification and warehouse team.
    """
    summary = {
        'all_received': True,
        'total_lines':  0,
        'fully_received': [],
        'shortfalls':   [],
        'damaged':      [],
        'rejected':     [],
    }

    for item in assignment.collected_items.select_related('manifest_line').all():
        line = item.manifest_line
        line.received_qty = item.collected_qty
        line.save(update_fields=['received_qty'])

        summary['total_lines'] += 1

        if float(item.collected_qty) >= float(line.expected_qty):
            summary['fully_received'].append(line.item_code)
        else:
            summary['all_received'] = False
            summary['shortfalls'].append({
                'item_code':    line.item_code,
                'description':  line.description,
                'expected':     str(line.expected_qty),
                'received':     str(item.collected_qty),
                'shortfall':    str(item.shortfall),
                'unit':         line.unit,
            })

        if item.condition == 'damaged':
            summary['damaged'].append(line.item_code)
        if item.condition == 'rejected':
            summary['rejected'].append(line.item_code)
            summary['all_received'] = False

    return summary
