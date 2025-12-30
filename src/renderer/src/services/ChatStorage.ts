import { Message } from '../features/inspector/components/ChatPanel/components/ChatBody';
import { ChatSession } from '../features/inspector/components/TabPanel/TabList';

const STORAGE_KEY_PREFIX = 'systema-chat-';
const SESSION_LIST_KEY = 'systema-sessions-list';

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

  updateSessionMetadata: (session: ChatSession) => {
    // We rely on the backend/agent for the active list, but for specific
    // local-only metadata (like offline history), we might want to store a copy.
    // For now, let's assuming `TabList` in `ChatContainer` manages the active session list logic from WS.
    // This storage is mainly for message content persistence.
  },

  // For HistoryPanel (offline sessions)
  getHistory: (): ChatSession[] => {
    // In a real app we'd sync this with backend.
    // For now, if we want offline history, we need to save session details too.
    // Let's implement a simple local session tracker.
    const listStr = localStorage.getItem(SESSION_LIST_KEY);
    return listStr ? JSON.parse(listStr) : [];
  },

  saveSessionToHistory: (session: ChatSession) => {
    const list = ChatStorage.getHistory();
    const idx = list.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      list[idx] = session;
    } else {
      list.unshift(session);
    }
    localStorage.setItem(SESSION_LIST_KEY, JSON.stringify(list));
  },

  clearHistory: () => {
    localStorage.removeItem(SESSION_LIST_KEY);
  },
};
