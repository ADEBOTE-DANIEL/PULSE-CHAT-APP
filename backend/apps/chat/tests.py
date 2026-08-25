from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from .models import ChatRoom, Message

User = get_user_model()


class ChatRoomCreationTests(APITestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(email='u1@example.com', username='u1', password='pass12345')
        self.user2 = User.objects.create_user(email='u2@example.com', username='u2', password='pass12345')
        self.user3 = User.objects.create_user(email='u3@example.com', username='u3', password='pass12345')
        self.client.force_authenticate(user=self.user1)

    def test_create_direct_room(self):
        response = self.client.post('/api/chat-rooms/', {
            'room_type': 'direct',
            'members': [str(self.user2.id)],
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ChatRoom.objects.count(), 1)
        room = ChatRoom.objects.first()
        self.assertEqual(room.members.count(), 2)

    def test_creating_same_direct_room_twice_reuses_it(self):
        self.client.post('/api/chat-rooms/', {
            'room_type': 'direct',
            'members': [str(self.user2.id)],
        }, format='json')
        response = self.client.post('/api/chat-rooms/', {
            'room_type': 'direct',
            'members': [str(self.user2.id)],
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(ChatRoom.objects.count(), 1)

    def test_create_group_room(self):
        response = self.client.post('/api/chat-rooms/', {
            'room_type': 'group',
            'members': [str(self.user2.id), str(self.user3.id)],
            'name': 'Test Group',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        room = ChatRoom.objects.first()
        self.assertEqual(room.room_type, 'group')
        self.assertEqual(room.members.count(), 3)

    def test_direct_room_requires_exactly_two_members(self):
        response = self.client.post('/api/chat-rooms/', {
            'room_type': 'direct',
            'members': [str(self.user2.id), str(self.user3.id)],
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_user_only_sees_their_own_rooms(self):
        ChatRoom.objects.create(room_type='direct', created_by=self.user2)
        room2 = ChatRoom.objects.create(room_type='direct', created_by=self.user1)
        room2.members.add(self.user1, self.user2)

        response = self.client.get('/api/chat-rooms/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        room_ids = [r['id'] for r in response.data['results']] if 'results' in response.data else [r['id'] for r in response.data]
        self.assertIn(str(room2.id), room_ids)


class MessageTests(APITestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(email='m1@example.com', username='m1', password='pass12345')
        self.user2 = User.objects.create_user(email='m2@example.com', username='m2', password='pass12345')
        self.room = ChatRoom.objects.create(room_type='direct', created_by=self.user1)
        self.room.members.add(self.user1, self.user2)
        self.client.force_authenticate(user=self.user1)

    def test_send_message(self):
        response = self.client.post('/api/messages/', {
            'room': str(self.room.id),
            'content': 'Hello there',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Message.objects.count(), 1)
        self.assertEqual(Message.objects.first().sender, self.user1)

    def test_get_messages_by_room(self):
        Message.objects.create(room=self.room, sender=self.user1, content='First')
        Message.objects.create(room=self.room, sender=self.user2, content='Second')

        response = self.client.get(f'/api/messages/by_room/?room_id={self.room.id}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 2)

    def test_non_member_cannot_send_message_to_room(self):
        outsider = User.objects.create_user(email='out@example.com', username='out', password='pass12345')
        self.client.force_authenticate(user=outsider)
        response = self.client.post('/api/messages/', {
            'room': str(self.room.id),
            'content': 'Sneaky message',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_edit_own_message(self):
        message = Message.objects.create(room=self.room, sender=self.user1, content='Original')
        response = self.client.put(f'/api/messages/{message.id}/edit/', {'content': 'Edited'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        message.refresh_from_db()
        self.assertEqual(message.content, 'Edited')
        self.assertTrue(message.is_edited)

    def test_cannot_edit_others_message(self):
        message = Message.objects.create(room=self.room, sender=self.user2, content='Not yours')
        response = self.client.put(f'/api/messages/{message.id}/edit/', {'content': 'Hacked'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_delete_own_message(self):
        message = Message.objects.create(room=self.room, sender=self.user1, content='To delete')
        response = self.client.post(f'/api/messages/{message.id}/delete/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        message.refresh_from_db()
        self.assertTrue(message.is_deleted)