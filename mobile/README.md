# Chat App Mobile

React Native mobile app built with Expo for real-time chat with AI assistant integration.

## Setup

### 1. Install Dependencies
```bash
npm install
# or
yarn install
```

### 2. Environment Variables
Create `.env.local`:
```env
EXPO_PUBLIC_API_URL=http://your-backend-url/api
EXPO_PUBLIC_WS_URL=ws://your-backend-url
```

For local development with ngrok:
```bash
# Start ngrok
ngrok http 8000

# Update .env.local with ngrok URL
EXPO_PUBLIC_API_URL=https://your-ngrok-url/api
EXPO_PUBLIC_WS_URL=wss://your-ngrok-url
```

### 3. Start Development Server
```bash
npm start
```

Scan QR code with Expo Go app or:
- Press `a` for Android
- Press `i` for iOS

## Building APK/IPA

### Prerequisites
- EAS account (free tier available)
- GitHub account (connected)

### Android APK
```bash
eas build --platform android
```

After build completes, download APK and install on device:
```bash
adb install app.apk
```

### iOS IPA
```bash
eas build --platform ios
```

## Google Sign-In Setup

### Android Steps

1. **Get SHA-1 Fingerprint:**
   ```bash
   keytool -list -v -keystore ~/.android/debug.keystore \
     -alias androiddebugkey -storepass android -keypass android
   ```

2. **Configure Google Cloud Console:**
   - Go to project in Google Cloud Console
   - OAuth 2.0 Credentials
   - Add Android app:
     - SHA-1 fingerprint (from above)
     - Package name: `com.chatapp.mobile`

3. **Update `app.json`:**
   ```json
   {
     "plugins": [
       [
         "expo-google-sign-in",
         {
           "androidClientId": "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com"
         }
       ]
     ]
   }
   ```

### iOS Steps

1. **Configure Google Cloud Console:**
   - Add iOS app:
     - Bundle ID: `com.chatapp.mobile`
     - App Store ID (if on App Store)

2. **Update `app.json`:**
   ```json
   {
     "plugins": [
       [
         "expo-google-sign-in",
         {
           "iosClientId": "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com"
         }
       ]
     ]
   }
   ```

## File Structure

```
mobile/
├── app/
│   ├── (tabs)/               # Tab navigation layout
│   ├── screens/
│   │   ├── login/
│   │   ├── chats/
│   │   ├── chat-detail/
│   │   ├── profile/
│   │   └── ai-responses/
│   ├── components/
│   │   ├── MessageBubble.js
│   │   ├── ChatItem.js
│   │   ├── TypingIndicator.js
│   │   └── ReactionPicker.js
│   ├── services/
│   │   └── api.js           # API client
│   ├── store/
│   │   ├── authStore.js     # Auth state
│   │   ├── chatStore.js     # Chat state
│   │   └── uiStore.js       # UI state
│   ├── hooks/
│   │   ├── useWebSocket.js  # WebSocket hook
│   │   ├── useAuth.js
│   │   ├── useNotifications.js
│   │   └── useGoogleSignIn.js
│   └── utils/
│       ├── constants.js
│       ├── validators.js
│       └── formatters.js
├── assets/                   # Images, fonts
├── app.json                  # Expo configuration
├── eas.json                  # EAS build config
└── package.json
```

## Key Hooks

### useWebSocket
```javascript
const {
  connected,
  sendMessage,
  sendTyping,
  stopTyping,
  sendReaction,
  editMsg,
  deleteMsg
} = useWebSocket(roomId);
```

### useAuth (Custom)
```javascript
const { user, login, logout, isLoading } = useAuth();
```

### useNotifications (Custom)
```javascript
const {
  notifications,
  unreadCount,
  markAsRead,
  clearAll
} = useNotifications();
```

## State Management (Zustand)

### Auth Store
```javascript
import { useAuthStore } from '@/store/authStore';

const user = useAuthStore((state) => state.user);
const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);
```

### Chat Store
```javascript
import { useChatStore } from '@/store/chatStore';

const chatRooms = useChatStore((state) => state.chatRooms);
const messages = useChatStore((state) => state.messages[roomId]);
const sendMessage = useChatStore((state) => state.sendMessage);
```

## Network Requests

All API requests go through the centralized `api.js` client:

```javascript
import { api } from '@/services/api';

// Login
const data = await api.loginWithGoogle(token);

// Send message
const message = await api.sendMessage(roomId, content);

// Get notifications
const notifications = await api.getNotifications();
```

## Firebase Notifications

Setup Firebase in app:

1. Download `google-services.json` from Firebase Console
2. Place in `mobile/android/` directory
3. Update `app.json`:
   ```json
   {
     "android": {
       "googleServicesFile": "./google-services.json"
     }
   }
   ```

## Performance Optimization

- Messages are virtualized (FlatList/FlashList)
- Images are cached with React Native Image Cache
- Zustand selectors prevent unnecessary re-renders
- WebSocket reconnects automatically

## Development Tips

- Use Expo Go for rapid development
- Use EAS Build for production builds
- Test on physical device (iPhone Simulator has limitations)
- Use React DevTools Debugger: `npm start` → `j` key

## Troubleshooting

### WebSocket Connection Failed
- Check API URL in `.env.local`
- Ensure ngrok tunnel is running (mobile dev)
- Check backend is accessible: `curl https://your-ngrok-url/api/docs/`

### Google Sign-In Fails
- Verify SHA-1 fingerprint in Google Console
- Check `app.json` credentials are correct
- Test on physical device (emulator may have issues)

### Push Notifications Not Working
- Verify Firebase project is linked
- Check `google-services.json` is in correct location
- Test notification permission is granted
- Check backend is sending notifications

### APK Installation Fails
- Clear app cache: `adb uninstall com.chatapp.mobile`
- Check device storage space
- Verify APK is signed correctly

## Building for Production

1. **Update version in `package.json` and `app.json`**
2. **Build with EAS:**
   ```bash
   eas build --platform android --auto-submit
   eas build --platform ios --auto-submit
   ```
3. **Submit to stores:**
   ```bash
   eas submit --platform android
   eas submit --platform ios
   ```

## Testing

```bash
npm test
```

Run with coverage:
```bash
npm test -- --coverage
```
