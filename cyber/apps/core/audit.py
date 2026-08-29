from apps.users.models import AuditLog
import logging

logger = logging.getLogger('audit')


def log_action(user, action_type, resource_type, resource_id='',
               payload=None, request=None):
    """
    Create an audit log entry. Call this from any view that performs
    a significant action.

    Usage:
        from apps.core.audit import log_action
        log_action(
            user=request.user,
            action_type='ioc_submission',
            resource_type='threat_indicator',
            resource_id=str(ioc.id),
            payload={'ioc_type': ioc.ioc_type, 'severity': ioc.severity},
            request=request,
        )
    """
    ip_address = None
    if request:
        ip_address = get_client_ip(request)
        # Anonymize if configured
        from django.conf import settings
        if getattr(settings, 'ANONYMIZE_IP_ADDRESSES', False):
            ip_address = anonymize_ip(ip_address)

    try:
        AuditLog.objects.create(
            user=user,
            action_type=action_type,
            resource_type=resource_type,
            resource_id=str(resource_id),
            payload=payload or {},
            ip_address=ip_address,
        )
    except Exception as e:
        # Never let audit logging crash the main request
        logger.error(f"Audit log creation failed: {e}", exc_info=True)


def get_client_ip(request):
    """Extract real IP from request, handling proxies"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        # Take the first IP (client), not the proxy chain
        ip = x_forwarded_for.split(',')[0].strip()
    else:
        ip = request.META.get('REMOTE_ADDR', '')
    return ip or None


def anonymize_ip(ip: str) -> str:
    """
    Anonymize IP address for GDPR compliance.
    IPv4: zero the last octet (192.168.1.100 → 192.168.1.0)
    IPv6: zero the last 64 bits
    """
    if not ip:
        return ip

    try:
        import ipaddress
        addr = ipaddress.ip_address(ip)

        if isinstance(addr, ipaddress.IPv4Address):
            # Zero last octet
            parts = ip.split('.')
            return '.'.join(parts[:3] + ['0'])

        elif isinstance(addr, ipaddress.IPv6Address):
            # Zero last 64 bits (8 groups, zero last 4)
            parts = addr.exploded.split(':')
            return ':'.join(parts[:4] + ['0000'] * 4)

    except ValueError:
        pass

    return ip  # Return as-is if parsing fails
