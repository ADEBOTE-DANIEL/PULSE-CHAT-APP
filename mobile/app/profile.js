import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from './_layout';
import { useAuthStore } from './store/authStore';

export default function ProfileScreen() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const insets = useSafeAreaInsets();

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  return (
   <View style={[styles.container, { paddingTop: insets.top }]}>
      <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backText}>‹ Back</Text>
      </TouchableOpacity>

      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {(user?.first_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
        </Text>
      </View>

      <Text style={styles.name}>{user?.first_name || user?.username || 'User'}</Text>
      <Text style={styles.email}>{user?.email}</Text>

      <View style={styles.infoCard}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Username</Text>
          <Text style={styles.infoValue}>{user?.username}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Account Type</Text>
          <Text style={styles.infoValue}>{user?.user_type}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 20, alignItems: 'center' },
  backButton: { alignSelf: 'flex-start', paddingVertical: 12 },
  backText: { color: COLORS.gold, fontSize: 15 },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    borderWidth: 3,
    borderColor: COLORS.gold,
  },
  avatarText: { color: COLORS.white, fontSize: 36, fontWeight: '700' },
  name: { color: COLORS.white, fontSize: 20, fontWeight: '700', marginTop: 16 },
  email: { color: COLORS.textSecondary, fontSize: 14, marginTop: 4 },
  infoCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginTop: 30,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: { color: COLORS.textSecondary, fontSize: 14 },
  infoValue: { color: COLORS.white, fontSize: 14, fontWeight: '600' },
  logoutButton: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.danger,
    alignItems: 'center',
    marginTop: 30,
  },
  logoutText: { color: COLORS.danger, fontWeight: '600', fontSize: 15 },
});
