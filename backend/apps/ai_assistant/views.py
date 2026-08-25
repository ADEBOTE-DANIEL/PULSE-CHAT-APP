from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import AIAssistantConfig, AIResponse
from .serializers import AIAssistantConfigSerializer, AIResponseSerializer
import logging

logger = logging.getLogger(__name__)


class AIAssistantConfigViewSet(viewsets.ModelViewSet):
    """ViewSet for managing AI assistant configuration"""
    serializer_class = AIAssistantConfigSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return configs for current user"""
        return AIAssistantConfig.objects.filter(user=self.request.user)
    
    def create(self, request):
        """Create AI config for a chat room"""
        chat_room_id = request.data.get('chat_room')
        is_enabled = request.data.get('is_enabled', False)
        tone = request.data.get('tone', 'friendly')
        system_prompt = request.data.get('system_prompt')
        max_tokens = request.data.get('max_tokens', 150)
        temperature = request.data.get('temperature', 0.7)
        
        config, created = AIAssistantConfig.objects.update_or_create(
            user=request.user,
            chat_room_id=chat_room_id,
            defaults={
                'is_enabled': is_enabled,
                'tone': tone,
                'system_prompt': system_prompt or AIAssistantConfig._meta.get_field('system_prompt').default,
                'max_tokens': max_tokens,
                'temperature': temperature,
            }
        )
        
        serializer = self.get_serializer(config)
        return Response(
            serializer.data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def toggle(self, request, pk=None):
        """Toggle AI assistant on/off for a chat room"""
        config = self.get_object()
        config.is_enabled = not config.is_enabled
        config.save()
        
        serializer = self.get_serializer(config)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def responses(self, request, pk=None):
        """Get all AI responses for this config"""
        config = self.get_object()
        responses = AIResponse.objects.filter(config=config).order_by('-created_at')
        
        serializer = AIResponseSerializer(responses, many=True)
        return Response(serializer.data)


class AIResponseViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing AI responses"""
    serializer_class = AIResponseSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Return AI responses the user has access to"""
        return AIResponse.objects.filter(
            config__user=self.request.user
        ).select_related('trigger_message', 'sent_message')
    
    @action(detail=False, methods=['get'])
    def latest_pending(self, request):
        """Return the latest unactioned (status='generated') suggestion for a chat room"""
        chat_room_id = request.query_params.get('chat_room')
        if not chat_room_id:
            return Response(
                {'error': 'chat_room query param is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        ai_response = self.get_queryset().filter(
            config__chat_room_id=chat_room_id,
            status='generated'
        ).order_by('-created_at').first()
        
        if not ai_response:
            return Response(None)
        
        serializer = self.get_serializer(ai_response)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        """Accept and send an AI-suggested response"""
        ai_response = self.get_object()
        
        if ai_response.status != 'generated':
            return Response(
                {'error': 'Can only accept generated responses'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from apps.chat.models import Message
        # Send the AI response as a message
        sent_message = Message.objects.create(
            room=ai_response.config.chat_room,
            sender=request.user,
            content=ai_response.suggested_response,
        )
        
        ai_response.sent_message = sent_message
        ai_response.status = 'sent'
        ai_response.save()
        
        serializer = self.get_serializer(ai_response)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        """Reject an AI-suggested response"""
        ai_response = self.get_object()
        ai_response.status = 'rejected'
        ai_response.user_edit_reason = request.data.get('reason', '')
        ai_response.save()
        
        serializer = self.get_serializer(ai_response)
        return Response(serializer.data)
    
    @action(detail=True, methods=['put'])
    def edit_and_send(self, request, pk=None):
        """Edit AI response and send it"""
        ai_response = self.get_object()
        edited_content = request.data.get('content')
        
        if not edited_content:
            return Response(
                {'error': 'content is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from apps.chat.models import Message
        sent_message = Message.objects.create(
            room=ai_response.config.chat_room,
            sender=request.user,
            content=edited_content,
        )
        
        ai_response.sent_message = sent_message
        ai_response.status = 'sent'
        ai_response.user_edited = True
        ai_response.save()
        
        serializer = self.get_serializer(ai_response)
        return Response(serializer.data)
