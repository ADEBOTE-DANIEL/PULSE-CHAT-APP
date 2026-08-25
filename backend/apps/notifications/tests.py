from unittest.mock import patch
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from .models import Notification

User = get_user_model()


class DeviceTokenTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='d1@example.com', username='d1', password='pass12345')
        self.client.force_authenticate(user=self.user)

    def test_update_device_token(self):
        response = self.client.post('/api/users/update_device_token/', {
            'firebase_token': 'sometoken123',
            'device_type': 'android',
        }, format='json')
        self.assertIn(response.status_code, [status.HTTP_200_OK, status.HTTP_201_CREATED])

    def test_update_device_token_requires_fields(self):
        response = self.client.post('/api/users/update_device_token/', {}, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class SendNotificationTaskTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email='n1@example.com', username='n1', password='pass12345')

    @patch('apps.notifications.tasks.messaging')
    def test_send_notification_creates_record(self, mock_messaging):
        mock_messaging.send.return_value = 'mock-message-id'
        from .tasks import send_notification
        send_notification(
            user_id=str(self.user.id),
            title='Test Title',
            body='Test Body',
            data={'type': 'message'},
        )
        notification = Notification.objects.first()
        self.assertIsNotNone(notification)
        self.assertEqual(notification.title, 'Test Title')

    def test_notification_mark_as_read(self):
        notification = Notification.objects.create(
            user=self.user,
            notification_type='message',
            title='Hi',
            body='Test',
        )
        self.assertFalse(notification.is_read)
        notification.mark_as_read()
        self.assertTrue(notification.is_read)