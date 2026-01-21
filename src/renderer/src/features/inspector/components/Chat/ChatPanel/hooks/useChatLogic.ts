import { useState, useRef, useEffect } from 'react';
import { Message } from '../components/ChatBody';
import { ProviderConfig, ProviderType, ElaraFreeConfig } from '../../../../types/provider-types';
import { DEFAULT_RULE_PROMPT } from '../../../../prompt';
import { parseAIResponse } from '../../../../../../services/ResponseParser';

// Attachments state
interface PendingAttachment {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  previewUrl?: string;
  progress?: number;
  fileId?: string;
  accountId?: string;
}

export function useChatLogic(
  providerConfig: ProviderConfig | null,
  _sessionId?: string,
  initialInput?: string,
  initialAttachments?: File[],
  initialAttachmentData?: PendingAttachment[],
  initialStreamEnabled?: boolean,
  initialThinkingEnabled?: boolean,
  initialConversationId?: string,
  onConversationIdUpdate?: (id: string) => void,
) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState(initialConversationId || '');
  const conversationIdRef = useRef(initialConversationId || '');

  useEffect(() => {
    conversationIdRef.current = currentConversationId;
  }, [currentConversationId]);

  const [input, setInput] = useState(initialInput || '');
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingEnabled, setThinkingEnabled] = useState(initialThinkingEnabled || false);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [streamEnabled, setStreamEnabled] = useState(initialStreamEnabled ?? true);

  // Transform initial attachments
  const [attachments, setAttachments] = useState<PendingAttachment[]>(() => {
    if (initialAttachmentData && initialAttachmentData.length > 0) {
      return initialAttachmentData;
    }
    return initialAttachments
      ? initialAttachments.map((f) => ({
          id: Math.random().toString(36).substring(7),
          file: f,
          status: 'pending',
          previewUrl: URL.createObjectURL(f),
          progress: 0,
        }))
      : [];
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const hasAutoSent = useRef(false);

  // Auto-Send on Mount if initial data exists
  useEffect(() => {
    if (
      (initialInput ||
        (initialAttachments && initialAttachments.length > 0) ||
        (initialAttachmentData && initialAttachmentData.length > 0)) &&
      !hasAutoSent.current &&
      providerConfig
    ) {
      hasAutoSent.current = true;
      // Small timeout to allow state to settle or component to mount fully
      setTimeout(() => {
        handleSend();
      }, 100);
    }
  }, [initialInput, initialAttachments, initialAttachmentData, providerConfig]);

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement> | { target: { files: FileList } },
  ) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      const newAttachments: PendingAttachment[] = newFiles.map((file) => ({
        id: Math.random().toString(36).substring(7),
        file,
        status: 'pending',
        previewUrl: URL.createObjectURL(file),
        progress: 0,
      }));
      setAttachments((prev) => [...prev, ...newAttachments]);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  // Handle File Uploads (Smart Upload Management) - Ported from Playground
  useEffect(() => {
    const uploadPendingFiles = async () => {
      if (providerConfig?.type !== ProviderType.ELARA_FREE) return;

      const config = providerConfig as ElaraFreeConfig;
      if (!config.accountId) return;

      const itemsToUpload = attachments.filter(
        (a) => a.status === 'pending' || (a.status === 'error' && !a.fileId),
      );

      if (itemsToUpload.length === 0) return;

      const baseURL = config.baseURL || 'http://localhost:11434';
      const uploadUrl = `${baseURL}/v1/chat/accounts/${config.accountId}/uploads`;

      // Mark as uploading
      setAttachments((prev) =>
        prev.map((a) =>
          itemsToUpload.some((i) => i.id === a.id) ? { ...a, status: 'uploading', progress: 0 } : a,
        ),
      );

      // Upload sequentially or in small batches to avoid overwhelming the bridge/backend
      for (const att of itemsToUpload) {
        try {
          const formData = new FormData();
          formData.append('file', att.file);

          console.log('[useChatLogic] Uploading file to:', uploadUrl, 'Account:', config.accountId);

          const res = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success && data.data?.file_id) {
              setAttachments((prev) =>
                prev.map((p) =>
                  p.id === att.id
                    ? {
                        ...p,
                        status: 'completed',
                        fileId: data.data.file_id,
                        accountId: config.accountId,
                        progress: 100,
                      }
                    : p,
                ),
              );
            } else {
              throw new Error(data.error || 'Invalid upload response');
            }
          } else {
            throw new Error(`Upload failed ${res.status}`);
          }
        } catch (err) {
          console.error(`Error uploading ${att.file.name}:`, err);
          setAttachments((prev) =>
            prev.map((p) => (p.id === att.id ? { ...p, status: 'error' } : p)),
          );
        }
      }
    };

    uploadPendingFiles();
  }, [attachments, providerConfig]);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const isUploadingAttachment = attachments.some(
    (a) => a.status === 'pending' || a.status === 'uploading',
  );

  const handleSend = async (options?: { isHidden?: boolean; customInput?: string }) => {
    const textToSend = options?.customInput || input;

    if (
      (!textToSend.trim() && attachments.length === 0) ||
      isLoading ||
      !providerConfig ||
      isUploadingAttachment
    )
      return;

    const userMsgId = Date.now().toString();
    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
      timestampStr: new Date().toLocaleTimeString(),
      attachments: attachments.map((a) => ({
        name: a.file.name,
        type: a.file.type,
        url: a.previewUrl,
        fileId: a.fileId,
      })),
      isHidden: options?.isHidden,
    };

    const messagesToAdd: Message[] = [];

    messagesToAdd.push(userMsg);

    setMessages((prev) => [...prev, ...messagesToAdd]);

    if (!options?.customInput) {
      setInput('');
      setAttachments([]); // Clear from input area
    }
    setIsLoading(true);

    const assistantMsgId = (Date.now() + 1).toString();
    const assistantMsg: Message = {
      id: assistantMsgId,
      role: 'assistant',
      content: '', // Streaming buffer
      timestamp: Date.now(),
      timestampStr: new Date().toLocaleTimeString(),
      isStreaming: true,
    };
    setMessages((prev) => [...prev, assistantMsg]);

    abortControllerRef.current = new AbortController();

    try {
      // 1. Prepare Payload
      // Extract file IDs
      const fileIds = userMsg.attachments?.map((a) => a.fileId).filter(Boolean) as string[];

      const payload: any = {
        messages: [
          ...messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          ...messagesToAdd.map((m, index) => ({
            role: m.role,
            content:
              messages.length === 0 && index === 0
                ? `${DEFAULT_RULE_PROMPT}\n\n${m.content}`
                : m.content,
          })),
        ],
        model: providerConfig.model,
        stream: streamEnabled, // Determine streaming based on toggle
        thinking_enabled: thinkingEnabled,
        search_enabled: searchEnabled,
        files: fileIds, // Add file IDs to top level payload
      };

      // 2. Determine Endpoint & Headers
      let url = '';
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (providerConfig.type === ProviderType.ELARA_FREE) {
        // --- ELARA SPECIFIC LOGIC ---
        const config = providerConfig as ElaraFreeConfig;
        if (!config.baseURL) throw new Error('Base URL missing for Elara');
        if (!config.accountId) throw new Error('Account ID missing for Elara');

        url = `${config.baseURL}/v1/chat/accounts/${config.accountId}/messages`;

        // UUID validation check: Elara/DeepSeek requires valid UUID for conversationId
        const isUUID = (str: string) =>
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

        // Update payload to match Elara API
        payload.search = searchEnabled;
        payload.thinking = thinkingEnabled;
        payload.ref_file_ids = fileIds;
        const cid = conversationIdRef.current;
        payload.conversationId = cid && isUUID(cid) ? cid : undefined;
        // Remove standard fields if they conflict or duplicate custom ones, but usually okay.
        delete payload.files;
        delete payload.search_enabled;
        delete payload.thinking_enabled;
      } else {
        // --- GENERIC GENERIC LOGIC ---
        const config = providerConfig as any;
        if (config.baseURL) {
          url = `${config.baseURL}/v1/chat/completions`;
        } else {
          throw new Error('Direct provider Not Implemented yet. Use Elara Proxy.');
        }

        if (config.apiKey) {
          headers['Authorization'] = `Bearer ${config.apiKey}`;
        }
      }

      console.log(`[ChatDebug] Sending request to: ${url}`);
      console.log(`[ChatDebug] Payload:`, JSON.stringify(payload, null, 2));

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal,
      });

      console.log(`[ChatDebug] Response status: ${response.status} ${response.statusText}`);
      console.log(`[ChatDebug] Response headers:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        try {
          const errorText = await response.text();
          console.error(`[ChatDebug] API Error Body:`, errorText);
        } catch (e) {}
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      if (!response.body) throw new Error('No response body');

      // Streaming Reader
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let streamedContent = '';
      let thinkingBuffer = '';
      let buffer = '';

      console.log(`[ChatDebug] Starting stream reader...`);

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          const chunkStr = decoder.decode(value, { stream: true });
          console.log(`[ChatDebug] Received chunk (${value.byteLength} bytes):`, chunkStr);
          buffer += chunkStr;
        }

        // Parse SSE Format
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last partial line in buffer

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          console.log(`[ChatDebug] Processing line:`, trimmedLine);

          if (trimmedLine.startsWith('data: ')) {
            const dataStr = trimmedLine.slice(6).trim();
            if (dataStr === '[DONE]') {
              console.log(`[ChatDebug] Stream [DONE] received`);
              continue;
            }

            try {
              const data = JSON.parse(dataStr);
              console.log(`[ChatDebug] Parsed data:`, data);

              // HANDLE ELARA FORMAT (Direct fields)
              if (providerConfig.type === ProviderType.ELARA_FREE) {
                if (data.error) {
                  console.error(`[ChatDebug] Backend Error:`, data.error);
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? { ...m, content: m.content + `\n\n[Error: ${data.error}]` }
                        : m,
                    ),
                  );
                }

                if (data.content) {
                  streamedContent += data.content;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? {
                            ...m,
                            content: streamedContent,
                            parsed: parseAIResponse(streamedContent),
                          }
                        : m,
                    ),
                  );
                }

                if (data.thinking) {
                  thinkingBuffer += data.thinking;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId ? { ...m, reasoning: thinkingBuffer } : m,
                    ),
                  );
                }

                // Handle Meta (e.g. Conversation ID update)
                if (
                  data.meta?.conversation_id &&
                  data.meta.conversation_id !== currentConversationId
                ) {
                  console.log('[ChatDebug] New conversation ID:', data.meta.conversation_id);
                  setCurrentConversationId(data.meta.conversation_id);
                  onConversationIdUpdate?.(data.meta.conversation_id);
                }
              }
              // HANDLE GENERIC OPENAI FORMAT (choices array)
              else {
                const contentDelta = data.choices?.[0]?.delta?.content || '';
                if (contentDelta) {
                  streamedContent += contentDelta;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId
                        ? {
                            ...m,
                            content: streamedContent,
                            parsed: parseAIResponse(streamedContent),
                          }
                        : m,
                    ),
                  );
                }

                const reasoningDelta = data.choices?.[0]?.delta?.reasoning_content;
                if (reasoningDelta) {
                  thinkingBuffer += reasoningDelta;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === assistantMsgId ? { ...m, reasoning: thinkingBuffer } : m,
                    ),
                  );
                }
              }
            } catch (e) {
              console.error(`[ChatDebug] JSON Parse error:`, e, 'on data:', dataStr);
              // Ignore parse errors for partial chunks
            }
          }
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        console.log('Request aborted');
      } else {
        console.error('Chat error', e);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsgId
              ? {
                  ...m,
                  content:
                    prev.find((p) => p.id === assistantMsgId)?.content +
                    `\n\n[Error: ${e.message}]`,
                }
              : m,
          ),
        );
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  return {
    messages,
    setMessages,
    input,
    setInput,
    isLoading,
    handleSend,
    handleStop,
    thinkingEnabled,
    setThinkingEnabled,
    searchEnabled,
    setSearchEnabled,
    attachments, // Pass full PendingAttachment[] objects
    handleFileSelect,
    handleRemoveAttachment,
    streamEnabled,
    setStreamEnabled,
    isUploadingAttachment, // Also return this state for UI to disable send button if needed
  };
}
