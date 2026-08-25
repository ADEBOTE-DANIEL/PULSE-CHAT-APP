from unittest.mock import patch, MagicMock
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from apps.chat.models import ChatRoom, Message
from .models import AIAssistantConfig, AIResponse

User = get_user_model()


class AIAssistantConfigTests(APITestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(email='a1@example.com', username='a1', password='pass12345')
        self.user2 = User.objects.create_user(email='a2@example.com', username='a2', password='pass12345')
        self.room = ChatRoom.objects.create(room_type='direct', created_by=self.user1)
        self.room.members.add(self.user1, self.user2)
        self.client.force_authenticate(user=self.user1)

    def test_create_ai_config(self):
        response = self.client.post('/api/ai-config/', {
            'chat_room': str(self.room.id),
            'is_enabled': True,
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(AIAssistantConfig.objects.count(), 1)

    def test_toggle_ai_config(self):
        config = AIAssistantConfig.objects.create(user=self.user1, chat_room=self.room, is_enabled=True)
        response = self.client.post(f'/api/ai-config/{config.id}/toggle/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        config.refresh_from_db()
        self.assertFalse(config.is_enabled)


class AIResponseGenerationTests(APITestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(email='g1@example.com', username='g1', password='pass12345')
        self.user2 = User.objects.create_user(email='g2@example.com', username='g2', password='pass12345')
        self.room = ChatRoom.objects.create(room_type='direct', created_by=self.user1)
        self.room.members.add(self.user1, self.user2)
        self.config = AIAssistantConfig.objects.create(user=self.user2, chat_room=self.room, is_enabled=True)
        self.message = Message.objects.create(room=self.room, sender=self.user1, content='Hi there')

    @patch('apps.ai_assistant.tasks.requests.post')
    def test_generate_ai_response_success(self, mock_post):
        mock_post.return_value = MagicMock(
            status_code=200,
            json=lambda: {'choices': [{'message': {'content': 'Hello back!'}}]}
        )
        from .tasks import generate_ai_response
        generate_ai_response(str(self.config.id), str(self.message.id))

        ai_response = AIResponse.objects.first()
        self.assertIsNotNone(ai_response)
        self.assertEqual(ai_response.status, 'generated')
        self.assertEqual(ai_response.suggested_response, 'Hello back!')

    @patch('apps.ai_assistant.tasks.requests.post')
    def test_generate_ai_response_handles_api_failure(self, mock_post):
        mock_post.return_value = MagicMock(status_code=500, text='Server error')
        from .tasks import generate_ai_response
        generate_ai_response(str(self.config.id), str(self.message.id))

        ai_response = AIResponse.objects.first()
        self.assertIsNotNone(ai_response)
        self.assertEqual(ai_response.status, 'failed')

    def test_ai_does_not_trigger_for_own_message(self):
        from .tasks import process_message_for_ai
        own_message = Message.objects.create(room=self.room, sender=self.user2, content='My own message')
        process_message_for_ai(str(own_message.id))
        self.assertEqual(AIResponse.objects.count(), 0)