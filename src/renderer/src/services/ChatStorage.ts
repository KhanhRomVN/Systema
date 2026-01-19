import { Message } from '../features/inspector/components/Chat/ChatPanel/components/ChatBody';
const STORAGE_KEY_PREFIX = 'systema-chat-';

export const ChatStorage = {
  saveMessage: (sessionId: string, message: Message) => {
    const key = `${STORAGE_KEY_PREFIX}${sessionId}`;
    const existing = localStorage.getItem(key);
    const messages = existing ? JSON.parse(existing) : [];
    messages.push(message);
    localStorage.setItem(key, JSON.stringify(messages));
  },

  saveMessages: (sessionId: string, messages: Message[]) => {
    const key = `${STORAGE_KEY_PREFIX}${sessionId}`;
    localStorage.setItem(key, JSON.stringify(messages));
  },

  loadMessages: (sessionId: string): Message[] => {
    const key = `${STORAGE_KEY_PREFIX}${sessionId}`;
    const existing = localStorage.getItem(key);
    return existing ? JSON.parse(existing) : [];
  },
};
