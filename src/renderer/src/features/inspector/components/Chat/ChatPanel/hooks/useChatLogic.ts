import { useState, useRef } from 'react';
import { Message } from '../components/ChatBody';
import { ProviderConfig, ProviderType, ElaraFreeConfig } from '../../../../types/provider-types';

export function useChatLogic(providerConfig: ProviderConfig | null, _sessionId?: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleRemoveAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && attachments.length === 0) || isLoading || !providerConfig) return;

    const userMsgId = Date.now().toString();
    const userMsg: Message = {
      id: userMsgId,
      role: 'user',
      content: input,
      timestamp: Date.now(),
      timestampStr: new Date().toLocaleTimeString(),
      // Store attachment metadata if needed
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setAttachments([]);
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
      const payload: any = {
        messages: [
          ...messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          { role: 'user', content: userMsg.content },
        ],
        model: providerConfig.model,
        stream: true, // Always stream for better UX
        thinking_enabled: thinkingEnabled,
        search_enabled: searchEnabled,
        // Add images if any (convert to base64)
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
    attachments,
    handleFileSelect,
    handleRemoveAttachment,
  };
}
