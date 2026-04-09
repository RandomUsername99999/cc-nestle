"""
Global Exception Handler for DRF
Provides standardized JSON error responses for all API failures.
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging
import traceback

logger = logging.getLogger('api.exceptions')


def custom_exception_handler(exc, context):
    """
    Wraps DRF's default exception handler to ensure all API errors
    return a consistent JSON format:
    {
        "success": false,
        "message": "Human-readable error",
        "data": null,
        "status_code": 400
    }
    """
    # Call DRF's default handler first (handles ValidationError, NotAuthenticated, PermissionDenied, etc.)
    response = exception_handler(exc, context)

    # Log the exception details for debugging
    view = context.get('view', None)
    request = context.get('request', None)
    logger.error(
        f"API Exception in {view.__class__.__name__ if view else 'Unknown'}: "
        f"{str(exc)} | User: {request.user if request else 'N/A'} | "
        f"Path: {request.path if request else 'N/A'}"
    )

    if response is not None:
        # Standardize the response format
        error_message = _extract_message(response.data)
        
        response.data = {
            'success': False,
            'message': error_message,
            'data': None,
            'status_code': response.status_code
        }
        return response

    # If DRF didn't handle it, it's an unhandled exception (500)
    logger.critical(f"Unhandled exception: {traceback.format_exc()}")
    
    return Response({
        'success': False,
        'message': 'An internal server error occurred. Please contact the system administrator.',
        'data': None,
        'status_code': 500
    }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def _extract_message(data):
    """Extract a human-readable message from DRF's various error formats."""
    if isinstance(data, str):
        return data
    if isinstance(data, list):
        return '; '.join(str(item) for item in data)
    if isinstance(data, dict):
        # Handle {'detail': '...'} format
        if 'detail' in data:
            return str(data['detail'])
        # Handle {'error': '...'} format
        if 'error' in data:
            return str(data['error'])
        # Handle {'field_name': ['error1', 'error2']} validation errors
        messages = []
        for field, errors in data.items():
            if isinstance(errors, list):
                for error in errors:
                    messages.append(f"{field}: {error}")
            else:
                messages.append(f"{field}: {errors}")
        return '; '.join(messages) if messages else str(data)
    return str(data)
