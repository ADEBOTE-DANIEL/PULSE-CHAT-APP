from rest_framework import serializers
from .models import AIAssistantConfig, AIResponse
from apps.chat.serializers import MessageSerializer


class AIAssistantConfigSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIAssistantConfig
        fields = ['id', 'chat_room', 'is_enabled', 'tone', 'max_tokens', 'temperature', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class AIResponseSerializer(serializers.ModelSerializer):
    trigger_message = MessageSerializer(read_only=True)
    sent_message = MessageSerializer(read_only=True)
    
    class Meta:
        model = AIResponse
        fields = ['id', 'config', 'trigger_message', 'suggested_response', 'status', 'sent_message',
                  'user_edited', 'confidence_score', 'created_at', 'updated_at']
        read_only_fields = ['id', 'suggested_response', 'status', 'confidence_score', 'created_at', 'updated_at']
