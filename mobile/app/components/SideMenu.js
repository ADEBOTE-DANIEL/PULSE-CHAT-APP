import { View, Text, TouchableOpacity, StyleSheet, Modal, Animated } from 'react-native';
import { useEffect, useRef } from 'react';
import { router } from 'expo-router';
import { COLORS } from '../_layout';
import { useAuthStore } from '../store/authStore';

export default function SideMenu({ visible, onClose }) {
  const slideAnim = useRef(new Animated.Value(-280)).current;
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: visible ? 0 : -280,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [visible]);

  const handleLogout = async () => {
    await logout();
    onClose();
    router.replace('/');
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <Animated.View
          style={[styles.panel, { transform: [{ translateX: slideAnim }] }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(user?.first_name?.[0] || user?.email?.[0] || 'U').toUpperCase()}
              </Text>
            </View>
            <Text style={styles.name}>{user?.first_name || user?.username || 'User'}</Text>
            <Text style={styles.email}>{user?.email}</Text>
          </View>

          <TouchableOpacity
            style={styles.item}
            onPress={() => {
              onClose();
              router.push('/chats');
            }}
          >
            <Text style={styles.itemText}>💬  Chats</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.item}
            onPress={() => {
              onClose();
              router.push('/profile');
            }}
          >
            <Text style={styles.itemText}>👤  Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.item}
            onPress={() => {
              onClose();
              router.push('/new-group');
            }}
          >
            <Text style={styles.itemText}>👥  New Group</Text>
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity style={styles.item} onPress={handleLogout}>
            <Text style={[styles.itemText, { color: COLORS.danger }]}>🚪  Logout</Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  panel: {
    width: 280,
    height: '100%',
    backgroundColor: COLORS.surface,
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
    paddingTop: 60,
  },
  header: { paddingHorizontal: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: COLORS.gold,
  },
  avatarText: { color: COLORS.white, fontSize: 22, fontWeight: '700' },
  name: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  email: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  item: { paddingVertical: 16, paddingHorizontal: 20 },
  itemText: { color: COLORS.white, fontSize: 15 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
});
