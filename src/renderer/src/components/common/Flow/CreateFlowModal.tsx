import { useState } from 'react';
import { X, Network } from 'lucide-react';

interface CreateFlowModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateFlow: (title: string) => void;
  requestInfo?: { method: string; host: string; path: string };
}

export function CreateFlowModal({
  isOpen,
  onClose,
  onCreateFlow,
  requestInfo,
}: CreateFlowModalProps) {
  const [title, setTitle] = useState('');

  if (!isOpen) return null;

  const handleCreate = () => {
    if (!title.trim()) return;
    onCreateFlow(title.trim());
    setTitle('');
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && title.trim()) {
      handleCreate();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-in fade-in">
      <div className="bg-card border border-border rounded-lg shadow-xl w-full max-w-md mx-4 animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2 font-medium text-green-400">
            <Network className="w-4 h-4" />
            Create New Flow
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {requestInfo && (
            <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2">
              Creating flow with:{' '}
              <span className="text-foreground font-medium">{requestInfo.method}</span>{' '}
              <span className="text-muted-foreground">
                {requestInfo.host}
                {requestInfo.path}
              </span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Flow Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g. Login Flow, API Sequence..."
              className="w-full bg-muted px-3 py-2 rounded text-sm outline-none border border-transparent focus:border-green-500/50"
              autoFocus
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 px-4 py-3 border-t border-border">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded font-medium text-sm border border-border text-muted-foreground hover:bg-muted transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!title.trim()}
            className="flex-1 bg-green-500/10 text-green-500 hover:bg-green-500/20 py-2 rounded font-medium text-sm transition-colors disabled:opacity-50 border border-green-500/30"
          >
            Create Flow
          </button>
        </div>
      </div>
    </div>
  );
}
