import { useState, useEffect, useRef } from 'react';
import { Copy, KeyRound, Save, X, Plus, Check, Shuffle } from 'lucide-react';
import { cn } from '../../../../../../shared/lib/utils';
import CryptoJS from 'crypto-js';

type CryptoMethod =
  | 'none'
  | 'base64-encode' | 'base64-decode'
  | 'url-encode' | 'url-decode'
  | 'html-encode' | 'html-decode'
  | 'hex-encode' | 'hex-decode'
  | 'rot13' | 'rot47'
  | 'md5' | 'sha1' | 'sha256' | 'sha512'
  | 'aes-encrypt' | 'aes-decrypt'
  | 'xor';

interface MethodOption {
  value: CryptoMethod;
  label: string;
  category: string;
  requiresKey?: boolean;
}

const METHODS: MethodOption[] = [
  { value: 'base64-encode', label: 'Base64 Encode', category: 'Encoding' },
  { value: 'base64-decode', label: 'Base64 Decode', category: 'Encoding' },
  { value: 'url-encode', label: 'URL Encode', category: 'Encoding' },
  { value: 'url-decode', label: 'URL Decode', category: 'Encoding' },
  { value: 'html-encode', label: 'HTML Encode', category: 'Encoding' },
  { value: 'html-decode', label: 'HTML Decode', category: 'Encoding' },
  { value: 'hex-encode', label: 'Hex Encode', category: 'Encoding' },
  { value: 'hex-decode', label: 'Hex Decode', category: 'Encoding' },
  { value: 'rot13', label: 'ROT-13', category: 'Classic' },
  { value: 'rot47', label: 'ROT-47', category: 'Classic' },
  { value: 'xor', label: 'XOR', category: 'Classic', requiresKey: true },
  { value: 'md5', label: 'MD5', category: 'Hashing' },
  { value: 'sha1', label: 'SHA-1', category: 'Hashing' },
  { value: 'sha256', label: 'SHA-256', category: 'Hashing' },
  { value: 'sha512', label: 'SHA-512', category: 'Hashing' },
  { value: 'aes-encrypt', label: 'AES Encrypt', category: 'Encryption', requiresKey: true },
  { value: 'aes-decrypt', label: 'AES Decrypt', category: 'Encryption', requiresKey: true },
];

// Unique color per method
const METHOD_COLORS: Record<string, string> = {
  'none':         'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  'base64-encode':'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'base64-decode':'bg-sky-500/15 text-sky-400 border-sky-500/30',
  'url-encode':   'bg-violet-500/15 text-violet-400 border-violet-500/30',
  'url-decode':   'bg-purple-500/15 text-purple-400 border-purple-500/30',
  'html-encode':  'bg-pink-500/15 text-pink-400 border-pink-500/30',
  'html-decode':  'bg-rose-500/15 text-rose-400 border-rose-500/30',
  'hex-encode':   'bg-orange-500/15 text-orange-400 border-orange-500/30',
  'hex-decode':   'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'rot13':        'bg-lime-500/15 text-lime-400 border-lime-500/30',
  'rot47':        'bg-green-500/15 text-green-400 border-green-500/30',
  'xor':          'bg-teal-500/15 text-teal-400 border-teal-500/30',
  'md5':          'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  'sha1':         'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  'sha256':       'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30',
  'sha512':       'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'aes-encrypt':  'bg-red-500/15 text-red-400 border-red-500/30',
  'aes-decrypt':  'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
};

function processText(text: string, method: CryptoMethod, key?: string): string {
  if (method === 'none') return text;
  try {
    switch (method) {
      case 'base64-encode': return btoa(unescape(encodeURIComponent(text)));
      case 'base64-decode': {
        try { return decodeURIComponent(escape(atob(text.trim()))); } catch { throw new Error('Invalid Base64 input'); }
      }
      case 'url-encode': return encodeURIComponent(text);
      case 'url-decode': return decodeURIComponent(text);
      case 'html-encode':
        return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
      case 'html-decode':
        return text.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#039;/g,"'");
      case 'hex-encode':
        return Array.from(text).map(c => c.charCodeAt(0).toString(16).padStart(2,'0')).join('');
      case 'hex-decode':
        return text.match(/.{1,2}/g)?.map(b => String.fromCharCode(parseInt(b,16))).join('') || '';
      case 'rot13':
        return text.replace(/[a-zA-Z]/g, c => {
          const base = c <= 'Z' ? 65 : 97;
          return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
        });
      case 'rot47':
        return text.replace(/[!-~]/g, c => String.fromCharCode(((c.charCodeAt(0) - 33 + 47) % 94) + 33));
      case 'xor': {
        if (!key) throw new Error('XOR key required');
        return Array.from(text).map((c, i) =>
          String.fromCharCode(c.charCodeAt(0) ^ key.charCodeAt(i % key.length))
        ).join('');
      }
      case 'md5': return CryptoJS.MD5(text).toString();
      case 'sha1': return CryptoJS.SHA1(text).toString();
      case 'sha256': return CryptoJS.SHA256(text).toString();
      case 'sha512': return CryptoJS.SHA512(text).toString();
      case 'aes-encrypt':
        if (!key) throw new Error('Encryption key required');
        return CryptoJS.AES.encrypt(text, key).toString();
      case 'aes-decrypt': {
        if (!key) throw new Error('Decryption key required');
        return CryptoJS.AES.decrypt(text, key).toString(CryptoJS.enc.Utf8);
      }
      default: return text;
    }
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : 'Processing failed');
  }
}

interface Step {
  id: string;
  method: CryptoMethod;
  key: string;
  output: string;
  error: string;
}

function runChain(input: string, steps: Step[]): Step[] {
  let current = input;
  return steps.map(step => {
    try {
      const output = processText(current, step.method, step.key || undefined);
      current = output;
      return { ...step, output, error: '' };
    } catch (e) {
      const error = e instanceof Error ? e.message : 'Error';
      current = '';
      return { ...step, output: '', error };
    }
  });
}

function ResizableTextarea({ value, onChange, placeholder, className }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = ref.current.scrollHeight + 'px';
    }
  }, [value]);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={1}
      className={cn('w-full p-3 text-xs font-mono bg-transparent outline-none resize-none text-text-primary overflow-hidden', className)}
    />
  );
}

// Methods that are "encode" direction
const ENCODE_METHODS = new Set(['base64-encode','url-encode','html-encode','hex-encode','aes-encrypt']);
// Methods that are "decode" direction  
const DECODE_METHODS = new Set(['base64-decode','url-decode','html-decode','hex-decode','aes-decrypt','md5','sha1','sha256','sha512']);
// Symmetric (both)
const BOTH_METHODS = new Set(['rot13','rot47','xor','none']);

function filterByMode(methods: MethodOption[], mode: 'encode' | 'decode'): MethodOption[] {
  return methods.filter(m =>
    BOTH_METHODS.has(m.value) ||
    (mode === 'encode' ? ENCODE_METHODS.has(m.value) : DECODE_METHODS.has(m.value))
  );
}

const grouped = METHODS.reduce((acc, m) => { (acc[m.category] ??= []).push(m); return acc; }, {} as Record<string, MethodOption[]>);

function AlgoDropdown({ value, onChange, mode }: {
  value: CryptoMethod;
  onChange: (v: CryptoMethod) => void;
  mode: 'encode' | 'decode';
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const label = value === 'none' ? 'NONE' : (METHODS.find(m => m.value === value)?.label ?? value);
  const colorClass = METHOD_COLORS[value] ?? METHOD_COLORS['none'];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSearch(''); }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = () => {
    if (btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      setPos({ top: r.bottom + 4, left: r.left });
    }
    setOpen(o => !o);
  };

  const filtered = Object.entries(grouped).reduce((acc, [cat, opts]) => {
    const matches = filterByMode(opts, mode).filter(o => o.label.toLowerCase().includes(search.toLowerCase()));
    if (matches.length) acc[cat] = matches;
    return acc;
  }, {} as Record<string, MethodOption[]>);

  return (
    <div ref={ref} className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        className={cn('px-2.5 py-1 rounded text-[11px] font-bold border transition-colors hover:opacity-80 self-center', colorClass)}
      >
        {label}
      </button>
      {open && (
        <div
          className="fixed z-[9999] bg-zinc-800 border border-zinc-700 rounded-md shadow-xl max-h-64 w-52 flex flex-col"
          style={{ top: pos.top, left: pos.left }}
        >
          <div className="p-2 border-b border-zinc-700 shrink-0">
            <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." className="w-full bg-zinc-900 border border-zinc-700 rounded px-2.5 py-1.5 text-xs text-zinc-100 outline-none placeholder:text-zinc-500" />
          </div>
          <div className="overflow-y-auto flex-1 p-1">
            {Object.entries(filtered).map(([cat, opts]) => (
              <div key={cat}>
                <div className="px-2 py-1 text-[9px] font-bold text-zinc-500 uppercase tracking-wider">{cat}</div>
                {opts.map(o => (
                  <button key={o.value} type="button"
                    onClick={() => { onChange(o.value); setOpen(false); setSearch(''); }}
                    className={cn('w-full text-left px-2.5 py-2 text-xs rounded flex items-center justify-between gap-2 transition-colors',
                      o.value === value ? 'bg-primary/20 text-primary' : 'text-zinc-300 hover:bg-zinc-700/50 hover:text-zinc-100'
                    )}>
                    {o.label}
                    {o.value === value && <Check className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export interface StringCryptoPanelProps {
  cardId?: string;
  initialText?: string;
  initialSteps?: Step[];
  mode?: 'encode' | 'decode';
  isTemp?: boolean;
  onSave?: (name: string, description: string) => void;
  onClose?: () => void;
}

interface ComboResult {
  index: number;
  name: string;
  value: string;
  error?: string;
}

const MAX_COMBO_RESULTS = 500;

async function runCombinationAsync(
  input: string,
  depth: number,
  mode: 'encode' | 'decode',
  onResult: (r: ComboResult) => void,
  signal: AbortSignal
): Promise<void> {
  const methods = METHODS.filter(m => !m.requiresKey && (BOTH_METHODS.has(m.value) || (mode === 'encode' ? ENCODE_METHODS.has(m.value) : DECODE_METHODS.has(m.value))));
  let idx = 1;
  let count = 0;

  // Iterative cartesian product via index arithmetic to avoid deep recursion
  const total = methods.length ** depth;
  const CHUNK = 50;

  for (let i = 0; i < total; i++) {
    if (signal.aborted || count >= MAX_COMBO_RESULTS) break;

    // Decode index i into method indices
    const combo: MethodOption[] = [];
    let tmp = i;
    for (let d = 0; d < depth; d++) {
      combo.unshift(methods[tmp % methods.length]);
      tmp = Math.floor(tmp / methods.length);
    }

    try {
      let val = input;
      for (const m of combo) val = processText(val, m.value);
      onResult({ index: idx++, name: combo.map(m => m.label).join(' → '), value: val });
    } catch (e) {
      onResult({ index: idx++, name: combo.map(m => m.label).join(' → '), value: '', error: e instanceof Error ? e.message : 'Error' });
    }
    count++;

    // Yield every CHUNK iterations to avoid blocking UI
    if (i % CHUNK === CHUNK - 1) {
      await new Promise(r => setTimeout(r, 0));
    }
  }
}

export function StringCryptoPanel({ cardId, initialText, initialSteps, mode = 'decode', isTemp, onSave, onClose }: StringCryptoPanelProps) {
  const [input, setInput] = useState(initialText || '');
  const [steps, setSteps] = useState<Step[]>(initialSteps ?? []);
  const [isSaveDrawerOpen, setIsSaveDrawerOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isComboDrawerOpen, setIsComboDrawerOpen] = useState(false);
  const [comboSourceId, setComboSourceId] = useState<string | null>(null);
  const [comboDepth, setComboDepth] = useState<number>(1);
  const [comboResults, setComboResults] = useState<ComboResult[]>([]);
  const [comboRunning, setComboRunning] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; result: ComboResult } | null>(null);
  const [pendingCombo, setPendingCombo] = useState<ComboResult | null>(null);
  const comboAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (initialText !== undefined) setInput(initialText);
  }, [initialText]);

  useEffect(() => {
    if (steps.length > 0) setSteps(prev => runChain(input, prev));
  }, [input]);

  // Persist steps whenever they change
  useEffect(() => {
    if (!cardId) return;
    try {
      const cards = JSON.parse(localStorage.getItem('crypto-manager-cards') || '[]');
      const updated = cards.map((c: any) => c.id === cardId ? { ...c, steps } : c);
      localStorage.setItem('crypto-manager-cards', JSON.stringify(updated));
    } catch {}
  }, [steps, cardId]);

  const updateStep = (id: string, patch: Partial<Step>) => {
    const updated = steps.map(s => s.id === id ? { ...s, ...patch } : s);
    setSteps(runChain(input, updated));
  };

  const addStep = () => {
    const prevOutput = steps.length > 0 ? steps[steps.length - 1].output : input;
    const newStep: Step = { id: crypto.randomUUID(), method: 'none', key: '', output: prevOutput, error: '' };
    setSteps(prev => runChain(input, [...prev, newStep]));
  };

  const removeStep = (id: string) => {
    setSteps(prev => runChain(input, prev.filter(s => s.id !== id)));
  };

  const copyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const openCombo = (sourceId: string | null) => {
    setComboSourceId(sourceId);
    setComboResults([]);
    setIsComboDrawerOpen(true);
  };

  const runCombo = () => {
    comboAbortRef.current?.abort();
    const ctrl = new AbortController();
    comboAbortRef.current = ctrl;
    let src = input;
    if (comboSourceId !== null) {
      const s = steps.find(s => s.id === comboSourceId);
      src = s ? s.output : input;
    }
    setComboResults([]);
    setComboRunning(true);
    runCombinationAsync(src, comboDepth, mode, r => {
      setComboResults(prev => [...prev, r]);
    }, ctrl.signal).finally(() => setComboRunning(false));
  };

  const applyCombo = (result: ComboResult) => {
    // Determine which step index is the source
    const sourceIdx = comboSourceId === null ? -1 : steps.findIndex(s => s.id === comboSourceId);
    const stepsAfter = steps.slice(sourceIdx + 1);

    if (stepsAfter.length > 0) {
      setPendingCombo(result);
    } else {
      doApplyCombo(result, sourceIdx);
    }
    setContextMenu(null);
  };

  const doApplyCombo = (result: ComboResult, sourceIdx: number) => {
    // Parse method names from result.name (e.g. "Base64 Encode → URL Encode")
    const methodNames = result.name.split(' → ');
    const newSteps: Step[] = methodNames.map(name => {
      const method = METHODS.find(m => m.label === name)?.value ?? 'none';
      return { id: crypto.randomUUID(), method, key: '', output: '', error: '' };
    });
    const kept = steps.slice(0, sourceIdx + 1);
    setSteps(runChain(input, [...kept, ...newSteps]));
    setIsComboDrawerOpen(false);
    setPendingCombo(null);
  };

  return (
    <div className="h-full flex flex-col bg-table-bodyBg relative">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-divider shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-10 rounded-lg bg-yellow-500/15 border border-yellow-500/25 shrink-0">
            <KeyRound className="w-4 h-4 text-yellow-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-text-primary">Crypto</h2>
              {isTemp && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-warning/15 text-warning border border-warning/30">TEMP</span>}
            </div>
            <p className="text-xs text-text-secondary mt-0.5">String encode / decode chain</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isTemp && (
              <button onClick={() => setIsSaveDrawerOpen(true)} className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-all">
                <Save className="w-3 h-3" />Save
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all" title="Close">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-2">
        {/* Input section */}
        <div className="rounded-lg border border-divider overflow-hidden">
          <div className="px-3 py-1.5 bg-muted/20 border-b border-divider flex items-center justify-between">
            <span className="text-[10px] font-bold text-text-secondary uppercase">Input</span>
            <div className="flex items-center gap-0.5">
              <button onClick={() => openCombo(null)} className="p-1 rounded transition-colors text-text-secondary hover:text-violet-400" title="Combination">
                <Shuffle className="w-3 h-3" />
              </button>
              {input && (
                <button onClick={() => copyText(input, 'input')} className={cn('p-1 rounded transition-colors', copiedId === 'input' ? 'text-green-400' : 'text-text-secondary hover:text-text-primary')}>
                  <Copy className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
          <ResizableTextarea value={input} onChange={setInput} placeholder="Paste text here..." />
        </div>

        {/* Steps */}
        {steps.map((step, idx) => {
          const methodInfo = METHODS.find(m => m.value === step.method);
          return (
            <div key={step.id}>
              <div className="rounded-lg border border-divider overflow-hidden">
                {/* Header: badge + algo badge trigger + copy + remove */}
                <div className="px-3 py-1.5 bg-muted/20 border-b border-divider flex items-center gap-2">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-muted/40 border border-divider text-text-secondary shrink-0">{idx + 1}</span>
                  <AlgoDropdown value={step.method} onChange={v => updateStep(step.id, { method: v })} mode={mode} />
                  <div className="flex-1" />
                  {step.method !== 'none' && (
                    <button onClick={() => openCombo(step.id)} className="p-1 rounded transition-colors text-text-secondary hover:text-violet-400 shrink-0" title="Combination">
                      <Shuffle className="w-3 h-3" />
                    </button>
                  )}
                  <button onClick={() => copyText(step.output, step.id)} className={cn('p-1 rounded transition-colors shrink-0', copiedId === step.id ? 'text-green-400' : 'text-text-secondary hover:text-text-primary')}>
                    <Copy className="w-3 h-3" />
                  </button>
                  <button onClick={() => removeStep(step.id)} className="p-1 rounded text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0">
                    <X className="w-3 h-3" />
                  </button>
                </div>

                {/* Key input */}
                {methodInfo?.requiresKey && (
                  <div className="px-3 py-2 border-b border-divider bg-muted/10">
                    <input value={step.key} onChange={e => updateStep(step.id, { key: e.target.value })} placeholder="Key..." className="w-full h-7 bg-input-background border border-input-border-default rounded px-2 text-xs text-text-primary outline-none focus:border-primary/50" />
                  </div>
                )}

                {/* Error */}
                {step.error && (
                  <div className="px-3 py-1.5 border-b border-divider">
                    <div className="text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded px-2 py-1">{step.error}</div>
                  </div>
                )}

                <ResizableTextarea
                  value={step.output}
                  onChange={v => updateStep(step.id, { output: v })}
                  placeholder="Output..."
                />
              </div>
            </div>
          );
        })}

        <button
          onClick={addStep}
          disabled={steps.length > 0 && steps[steps.length - 1].method === 'none'}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg border border-dashed border-divider text-xs text-text-secondary hover:text-text-primary hover:border-primary/40 hover:bg-primary/5 transition-all disabled:opacity-40 disabled:pointer-events-none"
        >
          <Plus className="w-3.5 h-3.5" />Add Step
        </button>
      </div>

      {/* Combination Drawer */}
      {isComboDrawerOpen && (
        <>
          <div className="absolute inset-0 bg-black/40 z-40" onClick={() => setIsComboDrawerOpen(false)} />
          <div className="absolute inset-0 z-50 bg-dialog-background flex flex-col">
            <div className="px-3 py-2 border-b border-divider flex items-center gap-2 shrink-0">
              <Shuffle className="w-3.5 h-3.5 text-violet-400 shrink-0" />
              <span className="text-[10px] font-bold text-text-secondary uppercase flex-1">Combination</span>
              <div className="flex items-center gap-1 flex-wrap">
                {Array.from({ length: 10 }, (_, i) => i + 1).map(d => (
                  <button
                    key={d}
                    onClick={() => setComboDepth(d)}
                    className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors',
                      comboDepth === d
                        ? 'bg-violet-500/20 text-violet-400 border-violet-500/40'
                        : 'bg-transparent text-text-secondary border-divider hover:border-violet-500/30 hover:text-violet-400'
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
              {comboRunning ? (
                <button
                  onClick={() => comboAbortRef.current?.abort()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25 transition-all shrink-0"
                >
                  Stop
                </button>
              ) : (
                <button
                  onClick={runCombo}
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold bg-violet-500/15 text-violet-400 border border-violet-500/30 hover:bg-violet-500/25 transition-all shrink-0"
                >
                  Run
                </button>
              )}
              <button onClick={() => { comboAbortRef.current?.abort(); setIsComboDrawerOpen(false); }} className="p-1.5 rounded text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            {comboRunning && (
              <div className="px-3 py-1.5 border-b border-divider bg-violet-500/5 shrink-0 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-violet-400 animate-pulse shrink-0" />
                <span className="text-[10px] text-violet-400">Running… {comboResults.length} results (max {MAX_COMBO_RESULTS})</span>
              </div>
            )}
            {comboResults.length > 0 && (
              <div className="flex-1 overflow-auto" onClick={() => setContextMenu(null)}>
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-dialog-background">
                    <tr className="border-b border-divider bg-muted/10">
                      <th className="px-3 py-1.5 text-left text-[9px] font-bold text-text-secondary uppercase w-10">#</th>
                      <th className="px-3 py-1.5 text-left text-[9px] font-bold text-text-secondary uppercase">Combination</th>
                      <th className="px-3 py-1.5 text-left text-[9px] font-bold text-text-secondary uppercase">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comboResults.map(r => (
                      <tr
                        key={r.index}
                        className="border-b border-divider/50 hover:bg-muted/10 transition-colors cursor-context-menu"
                        onContextMenu={e => { e.preventDefault(); if (!r.error) setContextMenu({ x: e.clientX, y: e.clientY, result: r }); }}
                      >
                        <td className="px-3 py-1.5 text-text-secondary font-mono">{r.index}</td>
                        <td className="px-3 py-1.5 text-text-secondary whitespace-nowrap">{r.name}</td>
                        <td className="px-3 py-1.5 font-mono max-w-[200px]">
                          {r.error
                            ? <span className="text-red-400 text-[10px]">{r.error}</span>
                            : <span className="text-text-primary truncate block">{r.value}</span>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-[9999] bg-zinc-800 border border-zinc-700 rounded-md shadow-xl py-1 min-w-[160px]"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            <button
              onClick={() => applyCombo(contextMenu.result)}
              className="w-full text-left px-3 py-2 text-xs text-zinc-200 hover:bg-zinc-700 transition-colors flex items-center gap-2"
            >
              <Shuffle className="w-3 h-3 text-violet-400" />
              Use this combination
            </button>
          </div>
        </>
      )}

      {/* Confirm overwrite drawer */}
      {pendingCombo && (
        <>
          <div className="absolute inset-0 bg-black/40 z-[60]" />
          <div className="absolute bottom-0 left-0 right-0 z-[61] bg-dialog-background border-t border-divider rounded-t-2xl shadow-2xl flex flex-col p-4 gap-3">
            <p className="text-sm font-bold text-text-primary">Replace following steps?</p>
            <p className="text-xs text-text-secondary">Steps after the selected source will be removed and replaced with <span className="text-violet-400 font-medium">{pendingCombo.name}</span>.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setPendingCombo(null)} className="px-3 py-1.5 rounded text-xs text-text-secondary hover:text-text-primary hover:bg-sidebar-itemHover transition-colors">Cancel</button>
              <button
                onClick={() => {
                  const sourceIdx = comboSourceId === null ? -1 : steps.findIndex(s => s.id === comboSourceId);
                  doApplyCombo(pendingCombo, sourceIdx);
                }}
                className="px-4 py-1.5 rounded text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </>
      )}

      {/* Save Drawer */}
      {isSaveDrawerOpen && (
        <>
          <div className="absolute inset-0 bg-black/40 z-40" onClick={() => setIsSaveDrawerOpen(false)} />
          <div className="absolute bottom-0 left-0 right-0 z-50 bg-dialog-background border-t border-divider rounded-t-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300" style={{ height: '45%' }}>
            <div className="px-4 pt-4 pb-3 border-b border-divider flex items-center gap-3 shrink-0">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 shrink-0"><Save className="w-3.5 h-3.5 text-primary" /></div>
              <div className="flex-1"><h3 className="text-sm font-bold text-text-primary">Save Crypto Card</h3></div>
              <button onClick={() => setIsSaveDrawerOpen(false)} className="p-1.5 rounded text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-text-secondary mb-1">NAME</label>
                <input value={saveName} onChange={e => setSaveName(e.target.value)} placeholder="e.g. JWT Token Decoder..." className="w-full bg-table-headerBg border border-input-border-default rounded px-3 py-2 text-sm text-text-primary outline-none focus:border-primary" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-text-secondary mb-1">DESCRIPTION</label>
                <textarea value={saveDesc} onChange={e => setSaveDesc(e.target.value)} placeholder="What does this card do?" rows={3} className="w-full bg-table-headerBg border border-input-border-default rounded px-3 py-2 text-sm text-text-primary outline-none focus:border-primary resize-none" />
              </div>
            </div>
            <div className="px-4 py-3 border-t border-divider flex justify-end gap-2 shrink-0">
              <button onClick={() => setIsSaveDrawerOpen(false)} className="px-3 py-1.5 rounded text-xs text-text-secondary hover:text-text-primary hover:bg-sidebar-itemHover transition-colors">Cancel</button>
              <button onClick={() => { onSave?.(saveName, saveDesc); setIsSaveDrawerOpen(false); }} disabled={!saveName.trim()} className="px-4 py-1.5 rounded text-xs font-bold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all">Save</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
