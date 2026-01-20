import { useState, useRef, useEffect } from 'react';
import { Message } from '../components/ChatBody';
import { ProviderConfig, ProviderType, ElaraFreeConfig } from '../../../../types/provider-types';

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
) {
  const [messages, setMessages] = useState<Message[]>([]);
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

  const handleSend = async () => {
    if (
      (!input.trim() && attachments.length === 0) ||
      isLoading ||
      !providerConfig ||
      isUploadingAttachment
    )
      return;

    const userMsgId = Date.now().toString();
    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: input,
      timestamp: Date.now(),
      timestampStr: new Date().toLocaleTimeString(),
      attachments: attachments.map((a) => ({
        name: a.file.name,
        type: a.file.type,
        url: a.previewUrl,
        fileId: a.fileId,
      })),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setAttachments([]); // Clear from input area
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
          {
            role: 'user',
            content: userMsg.content,
            // Some providers take 'files' or 'images' in message object,
            // others take it at top level. Systema usually takes 'files' in the request body for standard chat.
          },
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
        const config = providerConfig as ElaraFreeConfig;
        if (!config.baseURL) throw new Error('Base URL missing for Elara');

        // Use the Chat Completions endpoint
        url = `${config.baseURL}/v1/chat/completions`;

        // Add Account ID if present
        if (config.accountId) {
          url += `?accountId=${encodeURIComponent(config.accountId)}`;
          headers['x-account-id'] = config.accountId;
        }
      } else {
        // Generic handling for other providers
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

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      if (!response.body) throw new Error('No response body');

      // Streaming Reader
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let streamedContent = '';
      let thinkingBuffer = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        const chunkValue = decoder.decode(value, { stream: true });

        // Parse SSE Format (data: {...})
        const lines = chunkValue.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            const jsonStr = line.slice(6);
            try {
              const data = JSON.parse(jsonStr);

              // Handle Content
              const contentDelta = data.choices?.[0]?.delta?.content || '';
              if (contentDelta) {
                streamedContent += contentDelta;
                // Update UI
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? {
                          ...m,
                          content: streamedContent,
                        }
                      : m,
                  ),
                );
              }

              // Handle Thinking
              const reasoningDelta = data.choices?.[0]?.delta?.reasoning_content;
              if (reasoningDelta) {
                thinkingBuffer += reasoningDelta;
                // Update UI with thinking state
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsgId
                      ? {
                          ...m,
                          reasoning: thinkingBuffer,
                        }
                      : m,
                  ),
                );
              }
            } catch (e) {
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
