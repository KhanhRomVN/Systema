import {
  Plus,
  ChevronRight,
  Brain,
  ChevronDown,
  Globe,
  Sparkles,
  Loader2,
  AlertCircle,
  X,
  CheckCircle2,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

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
} from '../../../types/provider-types';
import { cn } from '../../../../../shared/lib/utils';
import { ChatInputArea, PendingAttachment } from '../ChatPanel/components/ChatInputArea';
import { AccountAvatar } from './components/AccountAvatar';

interface HomePanelProps {
  onSelectSession: (session: ChatSession) => void;
  onOpenSettings: () => void;
  onOpenProviderSelection: () => void;
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
}

// Custom Select Component for displaying Icons
function CustomSelect({
  value,
  onChange,
  options,
  onOpen,
  placeholder = 'Select...',
  disabled = false,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: {
    value: string;
    label: string;
    iconUrl?: string;
    iconNode?: React.ReactNode;
    disabled?: boolean;
  }[];
  onOpen?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={containerRef} className={cn('relative inline-block text-[11px]', className)}>
      <button
        type="button"
        onClick={() => {
          if (!disabled) {
            const nextState = !isOpen;
            setIsOpen(nextState);
            if (nextState && onOpen) {
              onOpen();
            }
          }
        }}
        disabled={disabled}
        className={cn(
          'h-8 w-full flex items-center justify-between gap-2 bg-background border border-border rounded px-2.5 outline-none focus:border-primary cursor-pointer transition-colors hover:bg-muted/50 truncate',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <span className="flex items-center gap-2 truncate flex-1">
          {selectedOption?.iconNode ? (
            selectedOption.iconNode
          ) : selectedOption?.iconUrl ? (
            <img
              src={selectedOption.iconUrl}
              alt=""
              className="w-4 h-4 object-contain rounded-sm"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          ) : selectedOption && selectedOption.iconUrl !== undefined ? (
            <Globe className="w-3.5 h-3.5 text-muted-foreground" />
          ) : null}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </span>
        <ChevronDown className="w-3.5 h-3.5 text-muted-foreground opacity-50 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-1 w-full min-w-[160px] max-h-60 overflow-y-auto bg-popover border border-border rounded-md shadow-md z-50 animate-in fade-in zoom-in-95 duration-100 slide-in-from-bottom-2">
          <div className="p-1">
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => {
                  if (!option.disabled) {
                    onChange(option.value);
                    setIsOpen(false);
                  }
                }}
                disabled={option.disabled}
                className={cn(
                  'w-full flex items-center gap-2 px-2 py-2 rounded-sm text-left transition-colors',
                  option.disabled
                    ? 'opacity-50 cursor-not-allowed bg-muted/20'
                    : 'hover:bg-muted/50 cursor-pointer',
                  option.value === value && !option.disabled && 'bg-muted font-medium',
                )}
              >
                {option.iconNode ? (
                  option.iconNode
                ) : option.iconUrl ? (
                  <img src={option.iconUrl} alt="" className="w-4 h-4 object-contain rounded-sm" />
                ) : option.iconUrl !== undefined ? (
                  <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                ) : null}
                <span className="truncate flex-1">{option.label}</span>
                {option.disabled && (
                  <span className="text-[10px] border border-border px-1 rounded">Disabled</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function HomePanel({
  onSelectSession,
  onOpenSettings,
  onOpenProviderSelection,
  currentProviderConfig,
  onUpdateProviderConfig,
}: HomePanelProps) {
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
        baseURL: 'http://localhost:11434',
      } as ProviderConfig;
      onUpdateProviderConfig(defaultConfig);
    }
  }, [currentProviderConfig?.type]);

  // Refactor fetch logic into a reusable function for retries
  const fetchSubProviders = () => {
    if (currentProviderConfig?.type === ProviderType.ELARA_FREE) {
      const config = currentProviderConfig as ElaraFreeConfig;
      const baseURL = config.baseURL || 'http://localhost:11434';

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
      const baseURL = config.baseURL || 'http://localhost:11434';

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
      title: 'New Analysis Session',
      timestamp: Date.now(),
      messageCount: 0,
      preview: 'Start analyzing network traffic...',
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
    handleNewChat(true);
  };

  // Dropdown Options
  const subProviderOptions = subProviders.map((sp) => ({
    value: sp.id,
    label: sp.name,
    iconUrl: sp.website
      ? `https://www.google.com/s2/favicons?domain=${sp.website}&sz=64`
      : undefined,
    disabled: sp.is_enabled === false,
  }));

  const modelOptions = models.map((m) => ({
    value: m.id,
    label: m.name,
  }));

  const accountOptions = [
    { value: '', label: 'No Account', iconNode: undefined },
    ...accounts.map((a) => ({
      value: a.id,
      label: a.email || a.id,
      iconNode: (
        <AccountAvatar email={a.email} provider={a.provider_id} className="w-4 h-4 text-[8px]" />
      ),
    })),
  ];

  return (
    <div className="flex flex-col h-full bg-background border-l border-border relative">
      <div className="flex flex-col border-b border-border bg-muted/40 shrink-0">
        <div className="h-10 flex items-center justify-between px-3">
          <span className="text-xs font-semibold text-muted-foreground">New Chat</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleNewChat(false)}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
              title="New Chat"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenProviderSelection}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
              title="Select Provider"
            >
              <Sparkles className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenSettings}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
              title="Settings"
            >
              <div className="border border-current rounded w-4 h-4 flex items-center justify-center">
                <ChevronRight className="w-3 h-3" />
              </div>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col items-center justify-center text-muted-foreground p-8">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 bg-muted/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 opacity-50" />
          </div>
          <h3 className="font-semibold text-lg text-foreground">Start a New Chat</h3>
          <p className="text-xs text-muted-foreground/80 leading-relaxed">
            Configure your AI provider below and start a new session to analyze your network
            traffic.
          </p>
        </div>
      </div>

      <div className="border-t border-border bg-background shrink-0">
        {/* Configuration Toolbar */}
        <div className="p-3 border-b border-border bg-muted/10 flex flex-wrap gap-2">
          {/* Elara SubProvider Select (Replaces Main Provider) */}
          {currentProviderConfig?.type === ProviderType.ELARA_FREE ? (
            <CustomSelect
              className="w-fit min-w-[130px] max-w-[160px]"
              options={subProviderOptions}
              value={selectedSubProvider}
              onChange={(val) => setSelectedSubProvider(val)}
              onOpen={() => {
                if (subProviders.length === 0) {
                  fetchSubProviders();
                }
              }}
              placeholder="Select Provider"
            />
          ) : (
            <div className="text-[10px] bg-red-500/10 text-red-500 px-2 rounded border border-red-500/20">
              Invalid Provider
            </div>
          )}

          {/* Model & Account Select (Conditional) */}
          {selectedSubProvider && (
            <>
              {/* Account Select (Center) */}
              {currentProviderConfig?.type === ProviderType.ELARA_FREE && (
                <CustomSelect
                  className="w-fit max-w-[200px]"
                  options={accountOptions}
                  value={(currentProviderConfig as ElaraFreeConfig).accountId || ''}
                  onChange={(val) => handleAccountChange(val)}
                  placeholder="Select Account"
                />
              )}

              {/* Model Select */}
              <CustomSelect
                className="w-fit max-w-[170px]"
                options={modelOptions}
                value={currentProviderConfig?.model || ''}
                onChange={(val) => handleModelChange(val)}
                placeholder="Model"
                disabled={isLoadingModels}
              />
            </>
          )}
        </div>

        {/* Chat Input Area */}
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
        />
      </div>
    </div>
  );
}
