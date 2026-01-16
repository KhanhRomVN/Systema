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
}

export function CollectionsTab({ onSelectRequest, currentRequest }: CollectionsTabProps) {
  const [collection, setCollection] = useState<RequestCollection | null>(null);

  useEffect(() => {
    loadData();

    const handleUpdate = () => loadData();
    window.addEventListener(COLLECTIONS_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(COLLECTIONS_UPDATED_EVENT, handleUpdate);
  }, []);

  const loadData = () => {
    setCollection(getOrCreateDefaultCollection());
  };

  const handleAddCurrentRequest = () => {
    if (!currentRequest) return;
    addRequestToDefaultCollection(currentRequest);
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
    deleteRequestFromCollection(collection.id, requestId);
    loadData();
  };

  if (!collection) {
    return null;
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Saved Requests</h3>
          <p className="text-xs text-muted-foreground">
            {collection.requests.length} saved requests
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
        {collection.requests.length === 0 ? (
          <div className="text-center text-muted-foreground text-xs p-4">No requests saved yet</div>
        ) : (
          <div className="space-y-2">
            {[...collection.requests].reverse().map((request) => (
              <div
                key={request.id}
                className="p-3 bg-muted/30 hover:bg-muted/50 rounded border border-border/50 transition-colors cursor-pointer group"
                onClick={() => onSelectRequest?.(request)}
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
                      <span
                        className={cn(
                          'text-[10px] font-medium',
                          request.status >= 200 && request.status < 300
                            ? 'text-green-500'
                            : request.status >= 400
                              ? 'text-red-500'
                              : 'text-yellow-500',
                        )}
                      >
                        {request.status}
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
                    className="p-1.5 hover:bg-red-500/20 text-red-500 rounded transition-colors opacity-0 group-hover:opacity-100"
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
