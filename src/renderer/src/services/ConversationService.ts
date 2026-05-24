// Renderer-side service to persist conversations via Electron IPC

const ipc = () => (window as any).api;

export interface ConversationMetadata {
  id: string;
  title: string;
  timestamp: number;
  lastModified: number;
  messageCount: number;
  provider?: string;
  requestCount?: number;
}

export const ConversationService = {
  async logMessage(conversationId: string, message: any): Promise<void> {
    await ipc().invoke('chat:logMessage', conversationId, message);
  },

  async save(conversationId: string, messages: any[], metadata: ConversationMetadata): Promise<void> {
    await ipc().invoke('chat:save', conversationId, { messages, metadata });
  },

  async get(conversationId: string): Promise<{ messages: any[]; metadata: ConversationMetadata | null } | null> {
    const res = await ipc().invoke('chat:get', conversationId);
    if (!res?.success) return null;
    return res.data;
  },

  async getHistory(): Promise<ConversationMetadata[]> {
    const res = await ipc().invoke('chat:getHistory');
    if (!res?.success) return [];
    return res.data;
  },

  async delete(conversationId: string): Promise<void> {
    await ipc().invoke('chat:delete', conversationId);
  },

  async deleteAll(): Promise<void> {
    await ipc().invoke('chat:deleteAll');
  },
};
