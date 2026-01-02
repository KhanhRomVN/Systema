import { useEffect, useState, useRef, useCallback } from 'react';
import { ChatHeader } from './components/ChatHeader';
import { ChatBody, Message } from './components/ChatBody';
import { ChatFooter } from './components/ChatFooter';
import { InspectorContext } from '../ChatContainer';
import { parseAIResponse, ToolAction } from '../../../../services/ResponseParser';
import { executeTool } from './services/ToolExecutor';
import { ChatStorage } from '../../../../services/ChatStorage';
import { combinePrompts } from '../../components/SettingsPanel/prompts'; // Import Systema Prompts
import { AgentOptionDrawer, ToolPermission } from './components/AgentOptionDrawer';

interface ChatPanelProps {
  sessionId: string;
  title?: string;
  provider?: string;
  initialConversationId?: string;
  onBack: () => void;
  inspectorContext: InspectorContext;
}

export function ChatPanel({
  sessionId,
  title,
  provider,
  initialConversationId,
  onBack,
  inspectorContext,
}: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRef = useRef(isProcessing);

  // Agent Options
  const [showAgentOptions, setShowAgentOptions] = useState(false);
  const [toolPermissions, setToolPermissions] = useState<Record<string, ToolPermission>>({});

  // Sync ref
  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  const [currentConversationId, setCurrentConversationId] = useState<string>(
    initialConversationId || Date.now().toString(),
  );

  // Zen State Ports
  const currentRequestIdRef = useRef<string | null>(null);
  const toolResultsBufferRef = useRef<Record<string, string[]>>({});
  // const [clickedActions, setClickedActions] = useState<Set<string>>(new Set()); // Not used yet
  const [isFirstRequest, setIsFirstRequest] = useState(true);

  // Restore history logic (Persistence)
  useEffect(() => {
    // Only load if we were provided a conversation ID (resuming)
    // If it's a new chat (no initial ID), we start empty.
    if (initialConversationId) {
      const savedMessages = ChatStorage.loadMessages(initialConversationId);
      if (savedMessages.length > 0) {
        setMessages(savedMessages);
        setIsFirstRequest(false); // Valid history means not first request
      }
    } else {
      setMessages([]);
      setIsFirstRequest(true);
    }
  }, [initialConversationId]);

  // Save messages whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      ChatStorage.saveMessages(currentConversationId, messages);
      // Also update session history list
      ChatStorage.saveSessionToHistory({
        id: currentConversationId,
        title: messages[0].content.slice(0, 50) || 'Chat Session',
        timestamp: Date.now(),
        messageCount: messages.length,
        preview: messages[messages.length - 1].content.slice(0, 100),
        status: 'free',
        provider: provider || 'deepseek',
        containerName: 'Container #01',
        conversationId: currentConversationId,
      });
    }
  }, [messages, currentConversationId, provider]);

  // Listen for WS messages
  useEffect(() => {
    // @ts-ignore
    const ipc = window.electron?.ipcRenderer;
    if (!ipc) return;

    const handleWsEvent = (_: any, { type, data }: any) => {
      // Handle Zen-compatible message types
      if (type === 'message') {
        const wsData = data;

        // 1. Conversation Heartbeat
        if (wsData.type === 'conversationPing') {
          // Echo back the data to keep session alive
          ipc.invoke('ws:send', {
            type: 'conversationPong',
            timestamp: Date.now(),
            tabId: wsData.tabId,
            conversationId: wsData.conversationId,
            requestId: wsData.requestId,
            folderPath: wsData.folderPath,
          });
          return;
        }

        // 2. Prompt Response
        if (wsData.type === 'promptResponse') {
          // Validate input request ID to ensure we are processing the correct response
          if (currentRequestIdRef.current && wsData.requestId !== currentRequestIdRef.current) {
            console.warn('[ChatPanel] Mismatched requestId. Ignoring.', {
              expected: currentRequestIdRef.current,
              received: wsData.requestId,
            });
            return;
          }

          // Guard: Only process if we are expecting a response
          if (!isProcessingRef.current) {
            console.warn(
              '[ChatPanel] Received promptResponse but not processing. Ignoring duplicate.',
              wsData,
            );
            return;
          }

          // IMPORTANT: Update ref IMMEDIATELY to prevent race condition if second event comes fast
          isProcessingRef.current = false;
          setIsProcessing(false);

          // Clear Timeout
          const timeoutId = (window as any).__chatTimeoutId;
          if (timeoutId) clearTimeout(timeoutId);

          let content = '';
          if (wsData.success && wsData.response) {
            // Try parsing if it looks like JSON from OpenAI format
            try {
              const parsed = JSON.parse(wsData.response);
              // Handle both direct content and OpenAI choices format
              content = parsed.content || parsed.choices?.[0]?.delta?.content || wsData.response;
            } catch (e) {
              content = wsData.response;
            }

            // Smart Parsing
            const parsedContent = parseAIResponse(content);

            const aiMsg: Message = {
              id: `msg-${Date.now()}-assistant`,
              role: 'assistant',
              content: content,
              parsed: parsedContent,
              timestamp: Date.now(),
              // Systema extras
              timestampStr: new Date().toLocaleTimeString(),
            };
            setMessages((prev) => [...prev, aiMsg]);

            // Auto-Execute Tools
            parsedContent.actions.forEach(async (action: ToolAction) => {
              // Permission Check
              const permission = toolPermissions[action.type] || 'off'; // Default 'off'

              if (permission === 'always') {
                const result = await executeTool(action, inspectorContext);
                const toolOutput = `Tool Output [${action.type}]:\n${result}`;

                // Add result message to UI
                const toolMsg: Message = {
                  id: `msg-${Date.now()}-tool-${action.type}`,
                  role: 'system',
                  content: toolOutput,
                  timestamp: Date.now(),
                  timestampStr: new Date().toLocaleTimeString(),
                };
                setMessages((prev) => [...prev, toolMsg]);

                // Basic buffering
                const msgId = aiMsg.id;
                if (!toolResultsBufferRef.current[msgId]) {
                  toolResultsBufferRef.current[msgId] = [];
                }
                toolResultsBufferRef.current[msgId].push(toolOutput);
              }
              // If OFF or AUTO, do nothing. User will execute manually via UI.
            });
          } else {
            // Error case
            const errorMsg: Message = {
              id: `msg-${Date.now()}-error`,
              role: 'assistant',
              content: `❌ Error: ${wsData.error || 'Unknown error'}`,
              timestamp: Date.now(),
              timestampStr: new Date().toLocaleTimeString(),
            };
            setMessages((prev) => [...prev, errorMsg]);
          }
        }
      }
    };

    const removeListener = ipc.on('ws:event', handleWsEvent);

    return () => {
      removeListener();
    };
  }, [inspectorContext, toolPermissions]);

  const handleSend = useCallback(
    async (
      content: string,
      files?: any[],
      skippedActionIds?: string[], // Future proofing
    ) => {
      // 1. Prepare Content & Consume Buffer
      let finalContent = content;
      const bufferedContent: string[] = [];

      // Check if we have buffered tool outputs
      if (!isFirstRequest && !skippedActionIds) {
        Object.entries(toolResultsBufferRef.current).forEach(([msgId, results]) => {
          if (results && results.length > 0) {
            bufferedContent.push(...results);
            // Clear buffer
            toolResultsBufferRef.current[msgId] = [];
          }
        });

        if (bufferedContent.length > 0) {
          const toolOutput = bufferedContent.join('\n\n');
          finalContent = content ? `${toolOutput}\n\n${content}` : toolOutput;
        }
      }

      // 2. Validation
      // Allow if content exists OR we have buffered tool output
      if (!finalContent.trim() && (!files || files.length === 0)) return;
      if (isProcessing) return;

      const requestId = `req-${Date.now()}`;
      currentRequestIdRef.current = requestId;

      let systemPrompt: string | null = null;
      const originalUserMessage = content; // UI displays only what user typed (could be empty for auto-tool)

      // 2. Strict Prompt Construction (First Request)
      if (isFirstRequest) {
        try {
          // Use targetApp from context, or fallback to provider if missing (though strictly should be from context now)
          const targetApp = inspectorContext.targetApp || provider;
          systemPrompt = combinePrompts(targetApp);
        } catch (e) {
          console.error('[ChatPanel] Failed to load system prompt:', e);
        }
      }

      // 3. Local Context Injection (Mocking Zen's Context Request)
      // Systema uses InspectorContext
      let contextString = '';
      if (inspectorContext.selectedRequestId) {
        const req = inspectorContext.requests.find(
          (r) => r.id === inspectorContext.selectedRequestId,
        );
        if (req) {
          contextString = `\n\n[Context: Selected Request]\nMethod: ${req.method}\nURL: ${req.host}${req.path}\nStatus: ${req.status}\nHeaders: ${JSON.stringify(req.requestHeaders)}`;
        }
      }

      // Inject Active Filters (First Request Only)
      if (isFirstRequest) {
        try {
          const filterConfig = await executeTool(
            { type: 'get_active_filters', params: {}, rawXml: '' },
            inspectorContext,
          );
          contextString += `\n\n## Active Filters\n${filterConfig}`;
        } catch (e) {
          console.warn('Failed to inject active filters', e);
        }
      }

      if (isFirstRequest) {
      }

      let fullPromptForAI = finalContent;

      if (isFirstRequest) {
        fullPromptForAI = `${systemPrompt ? systemPrompt + '\n\n' : ''}${contextString ? contextString + '\n\n' : ''}User Request: ${finalContent}`;
      } else {
        // Subsequent requests: just content + context if any
        fullPromptForAI = contextString ? `${finalContent}\n\n${contextString}` : finalContent;
      }

      // 4. Update UI
      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: originalUserMessage, // Display what user typed
        fullPrompt: fullPromptForAI, // 🆕 Attach Full Prompt
        timestamp: Date.now(),
        // Systema extras
        timestampStr: new Date().toLocaleTimeString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setIsProcessing(true);

      const sendPromptMessage = {
        type: 'sendPrompt',
        tabId: parseInt(sessionId, 10) || 1,
        prompt: fullPromptForAI,
        requestId: requestId,
        isNewTask: isFirstRequest,
        folderPath: null,
        conversationId: currentConversationId,
        containerName: 'Container #01',
        timestamp: Date.now(),
        files: files || [],
      };

      // 6. Send
      // @ts-ignore
      const ipc = window.electron?.ipcRenderer;
      if (ipc) {
        ipc.invoke('ws:send', sendPromptMessage);
      }

      if (isFirstRequest) setIsFirstRequest(false);

      // 7. Timeout Logic (15m)
      const timeoutId = setTimeout(() => {
        setIsProcessing((current) => {
          if (current) {
            const timeoutMsg: Message = {
              id: `msg-${Date.now()}-timeout`,
              role: 'assistant',
              content: '⏱️ Timeout: No response after 15 minutes.',
              timestamp: Date.now(),
            };
            setMessages((p) => [...p, timeoutMsg]);
            return false;
          }
          return current;
        });
      }, 900000); // 15 mins

      // Save timeout ID to clear later (using window hack or ref?)
      // Zen uses window hack, let's use Ref if possible, but cleaner to just let it run check.
      // We will clear it in useEffect when response comes.
      // Actually, standard way:
      (window as any).__chatTimeoutId = timeoutId;
    },
    [
      inspectorContext,
      isFirstRequest,
      sessionId,
      currentConversationId,
      isProcessing,
      toolPermissions,
    ],
  );

  const handleManualExecute = useCallback(
    async (action: ToolAction, msgId: string, blockIndex: number) => {
      try {
        const result = await executeTool(action, inspectorContext);
        const toolOutput = `Tool Output [${action.type}]:\n${result}`;

        // Buffer with message-specific key
        const bufferKey = `msg-${msgId}`;
        if (!toolResultsBufferRef.current[bufferKey]) {
          toolResultsBufferRef.current[bufferKey] = [];
        }
        toolResultsBufferRef.current[bufferKey].push(toolOutput);

        // Update local state to mark tool as executed
        let isSequenceComplete = false;

        setMessages((prev) =>
          prev.map((m) => {
            if (m.id === msgId && m.parsed) {
              const currentIndices = m.executedToolIndices || [];
              if (!currentIndices.includes(blockIndex)) {
                const newIndices = [...currentIndices, blockIndex];

                // Check completeness
                const totalTools = m.parsed.contentBlocks.filter((b) => b.type === 'tool').length;
                if (newIndices.length >= totalTools) {
                  isSequenceComplete = true;
                }

                return { ...m, executedToolIndices: newIndices };
              }
            }
            return m;
          }),
        );

        // Only send if sequence is complete
        // Note: setMessages is async-like, but we calculated isSequenceComplete based on logic that matches the update.
        // However, we need to be careful. The `isSequenceComplete` flag inside map might not escape scope easily if we didn't use a var.
        // Actually, simpler: calculate it from 'messages' (current state) + 1.

        const targetMsg = messages.find((m) => m.id === msgId);
        if (targetMsg?.parsed) {
          const totalTools = targetMsg.parsed.contentBlocks.filter((b) => b.type === 'tool').length;
          const executedCount = (targetMsg.executedToolIndices?.length || 0) + 1; // +1 for current
          if (executedCount >= totalTools) {
            handleSend('');
          }
        }
      } catch (e) {
        console.error('Manual tool execution failed', e);
      }
    },
    [inspectorContext, handleSend, messages],
  );

  const handlePreviewExecute = useCallback(
    async (action: ToolAction): Promise<string | null> => {
      try {
        // Just execute and return result, don't add to chat history
        const result = await executeTool(action, inspectorContext);
        return result;
      } catch (e) {
        console.error('Preview execution failed', e);
        return `Error: ${e instanceof Error ? e.message : String(e)}`;
      }
    },
    [inspectorContext],
  );

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setIsFirstRequest(true);
    setCurrentConversationId(Date.now().toString());
  }, []);

  return (
    <div className="relative flex flex-col h-full bg-background border-l border-border transition-all duration-300">
      <ChatHeader
        sessionId={sessionId}
        title={title}
        provider={provider}
        onBack={onBack}
        onNewChat={handleNewChat}
        onSettings={() => setShowAgentOptions(true)}
        onHistory={onBack}
      />

      <ChatBody
        messages={messages}
        isProcessing={isProcessing}
        onExecuteTool={handleManualExecute}
        onPreviewTool={handlePreviewExecute}
      />

      <ChatFooter
        input={input}
        setInput={setInput}
        onSend={() => handleSend(input)}
        isProcessing={isProcessing}
        onOpenAgentOptions={() => setShowAgentOptions(true)}
      />

      <AgentOptionDrawer
        isOpen={showAgentOptions}
        onClose={() => setShowAgentOptions(false)}
        permissions={toolPermissions}
        onPermissionChange={(tool, val) => setToolPermissions((prev) => ({ ...prev, [tool]: val }))}
      />
    </div>
  );
}
