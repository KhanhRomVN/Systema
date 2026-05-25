import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ArrowRightLeft, Search, X, Plus, Save, FolderOpen, Trash2, ChevronDown } from 'lucide-react';
import { cn } from '../../../../../shared/lib/utils';
import { NetworkRequest } from '../../../../../types/inspector';
import { InspectorContext } from '../index';
import { DiffView } from './DiffView';

interface ComparePanelProps {
  inspectorContext: InspectorContext;
}

interface SavedCompare {
  id: string;
  name: string;
  desc?: string;
  url1: string;
  url2: string;
  createdAt: number;
}

const STORAGE_KEY = 'systema-compares-global';

function loadSavedCompares(): SavedCompare[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveSavedCompares(compares: SavedCompare[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(compares));
}

export function ComparePanel({ inspectorContext }: ComparePanelProps) {
  if (inspectorContext.compareRequest1 || inspectorContext.compareRequest2) {
    const handleSaveTempCompare = (name: string, desc: string) => {
      const req1 = inspectorContext.compareRequest1;
      const req2 = inspectorContext.compareRequest2;
      if (!req1 || !req2) return;

      const url1 = `${req1.host}${req1.path}`;
      const url2 = `${req2.host}${req2.path}`;

      const newCompare: SavedCompare = {
        id: crypto.randomUUID(),
        name,
        url1,
        url2,
        createdAt: Date.now(),
      };

      const saved = loadSavedCompares();
      const updated = [...saved, newCompare];
      saveSavedCompares(updated);
      
      // Optional: show notification or refresh UI
      console.log(`Saved comparison: ${name}`);
    };

    return (
      <DiffView
        request1={inspectorContext.compareRequest1 || null}
        request2={inspectorContext.compareRequest2 || null}
        onClose={() => inspectorContext.onClearComparison?.()}
        initialTab={inspectorContext.initialDiffTab}
        initialSearchTerm={inspectorContext.initialDiffSearch}
        isTempDiff={true}
        onSaveCompare={handleSaveTempCompare}
      />
    );
  }

  const [savedCompares, setSavedCompares] = useState<SavedCompare[]>(loadSavedCompares);
  const [savedSearchTerm, setSavedSearchTerm] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [newCompareName, setNewCompareName] = useState('');
  const [newCompareDesc, setNewCompareDesc] = useState('');
  const [selectedUrl1, setSelectedUrl1] = useState('');
  const [selectedUrl2, setSelectedUrl2] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const requests = inspectorContext.requests || [];

  // Filter saved compares by search term
  const filteredSavedCompares = useMemo(() => {
    if (!savedSearchTerm.trim()) return savedCompares;
    const term = savedSearchTerm.toLowerCase();
    return savedCompares.filter((c) => c.name.toLowerCase().includes(term));
  }, [savedCompares, savedSearchTerm]);

  // Get unique URLs from requests for dropdown
  const uniqueUrls = useMemo(() => {
    const urlMap = new Map<string, NetworkRequest>();
    requests.forEach((req) => {
      const url = `${req.host}${req.path}`;
      if (!urlMap.has(url)) {
        urlMap.set(url, req);
      }
    });
    return Array.from(urlMap.entries()).map(([url, req]) => ({
      url,
      method: req.method,
      host: req.host,
      path: req.path,
      status: req.status,
    }));
  }, [requests]);

  const handleCreateCompare = () => {
    const name = newCompareName.trim();
    if (!name || !selectedUrl1 || !selectedUrl2) return;

    const newCompare: SavedCompare = {
      id: crypto.randomUUID(),
      name,
      desc: newCompareDesc.trim() || undefined,
      url1: selectedUrl1,
      url2: selectedUrl2,
      createdAt: Date.now(),
    };

    const updated = [...savedCompares, newCompare];
    setSavedCompares(updated);
    saveSavedCompares(updated);
    setNewCompareName('');
    setNewCompareDesc('');
    setSelectedUrl1('');
    setSelectedUrl2('');
    setDrawerOpen(false);
  };

  const handleDeleteCompare = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedCompares.filter((c) => c.id !== id);
    setSavedCompares(updated);
    saveSavedCompares(updated);
  };

  const handleLoadCompare = (compare: SavedCompare) => {
    // Find requests by URL and trigger comparison
    const req1 = requests.find((r) => `${r.host}${r.path}` === compare.url1);
    const req2 = requests.find((r) => `${r.host}${r.path}` === compare.url2);
    if (req1 && req2) {
      inspectorContext.onCompareRequests?.(req1, req2);
    }
  };

  useEffect(() => {
    if (drawerOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [drawerOpen]);

  // Combobox component for URL selection
  const Combobox = useCallback(({ items, value, onChange, placeholder }: {
    items: Array<{ url: string; method: string; host: string; path: string; status: number }>;
    value: string;
    onChange: (url: string) => void;
    placeholder: string;
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Filter items based on search term
    const filteredItems = useMemo(() => {
      if (!searchTerm.trim()) return items;
      const term = searchTerm.toLowerCase();
      return items.filter(item =>
        item.url.toLowerCase().includes(term) ||
        item.method.toLowerCase().includes(term) ||
        item.host.toLowerCase().includes(term) ||
        item.path.toLowerCase().includes(term) ||
        String(item.status).includes(term)
      );
    }, [items, searchTerm]);

    // Find selected item display
    const selectedItem = items.find(item => item.url === value);

    // Handle click outside to close dropdown
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (url: string) => {
      onChange(url);
      setSearchTerm('');
      setIsOpen(false);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
      setIsOpen(true);
    };

    const handleFocus = () => {
      setIsOpen(true);
    };

    return (
      <div ref={containerRef} className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={searchTerm || (selectedItem ? `[${selectedItem.method}] ${selectedItem.host}${selectedItem.path} (${selectedItem.status})` : '')}
            onChange={handleInputChange}
            onFocus={handleFocus}
            placeholder={placeholder}
            className="w-full bg-table-headerBg border border-input-border-default rounded-lg px-3 py-2.5 pr-8 text-sm text-text-primary outline-none focus:border-primary font-mono"
          />
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-text-secondary hover:text-text-primary"
          >
            <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
          </button>
        </div>
        
        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute z-50 w-full mt-1 bg-dialog-background border border-divider rounded-lg shadow-lg max-h-64 overflow-y-auto"
          >
            {filteredItems.length === 0 ? (
              <div className="px-3 py-2 text-xs text-text-secondary">No matching requests</div>
            ) : (
              filteredItems.map((item) => (
                <button
                  key={item.url}
                  onClick={() => handleSelect(item.url)}
                  className={cn(
                    "w-full text-left px-3 py-2 hover:bg-sidebar-itemHover transition-colors border-b border-divider/50 last:border-0",
                    value === item.url && "bg-primary/10"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded",
                      item.method === 'GET' && "text-blue-400 bg-blue-500/10",
                      item.method === 'POST' && "text-green-400 bg-green-500/10",
                      item.method === 'PUT' && "text-orange-400 bg-orange-500/10",
                      item.method === 'DELETE' && "text-red-400 bg-red-500/10",
                    )}>
                      {item.method}
                    </span>
                    <span className={cn(
                      "text-[10px] font-mono",
                      item.status >= 200 && item.status < 300 && "text-green-400",
                      item.status >= 300 && item.status < 400 && "text-yellow-400",
                      item.status >= 400 && "text-red-400",
                    )}>
                      {item.status}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-text-primary truncate mt-1">
                    {item.host}{item.path}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    );
  }, []);

  return (
    <div className="h-full flex flex-col bg-table-bodyBg">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-divider shrink-0 flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-10 rounded-lg bg-purple-500/15 border border-purple-500/25 shrink-0">
          <ArrowRightLeft className="w-4 h-4 text-purple-400" />
        </div>
        <div>
          <h2 className="text-base font-bold text-text-primary">Compare Requests</h2>
          <p className="text-xs text-text-secondary mt-0.5">Diff two requests side by side</p>
        </div>
        
      </div>

      {/* Saved Compares Section */}
      <div className="px-3 pt-3 pb-2 border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
            <input
              type="text"
              placeholder="Search saved compares..."
              value={savedSearchTerm}
              onChange={(e) => setSavedSearchTerm(e.target.value)}
              className="w-full h-11 bg-input-background border border-input-border-default rounded-lg pl-8 pr-3 text-sm text-text-primary focus:border-primary/50 outline-none"
            />
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            disabled={!inspectorContext.appId}
            className={cn(
              "flex items-center justify-center w-11 h-11 rounded-lg border transition-all active:scale-95 shrink-0",
              inspectorContext.appId
                ? "bg-secondary hover:bg-primary/20 hover:text-primary text-text-secondary border-divider hover:border-primary/30"
                : "bg-zinc-800/50 text-zinc-600 border-zinc-800/80 cursor-not-allowed opacity-50"
            )}
            title={inspectorContext.appId ? "New Compare" : "Select a target first"}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {filteredSavedCompares.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filteredSavedCompares.map((compare) => (
              <div
                key={compare.id}
                onClick={() => handleLoadCompare(compare)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-muted/20 border border-border hover:bg-purple-500/10 hover:border-purple-500/30 cursor-pointer transition-all group shrink-0"
              >
                <FolderOpen className="w-3 h-3 text-purple-400" />
                <span className="text-xs font-medium truncate max-w-[120px]">{compare.name}</span>
                <button
                  onClick={(e) => handleDeleteCompare(compare.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/20 hover:text-red-500 transition-all"
                >
                  <Trash2 className="w-2.5 h-2.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Empty state - saved compares only */}
      {savedCompares.length === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          <div className="w-16 h-16 rounded-xl bg-purple-500/15 flex items-center justify-center mx-auto mb-4 border border-purple-500/25">
            <ArrowRightLeft className="w-8 h-8 text-purple-400" />
          </div>
          <p className="text-sm text-text-primary font-medium">No Saved Compares</p>
          <p className="text-xs text-text-secondary mt-1 text-center">
            Click the + button to save a pair of requests
          </p>
        </div>
      )}

      {/* Create Compare Drawer */}
      {drawerOpen && (
        <>
          <div className="absolute inset-0 bg-black/40 z-40" onClick={() => setDrawerOpen(false)} />
          <div
            className="absolute bottom-0 left-0 right-0 z-50 bg-dialog-background border-t border-divider rounded-t-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300"
            style={{ height: '60%' }}
          >
            {/* Header */}
            <div className="px-4 pt-4 pb-3 border-b border-divider flex items-center gap-3 shrink-0">
              <div className="flex items-center justify-center w-9 h-10 rounded-lg bg-purple-500/15 border border-purple-500/25 shrink-0">
                <Save className="w-4 h-4 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-text-primary">Save Compare</h3>
                <p className="text-xs text-text-secondary mt-0.5">Name and select two requests</p>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg bg-secondary text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">COMPARE NAME</label>
                <input
                  ref={inputRef}
                  type="text"
                  value={newCompareName}
                  onChange={(e) => setNewCompareName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateCompare()}
                  placeholder="e.g. Login API Comparison"
                  className="w-full bg-table-headerBg border border-input-border-default rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">DESCRIPTION (OPTIONAL)</label>
                <textarea
                  value={newCompareDesc}
                  onChange={(e) => setNewCompareDesc(e.target.value)}
                  placeholder="Add a description for this comparison..."
                  rows={3}
                  className="w-full bg-table-headerBg border border-input-border-default rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">REQUEST A (URL)</label>
                <Combobox
                  items={uniqueUrls}
                  value={selectedUrl1}
                  onChange={setSelectedUrl1}
                  placeholder="Search and select a request..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">REQUEST B (URL)</label>
                <Combobox
                  items={uniqueUrls}
                  value={selectedUrl2}
                  onChange={setSelectedUrl2}
                  placeholder="Search and select a request..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-divider flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setDrawerOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-sidebar-itemHover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCompare}
                disabled={!newCompareName.trim() || !selectedUrl1 || !selectedUrl2}
                className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                Save Compare
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}