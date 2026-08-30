import { useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  Alert,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';

WebBrowser.maybeCompleteAuthSession();

export default function WebGoogleButton({ loginWithGoogle }) {
  const [webRequest, webResponse, promptWebGoogleAuth] =
    Google.useIdTokenAuthRequest({
      clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
      extraParams: {
        prompt: 'select_account',
      },
    });

  useEffect(() => {
    if (webResponse?.type !== 'success') {
      return;
    }

    const { id_token } = webResponse.params;

    if (!id_token) {
      Alert.alert(
        'Google sign-in failed',
        'No Google ID token was returned.'
      );
      return;
    }

    const handleWebGoogleLogin = async () => {
      try {
        await loginWithGoogle(id_token);
        router.replace('/chats');
      } catch (error) {
        console.error(
          'Web Google sign-in error:',
          error
        );

        Alert.alert(
          'Google sign-in failed',
          'Please try again.'
        );
      }
    };

    handleWebGoogleLogin();
  }, [webResponse, loginWithGoogle]);

  return (
    <TouchableOpacity
      style={styles.googleButton}
      onPress={() => promptWebGoogleAuth()}
      disabled={!webRequest}
    >
      <Text style={styles.googleButtonText}>
        Continue with Google
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  googleButton: {
    marginTop: 14,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#444',
    alignItems: 'center',
  },

  googleButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});