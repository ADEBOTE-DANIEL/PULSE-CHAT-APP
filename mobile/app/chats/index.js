import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { COLORS } from '../_layout';
import TopBar from '../components/TopBar';
import SideMenu from '../components/SideMenu';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';

export default function ChatListScreen() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const chatRooms = useChatStore((s) => s.chatRooms);
  const isLoadingRooms = useChatStore((s) => s.isLoadingRooms);
  const fetchChatRooms = useChatStore((s) => s.fetchChatRooms);
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);

useEffect(() => {
    if (isAuthenticated === true) {
      fetchChatRooms();
    } else if (isAuthenticated === false) {
      router.replace('/');
    }
  }, [isAuthenticated]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchChatRooms();
    setRefreshing(false);
  }, []);

  const getDisplayName = (item) => {
    if (item.name) return item.name;
    if (item.room_type === 'direct') {
      const other = item.members?.find((m) => m.id !== user?.id);
      return other?.username || other?.first_name || other?.email || 'Direct Message';
    }
    return 'Group Chat';
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.row}
      onPress={() => router.push(`/chats/${item.id}`)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>
          {getDisplayName(item)[0].toUpperCase()}
        </Text>
      </View>
      <View style={styles.rowContent}>
        <View style={styles.rowHeader}>
          <Text style={styles.rowTitle} numberOfLines={1}>
            {getDisplayName(item)}
          </Text>
        </View>

        <Text style={styles.rowSubtitle} numberOfLines={1}>
          {item.last_message?.content || 'No messages yet'}
        </Text>
      </View>
    </TouchableOpacity>
  );

    return (
    <View style={styles.container}>
      <TopBar title="Pulse" onMenuPress={() => setMenuOpen(true)} />
      <SideMenu visible={menuOpen} onClose={() => setMenuOpen(false)} />

    {isLoadingRooms && chatRooms.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={COLORS.gold} />
        </View>
      ) : chatRooms.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No chats yet</Text>
          <Text style={styles.emptySubtext}>Start a conversation to see it here</Text>
        </View>
      ) : (
        <FlatList
          data={chatRooms}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.gold} />
          }
        />
      )}

      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/new-group')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  emptySubtext: { color: COLORS.textSecondary, fontSize: 13, marginTop: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: COLORS.white, fontWeight: '700', fontSize: 18 },
  rowContent: { flex: 1 },
  rowHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  rowTitle: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
    rowSubtitle: { color: COLORS.textSecondary, fontSize: 13, marginTop: 3 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabText: { color: '#000', fontSize: 28, fontWeight: '700', marginTop: -2 },
});
