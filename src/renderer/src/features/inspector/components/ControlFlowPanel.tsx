import { useState, useEffect } from 'react';
import { X, Plus, Eye, Trash2, Network } from 'lucide-react';

interface ControlFlowPanelProps {
  onClose: () => void;
  onOpenFlow: (data: any) => void;
}

interface FlowCard {
  id: string;
  title: string;
  jsonCode: string;
  createdAt: number;
}

const DEFAULT_FLOW_JSON = `{
  "nodes": [
    { "id": "1", "position": { "x": 0, "y": 0 }, "data": { "label": "Start" } },
    { "id": "2", "position": { "x": 0, "y": 100 }, "data": { "label": "Process" } }
  ],
  "edges": [
    { "id": "e1-2", "source": "1", "target": "2" }
  ]
}`;

export function ControlFlowPanel({ onClose, onOpenFlow }: ControlFlowPanelProps) {
  const [flows, setFlows] = useState<FlowCard[]>(() => {
    const saved = localStorage.getItem('inspector-control-flows');
    return saved ? JSON.parse(saved) : [];
  });

  const [isCreating, setIsCreating] = useState(false);
  const [newFlowTitle, setNewFlowTitle] = useState('');
  const [newFlowJson, setNewFlowJson] = useState(DEFAULT_FLOW_JSON);

  useEffect(() => {
    localStorage.setItem('inspector-control-flows', JSON.stringify(flows));
  }, [flows]);

  const handleCreate = () => {
    if (!newFlowTitle.trim()) return;
    const newFlow: FlowCard = {
      id: Date.now().toString(),
      title: newFlowTitle,
      jsonCode: newFlowJson,
      createdAt: Date.now(),
    };
    setFlows([newFlow, ...flows]);
    setIsCreating(false);
    setNewFlowTitle('');
    setNewFlowJson(DEFAULT_FLOW_JSON);
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this flow?')) {
      setFlows(flows.filter((f) => f.id !== id));
    }
  };

  const handleView = (flow: FlowCard) => {
    try {
      const parsed = JSON.parse(flow.jsonCode);
      onOpenFlow(parsed);
    } catch (e) {
      alert('Invalid JSON');
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Header */}
      <div className="h-10 border-b border-border flex items-center shrink-0 bg-background/50 z-10 px-4 justify-between">
        <div className="flex items-center gap-2 font-medium text-sm text-green-400">
          <Network className="w-4 h-4" />
          Control Flow Panel
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isCreating ? (
          <div className="border border-border rounded-lg bg-card p-4 flex flex-col gap-4 animate-in fade-in zoom-in-95">
            <div className="flex justify-between items-center">
              <h3 className="font-medium text-sm">Create New Flow</h3>
              <button
                onClick={() => setIsCreating(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <input
              className="bg-muted px-3 py-2 rounded text-sm w-full outline-none border border-transparent focus:border-green-500/50"
              placeholder="Flow Title e.g. Login Process"
              value={newFlowTitle}
              onChange={(e) => setNewFlowTitle(e.target.value)}
              autoFocus
            />
            <textarea
              className="bg-muted px-3 py-2 rounded text-sm w-full outline-none border border-transparent focus:border-green-500/50 font-mono h-40 resize-none"
              value={newFlowJson}
              onChange={(e) => setNewFlowJson(e.target.value)}
              placeholder="Paste JSON here..."
            />
            <button
              onClick={handleCreate}
              disabled={!newFlowTitle.trim()}
              className="bg-green-500/10 text-green-500 hover:bg-green-500/20 py-2 rounded font-medium text-sm transition-colors disabled:opacity-50"
            >
              Create Flow
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="w-full flex items-center justify-center gap-2 py-3 border border-dashed border-border rounded-lg text-muted-foreground hover:text-foreground hover:border-green-500/50 hover:bg-green-500/5 transition-all mb-4"
          >
            <Plus className="w-4 h-4" />
            Create New Flow
          </button>
        )}

        <div className="flex flex-col gap-3">
          {flows.map((flow) => (
            <div
              key={flow.id}
              className="border border-border rounded-lg bg-card p-3 flex flex-col gap-3 hover:border-green-500/50 transition-colors shadow-sm group"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm truncate">{flow.title}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleDelete(flow.id)}
                    className="p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleView(flow)}
                    className="p-1.5 hover:bg-green-500/10 text-muted-foreground hover:text-green-500 rounded transition-colors"
                    title="View Flow"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="bg-muted/30 rounded p-2 text-xs font-mono overflow-hidden max-h-24 relative">
                <pre className="opacity-70">{flow.jsonCode}</pre>
                <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card to-transparent" />
              </div>
            </div>
          ))}

          {flows.length === 0 && !isCreating && (
            <div className="text-center py-10 text-muted-foreground text-xs opacity-50">
              No flows created yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
