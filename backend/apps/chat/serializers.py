from rest_framework import serializers
from .models import ChatRoom, Message, MessageReaction, TypingIndicator
from apps.users.serializers import UserSerializer


class MessageReactionSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = MessageReaction
        fields = ['id', 'user', 'emoji', 'created_at']
        read_only_fields = ['id', 'created_at']


class MessageSerializer(serializers.ModelSerializer):
    sender = UserSerializer(read_only=True)
    reactions = MessageReactionSerializer(many=True, read_only=True)
    
    class Meta:
        model = Message
        fields = ['id', 'room', 'sender', 'content', 'message_type', 'file_url',
                  'is_edited', 'edited_at', 'is_deleted', 'reactions', 'created_at', 'updated_at']
        read_only_fields = ['id', 'sender', 'is_edited', 'edited_at', 'created_at', 'updated_at']


class ChatRoomSerializer(serializers.ModelSerializer):
    members = UserSerializer(many=True, read_only=True)
    created_by = UserSerializer(read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatRoom
        fields = ['id', 'name', 'room_type', 'members', 'created_by', 'last_message',
                  'unread_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']
    
    def get_last_message(self, obj):
        last_message = obj.messages.filter(is_deleted=False).last()
        if last_message:
            return MessageSerializer(last_message).data
        return None
    
    def get_unread_count(self, obj):
        # Placeholder - implement based on your read receipts logic
        return 0


class ChatRoomDetailSerializer(serializers.ModelSerializer):
    members = UserSerializer(many=True, read_only=True)
    messages = serializers.SerializerMethodField()
    created_by = UserSerializer(read_only=True)
    
    class Meta:
        model = ChatRoom
        fields = ['id', 'name', 'room_type', 'members', 'created_by', 'messages', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_messages(self, obj):
        messages = obj.messages.filter(is_deleted=False).order_by('-created_at')[:50]  # Last 50
        return MessageSerializer(messages, many=True).data


class TypingIndicatorSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = TypingIndicator
        fields = ['id', 'room', 'user', 'created_at']
        read_only_fields = ['id', 'created_at']
