import axios from 'axios';
import { storage } from '../utils/storage';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000/api';

console.log('API_URL:', API_URL);
console.log('REGISTER ENDPOINT:', `${API_URL}/auth/register/`);

class APIClient {
  constructor() {
        this.client = axios.create({
      baseURL: API_URL,
      timeout: 10000,
      headers: {
        'ngrok-skip-browser-warning': 'true',
      },
    });

    this.client.interceptors.request.use(async (config) => {
      const publicEndpoints = ['/auth/login/', '/auth/refresh/', '/auth/google/', '/auth/register/'];
      const isPublic = publicEndpoints.some((path) => config.url?.includes(path));
      if (!isPublic) {
        try {
          const token = await storage.getItem('access_token');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        } catch (error) {
          console.error('Error getting token:', error);
        }
      }
      return config;
    });

    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = await storage.getItem('refresh_token');
            if (refreshToken) {
              const response = await axios.post(`${API_URL}/auth/refresh/`, {
                refresh: refreshToken,
              });

              const { access, refresh } = response.data;
              await storage.setItem('access_token', access);
              if (refresh) {
                await storage.setItem('refresh_token', refresh);
              }

              originalRequest.headers.Authorization = `Bearer ${access}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            throw refreshError;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  async loginWithGoogle(token) {
    const response = await this.client.post('/auth/google/', { token });
    return response.data;
  }

    async loginWithEmail(email, password) {
    const response = await this.client.post('/auth/login/', { email, password });
    return response.data;
  }

  async register(email, username, password, firstName = '', lastName = '') {
    const response = await this.client.post('/auth/register/', {
      email,
      username,
      password,
      first_name: firstName,
      last_name: lastName,
    });
    return response.data;
  }

  async refreshToken() {
    const refreshToken = await storage.getItem('refresh_token');
    const response = await this.client.post('/auth/refresh/', { refresh: refreshToken });
    return response.data;
  }

  async logout(refreshToken) {
    const response = await this.client.post('/auth/logout/', { refresh: refreshToken });
    return response.data;
  }

  async getMe() {
    const response = await this.client.get('/users/me/');
    return response.data;
  }

  async updateProfile(data) {
    const response = await this.client.put('/users/update_profile/', data);
    return response.data;
  }

  async searchUsers(query) {
    const response = await this.client.get('/users/search/', {
      params: { q: query },
    });
    return response.data;
  }

  async updateDeviceToken(firebaseToken, deviceType) {
    const response = await this.client.post('/users/update_device_token/', {
      firebase_token: firebaseToken,
      device_type: deviceType,
    });
    return response.data;
  }

  async getChatRooms(page = 1, search = '') {
    const response = await this.client.get('/chat-rooms/', {
      params: { page, search },
    });
    return response.data;
  }

  async getChatRoom(roomId) {
    const response = await this.client.get(`/chat-rooms/${roomId}/`);
    return response.data;
  }

  async createChatRoom(roomType, members, name = null) {
    const response = await this.client.post('/chat-rooms/', {
      room_type: roomType,
      members,
      name,
    });
    return response.data;
  }

  async getMessages(roomId, page = 1) {
    const response = await this.client.get('/messages/by_room/', {
      params: { room_id: roomId, page },
    });
    return response.data;
  }

  async sendMessage(roomId, content, messageType = 'text', fileUrl = null) {
    const response = await this.client.post('/messages/', {
      room: roomId,
      content,
      message_type: messageType,
      file_url: fileUrl,
    });
    return response.data;
  }

  async editMessage(messageId, content) {
    const response = await this.client.put(`/messages/${messageId}/edit/`, {
      content,
    });
    return response.data;
  }

  async deleteMessage(messageId) {
    const response = await this.client.post(`/messages/${messageId}/delete/`);
    return response.data;
  }

  async addReaction(messageId, emoji) {
    const response = await this.client.post(`/messages/${messageId}/add_reaction/`, {
      emoji,
    });
    return response.data;
  }

  async getAIConfig(roomId) {
    const response = await this.client.get('/ai-config/', {
      params: { chat_room: roomId },
    });
    return response.data.results?.[0] || null;
  }

  async createAIConfig(roomId, isEnabled, tone = 'friendly') {
    const response = await this.client.post('/ai-config/', {
      chat_room: roomId,
      is_enabled: isEnabled,
      tone,
    });
    return response.data;
  }

  async toggleAI(configId) {
    const response = await this.client.post(`/ai-config/${configId}/toggle/`);
    return response.data;
  }

  async acceptAIResponse(responseId) {
    const response = await this.client.post(`/ai-responses/${responseId}/accept/`);
    return response.data;
  }

  async rejectAIResponse(responseId, reason = '') {
    const response = await this.client.post(`/ai-responses/${responseId}/reject/`, {
      reason,
    });
    return response.data;
  }

  async editAndSendAIResponse(responseId, content) {
    const response = await this.client.put(`/ai-responses/${responseId}/edit_and_send/`, {
      content,
    });
    return response.data;
  }

  async getLatestPendingSuggestion(roomId) {
    const response = await this.client.get('/ai-responses/latest_pending/', {
      params: { chat_room: roomId },
    });
    return response.data;
  }

  async getNotifications(page = 1) {
    const response = await this.client.get('/notifications/', {
      params: { page },
    });
    return response.data;
  }

  async getUnreadNotifications() {
    const response = await this.client.get('/notifications/unread/');
    return response.data;
  }

  async markNotificationAsRead(notificationId) {
    const response = await this.client.post(`/notifications/${notificationId}/mark_as_read/`);
    return response.data;
  }

  async markAllNotificationsAsRead() {
    const response = await this.client.post('/notifications/mark_all_as_read/');
    return response.data;
  }
}

export const api = new APIClient();