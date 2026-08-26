import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const COLORS = {
  background: '#0A0A0A',
  surface: '#151515',
  surfaceLight: '#1F1F1F',
  border: '#2A2A2A',
  blue: '#3B82F6',
  gold: '#D4AF37',
  white: '#FFFFFF',
  textSecondary: '#9CA3AF',
  danger: '#EF4444',
};

export default function RootLayout() {
    const restoreSession = useAuthStore((s) => s.restoreSession);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    restoreSession();
  }, []);

    useEffect(() => {
    if (!isAuthenticated || Platform.OS === 'web') return;
    registerForPushNotifications();
  }, [isAuthenticated]);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const roomId = response.notification.request.content.data?.room_id;
      if (roomId) {
        router.push(`/chats/${roomId}`);
      }
    });
    return () => subscription.remove();
  }, []);

  const registerForPushNotifications = async () => {
    if (!Device.isDevice) return;

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return;

    const tokenData = await Notifications.getDevicePushTokenAsync();
    try {
      await api.updateDeviceToken(tokenData.data, Platform.OS);
    } catch (e) {
      console.error('Failed to register push token', e);
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.background } }} />
    </SafeAreaProvider>
  );
}