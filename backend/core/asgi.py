import os

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

import django
django.setup()

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator

from apps.chat.jwt_auth_middleware import JWTAuthMiddleware
from apps.chat.routing import websocket_urlpatterns


asgi_application = get_asgi_application()

application = ProtocolTypeRouter({
    'http': asgi_application,

    'websocket': AllowedHostsOriginValidator(
        JWTAuthMiddleware(
            URLRouter(websocket_urlpatterns)
        )
    ),
})