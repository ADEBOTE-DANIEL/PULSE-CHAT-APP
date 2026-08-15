import { create } from 'zustand';
import { storage } from '../utils/storage';
import { api } from '../services/api';

export const useAuthStore = create((set, get) => ({
  user: null,
  accessToken: null,
  refreshToken: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,

  setUser: (user) => set({ user }),

  setTokens: (accessToken, refreshToken) => {
    set({ accessToken, refreshToken, isAuthenticated: !!accessToken });
  },

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),

  loginWithGoogle: async (token) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.loginWithGoogle(token);
      await storage.setItem('access_token', data.access);
      await storage.setItem('refresh_token', data.refresh);
      set({
        accessToken: data.access,
        refreshToken: data.refresh,
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
      });
      return data;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  loginWithEmail: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const data = await api.loginWithEmail(email, password);
      await storage.setItem('access_token', data.access);
      await storage.setItem('refresh_token', data.refresh);
      set({
        accessToken: data.access,
        refreshToken: data.refresh,
        user: data.user,
        isAuthenticated: true,
        isLoading: false,
      });
      return data;
    } catch (error) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

restoreSession: async () => {
    set({ isLoading: true });
    try {
      const accessToken = await storage.getItem('access_token');
      const refreshToken = await storage.getItem('refresh_token');

      if (accessToken && refreshToken) {
        const user = await api.getMe();
        set({
          accessToken,
          refreshToken,
          user,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false, isAuthenticated: false });
      }
 } catch (error) {
      set({ isLoading: false, isAuthenticated: false });
      // Token might be expired, user needs to login again
    }
  },

  logout: async () => {
    try {
      await storage.removeItem('access_token');
      await storage.removeItem('refresh_token');
    } catch (error) {
      console.error('Error clearing stored tokens:', error);
    }
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      error: null,
    });
  },

  updateUser: (user) => set({ user }),
}));