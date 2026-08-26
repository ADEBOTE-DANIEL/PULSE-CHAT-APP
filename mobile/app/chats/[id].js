import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../_layout';
import { useChatStore } from '../../store/chatStore';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../services/api';
import { useWebSocket } from '../../hooks/useWebSocket';

export default function ChatDetailScreen() {
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiConfigId, setAiConfigId] = useState(null);
  const [suggestion, setSuggestion] = useState(null);
  const [editingSuggestionId, setEditingSuggestionId] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const listRef = useRef(null);

  const messages = useChatStore((s) => s.messages[id] || []);
  const fetchMessages = useChatStore((s) => s.fetchMessages);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const editMessage = useChatStore((s) => s.editMessage);
  const deleteMessage = useChatStore((s) => s.deleteMessage);
  const addReaction = useChatStore((s) => s.addReaction);
  const user = useAuthStore((s) => s.user);

  useWebSocket(id);

  useEffect(() => {
    fetchMessages(id);
    loadAIConfig();
  }, [id]);

  useEffect(() => {
    if (!aiEnabled) {
      setSuggestion(null);
      return;
    }
    fetchSuggestion();
    const interval = setInterval(fetchSuggestion, 4000);
    return () => clearInterval(interval);
  }, [aiEnabled, id]);

  const fetchSuggestion = async () => {
    try {
      const result = await api.getLatestPendingSuggestion(id);
      setSuggestion(result);
    } catch (e) {
      // No suggestion available, that's fine
    }
  };

  const handleAcceptSuggestion = async () => {
    if (!suggestion) return;
    try {
      await api.acceptAIResponse(suggestion.id);
      setSuggestion(null);
      fetchMessages(id);
    } catch (e) {
      console.error('Failed to accept suggestion', e);
    }
  };

  const handleDismissSuggestion = async () => {
    if (!suggestion) return;
    try {
      await api.rejectAIResponse(suggestion.id);
      setSuggestion(null);
    } catch (e) {
      console.error('Failed to dismiss suggestion', e);
    }
  };

  const handleEditSuggestion = () => {
    if (!suggestion) return;
    setText(suggestion.suggested_response);
    setEditingSuggestionId(suggestion.id);
    setSuggestion(null);
  };

  const loadAIConfig = async () => {
    try {
      const config = await api.getAIConfig(id);
      if (config) {
        setAiEnabled(config.is_enabled);
        setAiConfigId(config.id);
      }
    } catch (e) {
      // No config yet, that's fine
    }
  };

  const toggleAI = async () => {
    try {
      if (aiConfigId) {
        await api.toggleAI(aiConfigId);
        setAiEnabled(!aiEnabled);
      } else {
        const config = await api.createAIConfig(id, true);
        setAiConfigId(config.id);
        setAiEnabled(true);
      }
    } catch (e) {
      console.error('Failed to toggle AI', e);
    }
  };

  const handleSend = async () => {
    if (!text.trim()) return;
    const content = text.trim();
    setText('');
    try {
      if (editingSuggestionId) {
        await api.editAndSendAIResponse(editingSuggestionId, content);
        setEditingSuggestionId(null);
        fetchMessages(id);
      } else if (editingMessageId) {
        await editMessage(id, editingMessageId, content);
        setEditingMessageId(null);
      } else {
        await sendMessage(id, content);
      }
    } catch (e) {
      console.error('Send failed', e);
    }
  };

  const handleLongPressMessage = (item) => {
    setActionMessage(item);
  };

  const handleEditMessage = () => {
    if (!actionMessage) return;
    setText(actionMessage.content);
    setEditingMessageId(actionMessage.id);
    setActionMessage(null);
  };

  const handleDeleteMessage = async () => {
    if (!actionMessage) return;
    try {
      await deleteMessage(id, actionMessage.id);
    } catch (e) {
      console.error('Delete failed', e);
    }
    setActionMessage(null);
  };

  const handleReact = async (emoji) => {
    if (!actionMessage) return;
    try {
      await addReaction(actionMessage.id, emoji);
      fetchMessages(id);
    } catch (e) {
      console.error('Reaction failed', e);
    }
    setActionMessage(null);
  };

 const REACTION_EMOJIS = [
    '👍', '👎', '❤️', '😂', '😮', '😢', '🙏', '🔥',
    '🎉', '👏', '😍', '😡', '💯', '😊', '😎', '🤔',
    '😭', '😅', '🥳', '👀', '💀', '✅', '❌', '🤝',
  ];

  const renderMessage = ({ item }) => {
    const isMine = item.sender?.id === user?.id;
    return (
      <View style={[styles.bubbleRow, isMine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
        <TouchableOpacity
          activeOpacity={0.8}
          delayLongPress={350}
          onLongPress={() => handleLongPressMessage(item)}
          style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}
        >
          {!isMine && <Text style={styles.senderName}>{item.sender?.username || item.sender?.email}</Text>}
          <Text style={styles.messageText}>{item.content}</Text>
          {item.is_edited && <Text style={styles.editedTag}>edited</Text>}
          {item.reactions && item.reactions.length > 0 && (
            <View style={styles.reactionsRow}>
              {item.reactions.map((r) => (
                <Text key={r.id} style={styles.reactionBadge}>{r.emoji}</Text>
              ))}
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top : 0}
    >
      <View style={[styles.header, { height: 56 + insets.top, paddingTop: insets.top }]}>
        <TouchableOpacity onPress={() => router.push('/chats')} style={styles.backButton}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chat</Text>
        <View style={styles.aiToggle}>
          <Text style={styles.aiLabel}>AI</Text>
          <Switch
            value={aiEnabled}
            onValueChange={toggleAI}
            trackColor={{ false: COLORS.border, true: COLORS.gold }}
            thumbColor={COLORS.white}
          />
        </View>
      </View>

      <FlatList
        ref={listRef}
        style={styles.list}
        data={[...messages].reverse()}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.listContent}
        inverted
        extraData={user}
      />
{actionMessage && (
        <View style={styles.actionSheetOverlay}>
          <TouchableOpacity
            style={styles.actionSheetBackdrop}
            activeOpacity={1}
            onPress={() => setActionMessage(null)}
          />
          <View style={styles.actionSheet}>
            <View style={styles.reactionPickerRow}>
              {REACTION_EMOJIS.map((emoji) => (
                <TouchableOpacity key={emoji} onPress={() => handleReact(emoji)} style={styles.reactionOption}>
                  <Text style={styles.reactionOptionText}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {actionMessage.sender?.id === user?.id && (
              <>
                <TouchableOpacity style={styles.actionSheetItem} onPress={handleEditMessage}>
                  <Text style={styles.actionSheetItemText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionSheetItem} onPress={handleDeleteMessage}>
                  <Text style={[styles.actionSheetItemText, styles.actionSheetDeleteText]}>Delete</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity style={styles.actionSheetItem} onPress={() => setActionMessage(null)}>
              <Text style={styles.actionSheetItemTextMuted}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {suggestion && (
        <View style={styles.suggestionCard}>
          <Text style={styles.suggestionLabel}>AI SUGGESTION</Text>
          <Text style={styles.suggestionText}>{suggestion.suggested_response}</Text>
          <View style={styles.suggestionActions}>
            <TouchableOpacity style={styles.suggestionButton} onPress={handleDismissSuggestion}>
              <Text style={styles.suggestionButtonTextMuted}>Dismiss</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.suggestionButton} onPress={handleEditSuggestion}>
              <Text style={styles.suggestionButtonText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.suggestionButton, styles.suggestionAcceptButton]}
              onPress={handleAcceptSuggestion}
            >
              <Text style={styles.suggestionAcceptText}>Accept & Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={[styles.composeBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <TextInput
          style={styles.input}
          placeholder="Message..."
          placeholderTextColor={COLORS.textSecondary}
          value={text}
          onChangeText={setText}
          multiline
          onKeyPress={(e) => {
            if (Platform.OS === 'web' && e.nativeEvent.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <Text style={styles.sendText}>➤</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backText: { color: COLORS.gold, fontSize: 28, fontWeight: '300' },
  headerTitle: { color: COLORS.white, fontSize: 16, fontWeight: '600', flex: 1 },
  aiToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingRight: 8 },
  aiLabel: { color: COLORS.textSecondary, fontSize: 12, marginRight: 6 },
  list: { flex: 1 },
  listContent: { padding: 12, paddingBottom: 24 },
  bubbleRow: { marginBottom: 8, flexDirection: 'row' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubbleRowTheirs: { justifyContent: 'flex-start' },
  bubble: { maxWidth: '78%', padding: 12, borderRadius: 16 },
  bubbleMine: { backgroundColor: COLORS.blue, borderBottomRightRadius: 4 },
  bubbleTheirs: { backgroundColor: COLORS.surfaceLight, borderBottomLeftRadius: 4 },
  senderName: { color: COLORS.gold, fontSize: 11, fontWeight: '600', marginBottom: 3 },
  messageText: { color: COLORS.white, fontSize: 15 },
  editedTag: { color: 'rgba(255,255,255,0.5)', fontSize: 10, marginTop: 3 },


 actionSheetOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'flex-end',
    zIndex: 100,
  },
  actionSheetBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  actionSheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  reactionPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  reactionOption: {
    padding: 8,
    width: '16.66%',
    alignItems: 'center',
  },
  reactionOptionText: {
    fontSize: 26,
  },
  actionSheetItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  actionSheetItemText: {
    color: COLORS.white,
    fontSize: 16,
    textAlign: 'center',
  },
  actionSheetItemTextMuted: {
    color: COLORS.textSecondary,
    fontSize: 16,
    textAlign: 'center',
  },
  actionSheetDeleteText: {
    color: COLORS.danger,
  },
  reactionsRow: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 2,
  },
  reactionBadge: {
    fontSize: 13,
  },
  suggestionCard: {
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.gold,
    padding: 12,
  },
  suggestionLabel: {
    color: COLORS.gold,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 6,
  },
  suggestionText: {
    color: COLORS.white,
    fontSize: 14,
    marginBottom: 10,
  },
  suggestionActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  suggestionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceLight,
  },
  suggestionButtonText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '600',
  },
  suggestionButtonTextMuted: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  suggestionAcceptButton: {
    backgroundColor: COLORS.gold,
  },
  suggestionAcceptText: {
    color: '#000',
    fontSize: 13,
    fontWeight: '700',
  },
  composeBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 10,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  input: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: COLORS.white,
    maxHeight: 100,
    marginRight: 8,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: { color: '#000', fontSize: 16, fontWeight: '700' },
});