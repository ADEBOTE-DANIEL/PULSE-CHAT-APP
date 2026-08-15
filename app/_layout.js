import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from './store/authStore';

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

  useEffect(() => {
    restoreSession();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.background } }} />
    </SafeAreaProvider>
  );
}