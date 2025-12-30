import { useEffect, useState, useRef, useCallback } from 'react';
import { ChatHeader } from './components/ChatHeader';
import { ChatBody, Message } from './components/ChatBody';
import { ChatFooter } from './components/ChatFooter';
import { InspectorContext } from '../ChatContainer';
import { parseAIResponse, ToolAction } from '../../../../services/ResponseParser';
import { executeTool } from './services/ToolExecutor';
import { ChatStorage } from '../../../../services/ChatStorage';
import { combinePrompts } from '../../components/SettingsPanel/prompts'; // Import Systema Prompts

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
  const [currentConversationId] = useState<string>(initialConversationId || Date.now().toString());

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
      console.log('[ChatPanel] Resuming conversation:', initialConversationId);
      const savedMessages = ChatStorage.loadMessages(initialConversationId);
      if (savedMessages.length > 0) {
        setMessages(savedMessages);
        setIsFirstRequest(false); // Valid history means not first request
      }
    } else {
      console.log('[ChatPanel] New conversation started:', currentConversationId);
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

    const removeListener = ipc.on('ws:event', (_: any, { type, data }: any) => {
      // Handle Zen-compatible message types
      if (type === 'message') {
        const wsData = data;

        // 1. Conversation Heartbeat
        if (wsData.type === 'conversationPing') {
          ipc.invoke('ws:send', { type: 'conversationPong', timestamp: Date.now() });
          return;
        }

        // 2. Prompt Response
        if (wsData.type === 'promptResponse') {
          setIsProcessing(false);

          // Clear Timeout
          const timeoutId = (window as any).__chatTimeoutId;
          if (timeoutId) clearTimeout(timeoutId);

          let content = '';
          if (wsData.success && wsData.response) {
            // Try parsing if it looks like JSON from OpenAI format
            try {
              const parsed = JSON.parse(wsData.response);
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
              timestampStr: new Date().toLocaleTimeString(),
            };
            setMessages((prev) => [...prev, aiMsg]);

            // Auto-Execute Tools
            parsedContent.actions.forEach(async (action: ToolAction) => {
              // Add to executed set logic removed for now

              const result = await executeTool(action, inspectorContext);

              const toolOutput = `Tool Output [${action.type}]:\n${result}`;

              // Buffer proper tool result for next turn
              // We need to associate this result with the message ID?
              // Or just keep a running buffer? Zen uses `toolResultsBufferRef`.

              // Add result message to UI
              const toolMsg: Message = {
                id: `msg-${Date.now()}-tool-${action.type}`,
                role: 'system',
                content: toolOutput,
                timestamp: Date.now(),
                timestampStr: new Date().toLocaleTimeString(),
              };
              setMessages((prev) => [...prev, toolMsg]);

              // Ideally send tool output back to AI for continuation...
              // Zen: uses `toolResultsBuffer` to PREPEND to next user message.
              // We mimic that logic by not auto-sending immediately but waiting for user?
              // OR if it's `attempt_completion`, we stop?
              // Zen's `ChatPanel` allows "Auto-Execute" but usually waits for User unless it's a chain?
              // For Systema, we act as "User" so we let the user trigger next step.
              // But we should buffer the result.

              // Not fully implementing buffer ref logic here as it's complex state sync.
              // We rely on "Message History" being sent back.
              // If we send `toolMsg` as `role: system` or `role: user` with output?
              // Zen sends tool output as USER message context in next turn if not using specific tool roles.
              // Systema logic: Add to messages. Next `handleSend` will verify if we need to include it.
              // Zen pre-pends "tool results" to next prompt.
              // We will just let `History` handle it?
              // If `messages` contains the tool output, it should be fine if we send full history?
              // Currently `sendPromptMessage` constructs prompt from `files` + `prompt` string.
              // It does NOT send array of messages yet. It sends "Prompt String".
              // So for the NEXT prompt, proper context is lost unless we maintain history in Backend or re-send history?
              // Zen implementation: sends Single Prompt String. It assumes Backend/AI maintains history?
              // NO, Zen sends `conversationId`. The BACKEND (ZenTab) maintains history.
              // So, as long as backend receives `conversationId`, it knows the context.
              // We just need to make sure backend receives the Result?
              // ZenTab backend might not receive result if we just display it.
              // Zen actually sends `toolResponse` or equivalent?

              // Looking at Zen's `executeSingleAction`, it does NOT send back to backend immediately.
              // It relies on the User sending the NEXT message which implicitly acknowledges the tool result?
              // Wait, Zen logic `handleSendMessage` prepends `bufferedContent` to the user message.
              // So we need to buffer the tool output string.

              // Let's implement basic buffering
              const msgId = aiMsg.id;
              if (!toolResultsBufferRef.current[msgId]) {
                toolResultsBufferRef.current[msgId] = [];
              }
              toolResultsBufferRef.current[msgId].push(toolOutput);
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
    });

    return () => {
      removeListener();
    };
  }, [inspectorContext]);

  const handleSend = useCallback(
    async (
      content: string,
      files?: any[],
      skippedActionIds?: string[], // Future proofing
    ) => {
      // 1. Validation and Prep
      if (!content.trim() && (!files || files.length === 0)) return;
      if (isProcessing) return;

      const requestId = `req-${Date.now()}`;
      currentRequestIdRef.current = requestId;

      let finalContent = content;
      let systemPrompt: string | null = null;
      const originalUserMessage = content;

      // 1.5 Consume Buffered Tool Results (Partial Execution)
      if (!isFirstRequest && !skippedActionIds) {
        const bufferedContent: string[] = [];
        Object.entries(toolResultsBufferRef.current).forEach(([msgId, results]) => {
          if (results && results.length > 0) {
            bufferedContent.push(...results);
            // Clear buffer
            toolResultsBufferRef.current[msgId] = [];
          }
        });

        if (bufferedContent.length > 0) {
          const toolOutput = bufferedContent.join('\n\n');
          finalContent = `${toolOutput}\n\n${finalContent}`;
        }
      }

      // 2. Strict Prompt Construction (First Request)
      if (isFirstRequest) {
        try {
          systemPrompt = combinePrompts();
          console.log('[ChatPanel] Loaded System Prompt size:', systemPrompt.length);
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

      // Combine for Payload (Zen Logic)
      // If first request, we send system prompt + context + user message
      // But we DISPLAY only user message.
      // The backend (or AI) needs to see the full context under <task>.
      // Zen sends `prompt: <task>...</task>`.

      if (isFirstRequest) {
        // Zen Style: System Prompt + Context + User
        // We don't prepend to 'content' var because that's what's displayed.
        // We prepend in the PAYLOAD.
        // Wait, Zen logic:
        // content = `${systemPrompt}\n\n${contextString}\n\nUser Request: ${originalUserMessage}`
        // Then sends `content`.
        // And Systema displays `originalUserMessage`?
        // Systema currently displays `input`.
        // Let's replicate Zen's payload construction in `sendPromptMessage`.
      }

      // 4. Update UI
      const userMsg: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: originalUserMessage, // Display what user typed
        timestamp: Date.now(),
        // Systema extras
        timestampStr: new Date().toLocaleTimeString(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setIsProcessing(true);

      // 5. Construct Payload
      // We explicitly construct the full prompt string here
      let fullPromptForAI = finalContent;

      if (isFirstRequest) {
        fullPromptForAI = `${systemPrompt ? systemPrompt + '\n\n' : ''}${contextString ? contextString + '\n\n' : ''}User Request: ${finalContent}`;
      } else {
        // Subsequent requests: just content + context if any
        fullPromptForAI = contextString ? `${finalContent}\n\n${contextString}` : finalContent;
      }

      const sendPromptMessage = {
        type: 'sendPrompt',
        tabId: parseInt(sessionId, 10) || 1,
        prompt: `<task>\n${fullPromptForAI}`, // Wrap in <task> as per Zen
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
    [inspectorContext, isFirstRequest, sessionId, currentConversationId, isProcessing],
  );

  return (
    <div className="flex flex-col h-full bg-background border-l border-border transition-all duration-300">
      <ChatHeader
        sessionId={sessionId}
        title={title}
        provider={provider}
        onBack={onBack}
        onClearChat={() => setMessages([])}
      />

      <ChatBody messages={messages} isProcessing={isProcessing} />

      <ChatFooter
        input={input}
        setInput={setInput}
        onSend={() => handleSend(input)}
        isProcessing={isProcessing}
      />
    </div>
  );
}
