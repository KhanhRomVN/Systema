// Service for Claude CLI API interactions

const STORAGE_KEY = "zen-claude-cli-backend-url";
const DEFAULT_BACKEND_URL = "http://localhost:3000/v1";

export interface ClaudeCliAccount {
  id: string;
  email: string;
  username: string;
  isActive: boolean;
  reqCount: number;
  inputTokens: number;
  outputTokens: number;
  conversationId?: string | null;
}

export interface ClaudeCliAccountsResponse {
  success: boolean;
  accounts: ClaudeCliAccount[];
}

export interface ClaudeCliChatRequest {
  accountId: string;
  conversationId?: string;
  parentMessageUuid?: string;
  message: string;
  stream?: boolean;
  files?: any[];
}

export interface ClaudeCliChatResponse {
  success: boolean;
  messageUuid?: string;
  content?: string;
  inputTokens?: number;
  outputTokens?: number;
  error?: string;
}

/**
 * Get the configured backend URL from localStorage
 */
export const getBackendUrl = (): string => {
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_BACKEND_URL;
};

/**
 * Fetch all Claude CLI accounts from the backend
 */
export const fetchClaudeCliAccounts = async (): Promise<ClaudeCliAccount[]> => {
  const backendUrl = getBackendUrl();

  try {
    const response = await fetch(`${backendUrl}/accounts`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: ClaudeCliAccountsResponse = await response.json();

    if (!data.success) {
      throw new Error("Failed to fetch accounts");
    }

    return data.accounts;
  } catch (error) {
    console.error("[ClaudeCliService] Failed to fetch accounts:", error);
    throw error;
  }
};

/**
 * Send a chat message using Claude CLI
 */
export const sendClaudeCliMessage = async (
  accountId: string,
  message: string,
  conversationId?: string,
  parentMessageUuid?: string,
  files?: any[]
): Promise<ClaudeCliChatResponse> => {
  const backendUrl = getBackendUrl();

  try {
    const requestBody: ClaudeCliChatRequest = {
      accountId,
      message,
      conversationId,
      parentMessageUuid,
      stream: false, // For now, we'll use non-streaming
      files,
    };

    const response = await fetch(`${backendUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: ClaudeCliChatResponse = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Failed to send message");
    }

    return data;
  } catch (error) {
    console.error("[ClaudeCliService] Failed to send message:", error);
    throw error;
  }
};

/**
 * Send a streaming chat message using Claude CLI
 */
export const sendClaudeCliMessageStream = async (
  accountId: string,
  message: string,
  conversationId: string | undefined,
  parentMessageUuid: string | undefined,
  onChunk: (chunk: string) => void,
  files?: any[]
): Promise<void> => {
  const backendUrl = getBackendUrl();

  try {
    const requestBody: ClaudeCliChatRequest = {
      accountId,
      message,
      conversationId,
      parentMessageUuid,
      stream: true,
      files,
    };

    const response = await fetch(`${backendUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Response body is not readable");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");

      // Keep the last incomplete line in the buffer
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);

          if (data === "[DONE]") {
            return;
          }

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              onChunk(parsed.content);
            }
          } catch (e) {
            console.error("[ClaudeCliService] Failed to parse chunk:", e);
          }
        }
      }
    }
  } catch (error) {
    console.error(
      "[ClaudeCliService] Failed to send streaming message:",
      error
    );
    throw error;
  }
};

/**
 * Fetch conversation history for a given conversationId
 */
export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export const fetchConversationHistory = async (
  conversationId: string
): Promise<ConversationMessage[]> => {
  const backendUrl = getBackendUrl();

  try {
    const response = await fetch(`${backendUrl}/chat/${conversationId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Failed to fetch conversation history");
    }

    // Server returns { conversation: { chat_messages: [...] } }
    // We need to map from Claude API format to our internal format
    const messages =
      data.conversation?.chat_messages || data.conversation?.messages || [];

    return messages.map((msg: any) => ({
      role: msg.sender === "human" ? "user" : "assistant",
      content: msg.text || msg.content || "",
      timestamp: msg.created_at
        ? new Date(msg.created_at).getTime()
        : Date.now(),
      id: msg.uuid || msg.id,
    }));
  } catch (error) {
    console.error(
      "[ClaudeCliService] Failed to fetch conversation history:",
      error
    );
    throw error;
  }
};

/**
 * Create a new conversation for a specific account
 */
export const createNewConversation = async (
  accountId: string
): Promise<{ conversationId: string; parentMessageUuid: string }> => {
  const backendUrl = getBackendUrl();

  try {
    const response = await fetch(`${backendUrl}/chat/new`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ accountId }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Failed to create new conversation");
    }

    return {
      conversationId: data.conversationId,
      parentMessageUuid: data.parentMessageUuid,
    };
  } catch (error) {
    console.error(
      "[ClaudeCliService] Failed to create new conversation:",
      error
    );
    throw error;
  }
};
