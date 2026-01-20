import { useEffect, useState } from 'react';
import { ChatHeader } from './components/ChatHeader';
import { ChatBody } from './components/ChatBody';
import { ChatInputArea } from './components/ChatInputArea';
import { InspectorContext } from '../../ChatContainer';
import { ProviderConfig, ProviderType, ElaraFreeConfig } from '../../../types/provider-types';
import { useChatLogic } from './hooks/useChatLogic';
import { Settings2, Zap, User } from 'lucide-react';

interface ChatPanelProps {
  sessionId: string;
  title?: string;
  provider?: string;
  initialConversationId?: string;
  onBack: () => void;
  inspectorContext: InspectorContext;
  providerConfig?: ProviderConfig | null;
  initialInput?: string;
  initialInput?: string;
  initialAttachments?: File[];
  initialAttachmentData?: any[]; // PendingAttachment[]
  initialStreamEnabled?: boolean;
  initialThinkingEnabled?: boolean;
}

export function ChatPanel({
  sessionId,
  title,
  provider,

  onBack,

  providerConfig: initialProviderConfig,
  initialInput,
  initialAttachments,
  initialAttachmentData,
  initialStreamEnabled,
  initialThinkingEnabled,
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
  } = useChatLogic(
    localProviderConfig,
    sessionId,
    initialInput,
    initialAttachments,
    initialAttachmentData,
    initialStreamEnabled,
    initialThinkingEnabled,
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
        onExecuteTool={async () => {}} // Placeholder
        onPreviewTool={async () => null} // Placeholder
      />

      {/* Bottom Section: Toolbars + Input */}
      <div className="border-t border-border bg-background">
        {/* Configuration Toolbar */}
        <div className="flex flex-wrap items-center gap-2 px-4 py-2 bg-muted/20 border-b border-border text-xs">
          {/* Provider Badge / Selector */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-secondary/50 text-secondary-foreground">
            <Zap className="w-3 h-3" />
            <span className="font-medium">{localProviderConfig?.name || 'Unknown Provider'}</span>
          </div>

          {/* Elara Specific: Sub-Provider Selector */}
          {localProviderConfig?.type === ProviderType.ELARA_FREE && subProviders.length > 0 && (
            <div className="flex items-center gap-1">
              <select
                className="h-6 bg-background border border-border rounded px-1 outline-none text-[10px] min-w-[80px]"
                // Logic to update model list based on this would go here
              >
                <option value="">Select Provider</option>
                {subProviders.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Model Info */}
          <div className="flex items-center gap-1.5 px-2 py-1 border border-border rounded text-muted-foreground">
            <Settings2 className="w-3 h-3" />
            <span>{localProviderConfig?.model}</span>
          </div>

          {/* Elara Specific: Account Info */}
          {localProviderConfig?.type === ProviderType.ELARA_FREE &&
            (localProviderConfig as ElaraFreeConfig).accountId && (
              <div className="flex items-center gap-1.5 px-2 py-1 border border-border rounded text-muted-foreground">
                <User className="w-3 h-3" />
                <span className="max-w-[100px] truncate">
                  {(localProviderConfig as ElaraFreeConfig).accountId}
                </span>
              </div>
            )}
        </div>

        <ChatInputArea
          input={input}
          setInput={setInput}
          onSend={handleSend}
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
