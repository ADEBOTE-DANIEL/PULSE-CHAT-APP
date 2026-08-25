# Chat App Backend

Django REST Framework backend with real-time WebSocket support, AI assistant integration, and push notifications.

## Setup

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Environment Variables
```bash
cp .env.example .env
```

### 3. Run Migrations
```bash
python manage.py makemigrations
python manage.py migrate
```

### 4. Create Superuser (Admin)
```bash
python manage.py createsuperuser
```

### 5. Start Development Server

**With Daphne (WebSocket support):**
```bash
daphne -b 0.0.0.0 -p 8000 core.asgi:application
```

**With Django development server (HTTP only):**
```bash
python manage.py runserver
```

## Running Celery

### Celery Worker (for background tasks)
```bash
celery -A core worker --loglevel=info
```

### Celery Beat (for scheduled tasks)
```bash
celery -A core beat --loglevel=info
```

## API Endpoints

Base URL: `http://localhost:8000/api/`

### Authentication
- `POST /auth/login/` - Email/password login
- `POST /auth/google/` - Google OAuth login
- `POST /auth/refresh/` - Refresh JWT token

### Users
- `GET /users/` - List users
- `GET /users/me/` - Get current user
- `PUT /users/update_profile/` - Update profile
- `POST /users/update_device_token/` - Store Firebase token

### Chat Rooms
- `GET /chat-rooms/` - List user's chat rooms
- `POST /chat-rooms/` - Create new chat room
- `GET /chat-rooms/{id}/` - Get chat room details
- `POST /chat-rooms/{id}/add_member/` - Add user to group
- `POST /chat-rooms/{id}/remove_member/` - Remove user from group

### Messages
- `GET /messages/` - List all messages
- `POST /messages/` - Send message
- `GET /messages/by_room/?room_id={id}` - Get messages for room
- `PUT /messages/{id}/edit/` - Edit message
- `POST /messages/{id}/delete/` - Delete message (soft)
- `POST /messages/{id}/add_reaction/` - Add emoji reaction
- `POST /messages/{id}/remove_reaction/` - Remove emoji reaction

### AI Assistant
- `GET /ai-config/` - Get AI configuration
- `POST /ai-config/` - Create/update AI config
- `POST /ai-config/{id}/toggle/` - Toggle AI on/off
- `GET /ai-responses/` - Get generated responses
- `POST /ai-responses/{id}/accept/` - Accept response
- `POST /ai-responses/{id}/reject/` - Reject response
- `PUT /ai-responses/{id}/edit_and_send/` - Edit and send response

### Notifications
- `GET /notifications/` - List notifications
- `GET /notifications/unread/` - Get unread count
- `POST /notifications/{id}/mark_as_read/` - Mark as read
- `POST /notifications/mark_all_as_read/` - Mark all as read
- `DELETE /notifications/clear_all/` - Delete all

## WebSocket Connection

**URL:** `ws://localhost:8000/ws/chat/{room_id}/`

### Messages Format

**Send Message:**
```json
{
  "action": "message",
  "content": "Hello!",
  "message_type": "text",
  "file_url": null
}
```

**Typing Indicator:**
```json
{
  "action": "typing"
}
```

**Stop Typing:**
```json
{
  "action": "stop_typing"
}
```

**Add Reaction:**
```json
{
  "action": "reaction",
  "message_id": "uuid",
  "emoji": "👍"
}
```

**Edit Message:**
```json
{
  "action": "edit",
  "message_id": "uuid",
  "content": "Edited content"
}
```

**Delete Message:**
```json
{
  "action": "delete",
  "message_id": "uuid"
}
```

## Database Schema

### Core Models

**User** (extends Django User)
- `id` (UUID)
- `email` (unique)
- `google_id` (unique, nullable)
- `profile_picture` (URL)
- `is_online` (boolean)
- `user_type` (user/admin)

**ChatRoom**
- `id` (UUID)
- `room_type` (direct/group)
- `name` (for groups)
- `members` (M2M with User)
- `created_by` (User FK)

**Message**
- `id` (UUID)
- `room` (FK to ChatRoom)
- `sender` (FK to User)
- `content` (text)
- `message_type` (text/image/file)
- `is_edited`, `is_deleted` (soft delete)
- `created_at`, `updated_at`

**MessageReaction**
- `id` (UUID)
- `message` (FK)
- `user` (FK)
- `emoji`

**AIAssistantConfig**
- `id` (UUID)
- `user` (FK)
- `chat_room` (FK)
- `is_enabled` (boolean)
- `tone` (professional/casual/friendly/humorous)
- `system_prompt` (text)
- `max_tokens`, `temperature`

**AIResponse**
- `id` (UUID)
- `config` (FK)
- `trigger_message` (FK)
- `suggested_response` (text)
- `status` (pending/generated/sent/failed)
- `sent_message` (FK, nullable)

**Notification**
- `id` (UUID)
- `user` (FK)
- `notification_type`
- `title`, `body`, `data` (JSON)
- `is_read`, `is_sent`
- `created_at`, `read_at`

## Deployment

### Docker Build
```bash
docker build -t chat-app-backend .
```

### Environment for Production
```env
DEBUG=False
DJANGO_SECRET_KEY=<secure-random-key>
ALLOWED_HOSTS=yourdomain.com
DB_HOST=<render-postgres-host>
GROQ_API_KEY=<your-key>
GOOGLE_OAUTH_CLIENT_ID=<your-id>
GOOGLE_OAUTH_CLIENT_SECRET=<your-secret>
FIREBASE_CREDENTIALS_JSON=<json-blob>
```

## Logging

Logs are written to:
- Console (colored output for development)
- `logs/app.log` (JSON format for production)

## Admin Panel

Access at: http://localhost:8000/admin/

Login with superuser credentials created during setup.

## Rate Limiting (Production)

Add to `settings.py` for production:
```python
REST_FRAMEWORK['DEFAULT_THROTTLE_CLASSES'] = [
    'rest_framework.throttling.AnonRateThrottle',
    'rest_framework.throttling.UserRateThrottle'
]
REST_FRAMEWORK['DEFAULT_THROTTLE_RATES'] = {
    'anon': '100/hour',
    'user': '1000/hour'
}
```

## Testing

```bash
python manage.py test
# or with coverage
coverage run --source='.' manage.py test
coverage report
```
