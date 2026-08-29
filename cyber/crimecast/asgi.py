import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'crimecast.settings.development')
django.setup()  # Must be before any Django imports

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator
from apps.core.middleware import JWTAuthMiddlewareStack
from apps.core.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': AllowedHostsOriginValidator(
        JWTAuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        )
    ),
})
