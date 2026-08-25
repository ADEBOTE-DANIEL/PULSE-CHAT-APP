from django.db import models
from django.contrib.auth.models import AbstractUser
import uuid


class User(AbstractUser):
    """Extended User model with additional fields"""
    USER_TYPE_CHOICES = (
        ('user', 'Regular User'),
        ('admin', 'Admin'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    google_id = models.CharField(max_length=255, unique=True, null=True, blank=True)
    google_email = models.EmailField(null=True, blank=True)
    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES, default='user')
    profile_picture = models.URLField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    is_online = models.BooleanField(default=False)
    last_seen = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    groups = models.ManyToManyField('auth.Group', related_name='pulse_user_groups', blank=True)
    user_permissions = models.ManyToManyField('auth.Permission', related_name='pulse_user_permissions', blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['google_id']),
            models.Index(fields=['is_online']),
        ]
    
    def __str__(self):
        return self.email or self.username


class UserDeviceToken(models.Model):
    """Store Firebase device tokens for push notifications"""
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='device_token')
    firebase_token = models.TextField()
    device_type = models.CharField(max_length=20, choices=[('ios', 'iOS'), ('android', 'Android')])
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"{self.user.email} - {self.device_type}"
