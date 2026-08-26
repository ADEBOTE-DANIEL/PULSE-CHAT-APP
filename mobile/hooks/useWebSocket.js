import { useEffect, useRef, useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import { storage } from '../utils/storage';

const WS_URL = process.env.EXPO_PUBLIC_WS_URL || 'ws://localhost:8000';

export const useWebSocket = (roomId) => {
  const wsRef = useRef(null);
  const addMessage = useChatStore((state) => state.addMessage);
  const updateMessage = useChatStore((state) => state.updateMessage);
  const removeMessage = useChatStore((state) => state.removeMessage);
  const setTypingUsers = useChatStore((state) => state.setTypingUsers);

  const connect = useCallback(async () => {
    if (!roomId || wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const accessToken = await storage.getItem('access_token');
    if (!accessToken) {
      return;
    }

    try {
      wsRef.current = new WebSocket(`${WS_URL}/ws/chat/${roomId}/?token=${accessToken}`);

      wsRef.current.onopen = () => {
        console.log('WebSocket connected');
        useChatStore.getState().fetchMessages(roomId);
      };

      wsRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleMessage(data, roomId);
      };

            wsRef.current.onerror = () => {
        // Expected on network changes (app backgrounding, screen lock, etc.) — reconnect handles it
      };

      wsRef.current.onclose = () => {
        console.log('WebSocket disconnected');
        // Attempt to reconnect after 3 seconds
        setTimeout(() => connect(), 3000);
      };
    } catch (error) {
      console.error('Error creating WebSocket:', error);
    }
  }, [roomId]);

  const disconnect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
  }, []);

  const send = useCallback((action, payload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          action,
          ...payload,
        })
      );
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  const sendMessage = useCallback((content, messageType = 'text', fileUrl = null) => {
    send('message', { content, message_type: messageType, file_url: fileUrl });
  }, [send]);

  const sendTyping = useCallback(() => {
    send('typing', {});
  }, [send]);

  const stopTyping = useCallback(() => {
    send('stop_typing', {});
  }, [send]);

  const sendReaction = useCallback((messageId, emoji) => {
    send('reaction', { message_id: messageId, emoji });
  }, [send]);

  const editMsg = useCallback((messageId, content) => {
    send('edit', { message_id: messageId, content });
  }, [send]);

  const deleteMsg = useCallback((messageId) => {
    send('delete', { message_id: messageId });
  }, [send]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return {
    connected: wsRef.current?.readyState === WebSocket.OPEN,
    send,
    sendMessage,
    sendTyping,
    stopTyping,
    sendReaction,
    editMsg,
    deleteMsg,
  };
};

function handleMessage(data, roomId) {
  const { type, data: messageData } = data;

  switch (type) {
    case 'message':
      useChatStore.getState().addMessage(roomId, messageData);
      break;
    case 'typing':
      useChatStore.setState((state) => ({
        typingUsers: {
          ...state.typingUsers,
          [roomId]: [...(state.typingUsers[roomId] || []), messageData.user_id],
        },
      }));
      break;
    case 'stop_typing':
      useChatStore.setState((state) => ({
        typingUsers: {
          ...state.typingUsers,
          [roomId]: (state.typingUsers[roomId] || []).filter(
            (uid) => uid !== messageData.user_id
          ),
        },
      }));
      break;
    case 'user_join':
      useChatStore.getState().addOnlineUser(messageData.user_id);
      break;
    case 'user_leave':
      useChatStore.getState().removeOnlineUser(messageData.user_id);
      break;
    case 'reaction':
      // Handle reaction update
      break;
    case 'edit':
      // Handle edit
      break;
    case 'delete':
      // Handle delete
      break;
  }
}
