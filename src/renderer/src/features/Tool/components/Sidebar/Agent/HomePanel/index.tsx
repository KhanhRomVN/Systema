import { Brain, Settings, History } from 'lucide-react';
import { HistoryPanel, addToHistory, loadHistory } from '../HistoryPanel/index';
import { WelcomeUI } from './components/WelcomeUI';
import { QuickSwitchDrawer } from './components/QuickSwitchDrawer';
import { useHealthCheck } from '../hooks/useHealthCheck';
import { useState, useEffect, useRef } from 'react';
import { useI18n } from '../../../../../../i18n/i18nContext';

// TabList removed
// ChatSession defined locally now since TabList is gone
export interface ChatSession {
  id: string;
  title: string;
  timestamp: number;
  messageCount: number;
  preview: string;
  status?: 'free' | 'busy' | 'sleep';
  provider?: string;
  requestCount?: number;
  containerName?: string;
  conversationId?: string;
  initialInput?: string;
  initialAttachments?: File[];
  initialAttachmentData?: PendingAttachment[]; // Pass full state including fileId
  initialStreamEnabled?: boolean;
  initialThinkingEnabled?: boolean;
}
import {
  ProviderConfig,
  ProviderType,
  ModelInfo,
  ElaraFreeConfig,
} from '../../../../../../types/provider-types';
import { cn } from '../../../../../../shared/lib/utils';
import { ChatInputArea, PendingAttachment } from '../ChatPanel/components/ChatInputArea';

interface HomePanelProps {
  onSelectSession: (session: ChatSession) => void;
  onOpenSettings: () => void;
  currentProviderConfig: ProviderConfig | null;
  onUpdateProviderConfig: (config: ProviderConfig) => void;
}

interface Account {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  provider_id: string;
}

interface SubProvider {
  id: string;
  name: string;
  models: { id: string; name: string }[];
  website?: string;
  is_enabled?: boolean;
  is_upload?: boolean;
  is_search?: boolean;
  total_accounts?: number;
}

// Custom Select Component removed — replaced by inline drawer in HomePanel

export function HomePanel({
  onSelectSession,
  onOpenSettings,
  currentProviderConfig,
  onUpdateProviderConfig,
}: HomePanelProps) {
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showModelDrawer, setShowModelDrawer] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();

  const baseURL = (currentProviderConfig as ElaraFreeConfig)?.baseURL || 'http://localhost:8888';
  const { isConnected } = useHealthCheck(baseURL);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [subProviders, setSubProviders] = useState<SubProvider[]>([]);
  const [selectedSubProvider, setSelectedSubProvider] = useState<string>('');
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Input State
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const [thinkingEnabled, setThinkingEnabled] = useState(false);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [streamEnabled, setStreamEnabled] = useState(true);

  // Trace Config Changes
  useEffect(() => {
    console.log('[HomePanel] Current Provider Config:', currentProviderConfig);
  }, [currentProviderConfig]);

  // Default to Elara if not set
  useEffect(() => {
    if (!currentProviderConfig || currentProviderConfig.type !== ProviderType.ELARA_FREE) {
      console.log('[HomePanel] No valid config, setting default Elara...');
      const defaultConfig: ProviderConfig = {
        type: ProviderType.ELARA_FREE,
        name: 'Elara (Free)',
        model: '',
        baseURL: 'http://localhost:8888',
      } as ProviderConfig;
      onUpdateProviderConfig(defaultConfig);
    }
  }, [currentProviderConfig?.type]);

  // Refactor fetch logic into a reusable function for retries
  const fetchSubProviders = () => {
    if (currentProviderConfig?.type === ProviderType.ELARA_FREE) {
      const config = currentProviderConfig as ElaraFreeConfig;
      const baseURL = config.baseURL || 'http://localhost:8888';

      console.log('[HomePanel] Fetching providers from:', baseURL);

      fetch(`${baseURL}/v1/providers`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.data)) {
            const subs = data.data.map((p: any) => ({
              id: p.provider_id,
              name: p.provider_name,
              models: p.models || [],
              website: p.website,
              is_enabled: p.is_enabled,
              is_upload: p.is_upload,
              is_search: p.is_search,
              total_accounts: p.total_accounts,
            }));
            setSubProviders(subs);
          }
        })
        .catch((err) => {
          console.warn('[HomePanel] Failed to fetch providers:', err);
        });
    }
  };

  // Fetch SubProviders on mount or config change
  useEffect(() => {
    fetchSubProviders();
  }, [currentProviderConfig?.type, (currentProviderConfig as any)?.baseURL]);

  // Handle File Uploads (Smart Upload Management) - Ported from useChatLogic
  useEffect(() => {
    const uploadPendingFiles = async () => {
      if (currentProviderConfig?.type !== ProviderType.ELARA_FREE) return;

      const config = currentProviderConfig as ElaraFreeConfig;
      if (!config.accountId) return;

      const itemsToUpload = attachments.filter(
        (a) => a.status === 'pending' || (a.status === 'error' && !a.fileId),
      );

      if (itemsToUpload.length === 0) return;

      const baseURL = config.baseURL || 'http://localhost:8888';
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

          console.log('[HomePanel] Uploading file to:', uploadUrl, 'Account:', config.accountId);

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
  }, [attachments, currentProviderConfig]);

  // Fetch Models and Accounts when SubProvider changes
  useEffect(() => {
    if (currentProviderConfig?.type === ProviderType.ELARA_FREE && selectedSubProvider) {
      const config = currentProviderConfig as ElaraFreeConfig;
      const baseURL = config.baseURL || 'http://localhost:8888';

      setIsLoadingModels(true);

      // Check if we already have models from the provider list (optimization)
      const selectedProviderData = subProviders.find((p) => p.id === selectedSubProvider);
      const embeddedModels =
        selectedProviderData?.models &&
        Array.isArray(selectedProviderData.models) &&
        selectedProviderData.models.length > 0
          ? selectedProviderData.models
          : null;

      const modelsPromise = embeddedModels
        ? Promise.resolve(embeddedModels)
        : fetch(`${baseURL}/v1/providers/${selectedSubProvider}/models`)
            .then((res) => res.json())
            .then((data) => (data.success && Array.isArray(data.data) ? data.data : []));

      Promise.all([
        modelsPromise.catch((err) => {
          console.error('Failed to fetch models:', err);
          return [];
        }),

        // Fetch Accounts using specific provider_id
        fetch(`${baseURL}/v1/accounts?page=1&limit=10&provider_id=${selectedSubProvider}`)
          .then((res) => res.json())
          .then((data) => {
            if (data && data.success && data.data) {
              if (Array.isArray(data.data.accounts)) return data.data.accounts;
              if (Array.isArray(data.data)) return data.data;
            }
            return [];
          })
          .catch((err) => {
            console.error('Failed to fetch accounts:', err);
            return [];
          }),
      ])
        .then(([fetchedModels, fetchedAccounts]) => {
          // Normalize models if they came from embedded structure (might need mapping if format differs)
          // The JSON for embedded models: { id, name, is_thinking } -> Matches ModelInfo partially
          const normalizedModels: ModelInfo[] = fetchedModels.map((m: any) => ({
            id: m.id,
            name: m.name,
            providerId: selectedSubProvider,
            is_thinking: m.is_thinking,
            // Map other fields if necessary
          }));

          setModels(normalizedModels);
          setAccounts(fetchedAccounts);

          // Update config with auto-selected values
          const updates: Partial<ElaraFreeConfig> = {};
          let hasUpdates = false;

          // Auto-select Account
          if (fetchedAccounts.length > 0) {
            const currentAccountId = (currentProviderConfig as ElaraFreeConfig).accountId;
            const currentAccountValid = fetchedAccounts.find(
              (a: { id: string | undefined }) => a.id === currentAccountId,
            );

            if (!currentAccountValid) {
              updates.accountId = fetchedAccounts[0].id;
              hasUpdates = true;
            }
          }

          // Auto-select Model
          if (normalizedModels.length > 0) {
            const currentModelValid = normalizedModels.find(
              (m) => m.id === currentProviderConfig.model,
            );
            if (!currentModelValid) {
              updates.model = normalizedModels[0].id;
              hasUpdates = true;
            }
          } else if (currentProviderConfig.model) {
            updates.model = '';
            hasUpdates = true;
          }

          if (hasUpdates) {
            onUpdateProviderConfig({
              ...currentProviderConfig,
              ...updates,
            } as any);
          }
        })
        .finally(() => {
          setIsLoadingModels(false);
        });
    } else if (!selectedSubProvider) {
      setModels([]);
      setAccounts([]);
    }
  }, [selectedSubProvider, currentProviderConfig?.type]); // Added subProviders to dependency if we use it, but safe practice to just rely on ID or avoid stale closures. Actually subProviders dependency might cause loops if it updates. Better to rely on just selectedSubProvider and reference state or assume models are fetched.

  const handleNewChat = (shouldSend = false) => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newSession: ChatSession = {
      id: newId,
      title: t.agent.title,
      timestamp: Date.now(),
      messageCount: 0,
      preview: t.agent.tagline,
      status: 'free',
      provider: currentProviderConfig?.type || 'deepseek',
      containerName: 'Container #01',
      // Pass the current input and attachments to the new session
      initialInput: shouldSend ? inputText : undefined,
      initialAttachments: shouldSend ? attachments.map((a) => a.file) : undefined,
      initialAttachmentData: shouldSend ? attachments : undefined, // Transfer full state
      initialStreamEnabled: streamEnabled,
      initialThinkingEnabled: thinkingEnabled,
    };
    onSelectSession(newSession);
    addToHistory(newSession);

    // Clear only after passing
    if (shouldSend) {
      setInputText('');
      setAttachments([]);
    }
  };

  const handleModelChange = (modelId: string) => {
    if (currentProviderConfig) {
      onUpdateProviderConfig({
        ...currentProviderConfig,
        model: modelId,
      });
    }
  };

  const handleAccountChange = (accountId: string) => {
    if (currentProviderConfig?.type === ProviderType.ELARA_FREE) {
      const newConfig: ElaraFreeConfig = {
        ...(currentProviderConfig as ElaraFreeConfig),
        accountId: accountId,
      };
      onUpdateProviderConfig(newConfig);
    }
  };

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
    setAttachments((prev) => prev.filter((_, idx) => idx !== index));
  };

  const isUploadingAttachment = attachments.some(
    (a) => a.status === 'pending' || a.status === 'uploading',
  );

  const handleSend = () => {
    if (!inputText.trim() && attachments.length === 0) return;
    if (isUploadingAttachment) return;

    // Validation: Require model and accountId (for Elara)
    const isConfigValid =
      currentProviderConfig?.model &&
      (currentProviderConfig.type !== ProviderType.ELARA_FREE ||
        (currentProviderConfig as ElaraFreeConfig).accountId);

    if (!isConfigValid) {
      console.warn('[HomePanel] Cannot send: Missing configuration');
      return;
    }

    handleNewChat(true);
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-table-bodyBg border-l border-border relative">
      {/* Head Panel */}
      <div className="px-4 pt-4 pb-3 border-b border-border shrink-0 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center bg-violet-500/15 border border-violet-500/25">
            <Brain className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">{t.agent.title}</h2>
            <p className="text-[11px] text-muted-foreground/70 mt-0.5 leading-snug">{t.agent.tagline}</p>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
            title={t.agent.history}
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={onOpenSettings}
            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors"
            title={t.agentSettings.title}
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* History Panel overlay */}
      <HistoryPanel
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        onLoadSession={(session) => { onSelectSession(session); setIsHistoryOpen(false); }}
      />

      <WelcomeUI />

      <div className="bg-table-bodyBg shrink-0">
        {/* Chat Input Area with docked model badge */}
        <ChatInputArea
          input={inputText}
          setInput={setInputText}
          onSend={handleSend}
          isLoading={false}
          isUploadingAttachment={isUploadingAttachment}
          onStop={() => {}}
          attachments={attachments}
          onFileSelect={handleFileSelect}
          onRemoveAttachment={handleRemoveAttachment}
          thinkingEnabled={thinkingEnabled}
          setThinkingEnabled={setThinkingEnabled}
          searchEnabled={searchEnabled}
          setSearchEnabled={setSearchEnabled}
          streamEnabled={streamEnabled}
          setStreamEnabled={setStreamEnabled}
          disabled={
            !currentProviderConfig?.model ||
            (currentProviderConfig?.type === ProviderType.ELARA_FREE &&
              !(currentProviderConfig as ElaraFreeConfig).accountId)
          }
          supportsUpload={
            selectedSubProvider
              ? (subProviders.find((p) => p.id === selectedSubProvider)?.is_upload ?? false)
              : false
          }
          supportsSearch={
            selectedSubProvider
              ? (subProviders.find((p) => p.id === selectedSubProvider)?.is_search ?? false)
              : false
          }
          supportsThinking={
            !!(
              (currentProviderConfig?.model &&
                models.find((m) => m.id === currentProviderConfig.model)?.is_thinking) ||
              currentProviderConfig?.type === ProviderType.DEEPSEEK ||
              (selectedSubProvider && selectedSubProvider.includes('deepseek'))
            )
          }
          isConnected={isConnected}
          modelBadge={{
            label: selectedSubProvider && currentProviderConfig?.model
              ? `${selectedSubProvider}/${currentProviderConfig.model}`
              : t.agent.selectModel,
            faviconUrl: selectedSubProvider
              ? subProviders.find((p) => p.id === selectedSubProvider)?.website
                ? `https://www.google.com/s2/favicons?domain=${subProviders.find((p) => p.id === selectedSubProvider)?.website}&sz=64`
                : undefined
              : undefined,
            accountEmail: accounts.find((a) => a.id === (currentProviderConfig as ElaraFreeConfig)?.accountId)?.email,
            onClick: () => { if (subProviders.length === 0) fetchSubProviders(); setShowModelDrawer(true); },
          }}
        />

        <QuickSwitchDrawer
          isOpen={showModelDrawer}
          onClose={() => setShowModelDrawer(false)}
          anchorRef={containerRef}
          providers={subProviders.map((sp) => ({
            id: sp.id,
            name: sp.name,
            website: sp.website,
            is_enabled: sp.is_enabled,
            models: sp.models,
            is_upload: sp.is_upload,
            is_search: sp.is_search,
            total_accounts: sp.total_accounts,
          }))}
          baseURL={(currentProviderConfig as ElaraFreeConfig)?.baseURL || 'http://localhost:8888'}
          onSelect={({ providerId, modelId, accountId, email }) => {
            setSelectedSubProvider(providerId);
            onUpdateProviderConfig({
              ...currentProviderConfig!,
              model: modelId,
              ...(currentProviderConfig?.type === ProviderType.ELARA_FREE ? { accountId } : {}),
            } as ElaraFreeConfig);
            setAccounts((prev) => {
              const exists = prev.find((a) => a.id === accountId);
              if (exists) return prev;
              return [...prev, { id: accountId, email, name: email, provider_id: providerId }];
            });
          }}
        />
      </div>
    </div>
  );
}
