from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, UserDeviceToken
import logging

logger = logging.getLogger(__name__)


class UserSerializer(serializers.ModelSerializer):
    """Serializer for User model"""
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'username', 'profile_picture', 
                  'user_type', 'is_online', 'last_seen', 'created_at']
        read_only_fields = ['id', 'created_at', 'is_online', 'last_seen']


class UserDetailSerializer(serializers.ModelSerializer):
    """Detailed user serializer with all fields"""
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'username', 'profile_picture',
                  'user_type', 'is_online', 'last_seen', 'google_id', 'created_at', 'updated_at']
        read_only_fields = ['id', 'google_id', 'created_at', 'updated_at']


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT token serializer"""
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['email'] = user.email
        token['user_type'] = user.user_type
        return token


class GoogleOAuthSerializer(serializers.Serializer):
    """Serializer for Google OAuth token validation"""
    token = serializers.CharField(required=True)
    
    def validate_token(self, value):
        if not value:
            raise serializers.ValidationError("Token is required")
        return value


class LoginSerializer(serializers.Serializer):
    """Serializer for email/password login"""
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class RegisterSerializer(serializers.Serializer):
    """Serializer for email/password registration"""
    email = serializers.EmailField()
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=8)
    first_name = serializers.CharField(required=False, allow_blank=True, default='')
    last_name = serializers.CharField(required=False, allow_blank=True, default='')

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("This username is already taken.")
        return value


class UserDeviceTokenSerializer(serializers.ModelSerializer):
    """Serializer for device tokens"""
    class Meta:
        model = UserDeviceToken
        fields = ['firebase_token', 'device_type']
