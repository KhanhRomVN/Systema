import React, { useState, useEffect, useCallback, useRef } from "react";
import ChatHeader from "./ChatHeader";
import ChatBody from "./ChatBody";
import ChatFooter from "./ChatFooter";
import { AgentOptions } from "./ChatFooter/components/AgentOptionsDrawer";
import {
  sendClaudeCliMessage,
  fetchConversationHistory,
  createNewConversation,
} from "../../services/claudeCliService";
import { encode } from "gpt-tokenizer";

// 🆕 Storage helper functions
const STORAGE_PREFIX = "zen-conversation";

interface ConversationMetadata {
  id: string;
  tabId: number;
  folderPath: string | null;
  title: string;
  lastModified: number;
  messageCount: number;
  containerName?: string;
  provider?:
    | "deepseek"
    | "chatgpt"
    | "gemini"
    | "grok"
    | "claude"
    | "claude-cli";
  createdAt: number;
  totalRequests: number;
  totalContext: number;
  accountId?: string; // For Claude CLI
}

const calculateTokens = (text: string): number => {
  if (!text) return 0;
  try {
    const count = encode(text).length;
    return count;
  } catch (e) {
    console.warn("Token calculation failed, fallback to char count/4", e);
    return Math.ceil(text.length / 4);
  }
};

const getConversationKey = (
  tabId: number,
  folderPath: string | null,
  conversationId?: string
): string => {
  if (conversationId && conversationId.startsWith(STORAGE_PREFIX)) {
    return conversationId;
  }

  const safeFolderPath = folderPath || "global";
  const convId = conversationId || Date.now().toString();
  const fullKey = `${STORAGE_PREFIX}:${tabId}:${safeFolderPath}:${convId}`;
  return fullKey;
};

const saveConversation = async (
  tabId: number,
  folderPath: string | null,
  messages: Message[],
  isFirstRequest: boolean,
  conversationId?: string,
  selectedTab?: TabInfo,
  skipTimestampUpdate?: boolean
): Promise<string> => {
  try {
    if (!window.storage) {
      console.error("[ChatPanel] ❌ window.storage not available");
      return "";
    }

    const convId = conversationId || Date.now().toString();
    const key = getConversationKey(tabId, folderPath, convId);

    // Calculate stats
    const totalRequests = messages.filter((m) => m.role === "user").length;
    const totalContext = messages.reduce(
      (sum, m) => sum + (m.usage?.total_tokens || m.contextSize || 0),
      0
    );

    // Load existing data to preserve createdAt and lastModified
    let existingCreatedAt: number | undefined;
    let existingLastModified: number | undefined;
    try {
      const existingData = await window.storage.get(key, false);
      if (existingData && existingData.value) {
        const parsed = JSON.parse(existingData.value);
        existingCreatedAt = parsed.metadata?.createdAt;
        existingLastModified = parsed.metadata?.lastModified;
      }
    } catch (error) {
      // Ignore errors, will use defaults
    }

    const data = {
      messages,
      isFirstRequest,
      conversationId: convId,
      metadata: {
        id: key,
        tabId,
        folderPath,
        title: messages[0]?.content.substring(0, 100) || "New Conversation",
        lastModified: skipTimestampUpdate
          ? existingLastModified || Date.now()
          : Date.now(),
        messageCount: messages.length,
        containerName: selectedTab?.containerName,
        provider: selectedTab?.provider,
        createdAt: existingCreatedAt || Date.now(),
        totalRequests,
        totalContext,
        accountId: selectedTab?.accountId, // For Claude CLI
      } as ConversationMetadata,
    };

    const result = await window.storage.set(key, JSON.stringify(data), false);
    return convId;
  } catch (error) {
    console.error("[ChatPanel] ❌ Failed to save conversation:", error);
    return "";
  }
};

const loadConversation = async (
  tabId: number,
  folderPath: string | null,
  conversationId?: string
): Promise<{
  messages: Message[];
  isFirstRequest: boolean;
  conversationId: string;
} | null> => {
  try {
    if (!window.storage) {
      console.error("[ChatPanel] ❌ window.storage not available");
      return null;
    }

    const key = getConversationKey(tabId, folderPath, conversationId);
    const result = await window.storage.get(key, false);

    if (!result || !result.value) {
      // 🆕 Try to delete invalid key
      try {
        await window.storage.delete(key, false);
      } catch (deleteError) {
        console.error(
          "[ChatPanel] ❌ Failed to delete invalid key:",
          deleteError
        );
      }
      return null;
    }

    const data = JSON.parse(result.value);

    // 🆕 Validate data structure
    if (
      !data.messages ||
      !Array.isArray(data.messages) ||
      data.messages.length === 0
    ) {
      try {
        await window.storage.delete(key, false);
      } catch (deleteError) {
        console.error(
          "[ChatPanel] ❌ Failed to delete invalid conversation:",
          deleteError
        );
      }
      return null;
    }

    const returnData = {
      messages: data.messages || [],
      isFirstRequest: data.isFirstRequest ?? true,
      conversationId:
        data.conversationId || conversationId || Date.now().toString(),
    };

    return returnData;
  } catch (error) {
    console.error("[ChatPanel] ❌ Failed to load conversation:", error);
    // 🆕 Try to delete corrupted key on parse error
    if (conversationId) {
      try {
        const key = getConversationKey(tabId, folderPath, conversationId);
        await window.storage.delete(key, false);
      } catch (deleteError) {
        console.error(
          "[ChatPanel] ❌ Failed to delete corrupted conversation:",
          deleteError
        );
      }
    }
    return null;
  }
};

const deleteConversation = async (
  tabId: number,
  folderPath: string | null,
  conversationId?: string
): Promise<boolean> => {
  try {
    if (!window.storage) {
      return false;
    }

    const key = getConversationKey(tabId, folderPath, conversationId);
    const result = await window.storage.delete(key, false);
    return !!result;
  } catch (error) {
    console.error("[ChatPanel] Failed to delete conversation:", error);
    return false;
  }
};

interface TabInfo {
  tabId: number;
  containerName: string;
  title: string;
  url?: string;
  status: "free" | "busy" | "sleep";
  canAccept: boolean;
  requestCount: number;
  folderPath?: string | null;
  conversationId?: string | null;
  provider?:
    | "deepseek"
    | "chatgpt"
    | "gemini"
    | "grok"
    | "claude"
    | "claude-cli";
  accountId?: string; // For Claude CLI
}

import { CheckpointButton } from "./Checkpoint/CheckpointButton";
import { CheckpointWarningDrawer } from "./Checkpoint/CheckpointWarningDrawer";
import { CheckpointDetailsDrawer } from "./Checkpoint/CheckpointDetailsDrawer";
import {
  RevertConfirmDialog,
  RevertOptions,
} from "./Checkpoint/RevertConfirmDialog";
import { Message, Checkpoint } from "./ChatBody/types";

interface ChatPanelProps {
  selectedTab: TabInfo;
  onBack: () => void;
  wsConnected: boolean;
  onWsMessage: (message: any) => void;
  wsInstance?: WebSocket | null;
  tabs?: TabInfo[]; // 🆕 Receive all tabs
  onTabSelect?: (tab: TabInfo) => void; // 🆕 Receive tab selection handler
}

// 🆕 Local FileNode definition to avoid complex imports cyclic
interface FileNode {
  name: string;
  path: string;
  type: "file" | "folder";
  size: number;
  status?: "added" | "modified" | "deleted" | "unchanged";
  additions?: number;
  deletions?: number;
  children?: FileNode[];
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  selectedTab,
  onBack,
  wsConnected,
  onWsMessage,
  wsInstance,
  tabs, // 🆕 Destructure
  onTabSelect, // 🆕 Destructure
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] =
    useState<string>("");

  // 🆕 Use ref to avoid stale closure in ping handler
  const currentConversationIdRef = useRef<string>("");

  useEffect(() => {
    currentConversationIdRef.current = currentConversationId;
  }, [currentConversationId]);

  // 🆕 Track current Request ID for validation
  const currentRequestIdRef = useRef<string>("");

  // 🆕 Execution State for Batch Tools
  const [executionState, setExecutionState] = useState<{
    total: number;
    completed: number;
    status: "idle" | "running" | "error" | "done";
  }>({ total: 0, completed: 0, status: "idle" });

  // 🆕 Track clicked actions locally to support batch execution logic
  // ChatBody also tracks this, but ChatPanel needs it for handleExecutePendingBatch
  // We'll update this when we receive 'markActionClicked' or trigger it
  // 🆕 Track clicked actions locally to support batch execution logic
  // ChatBody also tracks this, but ChatPanel needs it for handleExecutePendingBatch
  // We'll update this when we receive 'markActionClicked' or trigger it
  const [clickedActions, setClickedActions] = useState<Set<string>>(new Set());
  const [clearedActions, setClearedActions] = useState<Set<string>>(new Set());

  // 🆕 Auto-Execute All state
  const [isAutoExecutingAll, setIsAutoExecutingAll] = useState(false);

  // 🆕 Tool Outputs State
  const [toolOutputs, setToolOutputs] = useState<
    Record<string, { output: string; isError: boolean }>
  >({});

  // 🆕 Pending Tool Resolvers (for blocking execution)
  const pendingToolResolvers = useRef<
    Map<string, (result: string | null) => void>
  >(new Map());

  // 🆕 Track command start times for duration calculation
  const commandStartTimes = useRef<Map<string, number>>(new Map());

  // 🆕 Buffer for tool results to support sequential execution
  // 🆕 Buffer for tool results (to support multi-step tool calls)
  const [availableToolResultsBuffer, setAvailableToolResultsBuffer] = useState<{
    [messageId: string]: string[];
  }>({});
  // Ref for immediate access in handleSendMessage callback without dep cycle or stale closure if feasible
  const toolResultsBufferRef = useRef(availableToolResultsBuffer);

  // Sync ref
  const setToolResultsBuffer = (
    valOrUpdater: React.SetStateAction<Record<string, string[]>>
  ) => {
    setAvailableToolResultsBuffer((prev) => {
      const newVal =
        typeof valOrUpdater === "function"
          ? (valOrUpdater as Function)(prev)
          : valOrUpdater;
      toolResultsBufferRef.current = newVal;
      return newVal;
    });
  };

  // 🆕 Agent options state (lifted from ChatFooter)
  const [agentOptions, setAgentOptions] = useState<AgentOptions>(() => {
    const saved = localStorage.getItem("zen-agent-options");
    const defaultOptions: AgentOptions = {
      read_file: { scope: "project", autoRead: "off" },
      write_to_file: { scope: "project", autoRead: "off" },
      replace_in_file: { scope: "project", autoRead: "off" },
      list_files: { scope: "project", autoRead: "off" },
      search_files: { scope: "project", autoRead: "off" },
      run_command: { autoRead: "off" },
    };
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return defaultOptions;
      }
    }
    return defaultOptions;
  });

  const handleAgentOptionsChange = useCallback((options: AgentOptions) => {
    setAgentOptions(options);
    localStorage.setItem("zen-agent-options", JSON.stringify(options));

    // Also notify extension if needed, though ChatFooter usually handles immediate updates
    // via onAgentOptionsChange -> but here we just update state.
    // The handleSendMessage logic reads this state.
  }, []);

  // 🆕 Detect history mode (viewing conversation from HistoryPanel)
  const [isHistoryMode, setIsHistoryMode] = useState(false);

  useEffect(() => {
    const isHistory =
      !!(selectedTab as any).conversationId && !selectedTab.canAccept;
    setIsHistoryMode(isHistory);
  }, [selectedTab]);

  // 🆕 Import parseAIResponse
  const { parseAIResponse } = require("../../services/ResponseParser");

  // 🆕 Memoize parsed messages
  const parsedMessages = React.useMemo(() => {
    return messages.map((msg) => ({
      ...msg,
      parsed: parseAIResponse(msg.content),
    }));
  }, [messages]);

  // 🆕 Calculate context usage
  const contextUsage = React.useMemo(() => {
    return messages.reduce(
      (acc, msg) => {
        if (msg.usage) {
          acc.prompt += msg.usage.prompt_tokens || 0;
          acc.completion += msg.usage.completion_tokens || 0;
          acc.total += msg.usage.total_tokens || 0;
        } else if (msg.contextSize) {
          // Fallback mechanism could go here if needed
        }
        return acc;
      },
      { prompt: 0, completion: 0, total: 0 }
    );
  }, [messages]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [isFirstRequest, setIsFirstRequest] = useState(true);
  const [checkpoints, setCheckpoints] = useState<string[]>([]);
  // 🆕 Checkpoint state
  const [checkpoint, setCheckpoint] = useState<Checkpoint | null>(null);

  // Checkpoint Warning UI State
  const [showCheckpointWarning, setShowCheckpointWarning] = useState(false);
  const [checkpointTree, setCheckpointTree] = useState<any>(null);
  const [pendingCheckpointType, setPendingCheckpointType] = useState<
    "full" | "incremental" | null
  >(null);

  // 🆕 Checkpoint View/Revert State
  const [viewingCheckpointId, setViewingCheckpointId] = useState<string | null>(
    null
  );
  const [revertingCheckpointId, setRevertingCheckpointId] = useState<
    string | null
  >(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      if (message.command === "createCheckpointResult") {
        if (message.error) {
          // Show error?
          console.error("Checkpoint creation failed:", message.error);
        } else {
          const result = message.result;
          // Add checkpoint message
          const checkpointMsg: Message = {
            id: `msg-${Date.now()}-checkpoint`,
            role: "system-checkpoint" as any,
            content: "",
            timestamp: result.timestamp,
            checkpointData: {
              id: result.id,
              totalFiles: Object.keys(result.files).length,
              totalSize: result.totalSize,
              timestamp: result.timestamp,
              files: result.files,
              stats: result.stats,
              changes: result.changes,
              storageSize: result.storageSize,
            },
          };
          setMessages((prev) => [...prev, checkpointMsg]);
        }
      } else if (message.command === "projectSizeResult") {
        // Handle size check result (from "Begin Checkpoint" logic)
        if (message.size > 10 * 1024 * 1024) {
          // 10MB
          setCheckpointTree(message.tree);
          setShowCheckpointWarning(true);
        } else {
          // Proceed with full checkpoint -> MOVED to handleSendMessage
          // We do nothing here, just let the user send the first message.
        }
      } else if (message.command === "markActionCleared" && message.actionId) {
        setClearedActions((prev) => new Set(prev).add(message.actionId));
        // Clear content of messages associated with this action
        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.actionIds && msg.actionIds.includes(message.actionId)) {
              return { ...msg, content: "" };
            }
            return msg;
          })
        );
      } else if (message.command === "commandExecuted") {
        if (message.actionId) {
          setToolOutputs((prev) => ({
            ...prev,
            [message.actionId]: {
              output: message.output,
              isError: !!message.error,
            },
          }));

          // Resolve blocking promise if exists
          if (pendingToolResolvers.current.has(message.actionId)) {
            const resolver = pendingToolResolvers.current.get(message.actionId);
            if (resolver) {
              const cmdText = message.commandText || "command";
              const outputContent = message.output ? message.output.trim() : "";

              const startTime = commandStartTimes.current.get(message.actionId);
              const duration = startTime
                ? ((Date.now() - startTime) / 1000).toFixed(1)
                : null;

              if (startTime) {
                commandStartTimes.current.delete(message.actionId);
              }

              const timeSuffix = duration ? ` for ${duration}s` : "";

              const resultMsg = message.error
                ? `Output: [execute_command for '${cmdText}']${timeSuffix}\n\`\`\`\nError: ${message.error}\n${outputContent}\n\`\`\``
                : `Output: [execute_command for '${cmdText}']${timeSuffix}\n\`\`\`\n${outputContent}\n\`\`\``;

              resolver(resultMsg);
              pendingToolResolvers.current.delete(message.actionId);
            }
          }
        }
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);
  const [isLoadingConversation, setIsLoadingConversation] = useState(true);

  // 🆕 Auto-save conversation khi có thay đổi
  useEffect(() => {
    if (
      !isLoadingConversation &&
      messages.length > 0 &&
      currentConversationId
    ) {
      const timeoutId = setTimeout(() => {
        saveConversation(
          selectedTab.tabId,
          selectedTab.folderPath || null,
          messages,
          isFirstRequest,
          currentConversationId,
          selectedTab,
          false // skipTimestampUpdate = false (normal save)
        ).then((convId) => {
          if (convId && !currentConversationId) {
            setCurrentConversationId(convId);
          }
        });
      }, 1000); // Debounce 1s

      return () => clearTimeout(timeoutId);
    }
  }, [
    messages,
    isFirstRequest,
    isLoadingConversation,
    selectedTab.tabId,
    selectedTab.folderPath,
    currentConversationId,
    selectedTab, // Added selectedTab to dependencies
  ]);

  // 🆕 Load conversation khi mount - CHỈ load khi có conversationId prop
  useEffect(() => {
    const loadExistingConversation = async () => {
      setIsLoadingConversation(true);
      const conversationId = (selectedTab as any).conversationId;

      if (selectedTab.provider === "claude-cli" && conversationId) {
        // Load Claud CLI conversation history
        try {
          const history = await fetchConversationHistory(conversationId);
          if (history && history.length > 0) {
            const formattedMessages: Message[] = history.map((msg: any) => ({
              id: msg.id || `msg-${Date.now()}-${Math.random()}`, // Ensure ID exists
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp || Date.now(),
            }));
            setMessages(formattedMessages);
            setIsFirstRequest(false); // If history exists, it's not the first request
            setCurrentConversationId(conversationId);
          } else {
            setMessages([]);
            setIsFirstRequest(true);
            setCurrentConversationId(conversationId); // Still set conversationId even if no history
          }
        } catch (error) {
          console.error(
            "[ChatPanel] ❌ Failed to load Claude CLI history:",
            error
          );
          setMessages([]);
          setIsFirstRequest(true);
          setCurrentConversationId(conversationId);
          const errorMessage: Message = {
            id: `msg-${Date.now()}-error`,
            role: "assistant",
            content: `❌ Error loading Claude CLI conversation history: ${
              error instanceof Error ? error.message : String(error)
            }`,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        }
      } else if (conversationId) {
        const saved = await loadConversation(
          selectedTab.tabId,
          selectedTab.folderPath || null,
          conversationId
        );

        if (saved && saved.messages.length > 0) {
          setMessages(saved.messages);
          setIsFirstRequest(saved.isFirstRequest);
          setCurrentConversationId(saved.conversationId);
        } else {
          setMessages([]);
          setIsFirstRequest(true);
          // Only create new if current state is empty
          if (!currentConversationId) {
            const newConvId = Date.now().toString();
            setCurrentConversationId(newConvId);
          }
        }
      } else {
        setMessages([]);
        setIsFirstRequest(true);
        // Only create new if current state is empty
        if (!currentConversationId) {
          const newConvId = Date.now().toString();
          setCurrentConversationId(newConvId);
        } else {
        }
      }

      setIsLoadingConversation(false);
    };

    loadExistingConversation();
  }, [
    selectedTab.tabId,
    selectedTab.folderPath,
    (selectedTab as any).conversationId,
    selectedTab.provider, // Added provider to dependencies
    selectedTab.provider, // Added provider to dependencies
    selectedTab.accountId, // Added accountId to dependencies
  ]);

  // 🆕 Check Project Size on First Load / New Conversation
  useEffect(() => {
    // Only check size, DO NOT create checkpoint here.
    if (messages.length === 0 && selectedTab.canAccept) {
      const vscodeApi = (window as any).vscodeApi;
      if (vscodeApi) {
        // Request size check
        vscodeApi.postMessage({ command: "checkProjectSize" });
      }
    }
  }, [selectedTab.conversationId, selectedTab.canAccept, messages.length]);

  useEffect(() => {
    const handleIncomingMessage = (data: any) => {
      // 🆕 Handle CONVERSATION PING from ZenTab (with conditions)
      if (data.type === "conversationPing") {
        // 🔥 Use ref to get current value (avoid stale closure)
        const currentConvId = currentConversationIdRef.current;

        // Condition 1: Check if in ChatPanel (panel is active)
        const inChatPanel = true; // ChatPanel is mounted, so we're in it

        // Condition 2: Check if conversationId matches
        const matchingConversation = currentConvId === data.conversationId;

        // Only send pong if BOTH conditions are met
        if (inChatPanel && matchingConversation) {
          if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
            wsInstance.send(
              JSON.stringify({
                type: "conversationPong",
                tabId: data.tabId,
                conversationId: data.conversationId,
                requestId: data.requestId, // Include requestId to distinguish first vs heartbeat pong
                folderPath: data.folderPath, // Include folderPath from ping
                timestamp: Date.now(),
              })
            );
          }
        } else {
          // Conditions not met - ignore ping
        }
        return;
      }

      // 🔥 Xử lý generationStarted message
      if (data.type === "generationStarted") {
        // 🆕 Validate Request ID
        if (
          currentRequestIdRef.current &&
          data.requestId !== currentRequestIdRef.current
        ) {
          return;
        }

        const statusMessage: Message = {
          id: `msg-${Date.now()}-status`,
          role: "assistant",
          content: "✅ AI đã bắt đầu xử lý request. Đang đợi response...",
          timestamp: Date.now(),
        };

        return;
      }

      if (data.type === "promptResponse") {
        // 🆕 Validate Request ID
        if (
          currentRequestIdRef.current &&
          data.requestId !== currentRequestIdRef.current
        ) {
          return;
        }

        // 🆕 Deduplicate: If we already processed this request ID, ignore
        if ((window as any).__lastProcessedRequestId === data.requestId) {
          return;
        }
        (window as any).__lastProcessedRequestId = data.requestId;

        const timeoutId = (window as any).__chatPanelTimeoutId;
        if (timeoutId) {
          clearTimeout(timeoutId);
          delete (window as any).__chatPanelTimeoutId;
        }

        if (data.success && data.response) {
          try {
            // Parse OpenAI response format
            const parsedResponse = JSON.parse(data.response);
            const rawContent =
              parsedResponse.content ||
              parsedResponse?.choices?.[0]?.delta?.content ||
              data.response;

            const aiUsage = {
              prompt_tokens: 0,
              completion_tokens: calculateTokens(rawContent),
              total_tokens: calculateTokens(rawContent),
            };

            // 🆕 Just add raw content to messages, ChatBody will handle parsing
            const aiMessage: Message = {
              id: `msg-${Date.now()}-assistant`,
              role: "assistant",
              content: rawContent,
              timestamp: Date.now(),
              usage: aiUsage, // 🆕 Store usage
              contextSize: calculateTokens(rawContent), // Backup
            };

            setMessages((prev) => {
              const newMessages = [...prev, aiMessage];
              return newMessages;
            });
            setIsProcessing(false);
          } catch (error) {
            console.error(`[ChatPanel] ❌ Failed to parse response:`, error);
            console.error(`[ChatPanel] 🔍 Parse error details:`, {
              errorMessage:
                error instanceof Error ? error.message : String(error),
              rawResponse: data.response?.substring(0, 200),
            });

            // Fallback: use raw response
            const aiMessage: Message = {
              id: `msg-${Date.now()}-assistant`,
              role: "assistant",
              content: data.response,
              timestamp: Date.now(),
            };

            setMessages((prev) => [...prev, aiMessage]);
            setIsProcessing(false);
          }
        } else {
          console.error(`[ChatPanel] ❌ promptResponse FAILED:`, {
            requestId: data.requestId,
            tabId: data.tabId,
            error: data.error,
            errorType: data.errorType,
            hasResponse: !!data.response,
          });
          setIsProcessing(false);

          // Build user-friendly error message based on errorType
          let errorContent = "";
          if (data.errorType === "VALIDATION_FAILED") {
            errorContent = `❌ **Lỗi: Tab không hợp lệ**

**Chi tiết:** ${data.error || "Tab validation failed"}

**Nguyên nhân có thể:**
- Tab không phải là DeepSeek/ChatGPT tab
- Tab đã navigate sang trang web khác
- Tab đang bị đóng hoặc không còn tồn tại

**Khuyến nghị:**
1. Quay lại TabPanel và kiểm tra danh sách tabs
2. Chọn lại tab có trạng thái "Free" (màu xanh)
3. Đảm bảo tab vẫn đang mở DeepSeek hoặc ChatGPT

**Thời gian:** ${new Date().toISOString()}
**Request ID:** ${data.requestId}
**Tab ID:** ${data.tabId}`;
          } else {
            errorContent = `❌ **Lỗi xảy ra**

**Chi tiết:** ${data.error || "Unknown error"}

**Request ID:** ${data.requestId}
**Tab ID:** ${data.tabId}
**Thời gian:** ${new Date().toISOString()}`;
          }

          // Add error message
          const errorMessage: Message = {
            id: `msg-${Date.now()}-error`,
            role: "assistant",
            content: errorContent,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        }
      } else if (data.type === "contextResponse") {
        // Forward to context response handler
        if ((window as any).__contextResponseHandler) {
          (window as any).__contextResponseHandler(data);
        }
      }

      // Forward all messages to parent
      onWsMessage(data);
    };

    // Subscribe to WebSocket messages bằng cách wrap onWsMessage
    const originalOnWsMessage = onWsMessage;
    (window as any).__chatPanelMessageHandler = handleIncomingMessage;

    return () => {
      delete (window as any).__chatPanelMessageHandler;
    };
  }, [onWsMessage, wsInstance, currentConversationIdRef]);

  const handleSendMessage = useCallback(
    async (
      content: string,
      files?: any[],
      agentOptions?: any,
      skipFirstRequestLogic?: boolean,
      actionIds?: string[]
    ) => {
      const requestId = `req-${Date.now()}`; // Standardize requestId generation
      currentRequestIdRef.current = requestId; // 🆕 Track active request ID
      const originalUserMessage = content; // 🆕 Store original user message
      let systemPrompt: string | null = null; // 🆕 Store system prompt

      // Send agent permissions update to extension
      if (agentOptions) {
        const vscodeApi = (window as any).vscodeApi;
        if (vscodeApi) {
          vscodeApi.postMessage({
            command: "updateAgentPermissions",
            permissions: agentOptions,
          });
        }
      }

      // 🆕 Check for buffered tool results to PREPEND to user message
      // This handles "Partial Execution" case where user runs some tools then types a message.
      if (!skipFirstRequestLogic && !actionIds) {
        // Check all buffers. Ideally find relevant ones.
        // We iterate and consume.
        // Note: setToolResultsBuffer is async, so we just read `toolResultsBuffer` ref/state.
        const bufferedContent: string[] = [];
        const bufferedActionIds: string[] = [];

        Object.entries(toolResultsBufferRef.current).forEach(
          ([msgId, results]) => {
            if (results && results.length > 0) {
              bufferedContent.push(...results);
              // Clear this buffer entry
              setToolResultsBuffer((prev: Record<string, string[]>) => ({
                ...prev,
                [msgId]: [],
              }));
            }
          }
        );

        if (bufferedContent.length > 0) {
          const toolOutput = bufferedContent.join("\n\n");
          content = `${toolOutput}\n\n${content}`;
        }

        // 🆕 Check for SKIPPED actions (Partial Execution)
        // If user sends a text message, any unclicked actions in the last tool response are considered SKIPPED.
        const lastToolMsg = parsedMessages
          .slice()
          .reverse()
          .find((m) => m.role === "assistant" && m.parsed?.actions?.length);

        if (lastToolMsg) {
          const unclickedActions = lastToolMsg.parsed.actions.filter(
            (_: any, index: number) =>
              !clickedActions.has(`${lastToolMsg.id}-action-${index}`)
          );

          if (unclickedActions.length > 0) {
            const skippedSummary = unclickedActions
              .map((a: any) => {
                const path =
                  a.params?.path ||
                  a.params?.command ||
                  JSON.stringify(a.params);
                return `${a.type}: ${path}`;
              })
              .join("\n- ");

            content = `${content}\n\n[System Note] The user skipped the following actions:\n- ${skippedSummary}`;
          }
        }
      }

      // 🆕 Get DEFAULT_RULE_PROMPT for first request only (skip if tool request)
      if (isFirstRequest && !skipFirstRequestLogic) {
        try {
          const {
            combinePrompts,
          } = require("../../components/SettingsPanel/prompts");
          systemPrompt = combinePrompts();
        } catch (error) {
          console.error(`[ChatPanel] ❌ Failed to load rule prompt:`, error);
        }
      }

      // Send context request via WebSocket
      // Send context request via VS Code API (extension will handle it)
      const vscodeApi = (window as any).vscodeApi;
      if (vscodeApi) {
        // Wait for context response (with timeout)
        const contextPromise = new Promise<string>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Context request timeout"));
          }, 10000); // 10s timeout

          const handleContextResponse = (event: MessageEvent) => {
            const data = event.data;
            if (
              data.command === "contextResponse" &&
              data.requestId === requestId
            ) {
              clearTimeout(timeout);
              if (data.error) {
                reject(new Error(data.error));
              } else {
                resolve(data.context);
              }
              // Cleanup listener
              window.removeEventListener("message", handleContextResponse);
            }
          };

          window.addEventListener("message", handleContextResponse);

          // Send request
          vscodeApi.postMessage({
            command: "requestContext",
            task: content,
            requestId: requestId,
            isFirstRequest: isFirstRequest && !skipFirstRequestLogic, // 🆕 Pass isFirstRequest
          });
        });

        try {
          const contextString = await contextPromise;

          // 🆕 Combine system prompt + context + user message for first request (skip if tool request)
          if (isFirstRequest && !skipFirstRequestLogic) {
            // Ensure we use the original message even if systemPrompt is missing
            content = `${
              systemPrompt ? systemPrompt + "\n\n" : ""
            }${contextString}\n\nUser Request: ${originalUserMessage}`;
          } else {
            // For subsequent requests (or skipped logic), we must PRESERVE the original content (e.g. tool output)
            // and append the context (if any).
            content = contextString
              ? `${originalUserMessage}\n\n${contextString}`
              : originalUserMessage;
          }
        } catch (error) {
          console.error(`[ChatPanel] ❌ Failed to get context:`, error);
          // Continue without context
        }
      }

      // 🆕 Token Calculation & Limit Check
      const userTokens = calculateTokens(content);
      const currentTotalContext = contextUsage.total;
      const expectedTotal = currentTotalContext + userTokens;

      if (expectedTotal > 500000) {
        const errorMsg: Message = {
          id: `msg-${Date.now()}-error`,
          role: "assistant",
          content: `❌ **Context Limit Exceeded**\n\nThe conversation has exceeded the 500,000 token limit (Current: ${expectedTotal.toLocaleString()}).\n\nPlease start a new conversation to continue.`,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMsg]);
        return;
      }

      // 🆕 VALIDATION 1: Check tab status trước
      if (selectedTab.provider !== "claude-cli" && !selectedTab.canAccept) {
        // Skip for Claude CLI
        console.error(
          `[ChatPanel] ❌ Cannot send - Tab cannot accept request:`,
          {
            tabId: selectedTab.tabId,
            status: selectedTab.status,
            canAccept: selectedTab.canAccept,
          }
        );

        // Hiển thị error cho user
        let errorContent = "";
        if (selectedTab.status === "busy") {
          errorContent = `❌ **Lỗi: Tab đang bận**

Tab ${selectedTab.tabId} hiện đang xử lý một request khác.

**Khuyến nghị:**
- Đợi tab xử lý xong (status chuyển sang "Free")
- Hoặc chọn tab khác có status "Free"`;
        } else if (selectedTab.status === "sleep") {
          errorContent = `❌ **Lỗi: Tab đang ngủ**

Tab ${selectedTab.tabId} hiện đang ở chế độ ngủ (sleep mode).

**Khuyến nghị:**
- Click vào tab trong ZenTab extension để wake up
- Hoặc chọn tab khác có status "Free"`;
        } else {
          errorContent = `❌ **Lỗi: Tab không thể nhận request**

Tab ${selectedTab.tabId} hiện không thể nhận request mới.

**Khuyến nghị:**
- Quay lại TabPanel và chọn tab khác
- Chỉ chọn tabs có status "Free" (màu xanh)`;
        }

        const errorMessage: Message = {
          id: `msg-${Date.now()}-error`,
          role: "assistant",
          content: errorContent,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        return;
      }

      // 🔥 VALIDATION 2: Check WebSocket connection
      if (
        selectedTab.provider !== "claude-cli" &&
        (!wsInstance || wsInstance.readyState !== WebSocket.OPEN)
      ) {
        // Skip for Claude CLI
        console.error(`[ChatPanel] ❌ Cannot send - WebSocket not ready:`, {
          hasWsInstance: !!wsInstance,
          readyState: wsInstance?.readyState,
          expectedState: WebSocket.OPEN,
          readyStateText:
            wsInstance?.readyState === 0
              ? "CONNECTING"
              : wsInstance?.readyState === 1
              ? "OPEN"
              : wsInstance?.readyState === 2
              ? "CLOSING"
              : wsInstance?.readyState === 3
              ? "CLOSED"
              : "NULL",
        });

        // Hiển thị error cho user
        const errorMessage: Message = {
          id: `msg-${Date.now()}-error`,
          role: "assistant",
          content:
            "❌ Lỗi: WebSocket chưa kết nối. Vui lòng kiểm tra connection status ở TabPanel footer.",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        setIsProcessing(false);
        return;
      }

      // 🆕 Always create a user message (even for tool requests)
      // For tool requests, we create a message to track the request in UI
      const userMessage: Message = {
        id: `msg-${Date.now()}-${skipFirstRequestLogic ? "tool" : "user"}`,
        role: "user",
        content: skipFirstRequestLogic ? content : originalUserMessage,
        timestamp: Date.now(),
        isFirstRequest: skipFirstRequestLogic ? false : isFirstRequest,
        isToolRequest: skipFirstRequestLogic, // Mark as tool request
        systemPrompt:
          !skipFirstRequestLogic && isFirstRequest
            ? systemPrompt || undefined
            : undefined,
        contextSize: content.length,
        usage: {
          prompt_tokens: calculateTokens(content),
          completion_tokens: 0,
          total_tokens: calculateTokens(content),
        },
        actionIds: actionIds, // 🆕 Attach actionIds
      };

      // 🆕 For first request, create and set conversationId IMMEDIATELY
      let conversationIdToUse = currentConversationId;

      if (isFirstRequest && !skipFirstRequestLogic && !currentConversationId) {
        conversationIdToUse = Date.now().toString();
        setCurrentConversationId(conversationIdToUse);
      }

      const updatedMessages = [...messages, userMessage];
      saveConversation(
        selectedTab.tabId,
        selectedTab.folderPath || null,
        updatedMessages,
        isFirstRequest,
        conversationIdToUse,
        selectedTab,
        false
      );

      setMessages((prev) => {
        return [...prev, userMessage];
      });

      setIsProcessing(true);

      if (isFirstRequest && !skipFirstRequestLogic) {
        setIsFirstRequest(false);
      }

      // 🆕 Create Begin-Checkpoint if this is the first request
      if (messages.length === 0) {
        const vscodeApi = (window as any).vscodeApi;
        if (vscodeApi) {
          vscodeApi.postMessage({
            command: "createCheckpoint",
            type: "full",
            messageId: "init-req1",
            // No parentId for the very first one
          });
        }
      }

      if (selectedTab.provider === "claude-cli") {
        if (!selectedTab.accountId) {
          console.error("[ChatPanel] No accountId provided for Claude CLI");
          const errorMessage: Message = {
            id: `msg-${Date.now()}-error`,
            role: "assistant",
            content: `❌ Error: No account selected. Please select a Claude CLI account from the Tab Panel.`,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, errorMessage]);
          setIsProcessing(false);
          return;
        }

        // Call Claude CLI service
        try {
          const claudeCliResponse = await sendClaudeCliMessage(
            selectedTab.accountId,
            content,
            conversationIdToUse,
            undefined, // parentMessageUuid
            files // 🆕 Pass files to Claude CLI
          );

          const aiMessage: Message = {
            id: `msg-${Date.now()}-assistant`,
            role: "assistant",
            content: claudeCliResponse.content || "",
            timestamp: Date.now(),
          };

          setMessages((prev) => [...prev, aiMessage]);
          setIsProcessing(false);
        } catch (error) {
          console.error("[ChatPanel] ❌ Claude CLI message failed:", error);
          const errorMessage: Message = {
            id: `msg-${Date.now()}-error`,
            role: "assistant",
            content: `❌ Error sending message to Claude CLI: ${
              error instanceof Error ? error.message : String(error)
            }`,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev, errorMessage]);
          setIsProcessing(false);
        }
        return;
      }

      const sendPromptMessage = {
        type: "sendPrompt",
        tabId: selectedTab.tabId,
        prompt: `<task>\n${content}`,
        requestId: requestId,
        isNewTask: isFirstRequest && !skipFirstRequestLogic,
        folderPath: (window as any).__zenWorkspaceFolderPath || null,
        conversationId: conversationIdToUse,
        containerName: selectedTab.containerName || null,
        timestamp: Date.now(),
        files: files,
      };

      // Post message to parent window (will be sent via WebSocket in TabFooter)
      const postMessageTimestamp = Date.now();

      window.postMessage(
        {
          command: "sendWebSocketMessage",
          data: sendPromptMessage,
        },
        "*"
      );

      const timeoutId = setTimeout(() => {
        setIsProcessing((current) => {
          if (current) {
            console.error(`[ChatPanel] ⏱️ Timeout waiting for response`);
            const timeoutMessage: Message = {
              id: `msg-${Date.now()}-timeout`,
              role: "assistant",
              content:
                "⏱️ Timeout: Không nhận được response từ ZenTab sau 15 phút. Vui lòng thử lại.",
              timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, timeoutMessage]);
            return false;
          }
          return current;
        });
      }, 900000); // 🔥 15 minutes timeout (15 phút)

      // Store timeout ID để có thể clear khi nhận response
      (window as any).__chatPanelTimeoutId = timeoutId;
    },
    [messages, isFirstRequest, selectedTab, wsInstance, currentConversationId]
  );

  // 🆕 Handle tool request from ChatBody
  const handleToolRequest = useCallback(
    async (actionOrActions: any, message: Message) => {
      const actions = Array.isArray(actionOrActions)
        ? actionOrActions
        : [actionOrActions];

      const vscodeApi = (window as any).vscodeApi;

      if (!vscodeApi) {
        console.error("[ChatPanel] vscodeApi not available");
        return;
      }

      // 1. Create Checkpoints for all edit tools in the batch
      const editTools = ["write_to_file", "replace_in_file", "execute_command"];

      const toolNames = actions.map((a) => a.type).join(", ");
      const impactedFiles = Array.from(
        new Set(
          actions
            .filter((a) => a.toolName)
            .map((a) => (a as any).targetFile)
            .filter(Boolean)
        )
      ).join(", ");

      const lastCheckpointMsg = [...messages]
        .reverse()
        .find((m) => m.role === ("system-checkpoint" as any));
      const lastCheckpointId = lastCheckpointMsg?.checkpointData?.id;

      actions.forEach((action) => {
        if (editTools.includes(action.type)) {
          const actionId = `${message.id}-action-${action._index}`;
          vscodeApi.postMessage({
            command: "createCheckpoint",
            filePath: action.params.path || action.params.command,
            conversationId: currentConversationId,
            toolType: action.type,
            actionId: actionId,
            messageId: message.id,
            type: "incremental", // Explicitly incremental
            parentId: lastCheckpointId, // Pass parentId!
          });
        }
      });

      const executeSingleAction = (
        action: any,
        skipDiagnostics: boolean = false
      ): Promise<string | null> => {
        return new Promise((resolve) => {
          switch (action.type) {
            case "read_file": {
              const requestId = `read-${Date.now()}-${Math.random()}`;
              vscodeApi.postMessage({
                command: "readFile",
                path: action.params.path,
                startLine: action.params.start_line
                  ? parseInt(action.params.start_line)
                  : undefined,
                endLine: action.params.end_line
                  ? parseInt(action.params.end_line)
                  : undefined,
                requestId: requestId,
              });

              const handleFileResponse = (event: MessageEvent) => {
                const msg = event.data;
                if (
                  msg.command === "fileContent" &&
                  msg.requestId === requestId
                ) {
                  window.removeEventListener("message", handleFileResponse);
                  if (msg.error) {
                    const errorMsg: Message = {
                      id: `msg-${Date.now()}-error`,
                      role: "assistant",
                      content: `❌ Error reading file '${action.params.path}': ${msg.error}`,
                      timestamp: Date.now(),
                    };
                    setMessages((prev) => [...prev, errorMsg]);

                    let readableError = msg.error;
                    if (
                      readableError.includes("tồn tại") ||
                      readableError.includes("no such file")
                    ) {
                      readableError = "File not found in project";
                    }

                    resolve(
                      `[read_file for '${action.params.path}'] Result: Error - ${readableError}`
                    );
                  } else {
                    let result = `[read_file for '${action.params.path}'] Result:\n\`\`\`\n${msg.content}\n\`\`\``;
                    if (msg.diagnostics && msg.diagnostics.length > 0) {
                      result += `\n\n⚠️ **Diagnostics Found:**\n${msg.diagnostics.join(
                        "\n"
                      )}`;
                    }
                    resolve(result);
                  }
                }
              };
              window.addEventListener("message", handleFileResponse);
              setTimeout(() => {
                window.removeEventListener("message", handleFileResponse);
                resolve(null); // Timeout
              }, 10000);
              break;
            }

            case "write_to_file": {
              const requestId = `write-${Date.now()}-${Math.random()}`;
              vscodeApi.postMessage({
                command: "writeFile",
                path: action.params.path,
                content: action.params.content,
                requestId: requestId,
                skipDiagnostics,
              });

              const handleResponse = (event: MessageEvent) => {
                const msg = event.data;
                if (
                  msg.command === "writeFileResult" &&
                  msg.requestId === requestId
                ) {
                  window.removeEventListener("message", handleResponse);
                  if (msg.error) {
                    const errorMsg: Message = {
                      id: `msg-${Date.now()}-error`,
                      role: "assistant",
                      content: `❌ Error writing file '${action.params.path}': ${msg.error}`,
                      timestamp: Date.now(),
                    };
                    setMessages((prev) => [...prev, errorMsg]);
                    resolve(
                      `[write_to_file for '${action.params.path}'] Result: Error - ${msg.error}`
                    );
                  } else {
                    let result = `[write_to_file for '${action.params.path}'] Success: File written successfully`;
                    if (msg.diagnostics && msg.diagnostics.length > 0) {
                      result += `\n\n⚠️ **Diagnostics Found:**\n${msg.diagnostics.join(
                        "\n"
                      )}`;
                    }
                    resolve(result);
                  }
                }
              };
              window.addEventListener("message", handleResponse);
              setTimeout(() => {
                window.removeEventListener("message", handleResponse);
                resolve(null);
              }, 10000);
              break;
            }

            case "replace_in_file": {
              const requestId = `replace-${Date.now()}-${Math.random()}`;
              vscodeApi.postMessage({
                command: "replaceInFile",
                path: action.params.path,
                diff: action.params.diff,
                requestId: requestId,
                skipDiagnostics,
              });

              const handleReplaceResponse = (event: MessageEvent) => {
                const msg = event.data;
                if (
                  msg.command === "replaceInFileResult" &&
                  msg.requestId === requestId
                ) {
                  window.removeEventListener("message", handleReplaceResponse);
                  if (msg.error) {
                    const errorMsg: Message = {
                      id: `msg-${Date.now()}-error`,
                      role: "assistant",
                      content: `❌ Error applying diff to '${action.params.path}': ${msg.error}`,
                      timestamp: Date.now(),
                    };
                    setMessages((prev) => [...prev, errorMsg]);
                    resolve(
                      `[replace_in_file for '${action.params.path}'] Result: Error - ${msg.error}`
                    );
                  } else {
                    let result = `[replace_in_file for '${action.params.path}'] Success: Diff applied successfully`;
                    if (msg.diagnostics && msg.diagnostics.length > 0) {
                      result += `\n\n⚠️ **Diagnostics Found:**\n${msg.diagnostics.join(
                        "\n"
                      )}`;
                      if (msg.content) {
                        result += `\n\n<current_file_content_post_edit>\n(The following is the full content of '${action.params.path}' AFTER the edit. Please review it to fix the diagnostics.)\n\`\`\`\n${msg.content}\n\`\`\`\n</current_file_content_post_edit>`;
                      }
                    }
                    resolve(result);
                  }
                }
              };
              window.addEventListener("message", handleReplaceResponse);
              setTimeout(() => {
                window.removeEventListener("message", handleReplaceResponse);
                resolve(null);
              }, 10000);
              break;
            }

            case "list_files": {
              const requestId = `list-${Date.now()}-${Math.random()}`;
              vscodeApi.postMessage({
                command: "listFiles",
                path: action.params.path,
                recursive: action.params.recursive, // Pass as is (string or boolean)
                type: action.params.type,
                requestId: requestId,
              });

              const handleListResponse = (event: MessageEvent) => {
                const msg = event.data;
                if (
                  msg.command === "listFilesResult" &&
                  msg.requestId === requestId
                ) {
                  window.removeEventListener("message", handleListResponse);
                  if (msg.error) {
                    const errorMsg: Message = {
                      id: `msg-${Date.now()}-error`,
                      role: "assistant",
                      content: `❌ Error listing files: ${msg.error}`,
                      timestamp: Date.now(),
                    };
                    setMessages((prev) => [...prev, errorMsg]);
                    resolve(
                      `[list_files for '${action.params.path}'] Result: Error - ${msg.error}`
                    );
                  } else {
                    resolve(
                      `[list_files for '${action.params.path}'] Result:\n\`\`\`\n${msg.files}\n\`\`\``
                    );
                  }
                }
              };
              window.addEventListener("message", handleListResponse);
              setTimeout(() => {
                window.removeEventListener("message", handleListResponse);
                resolve(null);
              }, 10000);
              break;
            }

            case "search_files": {
              const requestId = `search-${Date.now()}-${Math.random()}`;
              vscodeApi.postMessage({
                command: "searchFiles",
                path: action.params.path,
                regex: action.params.regex,
                filePattern: action.params.filePattern,
                requestId: requestId,
              });

              const handleSearchResponse = (event: MessageEvent) => {
                const msg = event.data;
                if (
                  msg.command === "searchFilesResult" &&
                  msg.requestId === requestId
                ) {
                  window.removeEventListener("message", handleSearchResponse);
                  if (msg.error) {
                    const errorMsg: Message = {
                      id: `msg-${Date.now()}-error`,
                      role: "assistant",
                      content: `❌ Error searching files: ${msg.error}`,
                      timestamp: Date.now(),
                    };
                    setMessages((prev) => [...prev, errorMsg]);
                    resolve(
                      `[search_files for '${action.params.path}'] Result: Error - ${msg.error}`
                    );
                  } else {
                    resolve(
                      `[search_files for '${action.params.path}'] Result:\n\`\`\`\n${msg.results}\n\`\`\``
                    );
                  }
                }
              };
              window.addEventListener("message", handleSearchResponse);
              setTimeout(() => {
                window.removeEventListener("message", handleSearchResponse);
                resolve(null);
              }, 10000);
              break;
            }

            case "execute_command": {
              // execute_command typically doesn't wait for output in this implementation
              // or it might send output via a specific channel?
              // Original code just posted 'executeCommand' and broke.
              // We'll preserve that behavior.
              commandStartTimes.current.set(
                (action as any).actionId,
                Date.now()
              );

              vscodeApi.postMessage({
                command: "executeCommand",
                commandText: action.params.command,
                actionId: (action as any).actionId,
              });

              // Blocking wait for command execution
              pendingToolResolvers.current.set(
                (action as any).actionId,
                resolve
              );
              // Fallback safety timeout? (optional, user can kill/detach)
              break;
            }

            case "update_codebase_context": {
              vscodeApi.postMessage({
                command: "saveProjectContext",
                context: action.params,
              });
              // Return success message to the AI
              resolve(
                `[update_codebase_context] Success: Project context updated.`
              );
              break;
            }

            default:
              console.warn(`[ChatPanel] Unknown tool type: ${action.type}`);
              resolve(null);
          }
        });
      };

      // 3. Execute all actions sequentially
      const validResults: string[] = [];

      // Reset execution state
      setExecutionState({
        total: actions.length,
        completed: 0,
        status: "running",
      });

      for (const [index, action] of actions.entries()) {
        // Optimization: Skip diagnostics for intermediate edits to the same file
        const isEditAction =
          action.type === "replace_in_file" || action.type === "write_to_file";
        let skipDiagnostics = false;

        if (isEditAction) {
          const currentPath = action.params.path;
          // Check if there's a subsequent edit to the same file in this batch
          const subsequentActions = actions.slice(index + 1);
          const hasMoreEditsToSameFile = subsequentActions.some(
            (a) =>
              (a.type === "replace_in_file" || a.type === "write_to_file") &&
              a.params.path === currentPath
          );

          if (hasMoreEditsToSameFile) {
            skipDiagnostics = true;
          }
        }

        const result = await executeSingleAction(action, skipDiagnostics);

        if (result !== null) {
          validResults.push(result);
          // Update completed count
          setExecutionState((prev) => ({
            ...prev,
            completed: prev.completed + 1,
            // If all done, status done (handled after loop or here check)
          }));

          // Notify UI to mark this specific action as clicked or failed
          const actionId = `${message.id}-action-${action._index}`;

          if (result.includes("Result: Error")) {
            window.postMessage(
              {
                command: "markActionFailed",
                actionId: actionId,
              },
              "*"
            );
          } else {
            window.postMessage(
              {
                command: "markActionClicked",
                actionId: actionId,
              },
              "*"
            );
          }

          setClickedActions((prev) => new Set(prev).add(actionId));
        } else {
          console.warn(
            `[ChatPanel] Unexpected failure. Stopping batch execution.`
          );
          setExecutionState((prev) => ({ ...prev, status: "error" }));
          break;
        }
      }

      setExecutionState((prev) => {
        if (prev.status === "error") return prev;
        return { ...prev, status: "done" };
      });

      setToolResultsBuffer((prev: Record<string, string[]>) => {
        const currentBuffer = prev[message.id] || [];
        const newBuffer = [...currentBuffer, ...validResults];
        const nextBuffer = { ...prev, [message.id]: newBuffer };

        // If we stopped due to error (validResults < actions.length), we MUST flush immediately.
        if (validResults.length < actions.length) {
          const textActionIds = actions.map(
            (a) => `${message.id}-action-${a._index}`
          );
          handleSendMessage(
            newBuffer.join("\n\n"),
            undefined,
            undefined,
            true,
            textActionIds
          );
          return { ...prev, [message.id]: [] }; // Clear buffer after sending
        }

        const newlyClickedIndices = actions.map((a) => a._index);
        const fullMsg = parsedMessages.find((m) => m.id === message.id);
        const actualTotal = fullMsg?.parsed?.actions?.length || 0;
        const allRelevantIndices = Array.from(Array(actualTotal).keys());
        const isComplete = allRelevantIndices.every(
          (idx) =>
            clickedActions.has(`${message.id}-action-${idx}`) ||
            newlyClickedIndices.includes(idx)
        );

        if (isComplete) {
          const textActionIds = actions.map(
            (a) => `${message.id}-action-${a._index}`
          );

          setTimeout(() => {
            handleSendMessage(
              newBuffer.join("\n\n"),
              undefined,
              undefined,
              true,
              textActionIds
            );
            // ... create checkpoint ...
            const vscodeApi = (window as any).vscodeApi;
            if (vscodeApi) {
              vscodeApi.postMessage({
                command: "createCheckpoint",
                type: "incremental",
                messageId: message.id,
              });
            }
          }, 0);
          return { ...prev, [message.id]: [] };
        } else {
          // Not complete. Buffer and wait.
          return nextBuffer;
        }
      });
    },
    [currentConversationId, handleSendMessage, clickedActions, parsedMessages]
  );

  // 🆕 Handler cho Clear Chat
  const handleClearChat = useCallback(async () => {
    // 🆕 Handle Claude CLI reset
    if (selectedTab.provider === "claude-cli") {
      if (!selectedTab.accountId) {
        console.error(
          "[ChatPanel] Cannot clear chat: No accountId for Claude CLI"
        );
        return;
      }

      try {
        setIsProcessing(true); // Show loading state if needed, or just block interactions
        const { conversationId } = await createNewConversation(
          selectedTab.accountId
        );

        // Reset state
        setMessages([]);
        setIsFirstRequest(true);
        setCurrentConversationId(conversationId);
      } catch (error) {
        console.error("[ChatPanel] Failed to create new conversation:", error);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    const vscodeApi = (window as any).vscodeApi;
    if (vscodeApi) {
      vscodeApi.postMessage({
        command: "confirmClearChat",
        conversationId: currentConversationId,
      });
    } else {
      // Fallback
      await deleteConversation(
        selectedTab.tabId,
        selectedTab.folderPath || null,
        currentConversationId
      );
      setMessages([]);
      setIsFirstRequest(true);
      setIsProcessing(false);
      setCurrentConversationId(Date.now().toString());
    }
  }, [
    selectedTab.tabId,
    selectedTab.folderPath,
    currentConversationId,
    selectedTab.provider,
    selectedTab.accountId,
  ]);

  // 🆕 Listen for clear chat confirmation
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;

      // Handle clear chat confirmation
      if (
        message.command === "clearChatConfirmed" &&
        message.conversationId === currentConversationId
      ) {
        deleteConversation(
          selectedTab.tabId,
          selectedTab.folderPath || null,
          currentConversationId
        ).then(() => {
          setMessages([]);
          setIsFirstRequest(true);
          setIsProcessing(false);
          setCurrentConversationId(Date.now().toString());
        });
      }

      // Handle checkpoint created from extension
      if (message.command === "checkpointCreated") {
        setCheckpoint(message.checkpoint);
      }

      // Handle checkpoint updated with post-edit content
      if (message.command === "checkpointUpdated") {
        setCheckpoint(message.checkpoint);
      }

      // Handle revert success
      if (message.command === "revertSuccess") {
        // Remove action from clickedActions to show button again
        if (message.actionId) {
          // Trigger ChatBody to remove from clickedActions
          window.postMessage(
            {
              command: "removeClickedAction",
              actionId: message.actionId,
            },
            "*"
          );

          // Also update local clickedActions
          setClickedActions((prev) => {
            const next = new Set(prev);
            next.delete(message.actionId);
            return next;
          });
        }

        // Remove all messages after the checkpoint's messageId
        if (message.messageId) {
          setMessages((prevMessages) => {
            // Find the index of the message containing the checkpoint
            const checkpointMessageIndex = prevMessages.findIndex(
              (msg) => msg.id === message.messageId
            );

            if (checkpointMessageIndex !== -1) {
              // Keep only messages up to and including the checkpoint message
              const newMessages = prevMessages.slice(
                0,
                checkpointMessageIndex + 1
              );
              return newMessages;
            }

            return prevMessages;
          });
        }

        // Clear checkpoint after revert
        setCheckpoint(null);
      }

      // Handle revert error
      if (message.command === "revertError") {
        console.error("[ChatPanel] Revert failed:", message.error);
        // Optionally show error notification
      }

      // Handle commandExecuted message from extension
      if (message.command === "commandExecuted") {
        // 🛑 This is legacy logic that causes duplication.
        // Logic moved to pendingToolResolvers and handleToolRequest.
        // Commenting out to fix double-request issue.
        /*
        // Build follow-up prompt with actual output
        const output = message.output || "No output";
        const error = message.error || null;

        let followUpPrompt = `[execute_command for '${message.commandText}'] Result:\nCommand executed.\n`;
        if (error) {
          followUpPrompt += `Error: ${error}\n`;
        }
        followUpPrompt += `Output:\n${output}`;
        handleSendMessage(
          followUpPrompt,
          undefined,
          undefined,
          true,
          message.actionId ? [message.actionId] : undefined
        );
        */
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [
    currentConversationId,
    selectedTab.tabId,
    selectedTab.folderPath,
    handleSendMessage,
  ]);

  const handleExecutePendingBatch = useCallback(() => {
    for (let i = parsedMessages.length - 1; i >= 0; i--) {
      const msg = parsedMessages[i];
      if (msg.role === "assistant" && msg.parsed.actions.length > 0) {
        const unclickedActions = msg.parsed.actions
          .map((action: any, index: number) => ({ ...action, _index: index }))
          .filter(
            (action: any) =>
              !clickedActions.has(`${msg.id}-action-${action._index}`)
          );

        if (unclickedActions.length > 0) {
          handleToolRequest(unclickedActions, msg);
          return true;
        }
      }
    }
    console.warn("[ChatPanel] No pending batch found to execute.");
    return false;
  }, [parsedMessages, clickedActions, handleToolRequest]);

  // 🆕 Check for any pending actions to control "Run All" visibility
  const hasPendingActions = React.useMemo(() => {
    return parsedMessages.some((msg) => {
      if (msg.role !== "assistant" || !msg.parsed?.actions?.length)
        return false;
      // Check if any action in this message is NOT clicked
      return msg.parsed.actions.some(
        (_: any, index: number) =>
          !clickedActions.has(`${msg.id}-action-${index}`)
      );
    });
  }, [parsedMessages, clickedActions]);

  // 🆕 Handle Execute All
  const handleExecuteAll = useCallback(() => {
    setIsAutoExecutingAll(true);
    handleExecutePendingBatch();
  }, [handleExecutePendingBatch]);

  // 🆕 Effect loop for Auto-Execute
  useEffect(() => {
    if (isAutoExecutingAll && executionState.status === "done") {
      // Small delay to allow state updates
      const timer = setTimeout(() => {
        const didExecute = handleExecutePendingBatch();
        if (!didExecute) {
          // Nothing left to execute
          setIsAutoExecutingAll(false);
        }
      }, 500);
      return () => clearTimeout(timer);
    } else if (isAutoExecutingAll && executionState.status === "error") {
      // Stop on error
      setIsAutoExecutingAll(false);
    }
  }, [isAutoExecutingAll, executionState.status, handleExecutePendingBatch]);

  // 🆕 Helper to build file tree from flat paths
  // 🆕 Helper to build file tree from flat paths
  const buildFileTree = useCallback(
    (
      files: { [path: string]: { size: number } },
      changes?: {
        [path: string]: {
          status: "added" | "modified" | "deleted";
          additions: number;
          deletions: number;
        };
      }
    ) => {
      const filePaths = changes ? Object.keys(changes) : Object.keys(files);

      const effectiveFiles: { [path: string]: { size: number } } = {};

      filePaths.forEach((p) => {
        if (files[p]) {
          effectiveFiles[p] = files[p];
        } else if (changes && changes[p]?.status === "deleted") {
          effectiveFiles[p] = { size: 0 };
        }
      });

      const root: FileNode = {
        name: ".",
        path: ".",
        type: "folder",
        size: 0,
        children: [],
      };

      Object.keys(effectiveFiles).forEach((filePath) => {
        const parts = filePath.split("/");
        const size = effectiveFiles[filePath].size;

        let current = root;

        parts.forEach((part, index) => {
          const isLast = index === parts.length - 1;
          const existing = current.children?.find((c: any) => c.name === part);

          if (existing) {
            current = existing;
          } else {
            // 🆕 Correctly access change info map
            const changeInfo = changes ? changes[filePath] : undefined;
            const newNode: FileNode = {
              name: part,
              path: parts.slice(0, index + 1).join("/"),
              type: isLast ? "file" : "folder",
              size: isLast ? size : 0, // CORRECTED: use 'size' not 'info.size'
              status: isLast && changeInfo ? changeInfo.status : undefined,
              additions:
                isLast && changeInfo ? changeInfo.additions : undefined,
              deletions:
                isLast && changeInfo ? changeInfo.deletions : undefined,
              children: isLast ? undefined : [],
            };
            current.children = current.children || [];
            current.children.push(newNode);
            current = newNode;
          }
        });
      });

      const calcSizeAndStatus = (node: FileNode): number => {
        if (node.type === "file") return node.size;
        if (node.children) {
          node.size = node.children.reduce(
            (sum: number, child: FileNode) => sum + calcSizeAndStatus(child),
            0
          );
        }
        return node.size;
      };
      calcSizeAndStatus(root);

      return root;
    },
    []
  );

  const firstRequestMessage =
    messages.find((m) => m.isFirstRequest) ||
    messages.find((m) => m.role === "user" && !m.isToolRequest);

  const allTaskProgress = React.useMemo(() => {
    for (let i = parsedMessages.length - 1; i >= 0; i--) {
      const msg = parsedMessages[i];
      if (msg.parsed.taskProgress && msg.parsed.taskProgress.length > 0) {
        return msg.parsed.taskProgress;
      }
      const actionProgress = msg.parsed.actions.flatMap(
        (action: any) => action.taskProgress || []
      );
      if (actionProgress.length > 0) {
        return actionProgress;
      }
    }
    return [];
  }, [parsedMessages]);

  return (
    <div className="chat-panel">
      <ChatHeader
        selectedTab={selectedTab}
        onBack={onBack}
        onClearChat={handleClearChat}
        isLoadingConversation={isLoadingConversation}
        // Use the calculated firstRequestMessage
        firstRequestMessage={firstRequestMessage}
        allTaskProgress={allTaskProgress}
        contextUsage={contextUsage}
      />
      <ChatBody
        messages={messages}
        isProcessing={isProcessing}
        checkpoints={checkpoints}
        checkpoint={checkpoint}
        onSendToolRequest={handleToolRequest}
        onSendMessage={handleSendMessage}
        onRevertCheckpoint={(id) => setRevertingCheckpointId(id)}
        onViewCheckpoint={(id) => setViewingCheckpointId(id)}
        agentOptions={agentOptions}
        executionState={executionState}
        toolOutputs={toolOutputs}
        firstRequestMessageId={firstRequestMessage?.id}
      />
      <ChatFooter
        onSendMessage={handleSendMessage}
        wsConnected={wsConnected}
        onWsMessage={onWsMessage}
        wsInstance={wsInstance}
        isHistoryMode={isHistoryMode}
        agentOptions={agentOptions}
        onAgentOptionsChange={handleAgentOptionsChange}
        messages={messages}
        executionState={executionState}
        onExecutePendingBatch={handleExecutePendingBatch}
        onExecuteAll={handleExecuteAll}
        isAutoExecutingAll={isAutoExecutingAll}
        hasPendingActions={hasPendingActions}
        lastCheckpointId={(() => {
          const lastCheckpointMsg = [...messages]
            .reverse()
            .find((m) => m.role === ("system-checkpoint" as any));
          return lastCheckpointMsg?.checkpointData?.id;
        })()}
      />

      {/* Checkpoint Warning Drawer */}
      {showCheckpointWarning && checkpointTree && (
        <CheckpointWarningDrawer
          tree={checkpointTree}
          onConfirm={() => {
            setShowCheckpointWarning(false);
            const vscodeApi = (window as any).vscodeApi;
            if (vscodeApi) {
              vscodeApi.postMessage({
                command: "createCheckpoint",
                type: "full",
                messageId: "init",
              });
            }
          }}
          onCancel={() => {
            setShowCheckpointWarning(false);
          }}
        />
      )}
      {/* Checkpoint Details Drawer */}
      {viewingCheckpointId && (
        <CheckpointDetailsDrawer
          isOpen={!!viewingCheckpointId}
          onClose={() => setViewingCheckpointId(null)}
          checkpointId={viewingCheckpointId}
          tree={(() => {
            // Configure tree on the fly
            const msg = messages.find(
              (m) => m.checkpointData?.id === viewingCheckpointId
            );
            if (msg?.checkpointData?.files) {
              return buildFileTree(
                msg.checkpointData.files,
                msg.checkpointData.changes
              );
            }
            return {
              name: "root",
              path: ".",
              type: "folder",
              children: [],
              size: 0,
            };
          })()}
          totalSize={(() => {
            const msg = messages.find(
              (m) => m.checkpointData?.id === viewingCheckpointId
            );
            return msg?.checkpointData?.totalSize || 0;
          })()}
        />
      )}

      {/* Revert Confirm Dialog */}
      <RevertConfirmDialog
        isOpen={!!revertingCheckpointId}
        checkpointId={revertingCheckpointId || ""}
        onClose={() => setRevertingCheckpointId(null)}
        onConfirm={(options) => {
          const vscodeApi = (window as any).vscodeApi;
          if (vscodeApi && revertingCheckpointId) {
            vscodeApi.postMessage({
              command: "restoreCheckpoint",
              checkpointId: revertingCheckpointId,
              restoreChat: options.restoreChat,
              restoreFilesMode: options.restoreFilesMode,
            });
          }
          setRevertingCheckpointId(null);
        }}
      />
    </div>
  );
};

export default ChatPanel;
