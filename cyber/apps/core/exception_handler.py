from rest_framework.views import exception_handler as drf_exception_handler
from rest_framework.exceptions import (
    ValidationError, AuthenticationFailed, NotAuthenticated,
    PermissionDenied, NotFound, Throttled, MethodNotAllowed
)
from django_ratelimit.exceptions import Ratelimited
from rest_framework.response import Response
from django.core.exceptions import ObjectDoesNotExist, SuspiciousOperation
from django.db import IntegrityError, DatabaseError
from django.http import Http404
import logging

logger = logging.getLogger('errors')


def custom_exception_handler(exc, context):
    """
    Custom DRF exception handler that standardizes error responses
    and logs exceptions with structured context.
    """
    request = context.get('request')
    view = context.get('view')

    def _build_error(message, code, status):
        return Response({'error': message, 'code': code, 'status': status}, status=status)

    error_context = {
        'path': getattr(request, 'path', 'unknown'),
        'method': getattr(request, 'method', 'unknown'),
        'user': str(getattr(request, 'user', 'anonymous')),
        'view': view.__class__.__name__ if view else 'unknown',
    }

    response = drf_exception_handler(exc, context)

    if response is not None:
        status_code = response.status_code

        if isinstance(exc, ValidationError):
            response.data = {
                'error': 'Validation failed',
                'code': 'validation_error',
                'details': exc.detail,
                'status': status_code,
            }
        elif isinstance(exc, (AuthenticationFailed, NotAuthenticated)):
            response.data = {
                'error': 'Authentication required',
                'code': 'not_authenticated',
                'status': 401,
            }
        elif isinstance(exc, Ratelimited):
            response.status_code = 429
            response.data = {
                'error': 'Rate limit exceeded. Please try again later.',
                'code': 'rate_limited',
                'status': 429,
            }
        elif isinstance(exc, PermissionDenied):
            response.data = {
                'error': 'You do not have permission to perform this action',
                'code': 'permission_denied',
                'status': 403,
            }
        elif isinstance(exc, NotFound) or isinstance(exc, Http404):
            response.data = {
                'error': 'Resource not found',
                'code': 'not_found',
                'status': 404,
            }
        elif isinstance(exc, Throttled):
            retry = getattr(exc, 'wait', None)
            response.data = {
                'error': f'Rate limit exceeded. Retry after {retry} seconds.' if retry else 'Rate limit exceeded.',
                'code': 'rate_limited',
                'retry_after': retry,
                'status': 429,
            }
        elif isinstance(exc, MethodNotAllowed):
            response.data = {
                'error': str(exc.detail) if hasattr(exc, 'detail') else str(exc),
                'code': 'method_not_allowed',
                'status': status_code,
            }

        if status_code >= 500:
            logger.error(
                f"Server error {status_code}: {exc}",
                extra=error_context,
                exc_info=True,
            )
        elif status_code >= 400 and status_code != 404:
            logger.debug(
                f"Client error {status_code}: {exc}",
                extra=error_context,
            )

        return response

    # Handle non-DRF Django exceptions
    if isinstance(exc, ObjectDoesNotExist):
        logger.debug(f"Object not found: {exc}", extra=error_context)
        return _build_error('Resource not found', 'not_found', 404)

    if isinstance(exc, IntegrityError):
        logger.warning(f"Database integrity error: {exc}", extra=error_context)
        return _build_error('Data conflict', 'conflict', 409)

    if isinstance(exc, DatabaseError):
        logger.error(f"Database error: {exc}", extra=error_context, exc_info=True)
        return _build_error('Database error', 'db_error', 503)

    if isinstance(exc, SuspiciousOperation):
        logger.warning(f"Suspicious operation: {exc}", extra=error_context)
        return _build_error('Invalid request', 'suspicious_operation', 400)

    logger.critical(f"Unhandled exception: {exc}", extra=error_context, exc_info=True)
    return _build_error(f'An unexpected error occurred: {str(exc)}', 'internal_error', 500)
