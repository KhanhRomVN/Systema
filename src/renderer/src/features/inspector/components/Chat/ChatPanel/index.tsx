import { useEffect, useState } from 'react';
import { ChatHeader } from './components/ChatHeader';
import { ChatBody } from './components/ChatBody';
import { ChatInputArea } from './components/ChatInputArea';
import { InspectorContext } from '../../ChatContainer';
import { ProviderConfig, ProviderType } from '../../../types/provider-types';
import { useChatLogic } from './hooks/useChatLogic';

interface ChatPanelProps {
  sessionId: string;
  title?: string;
  provider?: string;
  initialConversationId?: string;
  onBack: () => void;
  inspectorContext: InspectorContext;
  providerConfig?: ProviderConfig | null;
  initialInput?: string;
  initialAttachments?: File[];
  initialAttachmentData?: any[]; // PendingAttachment[]
  initialStreamEnabled?: boolean;
  initialThinkingEnabled?: boolean;
  onUpdateSession?: (updates: any) => void;
}

export function ChatPanel({
  sessionId,
  title,
  provider,
  initialConversationId,
  onBack,
  inspectorContext, // Added this
  providerConfig: initialProviderConfig,
  initialInput,
  initialAttachments,
  initialAttachmentData,
  initialStreamEnabled,
  initialThinkingEnabled,
  onUpdateSession,
}: ChatPanelProps) {
  // Local state for configuration within this panel (can override global)
  const [localProviderConfig, setLocalProviderConfig] = useState<ProviderConfig | null>(
    initialProviderConfig || null,
  );

  // Sync with prop updates if needed, but local selection should take precedence if we allow switching here
  useEffect(() => {
    if (initialProviderConfig) {
      setLocalProviderConfig(initialProviderConfig);
    }
  }, [initialProviderConfig]);

  const {
    messages,
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
    streamEnabled,
    setStreamEnabled,
    isUploadingAttachment,
    setMessages, // Need this to update executed indices
  } = useChatLogic(
    localProviderConfig,
    sessionId,
    initialInput,
    initialAttachments,
    initialAttachmentData,
    initialStreamEnabled,
    initialThinkingEnabled,
    initialConversationId,
    (newId) => {
      if (onUpdateSession) {
        onUpdateSession({ conversationId: newId });
      }
    },
  );

  // Elara Sub-Provider Logic
  const [subProviders, setSubProviders] = useState<any[]>([]);

  // Fetch Elara Sub-Providers
  useEffect(() => {
    if (localProviderConfig?.type === ProviderType.ELARA_FREE && localProviderConfig.baseURL) {
      // Fetch /v1/providers
      fetch(`${localProviderConfig.baseURL}/v1/providers`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.data)) {
            setSubProviders(data.data);
          }
        })
        .catch((err) => console.error('Failed to fetch Elara sub-providers', err));
    }
  }, [localProviderConfig?.type, (localProviderConfig as any)?.baseURL]);

  // Fetch Elara Models (Unified) when sub-provider changes
  // Actually, for Elara, the "Model" dropdown might depend on the selected Sub-Provider OR currently selected model.
  // The user said: "riêng với Elara là 1 provider chứa nhiều provider con... sẽ có thêm 1 dropdown chọn provider nữa"
  // So:
  // 1. Selector: Main Provider (Systema, Elara, OpenAI...) -> Handled by TabPanel mostly, but can be here.
  // 2. Selector: Model (DeepSeek, GPT-4...) -> Standard.
  // 3. IF Elara: Selector: Sub-Provider (DeepSeek, Claude...)
  // 4. IF Elara: Selector: Account.

  const handleExecuteTool = async (action: any, msgId: string, index: number) => {
    const { type, params } = action;

    if (type === 'get_filter' && inspectorContext.filter) {
      const f = inspectorContext.filter;

      const methods = Object.entries(f.methods || {})
        .filter(([_, enabled]) => enabled)
        .map(([m]) => m)
        .join(', ');

      const statuses = Object.entries(f.status || {})
        .filter(([_, enabled]) => enabled)
        .map(([s]) => s)
        .join(', ');

      const types = Object.entries(f.type || {})
        .filter(([_, enabled]) => enabled)
        .map(([t]) => t)
        .join(', ');

      const host = (f.host?.whitelist || []).join(', ');
      const path = (f.path?.whitelist || []).join(', ');
      const size =
        f.size?.min || f.size?.max ? `${f.size?.min || 0} - ${f.size?.max || 'inf'}` : '';
      const time =
        f.time?.min || f.time?.max ? `${f.time?.min || 0} - ${f.time?.max || 'inf'}` : '';

      const filterList = [
        `method: ${methods}`,
        `host: ${host}`,
        `path: ${path}`,
        `status: ${statuses}`,
        `type: ${types}`,
        `size: ${size}`,
        `time: ${time}`,
      ]
        .filter((item) => !item.endsWith(': '))
        .join('\n'); // Filter out empty entries

      const prompt = `Current Inspector Filter State:\n\`\`\`text\n${filterList}\n\`\`\`\n\nUse this information for your next analysis.`;

      // Update message state BEFORE sending follow-up to mark it as executed
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, executedToolIndices: [...(m.executedToolIndices || []), index] }
            : m,
        ),
      );

      handleSend({ isHidden: true, customInput: prompt });
    } else if (type === 'list_https') {
      const {
        methods = [],
        hosts = [],
        paths = [],
        statuses = [],
        types = [],
        limit = 20,
        offset = 0,
      } = params;

      let filtered = [...inspectorContext.requests];

      if (methods.length > 0)
        filtered = filtered.filter((r) =>
          methods.map((m: string) => m.toUpperCase()).includes(r.method.toUpperCase()),
        );
      if (hosts.length > 0)
        filtered = filtered.filter((r) => hosts.some((h: string) => r.host.includes(h)));
      if (paths.length > 0)
        filtered = filtered.filter((r) => paths.some((p: string) => r.path.includes(p)));
      if (statuses.length > 0)
        filtered = filtered.filter((r) => statuses.includes(String(r.status)));
      if (types.length > 0)
        filtered = filtered.filter((r) =>
          types.some((t: string) => r.type.toLowerCase().includes(t.toLowerCase())),
        );

      const paginated = filtered.slice(Number(offset), Number(offset) + Number(limit));
      const result = paginated.map((r) => ({
        id: r.id,
        method: r.method,
        host: r.host,
        path: r.path,
        status: r.status,
        type: r.type,
        time: r.time,
        size: r.size,
      }));

      const prompt = `Here are the HTTPS requests matching your criteria:\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``;

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, executedToolIndices: [...(m.executedToolIndices || []), index] }
            : m,
        ),
      );

      handleSend({ isHidden: true, customInput: prompt });
    } else if (type === 'get_https_details') {
      const { id } = params;
      const req = inspectorContext.requests.find((r: any) => r.id === id);
      if (req) {
        const details = {
          id: req.id,
          url: req.url,
          method: req.method,
          status: req.status,
          requestHeaders: req.requestHeaders,
          responseHeaders: req.responseHeaders,
          requestBody: req.requestBody,
          responseBody: req.responseBody,
        };
        const prompt = `Details for Request ${id}:\n\`\`\`json\n${JSON.stringify(details, null, 2)}\n\`\`\``;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, executedToolIndices: [...(m.executedToolIndices || []), index] }
              : m,
          ),
        );

        handleSend({ isHidden: true, customInput: prompt });
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, executedToolIndices: [...(m.executedToolIndices || []), index] }
              : m,
          ),
        );
        handleSend({ isHidden: true, customInput: `Request ${id} not found.` });
      }
    } else if (type === 'delete_https') {
      const { id } = params;
      if (inspectorContext.onDeleteRequest) {
        inspectorContext.onDeleteRequest(id);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, executedToolIndices: [...(m.executedToolIndices || []), index] }
              : m,
          ),
        );

        handleSend({ isHidden: true, customInput: `Request ${id} deleted successfully.` });
      }
    } else if (type === 'edit_filter') {
      // Map params (methods, hosts, paths, statuses, types) to InspectorFilter
      if (inspectorContext.onSetFilter) {
        const newFilter = { ...inspectorContext.filter };

        if (params.methods?.length > 0) {
          const methodsMap: any = {};
          params.methods.forEach((m: string) => {
            methodsMap[m.toUpperCase()] = true;
          });
          newFilter.methods = methodsMap;
        }

        if (params.hosts?.length > 0) newFilter.host.whitelist = params.hosts;
        if (params.paths?.length > 0) newFilter.path.whitelist = params.paths;

        if (params.statuses?.length > 0) {
          const statusMap: any = {};
          params.statuses.forEach((s: string) => {
            statusMap[parseInt(s)] = true;
          });
          newFilter.status = statusMap;
        }

        if (params.types?.length > 0) {
          const typeMap: any = {};
          params.types.forEach((t: string) => {
            typeMap[t.toLowerCase()] = true;
          });
          newFilter.type = typeMap;
        }

        inspectorContext.onSetFilter(newFilter);

        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId
              ? { ...m, executedToolIndices: [...(m.executedToolIndices || []), index] }
              : m,
          ),
        );

        handleSend({ isHidden: true, customInput: 'Filter updated successfully.' });
      }
    } else {
      // Generic fallback markup for other tools
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, executedToolIndices: [...(m.executedToolIndices || []), index] }
            : m,
        ),
      );
    }
  };

  // Agent Mode: Auto-execute tools
  useEffect(() => {
    if (!isLoading && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg.role === 'assistant' && lastMsg.parsed) {
        // Find first tool block that isn't in executedToolIndices
        const pendingToolIndex = lastMsg.parsed.contentBlocks.findIndex(
          (block, idx) => block.type === 'tool' && !lastMsg.executedToolIndices?.includes(idx),
        );

        if (pendingToolIndex !== -1) {
          const toolBlock = lastMsg.parsed.contentBlocks[pendingToolIndex];
          if (toolBlock.type === 'tool') {
            // Execute it after a small delay
            const timer = setTimeout(() => {
              handleExecuteTool(toolBlock.action, lastMsg.id, pendingToolIndex);
            }, 800);
            return () => clearTimeout(timer);
          }
        }
      }
    }
    return undefined;
  }, [messages, isLoading, inspectorContext]); // Added inspectorContext to dependencies

  return (
    <div className="relative flex flex-col h-full bg-background border-l border-border transition-all duration-300">
      <ChatHeader
        sessionId={sessionId}
        title={title}
        provider={provider}
        onBack={onBack}
        onNewChat={() => {}}
        onSettings={() => {}}
      />

      <ChatBody
        messages={messages}
        isProcessing={isLoading}
        onExecuteTool={handleExecuteTool}
        onPreviewTool={async () => null} // Placeholder
        inspectorFilter={inspectorContext.filter}
      />

      {/* Bottom Section: Toolbars + Input */}
      <div className="border-t border-border bg-background">
        <ChatInputArea
          input={input}
          setInput={setInput}
          onSend={() => handleSend()}
          isLoading={isLoading}
          isUploadingAttachment={isUploadingAttachment}
          onStop={handleStop}
          attachments={attachments}
          onFileSelect={handleFileSelect}
          onRemoveAttachment={handleRemoveAttachment}
          thinkingEnabled={thinkingEnabled}
          setThinkingEnabled={setThinkingEnabled}
          searchEnabled={searchEnabled}
          setSearchEnabled={setSearchEnabled}
          streamEnabled={streamEnabled}
          setStreamEnabled={setStreamEnabled}
          supportsThinking={
            !!(
              (localProviderConfig?.model &&
                subProviders.some((p) =>
                  p.models?.some((m: any) => m.id === localProviderConfig.model && m.is_thinking),
                )) ||
              localProviderConfig?.type === ProviderType.DEEPSEEK ||
              (localProviderConfig as any)?.provider_id === 'deepseek'
            )
          }
        />
      </div>
    </div>
  );
}
