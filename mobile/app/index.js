import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { COLORS } from './_layout';
import { useAuthStore } from '../store/authStore';
import WebGoogleButton from '../components/web-google-button';

// ============================================================
// NATIVE GOOGLE SIGN-IN
// Android / iOS only.
// This is your working native implementation.
// ============================================================
if (Platform.OS !== 'web') {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  });
}

// ============================================================
// LOGIN SCREEN
// ============================================================
export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const loginWithEmail = useAuthStore((s) => s.loginWithEmail);
  const loginWithGoogle = useAuthStore((s) => s.loginWithGoogle);
  const isLoading = useAuthStore((s) => s.isLoading);

  // ============================================================
  // ANDROID / iOS NATIVE GOOGLE LOGIN
  // ============================================================
  const handleGoogleLogin = async () => {
    try {
      await GoogleSignin.hasPlayServices();

      const response = await GoogleSignin.signIn();

      console.log(
        'DEBUG Google Sign-In response:',
        JSON.stringify(response)
      );

      if (response.type === 'cancelled') {
        return;
      }

      const idToken =
        response.data?.idToken || response.idToken;

      console.log(
        'DEBUG Google ID TOKEN EXISTS:',
        !!idToken
      );

      if (!idToken) {
        throw new Error('No ID token returned from Google');
      }

      console.log(
        'DEBUG: Google succeeded, now calling backend'
      );

      await loginWithGoogle(idToken);

      console.log(
        'DEBUG: Backend Google login succeeded'
      );

      router.replace('/chats');
    } catch (error) {
      console.error(
        'Google sign-in error CODE:',
        error?.code
      );

      console.error(
        'Google sign-in error MESSAGE:',
        error?.message
      );

      console.error(
        'Google sign-in error FULL:',
        JSON.stringify(error)
      );

      Alert.alert(
        'Google sign-in failed',
        `Code: ${error?.code || 'UNKNOWN'}\n${
          error?.message || 'Unknown error'
        }`
      );
    }
  };

  // ============================================================
  // EMAIL LOGIN
  // ============================================================
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(
        'Missing info',
        'Please enter both email and password.'
      );
      return;
    }

    try {
      await loginWithEmail(email.trim(), password);
      router.replace('/chats');
    } catch (error) {
      Alert.alert(
        'Login failed',
        'Check your email and password and try again.'
      );
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={
        Platform.OS === 'ios' ? 'padding' : 'height'
      }
    >
      <View style={styles.logoWrap}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoText}>PULSE</Text>
        </View>

        <Text style={styles.appName}>
          Pulse ChatApp
        </Text>

        <Text style={styles.tagline}>
          Real-time chat. Smarter replies.
        </Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>

        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor={COLORS.textSecondary}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Password</Text>

        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor={COLORS.textSecondary}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator
              color={COLORS.background}
            />
          ) : (
            <Text style={styles.buttonText}>
              Sign In
            </Text>
          )}
        </TouchableOpacity>

        {/* =====================================================
            WEB:
            WebGoogleButton automatically resolves to the
            .web.js implementation.

            ANDROID / iOS:
            The native GoogleSignin implementation below is used.
            ===================================================== */}

        {Platform.OS === 'web' ? (
          <WebGoogleButton
            loginWithGoogle={loginWithGoogle}
          />
        ) : (
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleGoogleLogin}
          >
            <Text style={styles.googleButtonTextActive}>
              Continue with Google
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => router.push('/register')}
        >
          <Text style={styles.linkText}>
            Don't have an account? Sign up
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

// ============================================================
// STYLES
// ============================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },

  logoWrap: {
    alignItems: 'center',
    marginBottom: 48,
  },

  logoBadge: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: COLORS.blue,
  },

  logoText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.gold,
    letterSpacing: 3,
  },

  appName: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.white,
    letterSpacing: 1,
  },

  tagline: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
  },

  form: {
    width: '100%',
  },

  label: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 6,
    marginTop: 14,
  },

  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    color: COLORS.white,
    fontSize: 15,
  },

  button: {
    backgroundColor: COLORS.gold,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 28,
  },

  buttonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 16,
  },

  googleButton: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },

  googleButtonTextActive: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },

  linkButton: {
    marginTop: 18,
    alignItems: 'center',
  },

  linkText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
});