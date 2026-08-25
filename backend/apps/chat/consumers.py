import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from django.utils import timezone
from .models import ChatRoom, Message, TypingIndicator

logger = logging.getLogger(__name__)
User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    """WebSocket consumer for real-time chat"""

    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'chat_{self.room_id}'
        self.user = self.scope["user"]

        if not self.user or not self.user.is_authenticated:
            logger.warning(f"WebSocket rejected: unauthenticated connection attempt for room {self.room_id}")
            await self.close(code=4001)
            return

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # Notify others that user joined
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_join',
                'user_id': str(self.user.id),
                'user_email': self.user.email,
            }
        )

    async def disconnect(self, close_code):
        if not getattr(self, 'user', None) or not self.user.is_authenticated:
            return

        # Remove typing indicator
        await self.remove_typing_indicator()

        # Notify others that user left
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_leave',
                'user_id': str(self.user.id),
                'user_email': self.user.email,
            }
        )

        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
    
    async def receive(self, text_data):
        data = json.loads(text_data)
        action = data.get('action')
        
        try:
            if action == 'message':
                await self.handle_message(data)
            elif action == 'typing':
                await self.handle_typing(data)
            elif action == 'stop_typing':
                await self.handle_stop_typing()
            elif action == 'reaction':
                await self.handle_reaction(data)
            elif action == 'edit':
                await self.handle_edit(data)
            elif action == 'delete':
                await self.handle_delete(data)
        except Exception as e:
            logger.error(f"WebSocket error: {str(e)}")
            await self.send(text_data=json.dumps({
                'error': 'An error occurred processing your request'
            }))
    
    async def handle_message(self, data):
        """Handle incoming message"""
        content = data.get('content')
        message_type = data.get('message_type', 'text')
        file_url = data.get('file_url')
        
        # Save message to database
        message = await self.save_message(content, message_type, file_url)
        
        # Broadcast message to room
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message_id': str(message.id),
                'sender_id': str(message.sender.id),
                'sender_email': message.sender.email,
                'content': message.content,
                'message_type': message.message_type,
                'file_url': message.file_url,
                'created_at': message.created_at.isoformat(),
            }
        )
    
    async def handle_typing(self, data):
        """Handle typing indicator"""
        await self.add_typing_indicator()
        
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_typing',
                'user_id': str(self.user.id),
                'user_email': self.user.email,
            }
        )
    
    async def handle_stop_typing(self):
        """Remove typing indicator"""
        await self.remove_typing_indicator()
        
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_stop_typing',
                'user_id': str(self.user.id),
            }
        )
    
    async def handle_reaction(self, data):
        """Handle emoji reaction"""
        message_id = data.get('message_id')
        emoji = data.get('emoji')
        
        await self.add_reaction(message_id, emoji)
        
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'message_reaction',
                'message_id': message_id,
                'user_id': str(self.user.id),
                'emoji': emoji,
            }
        )
    
    async def handle_edit(self, data):
        """Handle message edit"""
        message_id = data.get('message_id')
        new_content = data.get('content')
        
        await self.edit_message(message_id, new_content)
        
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'message_edit',
                'message_id': message_id,
                'content': new_content,
                'edited_at': timezone.now().isoformat(),
            }
        )
    
    async def handle_delete(self, data):
        """Handle message delete"""
        message_id = data.get('message_id')
        
        await self.delete_message(message_id)
        
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'message_delete',
                'message_id': message_id,
            }
        )
    
    # Event handlers (receive from group)
            # Event handlers (receive from group)
    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message',
            'data': event['message']
        }, default=str))
    
    async def user_typing(self, event):
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'data': event
        }))
    
    async def user_stop_typing(self, event):
        await self.send(text_data=json.dumps({
            'type': 'stop_typing',
            'data': event
        }))
    
    async def user_join(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user_join',
            'data': event
        }))
    
    async def user_leave(self, event):
        await self.send(text_data=json.dumps({
            'type': 'user_leave',
            'data': event
        }))
    
    async def message_reaction(self, event):
        await self.send(text_data=json.dumps({
            'type': 'reaction',
            'data': event
        }))
    
    async def message_edit(self, event):
        await self.send(text_data=json.dumps({
            'type': 'edit',
            'data': event
        }))
    
    async def message_delete(self, event):
        await self.send(text_data=json.dumps({
            'type': 'delete',
            'data': event
        }))
    
    # Database operations
    @database_sync_to_async
    def save_message(self, content, message_type, file_url):
        message = Message.objects.create(
            room_id=self.room_id,
            sender=self.user,
            content=content,
            message_type=message_type,
            file_url=file_url
        )
        return message
    
    @database_sync_to_async
    def edit_message(self, message_id, new_content):
        try:
            message = Message.objects.get(id=message_id, sender=self.user)
            message.content = new_content
            message.is_edited = True
            message.edited_at = timezone.now()
            message.save()
        except Message.DoesNotExist:
            pass
    
    @database_sync_to_async
    def delete_message(self, message_id):
        try:
            message = Message.objects.get(id=message_id, sender=self.user)
            message.is_deleted = True
            message.deleted_at = timezone.now()
            message.save()
        except Message.DoesNotExist:
            pass
    
    @database_sync_to_async
    def add_reaction(self, message_id, emoji):
        from .models import MessageReaction
        MessageReaction.objects.get_or_create(
            message_id=message_id,
            user=self.user,
            emoji=emoji
        )
    
    @database_sync_to_async
    def add_typing_indicator(self):
        TypingIndicator.objects.get_or_create(
            room_id=self.room_id,
            user=self.user
        )
    
    @database_sync_to_async
    def remove_typing_indicator(self):
        TypingIndicator.objects.filter(
            room_id=self.room_id,
            user=self.user
        ).delete()