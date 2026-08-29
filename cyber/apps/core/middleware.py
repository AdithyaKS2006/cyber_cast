"""
WebSocket JWT authentication middleware
"""
from channels.auth import AuthMiddlewareStack
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import TokenError

User = get_user_model()


@database_sync_to_async
def get_user_from_token(token_key):
    try:
        token = AccessToken(token_key)
        user_id = token.get('user_id')
        if user_id is None:
            return AnonymousUser()
        user = User.objects.get(id=user_id, is_active=True)
        return user
    except (TokenError, User.DoesNotExist, Exception):
        return AnonymousUser()


class JWTAuthMiddleware:
    def __init__(self, app):
        self.app = app
    
    async def __call__(self, scope, receive, send):
        token_key = None
        
        headers = dict(scope.get('headers', []))
        cookie_header = headers.get(b'cookie', b'').decode()
        cookies = {}
        for cookie in cookie_header.split(';'):
            if '=' in cookie:
                key, value = cookie.strip().split('=', 1)
                cookies[key.strip()] = value.strip()
        token_key = cookies.get('access_token') or cookies.get('ws_token')
        
        if not token_key:
            query_string = scope.get('query_string', b'').decode()
            params = {}
            for param in query_string.split('&'):
                if '=' in param:
                    k, v = param.split('=', 1)
                    params[k] = v
            token_key = params.get('token') or params.get('ws_token')
        
        if not token_key:
            await send({
                'type': 'websocket.close',
                'code': 4001,
            })
            return
        
        user = await get_user_from_token(token_key)
        if user.is_anonymous:
            await send({
                'type': 'websocket.close',
                'code': 4001,
            })
            return
        
        scope['user'] = user
        return await self.app(scope, receive, send)


def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(AuthMiddlewareStack(inner))


class SecurityHeadersMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        from django.conf import settings
        response = self.get_response(request)
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        if getattr(settings, 'SECURE_SSL_REDIRECT', False):
            response['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload'
        return response


class IPAnonymizationMiddleware:
    """
    Anonymizes IP addresses in request metadata for GDPR compliance.
    Only active when ANONYMIZE_IP_ADDRESSES=True.
    Zeroes the last octet of IPv4 addresses.
    """

    def __init__(self, get_response):
        self.get_response = get_response
        from django.conf import settings
        self.enabled = getattr(settings, 'ANONYMIZE_IP_ADDRESSES', False)

    def __call__(self, request):
        if self.enabled:
            from apps.core.audit import anonymize_ip, get_client_ip
            original_ip = get_client_ip(request)
            anonymized = anonymize_ip(original_ip)

            # Replace IP in request metadata
            if 'HTTP_X_FORWARDED_FOR' in request.META:
                ips = request.META['HTTP_X_FORWARDED_FOR'].split(',')
                ips[0] = anonymized
                request.META['HTTP_X_FORWARDED_FOR'] = ', '.join(ips)
            elif 'REMOTE_ADDR' in request.META:
                request.META['REMOTE_ADDR'] = anonymized

        return self.get_response(request)


from django.db import connection
import logging
logger = logging.getLogger('performance')


class QueryCountMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        from django.conf import settings
        before = len(connection.queries) if settings.DEBUG else 0
        response = self.get_response(request)
        after = len(connection.queries) if settings.DEBUG else 0
        count = after - before

        # Only warn for API endpoints with high query counts
        if request.path.startswith('/api/') and count > 15:
            logger.warning(
                f"HIGH QUERY COUNT: {count} queries | "
                f"{request.method} {request.path} | "
                f"User: {getattr(request, 'user', 'anon')}"
            )

        if hasattr(response, '__setitem__'):
            response['X-Query-Count'] = str(count)

        return response

import json
from django.http import HttpResponseForbidden
from django.core.cache import cache

class WAFMiddleware:
    """
    Zero-Day and AI-Attack WAF Middleware.
    Inspects API payloads for anomaly detection and rate limits.
    """
    def __init__(self, get_response):
        self.get_response = get_response
        
    def __call__(self, request):
        from apps.core.audit import get_client_ip
        if request.path.startswith('/api/') and request.method in ['POST', 'PUT', 'PATCH']:
            # Bypass WAF for authenticated internal agents pushing raw telemetry.
            # SECURITY: validate the key VALUE, not just its presence.
            from django.conf import settings as _s
            agent_key = request.headers.get('X-Agent-Key', '')
            valid_key = getattr(_s, 'INTERNAL_AGENT_KEY', '')
            if agent_key and valid_key and agent_key == valid_key:
                return self.get_response(request)
                
            # Rate limiting for AI scraping (velocity detection)
            ip = get_client_ip(request)
            cache_key = f"waf_velocity_{ip}"
            req_count = cache.get(cache_key, 0)
            if req_count > 100:  # High speed probing
                logger.warning(f"AI Velocity Limit Exceeded for IP: {ip}")
                return HttpResponseForbidden(json.dumps({'error': 'Velocity limit exceeded. Connection blocked.'}), content_type='application/json')
            cache.set(cache_key, req_count + 1, timeout=10) # 10 seconds sliding window

            # Payload analysis
            try:
                if request.body:
                    body_str = request.body.decode('utf-8')
                    try:
                        from apps.ml_engine.anomaly_detector import anomaly_detector
                        analysis = anomaly_detector.analyze_payload(body_str)
                        
                        if analysis.get('is_anomaly'):
                            logger.critical(f"ZERO-DAY ANOMALY DETECTED from {ip}! Score: {analysis.get('anomaly_score')}")
                            
                            # Emit to Dashboard via WebSocket
                            try:
                                from channels.layers import get_channel_layer
                                from asgiref.sync import async_to_sync
                                channel_layer = get_channel_layer()
                                async_to_sync(channel_layer.group_send)(
                                    'enterprise_defense',
                                    {
                                        'type': 'defense_event',
                                        'data': {
                                            'type': 'zero_day_blocked',
                                            'endpoint': f"{request.method} {request.path}",
                                            'score': analysis.get('anomaly_score'),
                                            'ip': ip
                                        }
                                    }
                                )
                            except Exception as e:
                                logger.error(f"Failed to emit WS event: {e}")
                                
                            return HttpResponseForbidden(json.dumps({
                                'error': 'Zero-Day / Structural Anomaly Detected.',
                                'score': analysis.get('anomaly_score')
                            }), content_type='application/json')
                    except ImportError:
                        pass
                        
            except Exception as e:
                logger.error(f"WAF Payload read error: {e}")
                
        return self.get_response(request)

