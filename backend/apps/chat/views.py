from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import ChatRoom, Message, MessageReaction
from .serializers import ChatRoomSerializer, ChatRoomDetailSerializer, MessageSerializer, MessageReactionSerializer
import logging

logger = logging.getLogger(__name__)


class ChatRoomViewSet(viewsets.ModelViewSet):
    """ViewSet for managing chat rooms"""
    serializer_class = ChatRoomSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['-updated_at', '-created_at']
    ordering = ['-updated_at']
    
    def get_queryset(self):
        """Return chat rooms for the current user"""
        return ChatRoom.objects.filter(members=self.request.user).prefetch_related('members')
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return ChatRoomDetailSerializer
        return ChatRoomSerializer
    
    def create(self, request):
        """Create a new chat room (direct or group)"""
        room_type = request.data.get('room_type')
        members = request.data.get('members', [])
        name = request.data.get('name')
        
        # Add current user to members
        if request.user.id not in members:
            members.append(str(request.user.id))
        
        # For direct messages, check if room already exists
        if room_type == 'direct':
            if len(members) != 2:
                return Response(
                    {'error': 'Direct messages must have exactly 2 members'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            # Check if direct chat already exists
            existing_room = ChatRoom.objects.filter(
                room_type='direct',
                members__id__in=members
            ).annotate(member_count=models.Count('members')).filter(member_count=2).first()
            
            if existing_room:
                serializer = self.get_serializer(existing_room)
                return Response(serializer.data, status=status.HTTP_200_OK)
        
        # Create new room
        room = ChatRoom.objects.create(
            room_type=room_type,
            name=name,
            created_by=request.user
        )
        room.members.set(members)
        
        serializer = self.get_serializer(room)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        """Add a member to a group chat"""
        room = self.get_object()
        
        if room.room_type != 'group':
            return Response(
                {'error': 'Can only add members to group chats'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user_id = request.data.get('user_id')
        room.members.add(user_id)
        
        serializer = self.get_serializer(room)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def remove_member(self, request, pk=None):
        """Remove a member from a group chat"""
        room = self.get_object()
        
        if room.room_type != 'group':
            return Response(
                {'error': 'Can only remove members from group chats'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user_id = request.data.get('user_id')
        room.members.remove(user_id)
        
        serializer = self.get_serializer(room)
        return Response(serializer.data)


class MessageViewSet(viewsets.ModelViewSet):
    """ViewSet for managing messages"""
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['-created_at']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Return messages the user has access to"""
        return Message.objects.filter(
            room__members=self.request.user
        ).exclude(is_deleted=True).select_related('sender')
    
    def create(self, request):
        """Create a new message"""
        room_id = request.data.get('room')
        content = request.data.get('content')
        message_type = request.data.get('message_type', 'text')
        file_url = request.data.get('file_url')
        
        try:
            room = ChatRoom.objects.get(id=room_id, members=request.user)
        except ChatRoom.DoesNotExist:
            return Response(
                {'error': 'Chat room not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        message = Message.objects.create(
            room=room,
            sender=request.user,
            content=content,
            message_type=message_type,
            file_url=file_url
        )
        
                # Trigger AI assistant if enabled
        from apps.ai_assistant.tasks import process_message_for_ai
        process_message_for_ai.delay(str(message.id))
        
        # Notify other members in the room about the new message
        from apps.notifications.tasks import send_notification
        for member in room.members.exclude(id=request.user.id):
            send_notification.delay(
                user_id=str(member.id),
                title=request.user.username or request.user.email,
                body=content[:100],
                data={'type': 'new_message', 'room_id': str(room.id)},
            )
        
        serializer = self.get_serializer(message)
        
        # Broadcast new message to room group over WebSocket
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f'chat_{room.id}',
            {
                'type': 'chat_message',
                'message': serializer.data,
            }
        )
        
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['put'])
    def edit(self, request, pk=None):
        """Edit a message"""
        message = self.get_object()
        
        if message.sender != request.user:
            return Response(
                {'error': 'Can only edit your own messages'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        message.content = request.data.get('content', message.content)
        message.is_edited = True
        message.edited_at = timezone.now()
        message.save()
        
        serializer = self.get_serializer(message)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def delete(self, request, pk=None):
        """Soft delete a message"""
        message = self.get_object()
        
        if message.sender != request.user:
            return Response(
                {'error': 'Can only delete your own messages'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        message.is_deleted = True
        message.deleted_at = timezone.now()
        message.save()
        
        return Response({'status': 'Message deleted'})
    
    @action(detail=True, methods=['post'])
    def add_reaction(self, request, pk=None):
        """Add emoji reaction to a message"""
        message = self.get_object()
        emoji = request.data.get('emoji')
        
        reaction, created = MessageReaction.objects.get_or_create(
            message=message,
            user=request.user,
            emoji=emoji
        )
        
        serializer = MessageReactionSerializer(reaction)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def remove_reaction(self, request, pk=None):
        """Remove emoji reaction from a message"""
        message = self.get_object()
        emoji = request.data.get('emoji')
        
        MessageReaction.objects.filter(
            message=message,
            user=request.user,
            emoji=emoji
        ).delete()
        
        return Response({'status': 'Reaction removed'})
    
    @action(detail=False, methods=['get'])
    def by_room(self, request):
        """Get messages for a specific room"""
        room_id = request.query_params.get('room_id')
        
        if not room_id:
            return Response(
                {'error': 'room_id query parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        messages = Message.objects.filter(
            room_id=room_id,
            room__members=request.user
        ).exclude(is_deleted=True).select_related('sender').order_by('created_at')
        
        serializer = self.get_serializer(messages, many=True)
        return Response(serializer.data)


from django.utils import timezone
from django.db import models
