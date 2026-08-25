from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

from apps.users.views import UserViewSet, GoogleOAuthView, LoginView, RegisterView, LogoutView, RefreshTokenView
from apps.chat.views import ChatRoomViewSet, MessageViewSet
from apps.ai_assistant.views import AIAssistantConfigViewSet, AIResponseViewSet
from apps.notifications.views import NotificationViewSet

# Create router and register viewsets
router = DefaultRouter()
router.register(r'users', UserViewSet, basename='user')
router.register(r'chat-rooms', ChatRoomViewSet, basename='chatroom')
router.register(r'messages', MessageViewSet, basename='message')
router.register(r'ai-config', AIAssistantConfigViewSet, basename='ai-config')
router.register(r'ai-responses', AIResponseViewSet, basename='ai-response')
router.register(r'notifications', NotificationViewSet, basename='notification')

from django.http import JsonResponse

def health_check(request):
    return JsonResponse({'status': 'ok'})

urlpatterns = [
    path('health/', health_check, name='health-check'),

    # Admin
    path('admin/', admin.site.urls),
    
    # API
    path('api/', include(router.urls)),
    
    # Auth
    path('api/auth/login/', LoginView.as_view(), name='login'),
    path('api/auth/register/', RegisterView.as_view(), name='register'),
    path('api/auth/logout/', LogoutView.as_view(), name='logout'),
    path('api/auth/refresh/', RefreshTokenView.as_view(), name='refresh-token'),
    path('api/auth/google/', GoogleOAuthView.as_view(), name='google-oauth'),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    
    # App URLs
    path('api/', include('apps.users.urls')),
    path('api/', include('apps.chat.urls')),
    path('api/', include('apps.notifications.urls')),
]

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
