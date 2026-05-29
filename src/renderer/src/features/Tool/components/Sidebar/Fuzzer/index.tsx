import { useState, useRef, useCallback, useEffect } from 'react';
import { Play, Square, Plus, Trash2, Search, Zap, X } from 'lucide-react';
import { cn } from '../../../../../shared/lib/utils';
import { NetworkRequest } from '../../../../../types/inspector';

// ── Types ─────────────────────────────────────────────────────────────────────

type PayloadType = 'list' | 'numbers' | 'brute';
type FuzzerStatus = 'idle' | 'running' | 'done' | 'stopped';

export interface FuzzerJob {
  id: string;
  name: string;
  description: string;
  method: string;
  urlTemplate: string;
  headersTemplate: string;
  bodyTemplate: string;
  payloadType: PayloadType;
  payloadList: string;
  numberFrom: number;
  numberTo: number;
  numberStep: number;
  bruteChars: string;
  bruteLen: number;
  concurrency: number;
  createdAt: number;
}

interface FuzzerResult {
  index: number;
  payload: string;
  status: number;
  time: number;
  size: number;
}

const STORAGE_KEY = 'systema-fuzzer-jobs';
const loadJobs = (): FuzzerJob[] => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } };
const saveJobs = (jobs: FuzzerJob[]) => localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));

const EMPTY_JOB: Omit<FuzzerJob, 'id' | 'createdAt'> = {
  name: '', description: '', method: 'GET',
  urlTemplate: 'https://example.com/api/user/§id§',
  headersTemplate: 'Content-Type: application/json',
  bodyTemplate: '',
  payloadType: 'numbers', payloadList: '',
  numberFrom: 1, numberTo: 100, numberStep: 1,
  bruteChars: 'abcdefghijklmnopqrstuvwxyz0123456789', bruteLen: 4,
  concurrency: 5,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function* generatePayloads(job: FuzzerJob): Generator<string> {
  if (job.payloadType === 'list') {
    for (const line of job.payloadList.split('\n')) { const p = line.trim(); if (p) yield p; }
  } else if (job.payloadType === 'numbers') {
    for (let i = job.numberFrom; i <= job.numberTo; i += job.numberStep) yield String(i);
  } else {
    const chars = job.bruteChars; const len = job.bruteLen;
    const total = Math.pow(chars.length, len);
    for (let i = 0; i < total; i++) {
      let n = i, word = '';
      for (let j = 0; j < len; j++) { word = chars[n % chars.length] + word; n = Math.floor(n / chars.length); }
      yield word;
    }
  }
}

function applyPayload(t: string, p: string) { return t.replace(/§[^§]*§/g, p); }
function parseHeaders(text: string): Record<string, string> {
  const h: Record<string, string> = {};
  for (const line of text.split('\n')) { const i = line.indexOf(':'); if (i > 0) h[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
  return h;
}
function countPayloads(job: FuzzerJob) {
  if (job.payloadType === 'list') return job.payloadList.split('\n').filter(l => l.trim()).length;
  if (job.payloadType === 'numbers') return Math.max(0, Math.floor((job.numberTo - job.numberFrom) / job.numberStep) + 1);
  return Math.pow(job.bruteChars.length, job.bruteLen);
}

function StatusBadge({ status }: { status: number }) {
  const color = !status ? 'text-red-400 bg-red-500/10' :
    status < 300 ? 'text-emerald-400 bg-emerald-500/10' :
    status < 400 ? 'text-blue-400 bg-blue-500/10' :
    status < 500 ? 'text-amber-400 bg-amber-500/10' : 'text-red-400 bg-red-500/10';
  return <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold font-mono', color)}>{status || 'ERR'}</span>;
}

// ── Add Job Drawer ────────────────────────────────────────────────────────────

function AddJobDrawer({ onClose, onSave }: { onClose: () => void; onSave: (job: FuzzerJob) => void }) {
  const [form, setForm] = useState<Omit<FuzzerJob, 'id' | 'createdAt'>>(EMPTY_JOB);
  const set = (k: keyof typeof form, v: any) => setForm(f => ({ ...f, [k]: v }));
  const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

  const handleSave = () => {
    if (!form.name.trim()) return;
    onSave({ ...form, id: crypto.randomUUID(), createdAt: Date.now() });
    onClose();
  };

  return (
    <>
      <div className="absolute inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 z-50 bg-dialog-background border-t border-divider rounded-t-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300 max-h-[85%]">
        {/* Drawer header */}
        <div className="px-4 pt-4 pb-3 border-b border-divider flex items-center gap-3 shrink-0">
          <div className="flex items-center justify-center w-9 h-10 rounded-lg bg-amber-500/15 border border-amber-500/25 shrink-0">
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-text-primary">New Fuzzer Job</h3>
            <p className="text-xs text-text-secondary mt-0.5">Cấu hình request và payload</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {/* Name + Description */}
          <div className="flex gap-2">
            <input value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Job name *" className="flex-1 h-9 bg-input-background border border-input-border-default rounded-lg px-3 text-sm text-text-primary outline-none focus:border-amber-500/50" />
            <select value={form.method} onChange={e => set('method', e.target.value)}
              className="h-9 bg-input-background border border-input-border-default rounded-lg px-2 text-sm text-text-primary outline-none">
              {methods.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <input value={form.description} onChange={e => set('description', e.target.value)}
            placeholder="Description (optional)" className="h-9 bg-input-background border border-input-border-default rounded-lg px-3 text-sm text-text-primary outline-none focus:border-amber-500/50" />

          {/* URL */}
          <div>
            <p className="text-[10px] font-bold text-text-secondary mb-1.5">URL TEMPLATE <span className="text-amber-400 font-normal">(dùng §payload§ để đánh dấu vị trí)</span></p>
            <input value={form.urlTemplate} onChange={e => set('urlTemplate', e.target.value)}
              className="w-full h-9 bg-input-background border border-input-border-default rounded-lg px-3 text-sm font-mono text-text-primary outline-none focus:border-amber-500/50" />
          </div>

          {/* Headers */}
          <div>
            <p className="text-[10px] font-bold text-text-secondary mb-1.5">HEADERS</p>
            <textarea value={form.headersTemplate} onChange={e => set('headersTemplate', e.target.value)}
              rows={2} spellCheck={false} placeholder="Header-Name: value"
              className="w-full bg-input-background border border-input-border-default rounded-lg px-3 py-2 text-xs font-mono text-text-primary outline-none focus:border-amber-500/50 resize-none" />
          </div>

          {/* Body */}
          {form.method !== 'GET' && (
            <div>
              <p className="text-[10px] font-bold text-text-secondary mb-1.5">BODY</p>
              <textarea value={form.bodyTemplate} onChange={e => set('bodyTemplate', e.target.value)}
                rows={2} spellCheck={false} placeholder='{"key": "§payload§"}'
                className="w-full bg-input-background border border-input-border-default rounded-lg px-3 py-2 text-xs font-mono text-text-primary outline-none focus:border-amber-500/50 resize-none" />
            </div>
          )}

          {/* Payload type */}
          <div>
            <p className="text-[10px] font-bold text-text-secondary mb-1.5">PAYLOAD TYPE</p>
            <div className="flex gap-1.5">
              {(['list', 'numbers', 'brute'] as PayloadType[]).map(t => (
                <button key={t} onClick={() => set('payloadType', t)}
                  className={cn('flex-1 py-1.5 rounded-lg text-xs font-bold uppercase transition-colors border',
                    form.payloadType === t ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-muted/10 text-text-secondary border-divider hover:text-text-primary')}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {form.payloadType === 'list' && (
            <textarea value={form.payloadList} onChange={e => set('payloadList', e.target.value)}
              rows={5} placeholder={"admin\nroot\ntest\n1' OR '1'='1\n<script>alert(1)</script>"}
              className="w-full bg-input-background border border-input-border-default rounded-lg px-3 py-2 text-xs font-mono text-text-primary outline-none focus:border-amber-500/50 resize-none" />
          )}

          {form.payloadType === 'numbers' && (
            <div className="flex gap-2">
              {([['From', 'numberFrom'], ['To', 'numberTo'], ['Step', 'numberStep']] as [string, keyof FuzzerJob][]).map(([label, key]) => (
                <div key={key} className="flex-1">
                  <p className="text-[10px] text-text-secondary mb-1">{label}</p>
                  <input type="number" value={form[key] as number} onChange={e => set(key, Number(e.target.value))}
                    className="w-full h-8 bg-input-background border border-input-border-default rounded-lg px-2 text-sm text-text-primary outline-none" />
                </div>
              ))}
            </div>
          )}

          {form.payloadType === 'brute' && (
            <div className="flex gap-2">
              <div className="flex-1">
                <p className="text-[10px] text-text-secondary mb-1">Charset</p>
                <input value={form.bruteChars} onChange={e => set('bruteChars', e.target.value)}
                  className="w-full h-8 bg-input-background border border-input-border-default rounded-lg px-2 text-xs font-mono text-text-primary outline-none" />
              </div>
              <div className="w-20">
                <p className="text-[10px] text-text-secondary mb-1">Length</p>
                <input type="number" min={1} max={6} value={form.bruteLen} onChange={e => set('bruteLen', Number(e.target.value))}
                  className="w-full h-8 bg-input-background border border-input-border-default rounded-lg px-2 text-sm text-text-primary outline-none" />
              </div>
            </div>
          )}

          {/* Concurrency */}
          <div className="flex items-center gap-3">
            <p className="text-[10px] font-bold text-text-secondary">CONCURRENCY</p>
            <input type="number" min={1} max={10} value={form.concurrency} onChange={e => set('concurrency', Number(e.target.value))}
              className="w-16 h-8 bg-input-background border border-input-border-default rounded-lg px-2 text-sm text-text-primary outline-none" />
            <span className="text-[10px] text-text-secondary ml-auto">{countPayloads(form as FuzzerJob).toLocaleString()} payloads</span>
          </div>
        </div>

        <div className="px-4 py-3 border-t border-divider flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-text-secondary hover:text-text-primary hover:bg-sidebar-itemHover transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={!form.name.trim()}
            className="px-5 py-2 rounded-lg text-sm font-bold bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 disabled:opacity-40 transition-colors">
            Create Job
          </button>
        </div>
      </div>
    </>
  );
}

// ── Fuzzer Panel (run view) ───────────────────────────────────────────────────

function FuzzerRunPanel({ job, onBack }: { job: FuzzerJob; onBack: () => void }) {
  const [status, setStatus] = useState<FuzzerStatus>('idle');
  const [results, setResults] = useState<FuzzerResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const stopRef = useRef(false);

  const run = useCallback(async () => {
    stopRef.current = false;
    setStatus('running'); setResults([]); setProgress(0);
    const payloads = [...generatePayloads(job)];
    setTotal(payloads.length);
    const concurrency = Math.min(job.concurrency, 10);
    let idx = 0;

    const runOne = async (payload: string, i: number): Promise<FuzzerResult> => {
      const url = applyPayload(job.urlTemplate, payload);
      const body = applyPayload(job.bodyTemplate, payload);
      const headers = parseHeaders(applyPayload(job.headersTemplate, payload));
      const t0 = performance.now();
      try {
        const res = await (window as any).api.invoke('inspector:send-request', {
          url, method: job.method, headers,
          body: job.method !== 'GET' ? body : undefined,
        });
        return { index: i, payload, status: res.status ?? 0, time: Math.round(performance.now() - t0), size: res.size ?? 0 };
      } catch {
        return { index: i, payload, status: 0, time: Math.round(performance.now() - t0), size: 0 };
      }
    };

    while (idx < payloads.length && !stopRef.current) {
      const chunk = payloads.slice(idx, idx + concurrency);
      const chunkResults = await Promise.all(chunk.map((p, ci) => runOne(p, idx + ci)));
      setResults(prev => [...prev, ...chunkResults]);
      idx += concurrency;
      setProgress(Math.min(idx, payloads.length));
    }
    setStatus(stopRef.current ? 'stopped' : 'done');
  }, [job]);

  const filtered = results.filter(r => {
    if (filterStatus && !String(r.status).startsWith(filterStatus)) return false;
    if (filterSearch && !r.payload.includes(filterSearch)) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-divider shrink-0 flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-sidebar-itemHover transition-colors">
          ←
        </button>
        <div className="flex items-center justify-center w-9 h-10 rounded-lg bg-amber-500/15 border border-amber-500/25 shrink-0">
          <Zap className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-text-primary truncate">{job.name}</h2>
          <p className="text-xs text-text-secondary mt-0.5">{job.method} · {countPayloads(job).toLocaleString()} payloads</p>
        </div>
        {status === 'running' ? (
          <button onClick={() => stopRef.current = true}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 text-xs font-bold transition-colors">
            <Square className="w-3.5 h-3.5" /> Stop
          </button>
        ) : (
          <button onClick={run}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold transition-colors">
            <Play className="w-3.5 h-3.5" /> Run
          </button>
        )}
      </div>

      {/* Progress */}
      {status !== 'idle' && (
        <div className="px-3 py-2 border-b border-divider shrink-0 flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-muted/30 rounded-full overflow-hidden">
            <div className="h-full bg-amber-400 transition-all" style={{ width: total ? `${(progress / total) * 100}%` : '0%' }} />
          </div>
          <span className="text-[10px] text-text-secondary shrink-0">{progress}/{total}</span>
          <span className={cn('text-[10px] font-bold shrink-0',
            status === 'running' ? 'text-amber-400' : status === 'done' ? 'text-emerald-400' : 'text-red-400')}>
            {status.toUpperCase()}
          </span>
        </div>
      )}

      {/* Filter */}
      {results.length > 0 && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b border-divider shrink-0">
          <Search className="w-3 h-3 text-text-secondary shrink-0" />
          <input value={filterSearch} onChange={e => setFilterSearch(e.target.value)}
            placeholder="Filter payload..." className="flex-1 bg-transparent text-xs text-text-primary outline-none" />
          <input value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            placeholder="Status" className="w-14 bg-transparent text-xs text-text-primary outline-none text-right" />
          <span className="text-[10px] text-text-secondary shrink-0">{filtered.length}</span>
        </div>
      )}

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {status === 'idle' && (
          <div className="flex flex-col items-center justify-center h-full text-text-secondary gap-2">
            <Play className="w-6 h-6 opacity-20" />
            <p className="text-xs">Press Run to start fuzzing</p>
          </div>
        )}
        {filtered.length > 0 && (
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-table-headerBg border-b border-divider">
              <tr>
                <th className="text-left px-3 py-1.5 text-[10px] font-bold text-text-secondary w-10">#</th>
                <th className="text-left px-2 py-1.5 text-[10px] font-bold text-text-secondary">Payload</th>
                <th className="text-left px-2 py-1.5 text-[10px] font-bold text-text-secondary w-14">Status</th>
                <th className="text-right px-2 py-1.5 text-[10px] font-bold text-text-secondary w-14">Time</th>
                <th className="text-right px-3 py-1.5 text-[10px] font-bold text-text-secondary w-14">Size</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.index} className="border-b border-divider/30 hover:bg-sidebar-itemHover/30 transition-colors">
                  <td className="px-3 py-1 text-text-secondary font-mono">{r.index + 1}</td>
                  <td className="px-2 py-1 font-mono text-text-primary truncate max-w-[120px]">{r.payload}</td>
                  <td className="px-2 py-1"><StatusBadge status={r.status} /></td>
                  <td className="px-2 py-1 text-right text-text-secondary">{r.time}ms</td>
                  <td className="px-3 py-1 text-right text-text-secondary">{r.size}B</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// ── Fuzzer Manager ────────────────────────────────────────────────────────────

export function FuzzerPanel({ requests, isTargetRunning }: { requests?: NetworkRequest[]; isTargetRunning?: boolean }) {
  const [jobs, setJobs] = useState<FuzzerJob[]>(loadJobs);
  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<FuzzerJob | null>(null);

  const addJob = (job: FuzzerJob) => {
    const updated = [job, ...jobs];
    setJobs(updated); saveJobs(updated);
  };

  const deleteJob = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = jobs.filter(j => j.id !== id);
    setJobs(updated); saveJobs(updated);
    if (selectedJob?.id === id) setSelectedJob(null);
  };

  const filtered = jobs.filter(j =>
    !search || j.name.toLowerCase().includes(search.toLowerCase()) || j.description.toLowerCase().includes(search.toLowerCase())
  );

  if (selectedJob) return <FuzzerRunPanel job={selectedJob} onBack={() => setSelectedJob(null)} />;

  return (
    <div className="flex flex-col h-full bg-table-bodyBg relative">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-divider shrink-0 flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-10 rounded-lg bg-amber-500/15 border border-amber-500/25 shrink-0">
          <Zap className="w-4 h-4 text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-text-primary">Fuzzer Manager</h2>
          <p className="text-xs text-text-secondary mt-0.5">Spam HTTPS với nhiều payload</p>
        </div>
      </div>

      {/* Search + Add */}
      <div className="px-3 py-2 border-b border-divider flex gap-2 items-center shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search jobs..."
            className="w-full h-11 bg-input-background border border-input-border-default rounded-lg pl-8 pr-3 text-sm text-text-primary focus:border-amber-500/50 outline-none" />
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          disabled={!isTargetRunning}
          title={!isTargetRunning ? 'Vui lòng start target trước' : 'Tạo Fuzzer Job mới'}
          className="flex items-center justify-center w-11 h-11 rounded-lg border transition-all active:scale-95 shrink-0 bg-secondary hover:bg-amber-500/20 hover:text-amber-400 text-text-secondary border-divider hover:border-amber-500/30 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-secondary disabled:hover:text-text-secondary disabled:hover:border-divider disabled:active:scale-100"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Job cards */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 py-20 gap-3">
            <div className="w-14 h-14 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <Zap className="w-7 h-7 text-amber-400/50" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-text-primary">No Fuzzer Jobs</p>
              <p className="text-xs text-text-secondary mt-0.5">Click + to create a new job</p>
            </div>
          </div>
        ) : filtered.map(job => (
          <div key={job.id} onClick={() => setSelectedJob(job)}
            className="group rounded-xl border border-divider bg-muted/10 p-3 flex items-start gap-2.5 cursor-pointer hover:border-amber-500/40 hover:bg-amber-500/5 transition-all">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/20 flex items-center justify-center shrink-0">
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-text-primary truncate">{job.name}</p>
              <p className="text-[10px] text-text-secondary truncate mt-0.5 font-mono">{job.urlTemplate}</p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/30 text-text-secondary font-bold">{job.method}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 font-bold">{job.payloadType}</span>
                <span className="text-[10px] text-text-secondary">{countPayloads(job).toLocaleString()} payloads</span>
              </div>
            </div>
            <button onClick={e => deleteJob(job.id, e)}
              className="p-1.5 rounded-lg text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100 shrink-0">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {/* Add drawer */}
      {drawerOpen && <AddJobDrawer onClose={() => setDrawerOpen(false)} onSave={addJob} />}
    </div>
  );
}
