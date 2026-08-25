from celery import shared_task
from django.conf import settings
from .models import AIAssistantConfig, AIResponse
from apps.chat.models import Message, ChatRoom
import logging
import requests

logger = logging.getLogger(__name__)


@shared_task
def process_message_for_ai(message_id):
    """
    Process a message and generate AI response if enabled for the chat room
    """
    try:
        message = Message.objects.get(id=message_id)
        room = message.room
        
        # Get AI config for all users in the room who have AI enabled
        ai_configs = AIAssistantConfig.objects.filter(
            chat_room=room,
            is_enabled=True
        ).exclude(user=message.sender)  # Don't respond to own messages
        
        for config in ai_configs:
            generate_ai_response.delay(str(config.id), str(message.id))
    
    except Message.DoesNotExist:
        logger.error(f"Message {message_id} not found")
    except Exception as e:
        logger.error(f"Error processing message for AI: {str(e)}")


@shared_task
def generate_ai_response(config_id, message_id):
    """
    Generate AI response using Groq API
    """
    try:
        config = AIAssistantConfig.objects.get(id=config_id)
        message = Message.objects.get(id=message_id)
        
        # Build conversation context (last 10 messages)
        recent_messages = Message.objects.filter(
            room=config.chat_room,
            is_deleted=False
        ).order_by('-created_at')[:10]
        
        context = build_context(recent_messages, config)
        
        # Call Groq API
        response_text = call_groq_api(config, context, message)
        
        if response_text:
            # Create AI response record
            ai_response = AIResponse.objects.create(
                config=config,
                trigger_message=message,
                suggested_response=response_text,
                status='generated',
                confidence_score=0.85  # Placeholder confidence
            )
            
            # Notify user of suggestion via notification
            send_notification_for_ai_response(config.user, ai_response)
            
            logger.info(f"Generated AI response for message {message_id}")
        else:
            # Log failure
            ai_response = AIResponse.objects.create(
                config=config,
                trigger_message=message,
                suggested_response='',
                status='failed',
                error_message='Failed to generate response from Groq API'
            )
    
    except Exception as e:
        logger.error(f"Error generating AI response: {str(e)}")


def build_context(messages, config):
    """
    Build conversation context for AI prompt
    """
    context = []
    for msg in reversed(messages):
        context.append(f"{msg.sender.email}: {msg.content}")
    return "\n".join(context)


def call_groq_api(config, context, message):
    """
    Call Groq API to generate response
    """
    try:
        api_key = settings.GROQ_API_KEY
        if not api_key:
            logger.error("GROQ_API_KEY not configured")
            return None
        
        prompt = f"""{config.system_prompt}

Conversation context:
{context}

Previous message from {message.sender.email}: {message.content}

Generate a natural, brief response. Keep it under {config.max_tokens} tokens."""
        
        response = requests.post(
            'https://api.groq.com/openai/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {api_key}',
                'Content-Type': 'application/json',
            },
            json={
                                'model': 'openai/gpt-oss-20b',  # Fast, current model (Groq deprecated the Llama chat models)
                'messages': [
                    {
                        'role': 'system',
                        'content': config.system_prompt
                    },
                    {
                        'role': 'user',
                        'content': prompt
                    }
                ],
                'temperature': config.temperature,
                'max_tokens': config.max_tokens,
            },
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            return data['choices'][0]['message']['content']
        else:
            logger.error(f"Groq API error: {response.status_code} - {response.text}")
            return None
    
    except Exception as e:
        logger.error(f"Error calling Groq API: {str(e)}")
        return None


def send_notification_for_ai_response(user, ai_response):
    """
    Send notification to user about AI suggestion
    """
    from apps.notifications.tasks import send_notification
    
    send_notification.delay(
        user_id=str(user.id),
        title="AI Response Suggestion",
        body=f"Got a suggestion for: {ai_response.trigger_message.content[:50]}...",
        data={
            'type': 'ai_response',
            'ai_response_id': str(ai_response.id),
        }
    )
