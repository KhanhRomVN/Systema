import { useState, useEffect, useMemo } from 'react';
import { Search, ChevronRight, ChevronLeft, X, Loader2, Brain } from 'lucide-react';
import { cn } from '../../../../../../../shared/lib/utils';
import { useI18n } from '../../../../../../../i18n/i18nContext';

interface Provider {
  id: string;
  name: string;
  website?: string;
  is_enabled?: boolean;
  total_accounts?: number;
  models: { id: string; name: string; is_thinking?: boolean; is_search?: boolean }[];
  is_upload?: boolean;
  is_search?: boolean;
}

interface Account { id: string; email: string; provider_id: string; }

interface QuickSwitchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  providers: Provider[];
  baseURL: string;
  anchorRef: React.RefObject<HTMLDivElement>;
  onSelect: (s: { providerId: string; modelId: string; accountId: string; email: string }) => void;
}

function getFavicon(website?: string) {
  if (!website) return '';
  try { return `${new URL(website).origin}/favicon.ico`; } catch { return ''; }
}

export function QuickSwitchDrawer({ isOpen, onClose, providers, baseURL, anchorRef, onSelect }: QuickSwitchDrawerProps) {
  const { t } = useI18n();
  const [step, setStep] = useState<'model' | 'account'>('model');
  const [modelSearch, setModelSearch] = useState('');
  const [accountSearch, setAccountSearch] = useState('');
  const [selectedModel, setSelectedModel] = useState<{ provider_id: string; id: string; name: string } | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [rect, setRect] = useState<{ left: number; width: number } | null>(null);

  useEffect(() => {
    if (isOpen && anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect();
      setRect({ left: r.left, width: r.width });
    }
  }, [isOpen, anchorRef]);

  useEffect(() => {
    if (isOpen) { setStep('model'); setModelSearch(''); setAccountSearch(''); setSelectedModel(null); setAccounts([]); }
  }, [isOpen]);

  useEffect(() => {
    if (step !== 'account' || !selectedModel) return;
    let alive = true;
    setIsLoadingAccounts(true);
    fetch(`${baseURL}/v1/accounts?page=1&limit=50&provider_id=${selectedModel.provider_id}`)
      .then((r) => r.json())
      .then((d) => { if (alive && d.success && d.data?.accounts) setAccounts(d.data.accounts); })
      .catch(() => {})
      .finally(() => { if (alive) setIsLoadingAccounts(false); });
    return () => { alive = false; };
  }, [step, selectedModel, baseURL]);

  // Filter: only providers with accounts (total_accounts > 0) and enabled
  const filteredProviders = useMemo(() =>
    providers
      .filter((p) => p.is_enabled !== false && p.total_accounts != null && p.total_accounts > 0)
      .map((p) => ({
        ...p,
        models: p.models.filter(
          (m) => !modelSearch || m.name.toLowerCase().includes(modelSearch.toLowerCase()) || m.id.toLowerCase().includes(modelSearch.toLowerCase()),
        ),
      }))
      .filter((p) => p.models.length > 0),
    [providers, modelSearch],
  );

  const filteredAccounts = useMemo(() =>
    accounts.filter((a) => !accountSearch || a.email.toLowerCase().includes(accountSearch.toLowerCase())),
    [accounts, accountSearch],
  );

  if (!isOpen || !rect) return null;

  const sidebarHeight = anchorRef.current?.getBoundingClientRect().height ?? window.innerHeight;
  const drawerHeight = sidebarHeight * 0.6;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div
        style={{ position: 'fixed', bottom: 0, left: rect.left, width: rect.width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="bg-table-bodyBg border border-border border-b-0 rounded-t-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-2 duration-300"
          style={{ height: `${drawerHeight}px`, maxHeight: '60vh' }}
        >
          {/* Header — same pattern as AddTargetDrawer */}
          <div className="px-4 pt-4 pb-3 border-b border-border shrink-0 flex items-center gap-3">
            {step === 'account' ? (
              <button
                onClick={() => { setStep('model'); setAccountSearch(''); }}
                className="flex items-center justify-center w-9 h-9 rounded-lg bg-violet-500/15 border border-violet-500/25 shrink-0 hover:bg-violet-500/30 transition-all"
              >
                <ChevronLeft className="w-4 h-4 text-violet-400" />
              </button>
            ) : (
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-violet-500/15 border border-violet-500/25 shrink-0">
                <Brain className="w-4 h-4 text-violet-400" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold text-foreground">
                {step === 'model' ? t.agent.selectModel : t.agent.selectAccount}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {step === 'model' ? t.agent.chooseProviderModel : `${selectedModel?.provider_id}/${selectedModel?.id}`}
              </p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="px-4 py-2.5 border-b border-border shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                autoFocus
                type="text"
                placeholder={step === 'model' ? t.agent.searchModels : t.agent.searchAccounts}
                value={step === 'model' ? modelSearch : accountSearch}
                onChange={(e) => step === 'model' ? setModelSearch(e.target.value) : setAccountSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-table-headerBg border border-border rounded-lg outline-none focus:border-primary/50 text-foreground placeholder:text-muted-foreground/50"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3">
            {step === 'model' ? (
              filteredProviders.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-10">{t.agent.noModelsAvailable}</p>
              ) : (
                filteredProviders.map((provider) => (
                  <div key={provider.id} className="mb-5">
                    <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider pb-2 mb-1 border-b border-border/50">
                      {getFavicon(provider.website) && (
                        <img src={getFavicon(provider.website)} alt="" className="w-3.5 h-3.5 rounded-sm"
                          onError={(e) => (e.currentTarget.style.display = 'none')} />
                      )}
                      {provider.name}
                    </div>
                    {provider.models.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => { setSelectedModel({ provider_id: provider.id, id: model.id, name: model.name }); setStep('account'); }}
                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted/40 transition-colors text-left"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{model.name}</span>
                          {model.is_thinking && <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-400 border border-violet-500/30">{t.agent.thinking}</span>}
                          {model.is_search && <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30">{t.agent.search}</span>}
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                      </button>
                    ))}
                  </div>
                ))
              )
            ) : (
              isLoadingAccounts ? (
                <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span className="text-sm">{t.agent.loadingAccounts}</span>
                </div>
              ) : filteredAccounts.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-10">
                  {accounts.length === 0 ? t.agent.noAccounts : t.agent.noAccountsMatch}
                </p>
              ) : (
                filteredAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => { onSelect({ providerId: selectedModel!.provider_id, modelId: selectedModel!.id, accountId: acc.id, email: acc.email }); onClose(); }}
                    className="w-full flex items-center px-3 py-2.5 rounded-lg hover:bg-muted/40 transition-colors text-left text-sm text-foreground"
                  >
                    {acc.email}
                  </button>
                ))
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
