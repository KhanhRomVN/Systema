import { useState, useEffect } from 'react';
import { BookmarkPlus, Trash2, Play, FolderPlus, Edit2, Save, X } from 'lucide-react';
import { cn } from '../../../shared/lib/utils';
import {
  loadCollections,
  createCollection,
  deleteCollection,
  deleteRequestFromCollection,
  renameCollection,
  addRequestToCollection,
  replayRequest,
  RequestCollection,
  SavedRequest,
} from '../utils/collections';
import { NetworkRequest } from '../types';

interface CollectionsTabProps {
  onSelectRequest?: (id: string) => void;
  currentRequest?: NetworkRequest | null;
}

export function CollectionsTab({ onSelectRequest, currentRequest }: CollectionsTabProps) {
  const [collections, setCollections] = useState<RequestCollection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setCollections(loadCollections());
  };

  const handleCreateCollection = () => {
    if (!newCollectionName.trim()) return;
    createCollection(newCollectionName.trim());
    setNewCollectionName('');
    setIsCreating(false);
    loadData();
  };

  const handleDeleteCollection = (id: string) => {
    if (confirm('Are you sure you want to delete this collection?')) {
      deleteCollection(id);
      if (selectedCollection === id) {
        setSelectedCollection(null);
      }
      loadData();
    }
  };

  const handleRename = (id: string) => {
    if (!editName.trim()) return;
    renameCollection(id, editName.trim());
    setEditingId(null);
    setEditName('');
    loadData();
  };

  const handleAddCurrentRequest = () => {
    if (!currentRequest || !selectedCollection) return;
    addRequestToCollection(selectedCollection, currentRequest);
    loadData();
  };

  const handleReplay = async (request: SavedRequest) => {
    try {
      const response = await replayRequest(request);
      console.log('Replay response:', response);
      // You could add more UI feedback here
    } catch (error) {
      console.error('Failed to replay request:', error);
    }
  };

  const handleDeleteRequest = (collectionId: string, requestId: string) => {
    deleteRequestFromCollection(collectionId, requestId);
    loadData();
  };

  const selectedCollectionData = collections.find((c) => c.id === selectedCollection);

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="h-12 border-b border-border flex items-center justify-between px-4">
        <h2 className="text-sm font-medium">Request Collections</h2>
        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs bg-primary/10 text-primary hover:bg-primary/20 rounded transition-colors"
        >
          <FolderPlus className="w-3.5 h-3.5" />
          New Collection
        </button>
      </div>

      {isCreating && (
        <div className="p-4 border-b border-border bg-muted/20">
          <div className="flex gap-2">
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="Collection name..."
              className="flex-1 px-3 py-1.5 text-xs bg-background border border-border rounded outline-none focus:border-primary"
              onKeyDown={(e) => e.key === 'Enter' && handleCreateCollection()}
              autoFocus
            />
            <button
              onClick={handleCreateCollection}
              className="px-3 py-1.5 text-xs bg-green-500/20 text-green-500 hover:bg-green-500/30 rounded transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                setIsCreating(false);
                setNewCollectionName('');
              }}
              className="px-3 py-1.5 text-xs bg-red-500/20 text-red-500 hover:bg-red-500/30 rounded transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Collections List */}
        <div className="w-64 border-r border-border overflow-auto">
          <div className="p-2">
            {collections.length === 0 ? (
              <div className="text-center text-muted-foreground text-xs p-4">
                No collections yet. Create one to get started!
              </div>
            ) : (
              collections.map((collection) => (
                <div key={collection.id} className="mb-1">
                  {editingId === collection.id ? (
                    <div className="flex gap-1 p-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-2 py-1 text-xs bg-background border border-border rounded outline-none"
                        onKeyDown={(e) => e.key === 'Enter' && handleRename(collection.id)}
                        autoFocus
                      />
                      <button
                        onClick={() => handleRename(collection.id)}
                        className="p-1 text-green-500 hover:bg-green-500/20 rounded"
                      >
                        <Save className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => {
                          setEditingId(null);
                          setEditName('');
                        }}
                        className="p-1 text-red-500 hover:bg-red-500/20 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => setSelectedCollection(collection.id)}
                      className={cn(
                        'p-2 rounded cursor-pointer transition-colors group',
                        selectedCollection === collection.id
                          ? 'bg-primary/20 text-primary'
                          : 'hover:bg-muted',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium truncate">{collection.name}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {collection.requests.length} requests
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingId(collection.id);
                              setEditName(collection.name);
                            }}
                            className="p-1 hover:bg-blue-500/20 text-blue-500 rounded"
                            title="Rename"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCollection(collection.id);
                            }}
                            className="p-1 hover:bg-red-500/20 text-red-500 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Collection Details */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {!selectedCollectionData ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
              Select a collection to view requests
            </div>
          ) : (
            <>
              <div className="p-4 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">{selectedCollectionData.name}</h3>
                  <p className="text-xs text-muted-foreground">
                    {selectedCollectionData.requests.length} saved requests
                  </p>
                </div>
                {currentRequest && (
                  <button
                    onClick={handleAddCurrentRequest}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 rounded transition-colors"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    Save Current Request
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-auto p-2">
                {selectedCollectionData.requests.length === 0 ? (
                  <div className="text-center text-muted-foreground text-xs p-4">
                    No requests saved yet
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedCollectionData.requests.map((request) => (
                      <div
                        key={request.id}
                        className="p-3 bg-muted/30 hover:bg-muted/50 rounded border border-border/50 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span
                                className={cn(
                                  'text-[10px] font-bold px-1.5 py-0.5 rounded',
                                  request.method === 'GET' && 'bg-blue-500/20 text-blue-500',
                                  request.method === 'POST' && 'bg-green-500/20 text-green-500',
                                  request.method === 'PUT' && 'bg-orange-500/20 text-orange-500',
                                  request.method === 'DELETE' && 'bg-red-500/20 text-red-500',
                                )}
                              >
                                {request.method}
                              </span>
                              <span
                                className={cn(
                                  'text-[10px] px-1.5 py-0.5 rounded',
                                  request.status >= 200 && request.status < 300
                                    ? 'bg-green-500/20 text-green-500'
                                    : request.status >= 400
                                      ? 'bg-red-500/20 text-red-500'
                                      : 'bg-yellow-500/20 text-yellow-500',
                                )}
                              >
                                {request.status}
                              </span>
                            </div>
                            <div className="text-xs font-mono truncate">
                              {request.protocol}://{request.host}
                              {request.path}
                            </div>
                            {request.notes && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {request.notes}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-1 ml-2">
                            <button
                              onClick={() => handleReplay(request)}
                              className="p-1.5 hover:bg-green-500/20 text-green-500 rounded transition-colors"
                              title="Replay Request"
                            >
                              <Play className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                handleDeleteRequest(selectedCollectionData.id, request.id)
                              }
                              className="p-1.5 hover:bg-red-500/20 text-red-500 rounded transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          Saved: {new Date(request.savedAt).toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
