from rest_framework import viewsets, status, views
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView
from django.conf import settings
from google.auth.transport import requests
from google.oauth2 import id_token
from .models import User
from .serializers import (
    UserSerializer, UserDetailSerializer, GoogleOAuthSerializer,
    LoginSerializer, RegisterSerializer, CustomTokenObtainPairSerializer
)
import logging
from django.contrib.auth import authenticate

logger = logging.getLogger(__name__)


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet for user management"""
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return UserDetailSerializer
        return UserSerializer
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def me(self, request):
        """Get current user profile"""
        serializer = UserDetailSerializer(request.user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['put'], permission_classes=[IsAuthenticated])
    def update_profile(self, request):
        """Update user profile"""
        user = request.user
        serializer = UserDetailSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def search(self, request):
        """Search users by email or username (for adding to chats/groups)"""
        from django.db.models import Q

        query = request.query_params.get('q', '').strip()
        if not query or len(query) < 2:
            return Response([])

        users = User.objects.filter(
            Q(email__icontains=query) | Q(username__icontains=query)
        ).exclude(id=request.user.id)[:20]

        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def update_device_token(self, request):
        """Update Firebase device token for push notifications"""
        from .models import UserDeviceToken
        from .serializers import UserDeviceTokenSerializer
        
        device_token = request.data.get('firebase_token')
        device_type = request.data.get('device_type')
        
        if not device_token or not device_type:
            return Response(
                {'error': 'firebase_token and device_type are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        obj, created = UserDeviceToken.objects.update_or_create(
            user=request.user,
            defaults={'firebase_token': device_token, 'device_type': device_type}
        )
        serializer = UserDeviceTokenSerializer(obj)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


class LoginView(views.APIView):
    """Email/Password login view"""
    permission_classes = [AllowAny]
    throttle_scope = 'auth'
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        email = serializer.validated_data['email']
        password = serializer.validated_data['password']
        
        try:
            user = User.objects.get(email=email)
            user = authenticate(username=user.username, password=password)
            
            if user is None:
                return Response(
                    {'error': 'Invalid credentials'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': UserSerializer(user).data
            })
        except User.DoesNotExist:
            return Response(
                {'error': 'User not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class LogoutView(views.APIView):
    """Blacklist the refresh token on logout"""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get('refresh')
            if not refresh_token:
                return Response(
                    {'error': 'refresh token is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({'status': 'Logged out'}, status=status.HTTP_200_OK)
        except Exception as e:
            logger.error(f"Logout error: {repr(e)}")
            return Response(
                {'error': 'Invalid token'},
                status=status.HTTP_400_BAD_REQUEST
            )


class RegisterView(views.APIView):
    """Email/Password registration view"""
    permission_classes = [AllowAny]
    throttle_scope = 'auth'

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        user = User.objects.create_user(
            email=data['email'],
            username=data['username'],
            password=data['password'],
            first_name=data.get('first_name', ''),
            last_name=data.get('last_name', ''),
        )

        refresh = RefreshToken.for_user(user)
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': UserSerializer(user).data,
        }, status=status.HTTP_201_CREATED)


class GoogleOAuthView(views.APIView):
    """Google OAuth authentication view"""
    permission_classes = [AllowAny]
    throttle_scope = 'auth'
    
    def post(self, request):
        serializer = GoogleOAuthSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
        token = serializer.validated_data['token']
        
        try:
            # Verify Google token
            idinfo = id_token.verify_oauth2_token(
                token, 
                requests.Request(),
                audience=settings.GOOGLE_OAUTH_CLIENT_ID,
                clock_skew_in_seconds=10
            )
            
            google_id = idinfo.get('sub')
            email = idinfo.get('email')
            name = idinfo.get('name', '').split()
            first_name = name[0] if len(name) > 0 else ''
            last_name = name[1] if len(name) > 1 else ''
            picture = idinfo.get('picture')
            
            # First, try to find a user already linked to this Google account
            user = User.objects.filter(google_id=google_id).first()
            created = False
            
            if not user:
                # Next, check if an existing account uses this email (e.g. signed up via password)
                user = User.objects.filter(email=email).first()
                if user:
                    # Link this existing account to Google
                    user.google_id = google_id
                    user.google_email = email
                    if not user.profile_picture:
                        user.profile_picture = picture
                    user.save()
                else:
                    # Brand new user
                    user = User.objects.create(
                        google_id=google_id,
                        email=email,
                        google_email=email,
                        username=email.split('@')[0],
                        first_name=first_name,
                        last_name=last_name,
                        profile_picture=picture,
                    )
                    created = True
            
            user.last_seen = timezone.now()
            user.save()
            
            refresh = RefreshToken.for_user(user)
            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': UserSerializer(user).data,
                'created': created
            })
            
        except Exception as e:
            logger.error(f"Google OAuth error: {repr(e)}")
            return Response(
                {'error': 'Invalid token', 'detail': str(e) if settings.DEBUG else None},
                status=status.HTTP_401_UNAUTHORIZED
            )


class RefreshTokenView(TokenRefreshView):
    """Refresh JWT token view"""
    permission_classes = [AllowAny]


from django.utils import timezone
