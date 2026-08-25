from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status

User = get_user_model()


class RegisterTests(APITestCase):
    def test_register_creates_user_and_returns_tokens(self):
        response = self.client.post('/api/auth/register/', {
            'email': 'newuser@example.com',
            'username': 'newuser',
            'password': 'supersecret123',
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertTrue(User.objects.filter(email='newuser@example.com').exists())

    def test_register_rejects_duplicate_email(self):
        User.objects.create_user(email='dup@example.com', username='dupuser', password='pass12345')
        response = self.client.post('/api/auth/register/', {
            'email': 'dup@example.com',
            'username': 'anotherusername',
            'password': 'pass12345',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_register_rejects_short_password(self):
        response = self.client.post('/api/auth/register/', {
            'email': 'short@example.com',
            'username': 'shortpw',
            'password': '123',
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class LoginTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='login@example.com', username='loginuser', password='mypassword123'
        )

    def test_login_with_correct_credentials(self):
        response = self.client.post('/api/auth/login/', {
            'email': 'login@example.com',
            'password': 'mypassword123',
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_login_with_wrong_password(self):
        response = self.client.post('/api/auth/login/', {
            'email': 'login@example.com',
            'password': 'wrongpassword',
        })
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_login_with_unknown_email(self):
        response = self.client.post('/api/auth/login/', {
            'email': 'doesnotexist@example.com',
            'password': 'whatever123',
        })
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class MeEndpointTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            email='me@example.com', username='meuser', password='mypassword123'
        )

    def test_me_requires_authentication(self):
        response = self.client.get('/api/users/me/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_me_returns_current_user_when_authenticated(self):
        self.client.force_authenticate(user=self.user)
        response = self.client.get('/api/users/me/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['email'], 'me@example.com')