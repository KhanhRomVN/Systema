import { useState, useRef } from 'react';
import { Plus, KeyRound, X, Search, FileText, Type, ShieldCheck, ShieldOff } from 'lucide-react';
import { cn } from '../../../../../../shared/lib/utils';
import { useI18n } from '../../../../../../i18n/i18nContext';

type InputType = 'string' | 'file';
export type CryptoMode = 'encode' | 'decode';

export interface CryptoStep {
  id: string;
  method: string;
  key: string;
  output: string;
  error: string;
}

export interface CryptoCard {
  id: string;
  name: string;
  description: string;
  inputType: InputType;
  mode: CryptoMode;
  input: string;
  steps: CryptoStep[];
  createdAt: number;
  targetApp?: string;
}

const STORAGE_KEY = 'crypto-manager-cards';

function loadCards(): CryptoCard[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}
export function saveCards(cards: CryptoCard[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

interface CryptoManagerProps {
  onOpenCard: (card: CryptoCard) => void;
  targetApp?: string;
}

const MODE_CONFIG = {
  encode: { labelKey: 'encode' as const, icon: ShieldCheck, color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  decode: { labelKey: 'decode' as const, icon: ShieldOff,  color: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
};

export function CryptoManager({ onOpenCard, targetApp }: CryptoManagerProps) {
  const { t } = useI18n();
  const [cards, setCards] = useState<CryptoCard[]>(loadCards);
  const [search, setSearch] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; cardId: string } | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<CryptoMode>('decode');
  const [inputType, setInputType] = useState<InputType>('string');
  const [inputString, setInputString] = useState('');
  const [fileContent, setFileContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filtered = cards.filter(c =>
    c.targetApp === (targetApp || '') &&
    (c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase()))
  );

  const readFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = e => setFileContent(e.target?.result as string || '');
    reader.readAsText(file);
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    const card: CryptoCard = {
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description.trim(),
      inputType,
      mode,
      input: inputType === 'string' ? inputString : fileContent,
      steps: [],
      createdAt: Date.now(),
      targetApp: targetApp || '',
    };
    const updated = [card, ...cards];
    setCards(updated);
    saveCards(updated);
    setIsDrawerOpen(false);
    setName(''); setDescription(''); setMode('decode'); setInputType('string');
    setInputString(''); setFileContent(''); setFileName('');
  };

  const handleDelete = (id: string) => {
    const updated = cards.filter(c => c.id !== id);
    setCards(updated);
    saveCards(updated);
  };

  return (
    <div className="h-full flex flex-col bg-table-bodyBg relative">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-divider shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-10 rounded-lg bg-yellow-500/15 border border-yellow-500/25 shrink-0">
            <KeyRound className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-text-primary">{t.crypto.title}</h2>
            <p className="text-xs text-text-secondary mt-0.5">{t.crypto.desc}</p>
          </div>
        </div>
      </div>

      {/* Search + Add */}
      <div className="px-3 py-2 border-b border-divider flex gap-2 items-center shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={t.crypto.searchCards}
            className="w-full h-11 bg-input-background border border-input-border-default rounded-lg pl-8 pr-3 text-sm text-text-primary focus:border-primary/50 outline-none" />
        </div>
        <button onClick={() => setIsDrawerOpen(true)}
          disabled={!targetApp}
          className="flex items-center justify-center w-11 h-11 rounded-lg border transition-all active:scale-95 shrink-0 bg-secondary hover:bg-primary/20 hover:text-primary text-text-secondary border-divider hover:border-primary/30 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-secondary disabled:hover:text-text-secondary disabled:hover:border-divider">
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-auto p-2 space-y-2" onClick={() => setContextMenu(null)}>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-text-secondary">
            <KeyRound className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-xs">{t.crypto.noCards}</p>
            <p className="text-[10px] opacity-60">{t.crypto.noCardsDesc}</p>
          </div>
        ) : filtered.map(card => {
          const modeConf = MODE_CONFIG[card.mode ?? 'decode'];
          const ModeIcon = modeConf.icon;
          const stepCount = card.steps?.length ?? 0;
          const preview = card.input ? card.input.slice(0, 80) + (card.input.length > 80 ? '…' : '') : null;
          return (
            <div key={card.id}
              className="p-3 rounded-lg bg-table-headerBg border border-divider/40 hover:bg-sidebar-itemHover/60 hover:border-primary/30 hover:scale-[1.01] transition-all duration-200 group cursor-pointer"
              onClick={() => onOpenCard(card)}
              onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, cardId: card.id }); }}>
              {/* Top row: name + mode badge + steps badge */}
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold text-text-primary truncate flex-1">{card.name}</span>
                <span className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border shrink-0', modeConf.color)}>
                  <ModeIcon className="w-2.5 h-2.5" />{t.crypto[modeConf.labelKey]}
                </span>
                {stepCount > 0 && (
                  <span className="text-[9px] text-text-secondary bg-muted/30 border border-divider/50 rounded px-1.5 py-0.5 shrink-0">
                    {t.crypto.stepCountPlural.replace('{count}', String(stepCount))}
                  </span>
                )}
              </div>

              {/* Input preview */}
              {preview && (
                <p className="text-[10px] font-mono text-text-secondary/70 truncate mb-1.5 bg-muted/20 rounded px-2 py-1">{preview}</p>
              )}

              {/* Description */}
              {card.description && (
                <span className="text-[9px] text-text-secondary/60 truncate block">{card.description}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div className="fixed z-50 bg-dialog-background border border-divider rounded-lg shadow-xl py-1 min-w-[120px]"
            style={{ left: contextMenu.x, top: contextMenu.y }}>
            <button
              onClick={() => { handleDelete(contextMenu.cardId); setContextMenu(null); }}
              className="w-full px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10 text-left transition-colors">
              Delete
            </button>
          </div>
        </>
      )}

      {/* Create Drawer */}
      {isDrawerOpen && (
        <>
          <div className="absolute inset-0 bg-black/40 z-40" onClick={() => setIsDrawerOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 z-50 bg-dialog-background border-t border-divider rounded-t-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300" style={{ height: '75%' }}>
            <div className="px-4 pt-4 pb-3 border-b border-divider flex items-center gap-3 shrink-0">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-yellow-500/15 border border-yellow-500/25 shrink-0">
                <Plus className="w-4 h-4 text-yellow-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-text-primary">{t.crypto.newCrypto}</h3>
                <p className="text-xs text-text-secondary mt-0.5">{t.crypto.newCryptoDesc}</p>
              </div>
              <button onClick={() => setIsDrawerOpen(false)} className="p-1.5 rounded-lg bg-secondary text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">{t.crypto.name}</label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder={t.crypto.namePlaceholder}
                  className="w-full bg-table-headerBg border border-input-border-default rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary" />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">{t.crypto.description} <span className="text-text-secondary/50">{t.crypto.descOptional}</span></label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder={t.crypto.descPlaceholder} rows={2}
                  className="w-full bg-table-headerBg border border-input-border-default rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary resize-none" />
              </div>

              {/* Mode */}
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">{t.crypto.mode}</label>
                <div className="flex gap-2">
                  {(['encode', 'decode'] as CryptoMode[]).map(m => {
                    const conf = MODE_CONFIG[m];
                    const Icon = conf.icon;
                    return (
                      <button key={m} onClick={() => setMode(m)}
                        className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-all',
                          mode === m ? conf.color : 'bg-table-headerBg text-text-secondary border-input-border-default hover:border-primary/20')}>
                        <Icon className="w-3.5 h-3.5" />{t.crypto[conf.labelKey]}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Input type */}
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">{t.crypto.inputType}</label>
                <div className="flex gap-2 mb-3">
                  {(['string', 'file'] as InputType[]).map(type => (
                    <button key={type} onClick={() => setInputType(type)}
                      className={cn('flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-medium transition-all',
                        inputType === type ? 'bg-primary/10 text-primary border-primary/30' : 'bg-table-headerBg text-text-secondary border-input-border-default hover:border-primary/20')}>
                      {type === 'file' ? <FileText className="w-3 h-3" /> : <Type className="w-3 h-3" />}
                      {type === 'file' ? t.crypto.file : t.crypto.string}
                    </button>
                  ))}
                </div>
                {inputType === 'string' ? (
                  <textarea value={inputString} onChange={e => setInputString(e.target.value)} placeholder={t.crypto.inputPlaceholder} rows={4}
                    className="w-full bg-table-headerBg border border-input-border-default rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary resize-none font-mono" />
                ) : (
                  <div
                    onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onDrop={e => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) readFile(f); }}
                    onClick={() => fileInputRef.current?.click()}
                    className={cn('border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors',
                      isDragOver ? 'border-primary bg-primary/5' : 'border-divider hover:border-primary/50 hover:bg-muted/20')}>
                    <FileText className={cn('w-8 h-8', isDragOver ? 'text-primary' : 'text-text-secondary/50')} />
                    {fileName
                      ? <span className="text-xs font-medium text-primary">{fileName}</span>
                      : <><span className="text-xs text-text-secondary">{t.crypto.dropFile}</span><span className="text-[10px] text-text-secondary/50">{t.crypto.anyFile}</span></>
                    }
                    <input ref={fileInputRef} type="file" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) readFile(f); }} />
                  </div>
                )}
              </div>
            </div>

            <div className="px-5 py-4 border-t border-divider flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsDrawerOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-sidebar-itemHover transition-colors">{t.crypto.cancel}</button>
              <button onClick={handleCreate} disabled={!name.trim() || (inputType === 'string' ? !inputString.trim() : !fileContent)}
                className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all">{t.crypto.create}</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
