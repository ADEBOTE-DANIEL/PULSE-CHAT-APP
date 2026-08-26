import { create } from 'zustand';
import { api } from '../services/api';

export const useChatStore = create((set, get) => ({
  // State
  chatRooms: [],
  activeRoom: null,
  messages: {},
  typingUsers: {},
  onlineUsers: new Set(),
  isLoadingRooms: false,
  isLoadingMessages: false,
  error: null,

  // Actions
  setChatRooms: (rooms) => set({ chatRooms: rooms }),

  setActiveRoom: (room) => set({ activeRoom: room }),

  setMessages: (roomId, messages) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: messages,
      },
    }));
  },

  addMessage: (roomId, message) => {
    set((state) => {
      const existing = state.messages[roomId] || [];
      if (existing.some((m) => m.id === message.id)) {
        return state;
      }
      return {
        messages: {
          ...state.messages,
          [roomId]: [...existing, message],
        },
      };
    });
  },

  updateMessage: (roomId, messageId, updates) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: state.messages[roomId].map((msg) =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        ),
      },
    }));
  },

  removeMessage: (roomId, messageId) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [roomId]: state.messages[roomId].filter((msg) => msg.id !== messageId),
      },
    }));
  },

  setTypingUsers: (roomId, users) => {
    set((state) => ({
      typingUsers: {
        ...state.typingUsers,
        [roomId]: users,
      },
    }));
  },

  setOnlineUsers: (users) => set({ onlineUsers: new Set(users) }),

  addOnlineUser: (userId) => {
    set((state) => {
      const newOnlineUsers = new Set(state.onlineUsers);
      newOnlineUsers.add(userId);
      return { onlineUsers: newOnlineUsers };
    });
  },

  removeOnlineUser: (userId) => {
    set((state) => {
      const newOnlineUsers = new Set(state.onlineUsers);
      newOnlineUsers.delete(userId);
      return { onlineUsers: newOnlineUsers };
    });
  },

  // Async actions
  fetchChatRooms: async (search = '') => {
    set({ isLoadingRooms: true, error: null });
    try {
      const data = await api.getChatRooms(1, search);
      set({ chatRooms: data.results || data, isLoadingRooms: false });
    } catch (error) {
      set({ error: error.message, isLoadingRooms: false });
    }
  },

  fetchMessages: async (roomId) => {
    set({ isLoadingMessages: true, error: null });
    try {
      const data = await api.getMessages(roomId);
      set((state) => ({
        messages: {
          ...state.messages,
          [roomId]: data.results || data,
        },
        isLoadingMessages: false,
      }));
    } catch (error) {
      set({ error: error.message, isLoadingMessages: false });
    }
  },

  createChatRoom: async (roomType, members, name = null) => {
    try {
      const room = await api.createChatRoom(roomType, members, name);
      set((state) => ({
        chatRooms: [...state.chatRooms, room],
      }));
      return room;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  sendMessage: async (roomId, content) => {
    try {
      const message = await api.sendMessage(roomId, content);
      get().addMessage(roomId, message);
      return message;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  editMessage: async (roomId, messageId, content) => {
    try {
      const message = await api.editMessage(messageId, content);
      get().updateMessage(roomId, messageId, message);
      return message;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  deleteMessage: async (roomId, messageId) => {
    try {
      await api.deleteMessage(messageId);
      get().removeMessage(roomId, messageId);
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  addReaction: async (messageId, emoji) => {
    try {
      await api.addReaction(messageId, emoji);
      return true;
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  },

  setError: (error) => set({ error }),
  clearError: () => set({ error: null }),
}));
