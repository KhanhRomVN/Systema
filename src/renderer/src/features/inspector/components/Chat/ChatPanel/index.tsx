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
