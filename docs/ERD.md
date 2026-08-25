# Entity Relationship Diagram

```mermaid
erDiagram
    USER ||--o{ MESSAGE : sends
    USER }o--o{ CHATROOM : "is member of"
    USER ||--o{ CHATROOM : creates
    USER ||--o{ AIASSISTANTCONFIG : configures
    USER ||--o{ MESSAGEREACTION : reacts
    USER ||--o{ NOTIFICATION : receives
    USER ||--o| USERDEVICETOKEN : has

    CHATROOM ||--o{ MESSAGE : contains
    CHATROOM ||--o{ AIASSISTANTCONFIG : "has config for"
    CHATROOM ||--o{ TYPINGINDICATOR : tracks

    MESSAGE ||--o{ MESSAGEREACTION : "has reactions"
    MESSAGE ||--o{ AIRESPONSE : triggers

    AIASSISTANTCONFIG ||--o{ AIRESPONSE : generates

    USER {
        uuid id PK
        string email UK
        string username UK
        string first_name
        string last_name
        string google_id
        string profile_picture
        boolean is_online
        datetime last_seen
    }

    CHATROOM {
        uuid id PK
        string name
        string room_type "direct or group"
        uuid created_by FK
        datetime created_at
        datetime updated_at
    }

    MESSAGE {
        uuid id PK
        uuid room FK
        uuid sender FK
        text content
        string message_type
        boolean is_edited
        boolean is_deleted
        datetime created_at
    }

    MESSAGEREACTION {
        uuid id PK
        uuid message FK
        uuid user FK
        string emoji
    }

    TYPINGINDICATOR {
        uuid id PK
        uuid room FK
        uuid user FK
    }

    AIASSISTANTCONFIG {
        uuid id PK
        uuid user FK
        uuid chat_room FK
        boolean is_enabled
        string tone
        text system_prompt
        int max_tokens
        float temperature
    }

    AIRESPONSE {
        uuid id PK
        uuid config FK
        uuid trigger_message FK
        text suggested_response
        string status
        uuid sent_message FK
        boolean user_edited
        float confidence_score
    }

    NOTIFICATION {
        uuid id PK
        uuid user FK
        string notification_type
        string title
        text body
        json data
        boolean is_read
    }

    USERDEVICETOKEN {
        uuid id PK
        uuid user FK
        string firebase_token
        string device_type
    }
```

## Key relationships explained

- A **ChatRoom** is either `direct` (exactly 2 members) or `group` (2+ members), enforced at the API layer, not the database — this keeps the schema flexible for future room types.
- **AIAssistantConfig** is scoped per `(user, chat_room)` pair via a unique constraint — each participant independently controls whether they receive AI suggestions in that specific conversation.
- **AIResponse** links back to the `Message` that triggered it (`trigger_message`) and, once accepted, to the `Message` that was actually sent (`sent_message`) — this preserves a full audit trail of what the AI suggested versus what was ultimately sent.
- **Message** uses soft deletion (`is_deleted` flag) rather than hard deletion, so conversation history and reaction/AI-response references stay intact.
