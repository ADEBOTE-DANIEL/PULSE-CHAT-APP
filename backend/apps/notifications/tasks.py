from celery import shared_task
from django.conf import settings
from .models import Notification
from apps.users.models import UserDeviceToken
import logging
import firebase_admin
from firebase_admin import credentials, messaging
import json

logger = logging.getLogger(__name__)

# Initialize Firebase (once)
firebase_initialized = False

def initialize_firebase():
    """Initialize Firebase Admin SDK"""
    global firebase_initialized
    if firebase_initialized:
        return
    
    try:
        creds_json = settings.FIREBASE_CREDENTIALS
        if isinstance(creds_json, str):
            creds_dict = json.loads(creds_json)
        else:
            creds_dict = creds_json
        
        creds = credentials.Certificate(creds_dict)
        firebase_admin.initialize_app(creds)
        firebase_initialized = True
        logger.info("Firebase initialized successfully")
    except Exception as e:
        logger.error(f"Failed to initialize Firebase: {str(e)}")


@shared_task
def send_notification(user_id, title, body, data=None):
    """
    Send push notification to user via Firebase
    """
    try:
        initialize_firebase()
        
        from apps.users.models import User
        user = User.objects.get(id=user_id)
        
        # Create in-app notification
        notification_type = data.get('type', 'system') if data else 'system'
        notification = Notification.objects.create(
            user=user,
            notification_type=notification_type,
            title=title,
            body=body,
            data=data or {}
        )
        
        # Send push notification if user has device token
        try:
            device_token = UserDeviceToken.objects.get(user=user)
            send_firebase_notification(device_token.firebase_token, title, body, data or {})
            notification.is_sent = True
            notification.save()
        except UserDeviceToken.DoesNotExist:
            logger.warning(f"No device token for user {user.email}")
        
        logger.info(f"Notification sent to {user.email}")
        return str(notification.id)
    
    except Exception as e:
        logger.error(f"Error sending notification: {str(e)}")


def send_firebase_notification(token, title, body, data):
    """
    Send FCM push notification
    """
    try:
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data=data,
            token=token,
        )
        
        response = messaging.send(message)
        logger.info(f"Firebase notification sent: {response}")
    except Exception as e:
        logger.error(f"Firebase notification error: {str(e)}")


@shared_task
def send_new_message_notification(message_id):
    """
    Send notification to room members when new message arrives
    """
    try:
        from apps.chat.models import Message
        message = Message.objects.get(id=message_id)
        room = message.room
        
        # Get all room members except sender
        members = room.members.exclude(id=message.sender.id)
        
        for member in members:
            send_notification.delay(
                user_id=str(member.id),
                title=f"New message from {message.sender.first_name or message.sender.email}",
                body=message.content[:100],
                data={
                    'type': 'message',
                    'room_id': str(room.id),
                    'message_id': str(message.id),
                }
            )
    
    except Exception as e:
        logger.error(f"Error sending message notification: {str(e)}")
