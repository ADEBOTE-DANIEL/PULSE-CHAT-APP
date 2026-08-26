import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from './_layout';
import { api } from '../services/api';

export default function NewGroupScreen() {
  const insets = useSafeAreaInsets();
  const [groupName, setGroupName] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState([]);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setSearching(true);
      try {
        const users = await api.searchUsers(query.trim());
        setResults(users);
      } catch (e) {
        console.error('Search failed', e);
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(timeout);
  }, [query]);

  const toggleMember = (user) => {
    setSelected((prev) =>
      prev.some((m) => m.id === user.id)
        ? prev.filter((m) => m.id !== user.id)
        : [...prev, user]
    );
  };

    const isDirect = selected.length === 1;

  const handleCreate = async () => {
    if (selected.length === 0) {
      Alert.alert('Select someone', 'Pick at least one person to start a chat.');
      return;
    }
    if (!isDirect && !groupName.trim()) {
      Alert.alert('Name required', 'Please give your group a name.');
      return;
    }
    setCreating(true);
    try {
      const room = await api.createChatRoom(
        isDirect ? 'direct' : 'group',
        selected.map((m) => m.id),
        isDirect ? null : groupName.trim()
      );
      router.replace(`/chats/${room.id}`);
    } catch (e) {
      console.error('Failed to create chat', e);
      Alert.alert('Failed to create chat', 'Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const renderResult = ({ item }) => {
    const isSelected = selected.some((m) => m.id === item.id);
    return (
      <TouchableOpacity style={styles.resultRow} onPress={() => toggleMember(item)}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {(item.username || item.email)[0].toUpperCase()}
          </Text>
        </View>
        <View style={styles.resultInfo}>
          <Text style={styles.resultName}>{item.username || item.email}</Text>
          <Text style={styles.resultEmail}>{item.email}</Text>
        </View>
        <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
          {isSelected && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
                <Text style={styles.headerTitle}>{isDirect ? 'New Chat' : 'New Group'}</Text>
        <TouchableOpacity onPress={handleCreate} disabled={creating}>
          {creating ? (
            <ActivityIndicator color={COLORS.gold} />
          ) : (
            <Text style={styles.createText}>Create</Text>
          )}
        </TouchableOpacity>
      </View>

           {!isDirect && selected.length > 0 && (
        <TextInput
          style={styles.nameInput}
          placeholder="Group name"
          placeholderTextColor={COLORS.textSecondary}
          value={groupName}
          onChangeText={setGroupName}
        />
      )}

      {selected.length > 0 && (
        <View style={styles.chipsRow}>
          {selected.map((m) => (
            <TouchableOpacity
              key={m.id}
              style={styles.chip}
              onPress={() => toggleMember(m)}
            >
              <Text style={styles.chipText}>{m.username || m.email} ✕</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TextInput
        style={styles.searchInput}
        placeholder="Search by username or email..."
        placeholderTextColor={COLORS.textSecondary}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
      />

      {searching && <ActivityIndicator style={{ marginTop: 12 }} color={COLORS.gold} />}

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={renderResult}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={
          !searching && query.trim().length >= 2 ? (
            <Text style={styles.emptyText}>No users found</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backText: { color: COLORS.gold, fontSize: 28, fontWeight: '300' },
  headerTitle: { color: COLORS.white, fontSize: 16, fontWeight: '600' },
  createText: { color: COLORS.gold, fontSize: 15, fontWeight: '700', paddingHorizontal: 8 },
  nameInput: {
    margin: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    color: COLORS.white,
    fontSize: 15,
  },
  searchInput: {
    marginHorizontal: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    padding: 12,
    color: COLORS.white,
    fontSize: 15,
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipText: { color: COLORS.white, fontSize: 13 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.blue,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
  resultInfo: { flex: 1 },
  resultName: { color: COLORS.white, fontSize: 15, fontWeight: '600' },
  resultEmail: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: COLORS.gold, borderColor: COLORS.gold },
  checkmark: { color: '#000', fontWeight: '700', fontSize: 14 },
  emptyText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 20 },
});