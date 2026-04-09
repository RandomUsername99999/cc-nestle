def verify_supplier_qr(token, expected_supplier_id):
    """
    Verify the supplier's QR token. 
    In a real app, this would verify a signed JWT.
    """
    # Simple simulation: check if expected_supplier_id is in token or some static secret
    if token == "SECRET_SUPPLIER_TOKEN" or expected_supplier_id in token:
        return {'valid': True}
    return {'valid': False, 'reason': 'Invalid QR token for this supplier'}

def verify_inbound_warehouse_qr(token, run_id):
    """
    Verify the warehouse's QR token for inbound scans.
    """
    if token == "SECRET_WAREHOUSE_INBOUND" or run_id in token:
        return {'valid': True}
    return {'valid': False, 'reason': 'Invalid QR token for this warehouse'}
