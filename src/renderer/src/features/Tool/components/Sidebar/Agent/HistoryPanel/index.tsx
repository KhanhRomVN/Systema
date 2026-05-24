import { useState, useEffect, useCallback } from 'react';
import { Search, Trash2, FolderOpen, Loader2, X, Zap, History } from 'lucide-react';
import { cn } from '../../../../../../shared/lib/utils';
import { ChatSession } from '../HomePanel/index';
import { ConversationService } from '../../../../../../services/ConversationService';

// Keep localStorage helpers for backward compat (addToHistory still used by HomePanel for metadata)
const STORAGE_KEY = 'khanhromvn-systema-agent-history';

export function loadHistory(): ChatSession[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
}

export function saveHistory(sessions: ChatSession[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
}

export function addToHistory(session: ChatSession) {
  const existing = loadHistory();
  const filtered = existing.filter((s) => s.id !== session.id);
  saveHistory([session, ...filtered].slice(0, 200));
}

export function deleteFromHistory(id: string) {
  saveHistory(loadHistory().filter((s) => s.id !== id));
}

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadSession: (session: ChatSession) => void;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getDateLabel(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dateStr = `${dd}/${mm}`;
  if (date.toDateString() === now.toDateString()) return `Today · ${dateStr}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday · ${dateStr}`;
  return `${date.toLocaleDateString('en-US', { weekday: 'long' })} · ${dateStr}`;
}

function getTokenColor(n: number) {
  if (n >= 500000) return 'bg-red-500/15 border-red-500/40 text-red-400';
  if (n >= 100000) return 'bg-orange-500/15 border-orange-500/40 text-orange-400';
  if (n >= 50000) return 'bg-yellow-500/15 border-yellow-500/40 text-yellow-600';
  if (n >= 10000) return 'bg-green-500/15 border-green-500/40 text-green-600';
  return 'bg-indigo-500/15 border-indigo-500/40 text-indigo-400';
}

export function HistoryPanel({ isOpen, onClose, onLoadSession }: HistoryPanelProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await ConversationService.getHistory();
      setSessions(data.map((m) => ({
        id: m.id,
        title: m.title,
        timestamp: m.timestamp,
        messageCount: m.messageCount,
        preview: m.title,
        requestCount: m.requestCount,
        provider: m.provider,
        conversationId: m.id, // file name IS the conversationId
      })));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) load();
  }, [isOpen, load]);

  if (!isOpen) return null;

  const filtered = sessions.filter(
    (s) =>
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.preview.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const groups: { label: string; items: ChatSession[] }[] = [];
  filtered.forEach((s) => {
    const label = getDateLabel(s.timestamp);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(s);
    else groups.push({ label, items: [s] });
  });

  const handleDelete = (id: string) => {
    ConversationService.delete(id);
    deleteFromHistory(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  };

  const handleClearAll = () => {
    ConversationService.deleteAll();
    saveHistory([]);
    setSessions([]);
    setShowConfirm(false);
  };

  return (
    <div className="absolute inset-0 z-50 flex flex-col bg-table-bodyBg">
      {/* Head Panel - same pattern as other panels */}
      <div className="px-4 pt-4 pb-3 border-b border-border shrink-0 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg shrink-0 flex items-center justify-center bg-indigo-500/15 border border-indigo-500/25">
            <History className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-sm font-bold text-foreground">History</span>
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
                {sessions.length}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground/70 leading-snug">Browse past conversations</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-md text-muted-foreground hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/40 transition-all shrink-0"
          title="Close"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Search + Clear */}
      <div className="px-3 py-2 border-b border-border flex gap-2 items-center shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-muted border border-border rounded-md outline-none focus:border-primary/50 text-foreground placeholder:text-muted-foreground/50"
          />
        </div>
        <button
          onClick={() => setShowConfirm(true)}
          className="p-1.5 rounded-md text-muted-foreground hover:text-yellow-400 hover:bg-yellow-500/10 border border-transparent hover:border-yellow-500/40 transition-all shrink-0"
          title="Clear all history"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Confirm modal */}
      {showConfirm && (
        <div className="absolute inset-0 z-[100] bg-black/50 flex items-center justify-center">
          <div className="bg-popover border border-border rounded-xl p-5 w-[calc(100%-32px)] flex flex-col gap-3">
            <p className="text-sm font-semibold text-foreground">Clear all history?</p>
            <p className="text-xs text-muted-foreground">This will permanently delete all conversations.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowConfirm(false)} className="px-3 py-1.5 text-xs rounded-md border border-border text-muted-foreground hover:bg-muted/50 transition-colors">
                Cancel
              </button>
              <button onClick={handleClearAll} className="px-3 py-1.5 text-xs rounded-md border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto p-3" onClick={() => setContextMenu(null)}>
        {isLoading ? (
          <div className="flex items-center justify-center h-40 gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            <span className="text-xs">Loading...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground gap-3">
            <FolderOpen className="w-10 h-10 opacity-20" />
            <div className="text-center">
              <p className="text-xs font-medium opacity-70">{searchQuery ? 'No results found' : 'No conversations yet'}</p>
              <p className="text-[10px] opacity-50 mt-1">{searchQuery ? 'Try a different search term' : 'Start a new chat to begin'}</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {groups.map((group) => (
              <div key={group.label}>
                <div className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-widest px-2 py-1.5">
                  {group.label}
                </div>
                {group.items.map((session) => (
                  <div
                    key={session.id}
                    className="relative w-full rounded-md hover:bg-muted/40 cursor-pointer transition-colors"
                    onClick={() => { onLoadSession(session); onClose(); }}
                    onContextMenu={(e) => { e.preventDefault(); setContextMenu({ id: session.id, x: e.clientX, y: e.clientY }); }}
                  >
                    <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                      <span className="text-xs font-medium text-foreground truncate flex-1">
                        {session.title.length > 60 ? session.title.slice(0, 57) + '...' : session.title}
                      </span>
                      {(session.requestCount ?? 0) > 0 && (
                        <div className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded border text-[10px] font-bold shrink-0', getTokenColor(session.requestCount ?? 0))}>
                          <Zap className="w-2.5 h-2.5" />
                          <span>{session.requestCount}</span>
                        </div>
                      )}
                    </div>
                    <div className="px-2.5 pb-1.5 text-[10px] text-muted-foreground/60 truncate">
                      {formatDate(session.timestamp)} · {session.messageCount} msgs
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-[200] bg-popover border border-border rounded-lg shadow-xl py-1 min-w-[140px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
            onClick={() => { handleDelete(contextMenu.id); setContextMenu(null); }}
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
