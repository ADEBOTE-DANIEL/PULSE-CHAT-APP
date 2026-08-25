jest.mock('../../services/api');

import { useChatStore } from '../chatStore';
import { api } from '../../services/api';

describe('chatStore', () => {
  beforeEach(() => {
    useChatStore.setState({
      chatRooms: [],
      messages: {},
      isLoadingRooms: false,
      isLoadingMessages: false,
      error: null,
    });
    jest.clearAllMocks();
  });

  test('addMessage adds a new message to the room', () => {
    const message = { id: 'msg1', content: 'Hello' };
    useChatStore.getState().addMessage('room1', message);

    const state = useChatStore.getState();
    expect(state.messages['room1']).toHaveLength(1);
    expect(state.messages['room1'][0].id).toBe('msg1');
  });

  test('addMessage does not add a duplicate message with the same id', () => {
    const message = { id: 'msg1', content: 'Hello' };
    useChatStore.getState().addMessage('room1', message);
    useChatStore.getState().addMessage('room1', message);

    const state = useChatStore.getState();
    expect(state.messages['room1']).toHaveLength(1);
  });

  test('updateMessage updates fields on the matching message', () => {
    useChatStore.setState({
      messages: { room1: [{ id: 'msg1', content: 'Original' }] },
    });

    useChatStore.getState().updateMessage('room1', 'msg1', { content: 'Edited', is_edited: true });

    const state = useChatStore.getState();
    expect(state.messages['room1'][0].content).toBe('Edited');
    expect(state.messages['room1'][0].is_edited).toBe(true);
  });

  test('removeMessage removes the matching message', () => {
    useChatStore.setState({
      messages: { room1: [{ id: 'msg1' }, { id: 'msg2' }] },
    });

    useChatStore.getState().removeMessage('room1', 'msg1');

    const state = useChatStore.getState();
    expect(state.messages['room1']).toHaveLength(1);
    expect(state.messages['room1'][0].id).toBe('msg2');
  });

  test('fetchChatRooms populates chatRooms on success', async () => {
    api.getChatRooms.mockResolvedValue({ results: [{ id: 'room1' }, { id: 'room2' }] });

    await useChatStore.getState().fetchChatRooms();

    const state = useChatStore.getState();
    expect(state.chatRooms).toHaveLength(2);
    expect(state.isLoadingRooms).toBe(false);
  });

  test('fetchChatRooms sets error on failure', async () => {
    api.getChatRooms.mockRejectedValue(new Error('Network error'));

    await useChatStore.getState().fetchChatRooms();

    const state = useChatStore.getState();
    expect(state.error).toBe('Network error');
    expect(state.isLoadingRooms).toBe(false);
  });

  test('sendMessage calls api and adds the returned message', async () => {
    api.sendMessage.mockResolvedValue({ id: 'msg1', content: 'New message' });

    await useChatStore.getState().sendMessage('room1', 'New message');

    const state = useChatStore.getState();
    expect(state.messages['room1']).toHaveLength(1);
    expect(state.messages['room1'][0].content).toBe('New message');
  });
});