import { useState, useEffect } from 'react';
import { BookmarkPlus, Trash2 } from 'lucide-react';
import { cn } from '../../../shared/lib/utils';
import {
  getOrCreateDefaultCollection,
  addRequestToDefaultCollection,
  deleteRequestFromCollection,
  replayRequest,
  RequestCollection,
  SavedRequest,
  COLLECTIONS_UPDATED_EVENT,
} from '../utils/collections';
import { NetworkRequest } from '../types';

interface CollectionsTabProps {
  onSelectRequest?: (request: NetworkRequest) => void;
  currentRequest?: NetworkRequest | null;
  appId: string;
}

export function CollectionsTab({ onSelectRequest, currentRequest, appId }: CollectionsTabProps) {
  const [collection, setCollection] = useState<RequestCollection | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener(COLLECTIONS_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(COLLECTIONS_UPDATED_EVENT, handleUpdate);
  }, []);

  const loadData = () => {
    setCollection(getOrCreateDefaultCollection(appId));
  };

  const handleAddCurrentRequest = () => {
    if (!currentRequest) return;
    addRequestToDefaultCollection(appId, currentRequest);
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

  const handleDeleteRequest = (requestId: string) => {
    if (!collection) return;
    deleteRequestFromCollection(appId, collection.id, requestId);
    loadData();
  };

  if (!collection) {
    return null;
  }

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="flex-1 overflow-auto p-2">
        {collection.requests.length === 0 ? (
          <div className="text-center text-muted-foreground text-xs p-4">No requests saved yet</div>
        ) : (
          <div className="space-y-2">
            {[...collection.requests].reverse().map((request) => (
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
    </div>
  );
}
