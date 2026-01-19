import {
  History,
  Plus,
  ChevronRight,
  Send,
  Brain,
  Paperclip,
  Search,
  X,
  ChevronDown,
  Globe,
  Sparkles,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

import { TabList, ChatSession } from './TabList';
import {
  ProviderConfig,
  ProviderType,
  ModelInfo,
  ElaraFreeConfig,
} from '../../types/provider-types';
import { cn } from '../../../../shared/lib/utils';

interface TabPanelProps {
  sessions: ChatSession[];
  onSelectSession: (id: string) => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  onSessionsChange: (sessions: ChatSession[]) => void;
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
  models: string[];
  website?: string;
  is_enabled?: boolean;
}

// Custom Select Component for displaying Icons
function CustomSelect({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  disabled = false,
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; iconUrl?: string; disabled?: boolean }[];
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
    <div ref={containerRef} className={cn('relative inline-block text-[10px]', className)}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={cn(
          'h-7 w-full flex items-center justify-between gap-2 bg-background border border-border rounded px-2 outline-none focus:border-primary cursor-pointer transition-colors hover:bg-muted/50 truncate',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <span className="flex items-center gap-2 truncate flex-1">
          {selectedOption?.iconUrl ? (
            <img
              src={selectedOption.iconUrl}
              alt=""
              className="w-3.5 h-3.5 object-contain rounded-sm"
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
          ) : selectedOption && selectedOption.iconUrl !== undefined ? (
            <Globe className="w-3 h-3 text-muted-foreground" />
          ) : null}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </span>
        <ChevronDown className="w-3 h-3 text-muted-foreground opacity-50 shrink-0" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-1 w-full min-w-[140px] max-h-60 overflow-y-auto bg-popover border border-border rounded-md shadow-md z-50 animate-in fade-in zoom-in-95 duration-100 slide-in-from-bottom-2">
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
                  'w-full flex items-center gap-2 px-2 py-1.5 rounded-sm text-left transition-colors',
                  option.disabled
                    ? 'opacity-50 cursor-not-allowed bg-muted/20'
                    : 'hover:bg-muted/50 cursor-pointer',
                  option.value === value && !option.disabled && 'bg-muted font-medium',
                )}
              >
                {option.iconUrl ? (
                  <img
                    src={option.iconUrl}
                    alt=""
                    className="w-3.5 h-3.5 object-contain rounded-sm"
                  />
                ) : option.iconUrl !== undefined ? (
                  <Globe className="w-3 h-3 text-muted-foreground" />
                ) : null}
                <span className="truncate flex-1">{option.label}</span>
                {option.disabled && (
                  <span className="text-[9px] border border-border px-1 rounded">Disabled</span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function TabPanel({
  sessions,
  onSelectSession,
  onOpenHistory,
  onOpenSettings,
  onSessionsChange,
  onOpenProviderSelection,
  currentProviderConfig,
  onUpdateProviderConfig,
}: TabPanelProps) {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [subProviders, setSubProviders] = useState<SubProvider[]>([]);
  const [selectedSubProvider, setSelectedSubProvider] = useState<string>('');
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  // Input State
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isSearch, setIsSearch] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Trace Config Changes
  useEffect(() => {
    console.log('[TabPanel] Current Provider Config:', currentProviderConfig);
  }, [currentProviderConfig]);

  // Default to Elara if not set
  useEffect(() => {
    if (!currentProviderConfig || currentProviderConfig.type !== ProviderType.ELARA_FREE) {
      console.log('[TabPanel] No valid config, setting default Elara...');
      const defaultConfig: ProviderConfig = {
        type: ProviderType.ELARA_FREE,
        name: 'Elara (Free)',
        model: '',
        baseURL: 'http://localhost:11434',
      } as ProviderConfig;
      onUpdateProviderConfig(defaultConfig);
    }
  }, [currentProviderConfig?.type]);

  // Fetch SubProviders (Only once or on mount)
  useEffect(() => {
    if (currentProviderConfig?.type === ProviderType.ELARA_FREE) {
      const config = currentProviderConfig as ElaraFreeConfig;
      // Robust Fallback: Use config.baseURL OR default to local backend
      const baseURL = config.baseURL || 'http://localhost:11434';

      console.log('[TabPanel] Config:', config);
      console.log('[TabPanel] Fetching providers from:', baseURL);

      fetch(`${baseURL}/v1/providers`)
        .then((res) => res.json())
        .then((data) => {
          console.log('[TabPanel] Providers API Response:', data);
          if (data.success && Array.isArray(data.data)) {
            const subs = data.data.map((p: any) => ({
              id: p.id,
              name: p.name,
              models: [],
              website: p.website,
              is_enabled: p.is_enabled,
            }));
            setSubProviders(subs);
          } else {
            console.warn('[TabPanel] Invalid providers data structure:', data);
          }
        })
        .catch((err) => {
          console.warn('[TabPanel] Failed to fetch providers (likely offline or wrong URL):', err);
        });
    }
  }, [currentProviderConfig?.type, (currentProviderConfig as any)?.baseURL]);

  // Fetch Models and Accounts when SubProvider changes
  useEffect(() => {
    if (currentProviderConfig?.type === ProviderType.ELARA_FREE && selectedSubProvider) {
      const config = currentProviderConfig as ElaraFreeConfig;
      const baseURL = config.baseURL || 'http://localhost:11434';

      setIsLoadingModels(true);

      Promise.all([
        // Fetch Models
        fetch(`${baseURL}/v1/providers/${selectedSubProvider}/models`)
          .then((res) => res.json())
          .then((data) => (data.success && Array.isArray(data.data) ? data.data : []))
          .catch((err) => {
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
          setModels(fetchedModels);
          setAccounts(fetchedAccounts);

          // Auto-select logic
          if (fetchedModels.length > 0) {
            const currentModelValid = fetchedModels.find(
              (m: { id: string }) => m.id === currentProviderConfig.model,
            );
            if (!currentModelValid) {
              onUpdateProviderConfig({
                ...currentProviderConfig,
                model: fetchedModels[0].id,
              });
            }
          } else if (currentProviderConfig.model) {
            onUpdateProviderConfig({
              ...currentProviderConfig,
              model: '',
            });
          }
        })
        .finally(() => {
          setIsLoadingModels(false);
        });
    } else if (!selectedSubProvider) {
      setModels([]);
      setAccounts([]);
    }
  }, [selectedSubProvider, currentProviderConfig?.type]);

  const handleNewChat = () => {
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
    };
    onSessionsChange([newSession, ...sessions]);
    onSelectSession(newId);
    setInputText('');
    setAttachments([]);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
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
    { value: '', label: 'No Account' },
    ...accounts.map((a) => ({
      value: a.id,
      label: a.email || a.id,
    })),
  ];

  return (
    <div className="flex flex-col h-full bg-background border-l border-border relative">
      <div className="flex flex-col border-b border-border bg-muted/40 shrink-0">
        <div className="h-10 flex items-center justify-between px-3">
          <span className="text-xs font-semibold text-muted-foreground">New Chat</span>
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenHistory}
              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded transition-colors"
              title="History"
            >
              <History className="w-4 h-4" />
            </button>
            <button
              onClick={handleNewChat}
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

      <div className="flex-1 overflow-y-auto min-h-0">
        <TabList sessions={sessions} onSelect={onSelectSession} onNewChat={handleNewChat} />
      </div>

      <div className="p-3 border-t border-border bg-muted/10 shrink-0 flex flex-col gap-2">
        {/* Unified Config Row */}
        <div className="flex flex-wrap gap-2">
          {/* Elara SubProvider Select (Replaces Main Provider) */}
          {currentProviderConfig?.type === ProviderType.ELARA_FREE ? (
            <CustomSelect
              className="w-fit min-w-[120px] max-w-[150px]"
              options={subProviderOptions}
              value={selectedSubProvider}
              onChange={(val) => setSelectedSubProvider(val)}
              placeholder="Select Provider"
              disabled={subProviders.length === 0}
            />
          ) : (
            <div className="text-[10px] bg-red-500/10 text-red-500 px-2 rounded border border-red-500/20">
              Invalid Provider
            </div>
          )}

          {/* Model Select */}
          <CustomSelect
            className="w-fit max-w-[150px]"
            options={modelOptions}
            value={currentProviderConfig?.model || ''}
            onChange={(val) => handleModelChange(val)}
            placeholder="Model"
            disabled={isLoadingModels || !selectedSubProvider}
          />

          {/* Account Select */}
          {currentProviderConfig?.type === ProviderType.ELARA_FREE && (
            <CustomSelect
              className="w-fit max-w-[150px]"
              options={accountOptions}
              value={(currentProviderConfig as ElaraFreeConfig).accountId || ''}
              onChange={(val) => handleAccountChange(val)}
              placeholder="No Account"
            />
          )}
        </div>

        {attachments.length > 0 && (
          <div className="flex gap-2 overflow-x-auto py-1">
            {attachments.map((file, i) => (
              <div
                key={i}
                className="flex items-center gap-1 bg-background border border-border rounded px-2 py-1 text-[10px]"
              >
                <span className="truncate max-w-[80px]">{file.name}</span>
                <button
                  onClick={() => setAttachments((p) => p.filter((_, idx) => idx !== i))}
                  className="text-muted-foreground hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="relative bg-background border border-input rounded-lg shadow-sm focus-within:ring-1 focus-within:ring-primary">
          <textarea
            className="w-full bg-transparent border-none px-3 py-2 text-xs resize-none outline-none min-h-[48px] max-h-[200px]"
            placeholder="Type a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            rows={2}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleNewChat();
              }
            }}
          />
          <div className="flex items-center justify-between px-2 pb-2">
            <div className="flex items-center gap-1">
              <input
                type="file"
                multiple
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileSelect}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                title="Attach File"
              >
                <Paperclip className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsSearch(!isSearch)}
                className={`p-1.5 rounded transition-all ${isSearch ? 'text-blue-400 bg-blue-400/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                title="Web Search"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsThinking(!isThinking)}
                className={`p-1.5 rounded transition-all ${isThinking ? 'text-purple-400 bg-purple-400/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                title="Thinking Mode"
              >
                <Brain className="w-3.5 h-3.5" />
              </button>
            </div>
            <button
              onClick={handleNewChat}
              disabled={!inputText.trim() && attachments.length === 0}
              className="p-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
