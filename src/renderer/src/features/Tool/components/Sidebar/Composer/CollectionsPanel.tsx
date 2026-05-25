import { useState, useEffect } from 'react';
import { Trash2, Plus, Search, Bookmark, X } from 'lucide-react';
import { cn } from '../../../../../shared/lib/utils';
import {
  getOrCreateDefaultCollection,
  deleteRequestFromCollection,
  addRequestToDefaultCollection,
  RequestCollection,
  COLLECTIONS_UPDATED_EVENT,
} from '../../../../../utils/collections';
import { NetworkRequest } from '../../../../../types/inspector';
import { EmptyState } from '../EmptyState';

interface CollectionsPanelProps {
  onSelectRequest?: (request: NetworkRequest) => void;
  appId: string;
  requests?: NetworkRequest[];
}

export function CollectionsPanel({ onSelectRequest, appId, requests = [] }: CollectionsPanelProps) {
  const [collection, setCollection] = useState<RequestCollection | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [requestSearchTerm, setRequestSearchTerm] = useState('');
  const [showRequestDropdown, setShowRequestDropdown] = useState(false);

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener(COLLECTIONS_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(COLLECTIONS_UPDATED_EVENT, handleUpdate);
  }, []);

  const loadData = () => {
    setCollection(getOrCreateDefaultCollection(appId));
  };

  const handleDeleteRequest = (requestId: string) => {
    if (!collection) return;
    deleteRequestFromCollection(appId, collection.id, requestId);
    loadData();
  };

  const handleCreateCollection = () => {
    if (selectedRequestId) {
      const request = requests.find(r => r.id === selectedRequestId);
      if (request) {
        addRequestToDefaultCollection(appId, request);
        loadData();
      }
    }
    setIsDrawerOpen(false);
    setNewCollectionName('');
    setSelectedRequestId(null);
    setRequestSearchTerm('');
  };

  const filteredRequestsForDropdown = requests.filter(r => {
    const searchLower = requestSearchTerm.toLowerCase();
    return (
      r.method?.toLowerCase().includes(searchLower) ||
      r.host?.toLowerCase().includes(searchLower) ||
      r.path?.toLowerCase().includes(searchLower) ||
      String(r.status).includes(searchLower)
    );
  }).slice(0, 20);

  const filteredCollectionRequests = collection?.requests.filter(r => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      r.method?.toLowerCase().includes(searchLower) ||
      r.host?.toLowerCase().includes(searchLower) ||
      r.path?.toLowerCase().includes(searchLower)
    );
  }) || [];

  if (!collection) {
    return null;
  }

  const hasRequests = filteredCollectionRequests.length > 0;

  return (
    <div className="h-full flex flex-col bg-table-bodyBg">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-divider shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-10 rounded-lg bg-orange-500/15 border border-orange-500/25 shrink-0">
            <Bookmark className="w-4 h-4 text-orange-400" />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-text-primary">Composers Manager</h2>
            <p className="text-xs text-text-secondary mt-0.5">Save and manage your composed requests</p>
          </div>
        </div>
      </div>

      {/* Search and Add Bar */}
      <div className="px-3 py-2 border-b border-divider flex gap-2 items-center shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
          <input
            type="text"
            placeholder="Search saved requests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-11 bg-input-background border border-input-border-default rounded-lg pl-8 pr-3 text-sm text-text-primary focus:border-primary/50 outline-none"
          />
        </div>
        <button
          onClick={() => setIsDrawerOpen(true)}
          disabled={!appId}
          className={cn(
            "flex items-center justify-center w-11 h-11 rounded-lg border transition-all active:scale-95 shrink-0",
            appId
              ? "bg-secondary hover:bg-primary/20 hover:text-primary text-text-secondary border-divider hover:border-primary/30"
              : "bg-zinc-800/50 text-zinc-600 border-zinc-800/80 cursor-not-allowed opacity-50"
          )}
          title={appId ? "Add to collection" : "Select a target first"}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Collection List */}
      <div className="flex-1 overflow-auto p-2">
        {!hasRequests ? (
          <EmptyState
            icon={<Bookmark className="w-8 h-8" />}
            title="No saved requests"
            description="Click the + button to add requests to your collection"
            iconColor="text-orange-400"
            iconBgColor="bg-orange-500/15"
          />
        ) : (
          <div className="space-y-2">
            {filteredCollectionRequests.map((request) => (
              <div
                key={request.id}
                className={cn(
                  'p-3 rounded transition-all cursor-pointer group',
                  selectedId === request.id
                    ? 'bg-muted/50 border-2 border-dashed border-primary'
                    : 'bg-muted/30 hover:bg-muted/50 border border-border/50',
                )}
                onClick={() => {
                  setSelectedId(request.id);
                  onSelectRequest?.(request);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'text-[10px] font-bold',
                          request.method === 'GET' && 'text-blue-500',
                          request.method === 'POST' && 'text-green-500',
                          request.method === 'PUT' && 'text-orange-500',
                          request.method === 'DELETE' && 'text-red-500',
                        )}
                      >
                        {request.method}
                      </span>
                    </div>
                    <div className="text-xs font-mono truncate text-foreground/90">
                      {request.protocol}://{request.host}
                      {request.path}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteRequest(request.id);
                    }}
                    className="p-1.5 text-red-500 rounded transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add to Collection Drawer */}
      {isDrawerOpen && (
        <>
          <div className="absolute inset-0 bg-black/40 z-40" onClick={() => setIsDrawerOpen(false)} />
          <div
            className="absolute bottom-0 left-0 right-0 z-50 bg-dialog-background border-t border-divider rounded-t-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300"
            style={{ height: '60%' }}
          >
            <div className="px-4 pt-4 pb-3 border-b border-divider flex items-center gap-3 shrink-0">
              <div className="flex items-center justify-center w-9 h-10 rounded-lg bg-orange-500/15 border border-orange-500/25 shrink-0">
                <Plus className="w-4 h-4 text-orange-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-text-primary">Add to Collection</h3>
                <p className="text-xs text-text-secondary mt-0.5">Save a request to your collection</p>
              </div>
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="p-1.5 rounded-lg bg-secondary text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">
                  COLLECTION NAME <span className="text-text-secondary/50">(optional)</span>
                </label>
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="e.g. API Endpoints, Login Flow..."
                  className="w-full bg-table-headerBg border border-input-border-default rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">SELECT REQUEST</label>
                <div className="relative">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary pointer-events-none" />
                    <input
                      type="text"
                      value={requestSearchTerm}
                      onChange={(e) => {
                        setRequestSearchTerm(e.target.value);
                        setShowRequestDropdown(true);
                      }}
                      onFocus={() => setShowRequestDropdown(true)}
                      placeholder="Search requests by URL, method, status..."
                      className="w-full bg-table-headerBg border border-input-border-default rounded-lg pl-8 pr-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary"
                    />
                  </div>
                  {showRequestDropdown && filteredRequestsForDropdown.length > 0 && (
                    <div className="absolute z-10 left-0 right-0 mt-1 bg-dialog-background border border-divider rounded-lg shadow-xl max-h-64 overflow-y-auto">
                      {filteredRequestsForDropdown.map((req) => (
                        <div
                          key={req.id}
                          className={cn(
                            'px-3 py-2 cursor-pointer hover:bg-sidebar-itemHover transition-colors border-b border-divider/50 last:border-b-0',
                            selectedRequestId === req.id && 'bg-primary/10'
                          )}
                          onClick={() => {
                            setSelectedRequestId(req.id);
                            setRequestSearchTerm(`${req.method} ${req.host}${req.path}`);
                            setShowRequestDropdown(false);
                          }}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'text-[10px] font-bold px-1.5 py-0.5 rounded',
                                req.method === 'GET' && 'text-blue-400 bg-blue-500/10',
                                req.method === 'POST' && 'text-green-400 bg-green-500/10',
                                req.method === 'PUT' && 'text-orange-400 bg-orange-500/10',
                                req.method === 'DELETE' && 'text-red-400 bg-red-500/10',
                              )}
                            >
                              {req.method}
                            </span>
                            <span
                              className={cn(
                                'text-[10px] font-mono',
                                req.status >= 200 && req.status < 300 && 'text-green-400',
                                req.status >= 300 && req.status < 400 && 'text-orange-400',
                                req.status >= 400 && 'text-red-400',
                              )}
                            >
                              {req.status}
                            </span>
                          </div>
                          <div className="text-xs font-mono truncate text-text-secondary mt-1">
                            {req.host}{req.path}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-text-secondary mt-1.5 italic">
                  Select a request from the list above
                </p>
              </div>
            </div>

            <div className="px-5 py-4 border-t border-divider flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setIsDrawerOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-sidebar-itemHover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCollection}
                disabled={!selectedRequestId}
                className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                Add to Collection
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}