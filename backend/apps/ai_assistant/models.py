from django.db import models
from django.contrib.auth import get_user_model
import uuid

User = get_user_model()


class AIAssistantConfig(models.Model):
    """Configuration for AI assistant per user and chat room"""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='ai_configs')
    chat_room = models.ForeignKey('chat.ChatRoom', on_delete=models.CASCADE, related_name='ai_configs')
    is_enabled = models.BooleanField(default=False)
    tone = models.CharField(
        max_length=50,
        choices=[
            ('professional', 'Professional'),
            ('casual', 'Casual'),
            ('friendly', 'Friendly'),
            ('humorous', 'Humorous'),
        ],
        default='friendly'
    )
    system_prompt = models.TextField(
        default='You are a helpful assistant responding to messages in a chat. Keep responses concise and natural.'
    )
    max_tokens = models.IntegerField(default=150)
    temperature = models.FloatField(default=0.7)  # 0-1: lower = more deterministic
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['user', 'chat_room']
        ordering = ['-updated_at']
    
    def __str__(self):
        return f"AI Config for {self.user.email} in {self.chat_room}"


class AIResponse(models.Model):
    """Track AI-generated responses"""
    
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('generated', 'Generated'),
        ('sent', 'Sent'),
        ('failed', 'Failed'),
        ('rejected', 'Rejected by user'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    config = models.ForeignKey(AIAssistantConfig, on_delete=models.CASCADE, related_name='responses')
    trigger_message = models.ForeignKey('chat.Message', on_delete=models.CASCADE, related_name='ai_responses')
    suggested_response = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    sent_message = models.ForeignKey(
        'chat.Message', 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='ai_sent_from'
    )
    user_edited = models.BooleanField(default=False)
    user_edit_reason = models.TextField(null=True, blank=True)
    confidence_score = models.FloatField(null=True, blank=True)
    error_message = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['config', '-created_at']),
            models.Index(fields=['status']),
        ]
    
    def __str__(self):
        return f"AI Response for {self.trigger_message.sender.email}"
