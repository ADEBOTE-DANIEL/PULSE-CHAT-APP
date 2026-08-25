# Google OAuth Setup Checklist

Complete step-by-step guide for setting up Google authentication on Android, iOS, and Web.

## ✅ Phase 1: Google Cloud Console Setup

### 1.1 Create Project
- [ ] Go to [Google Cloud Console](https://console.cloud.google.com/)
- [ ] Click "Select a Project" → "New Project"
- [ ] Project name: `ChatApp`
- [ ] Create

### 1.2 Enable APIs
- [ ] Search for "Google+ API"
- [ ] Click "Enable"
- [ ] Search for "Identity and Access Management API"
- [ ] Click "Enable"

### 1.3 Create OAuth 2.0 Credentials
- [ ] Go to "Credentials" in left sidebar
- [ ] Click "Create Credentials" → "OAuth client ID"
- [ ] Choose "Application type"

---

## ✅ Phase 2: Android Setup

### 2.1 Get SHA-1 Fingerprint (Development)

**Option A: Debug Keystore (Development)**
```bash
keytool -list -v -keystore ~/.android/debug.keystore \
  -alias androiddebugkey \
  -storepass android \
  -keypass android
```

Look for: `SHA1: XX:XX:XX:...`

Copy the SHA1 value (without colons).

**Option B: Production Keystore (After building APK)**
```bash
keytool -list -v -keystore /path/to/your/keystore.keystore \
  -alias your_key_alias
```

### 2.2 Add Android App to Google Console

- [ ] In Google Cloud Console, create new OAuth credential
- [ ] Application type: **Android**
- [ ] Package name: `com.chatapp.mobile`
- [ ] SHA-1 fingerprint: Paste from 2.1
- [ ] Click "Create"
- [ ] Download and save the JSON file

### 2.3 Update app.json

```json
{
  "expo": {
    "plugins": [
      [
        "expo-google-sign-in",
        {
          "androidClientId": "YOUR_ANDROID_CLIENT_ID.apps.googleusercontent.com"
        }
      ]
    ],
    "android": {
      "package": "com.chatapp.mobile"
    }
  }
}
```

Get `YOUR_ANDROID_CLIENT_ID` from the JSON file in 2.2.

### 2.4 Build and Test

```bash
# Build APK
eas build --platform android --profile development

# Once built, download APK
adb install app.apk

# Test Google Sign-In in app
```

---

## ✅ Phase 3: iOS Setup

### 3.1 Get Bundle ID

The Bundle ID is already set in `app.json`:
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.chatapp.mobile"
    }
  }
}
```

### 3.2 Add iOS App to Google Console

- [ ] In Google Cloud Console, create new OAuth credential
- [ ] Application type: **iOS**
- [ ] Bundle ID: `com.chatapp.mobile`
- [ ] App Store ID: (leave empty for development)
- [ ] Team ID: (leave empty for development)
- [ ] Click "Create"
- [ ] Download and save the JSON file

### 3.3 Update app.json

```json
{
  "expo": {
    "plugins": [
      [
        "expo-google-sign-in",
        {
          "iosClientId": "YOUR_IOS_CLIENT_ID.apps.googleusercontent.com"
        }
      ]
    ]
  }
}
```

Get `YOUR_IOS_CLIENT_ID` from the JSON file in 3.2.

### 3.4 Build and Test

```bash
# Build IPA
eas build --platform ios --profile development

# Once built, download IPA
# Install on device using Xcode or TestFlight

# Test Google Sign-In in app
```

---

## ✅ Phase 4: Web Setup

### 4.1 Add Web Redirect URIs

- [ ] In Google Cloud Console, find OAuth 2.0 Client IDs
- [ ] Click the existing credential (or create new)
- [ ] Add Authorized redirect URIs:
  - `http://localhost:8000/api/auth/google/callback/`
  - `http://localhost:3000/auth/callback`
  - `https://yourdomain.com/api/auth/google/callback/`

### 4.2 Update Backend .env

```env
GOOGLE_OAUTH_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=YOUR_WEB_CLIENT_SECRET
```

---

## ✅ Phase 5: Backend Integration

### 5.1 Django Setup

Backend already has Google OAuth configured:
- `apps/users/views.py` → `GoogleOAuthView`
- Uses `google-auth` library
- Validates token and creates/updates user

### 5.2 Environment Variables

Ensure `.env` has:
```env
DEBUG=True
GOOGLE_OAUTH_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_OAUTH_CLIENT_SECRET=xxx
```

### 5.3 Test Backend

```bash
# Start backend
docker-compose up -d backend

# Test endpoint
curl -X POST http://localhost:8000/api/auth/google/ \
  -H "Content-Type: application/json" \
  -d '{"token":"<your-google-token>"}'
```

---

## ✅ Phase 6: Mobile App Integration

### 6.1 Install Google Sign-In Package

Already installed:
```bash
npm install expo-google-sign-in
```

### 6.2 Create Login Screen Hook

Create `app/hooks/useGoogleSignIn.js`:

```javascript
import * as GoogleSignIn from 'expo-google-sign-in';
import { useAuthStore } from '../store/authStore';

export const useGoogleSignIn = () => {
  const loginWithGoogle = useAuthStore((state) => state.loginWithGoogle);

  const handleGoogleSignIn = async () => {
    try {
      await GoogleSignIn.initAsync({
        clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
      });

      const result = await GoogleSignIn.signInAsync();

      if (result.type === 'success') {
        await loginWithGoogle(result.idToken);
      }
    } catch (error) {
      console.error('Google Sign-In error:', error);
    }
  };

  return { handleGoogleSignIn };
};
```

### 6.3 Use in Login Screen

```javascript
import { useGoogleSignIn } from '@/hooks/useGoogleSignIn';

export default function LoginScreen() {
  const { handleGoogleSignIn } = useGoogleSignIn();

  return (
    <Button title="Sign in with Google" onPress={handleGoogleSignIn} />
  );
}
```

---

## ✅ Phase 7: Testing

### 7.1 Test on Android

- [ ] Install APK on device
- [ ] Open app
- [ ] Tap "Sign in with Google"
- [ ] Select Google account
- [ ] Verify logged in (JWT token received)

### 7.2 Test on iOS

- [ ] Install IPA on device
- [ ] Open app
- [ ] Tap "Sign in with Google"
- [ ] Select Google account
- [ ] Verify logged in (JWT token received)

### 7.3 Test on Web

- [ ] Login via web interface
- [ ] Verify JWT token in localStorage
- [ ] Check user profile appears

---

## ✅ Phase 8: Troubleshooting

### Issue: "OAuth consent screen not configured"
- [ ] Go to Google Cloud Console
- [ ] "OAuth consent screen" in left sidebar
- [ ] Click "Create"
- [ ] User type: "External"
- [ ] Fill in app details
- [ ] Save

### Issue: SHA-1 doesn't match
- [ ] Verify you generated SHA-1 from correct keystore
- [ ] Check Package name matches `app.json`
- [ ] Re-add credential in Google Console with correct SHA-1

### Issue: "Invalid redirect_uri"
- [ ] Check redirect URI exactly matches Google Console
- [ ] Includes protocol (`http://` or `https://`)
- [ ] Includes `/callback` if specified

### Issue: Google button doesn't appear
- [ ] Verify `app.json` plugin configuration
- [ ] Clear node_modules: `rm -rf node_modules && npm install`
- [ ] Rebuild app: `eas build --platform android --profile development`

### Issue: "Credentials not valid"
- [ ] Copy exact credential from Google Console
- [ ] No spaces or typos
- [ ] Check expiration date

---

## ✅ Checklist Before Production

- [ ] Android SHA-1 configured in Google Console
- [ ] iOS Bundle ID configured in Google Console
- [ ] Web redirect URIs set correctly
- [ ] `.env` variables populated
- [ ] `app.json` updated with credentials
- [ ] Backend Google auth view tested
- [ ] Mobile app builds and installs successfully
- [ ] Google Sign-In works on device (not emulator)
- [ ] User created in database after first login
- [ ] JWT token returned and stored securely
- [ ] OAuth consent screen configured

---

## ✅ Production Deployment

### App Store / Google Play

1. **Generate Production Keys:**
   ```bash
   keytool -genkey -v -keystore release.keystore \
     -keyalg RSA -keysize 2048 -validity 10000 \
     -alias release
   ```

2. **Get Production SHA-1:**
   ```bash
   keytool -list -v -keystore release.keystore -alias release
   ```

3. **Add to Google Console:**
   - Add new Android credential with production SHA-1

4. **Update app.json with production values**

5. **Build for production:**
   ```bash
   eas build --platform android
   ```

6. **Deploy to Google Play / App Store**

---

## 🔗 Resources

- [Google Sign-In Documentation](https://developers.google.com/identity)
- [Expo Google Sign-In Plugin](https://docs.expo.dev/guides/google-authentication/)
- [Django Google OAuth](https://developers.google.com/identity/protocols/oauth2)
- [Firebase Console](https://console.firebase.google.com/)

---

## 📞 Support

If Google OAuth still isn't working after completing this checklist:

1. Enable verbose logging in backend:
   ```python
   # settings.py
   LOGGING['loggers']['apps.users.views']['level'] = 'DEBUG'
   ```

2. Check Django logs: `docker-compose logs backend`

3. Check mobile logs:
   - Android: `adb logcat | grep GoogleSignIn`
   - iOS: Xcode console

4. Common fixes:
   - Clear browser cache and cookies
   - Reinstall APK (clear app data first)
   - Regenerate credentials in Google Console
