jest.mock('../../services/api');
jest.mock('../../utils/storage', () => ({
  storage: {
    setItem: jest.fn(),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

import { useAuthStore } from '../authStore';
import { api } from '../../services/api';

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    jest.clearAllMocks();
  });

  test('loginWithEmail sets user and marks authenticated on success', async () => {
    api.loginWithEmail.mockResolvedValue({
      access: 'access123',
      refresh: 'refresh123',
      user: { id: '1', email: 'test@example.com' },
    });

    await useAuthStore.getState().loginWithEmail('test@example.com', 'password123');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user.email).toBe('test@example.com');
    expect(state.accessToken).toBe('access123');
  });

  test('loginWithEmail sets error and stays unauthenticated on failure', async () => {
    api.loginWithEmail.mockRejectedValue(new Error('Invalid credentials'));

    await expect(
      useAuthStore.getState().loginWithEmail('bad@example.com', 'wrong')
    ).rejects.toThrow('Invalid credentials');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.error).toBe('Invalid credentials');
  });

  test('register sets user and marks authenticated on success', async () => {
    api.register.mockResolvedValue({
      access: 'access456',
      refresh: 'refresh456',
      user: { id: '2', email: 'new@example.com' },
    });

    await useAuthStore.getState().register('new@example.com', 'newuser', 'password123');

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.user.email).toBe('new@example.com');
  });

  test('logout clears user and tokens', async () => {
    useAuthStore.setState({
      user: { id: '1', email: 'test@example.com' },
      accessToken: 'token',
      isAuthenticated: true,
    });

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});