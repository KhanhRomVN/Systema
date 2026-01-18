import { useState, useMemo } from 'react';
import { X, Eye, Trash2, Network, Pencil, List, Braces, FileText, Shield } from 'lucide-react';
import { CodeBlock } from '../../../components/CodeBlock';
import { NetworkRequest } from '../types';
import { ResizableSplit } from '../../../components/ResizableSplit';
import { cn } from '../../../shared/lib/utils';
import { KeyValueTable } from './ComposerEditors/KeyValueTable';
import { AuthEditor, AuthConfig } from './ComposerEditors/AuthEditor';
import { DocsEditor } from './ComposerEditors/DocsEditor';

interface FlowCard {
  id: string;
  title: string;
  nodes: any[];
  edges: any[];
  createdAt: number;
}

interface ControlFlowPanelProps {
  onClose: () => void;
  onOpenFlow: (data: { nodes: any[]; edges: any[] }) => void;
  flows: FlowCard[];
  onDeleteFlow: (id: string) => void;
  onUpdateFlow: (id: string, data: { nodes: any[]; edges: any[] }) => void;
  activeFlowData?: { nodes: any[]; edges: any[] } | null;
  selectedRequest?: NetworkRequest | null;
}

function FlowRequestDetails({ request }: { request: NetworkRequest }) {
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body' | 'auth' | 'docs'>(
    'params',
  );
  const [resTab, setResTab] = useState<'body' | 'headers'>('body');

  // Parse Params
  const params = useMemo(() => {
    try {
      const urlObj = new URL(`http://${request.host}${request.path}`);
      const items: any[] = [];
      urlObj.searchParams.forEach((value, key) => {
        items.push({ key, value, enabled: true });
      });
      return items;
    } catch (e) {
      return [];
    }
  }, [request.host, request.path]);

  // Parse Headers
  const headers = useMemo(() => {
    return Object.entries(request.requestHeaders || {}).map(([key, value]) => ({
      key,
      value: String(value),
      enabled: true,
    }));
  }, [request.requestHeaders]);

  // Parse Auth
  const authConfig = useMemo<AuthConfig>(() => {
    const authHeader =
      request.requestHeaders?.['Authorization'] || request.requestHeaders?.['authorization'];
    if (typeof authHeader === 'string') {
      if (authHeader.startsWith('Bearer ')) {
        return { type: 'bearer', bearerToken: authHeader.slice(7) };
      }
      if (authHeader.startsWith('Basic ')) {
        // Try to decode basic
        try {
          const creds = atob(authHeader.slice(6));
          const [u, p] = creds.split(':');
          return { type: 'basic', basicUsername: u, basicPassword: p };
        } catch (e) {
          return { type: 'basic' };
        }
      }
    }
    return { type: 'none' };
  }, [request.requestHeaders]);

  // Response Headers
  const resHeaders = useMemo(() => {
    return Object.entries(request.responseHeaders || {}).map(([key, value]) => ({
      key,
      value: String(value),
      enabled: true,
    }));
  }, [request.responseHeaders]);

  const tabs = [
    { id: 'params', label: 'Params', icon: List, color: 'text-blue-500', count: params.length },
    {
      id: 'headers',
      label: 'Headers',
      icon: Braces,
      color: 'text-purple-500',
      count: headers.length,
    },
    {
      id: 'body',
      label: 'Body',
      icon: FileText,
      color: 'text-orange-500',
      dot: !!request.requestBody,
    },
    {
      id: 'auth',
      label: 'Auth',
      icon: Shield,
      color: 'text-green-500',
      dot: authConfig.type !== 'none',
    },
    { id: 'docs', label: 'Docs', icon: FileText, color: 'text-gray-500', dot: false },
  ];

  return (
    <ResizableSplit direction="vertical" initialSize={50} minSize={20} maxSize={80}>
      {/* Top: Request Pane */}
      <div className="flex flex-col h-full bg-background overflow-hidden relative">
        {/* Method/URL Bar (Optional, already in header? No, header is Flow Details. Maybe add request summary here) */}
        <div className="flex border-b border-border bg-muted/10 items-center overflow-x-auto no-scrollbar px-2 h-10 shrink-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'px-3 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-2 shrink-0',
                activeTab === tab.id
                  ? `${tab.color} bg-background border-current`
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20',
              )}
              style={activeTab === tab.id ? { borderBottomColor: undefined } : undefined}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                    activeTab === tab.id ? 'bg-current/10' : 'bg-muted text-muted-foreground',
                  )}
                >
                  {tab.count}
                </span>
              )}
              {tab.dot && (
                <span
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    tab.id === 'body' ? 'bg-orange-500' : 'bg-green-500',
                  )}
                />
              )}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-hidden relative">
          <div
            className={cn('absolute inset-0 overflow-auto', activeTab === 'auth' ? 'p-4' : 'p-0')}
          >
            {activeTab === 'params' && (
              <KeyValueTable items={params} onChange={() => {}} readOnly={true} />
            )}
            {activeTab === 'headers' && (
              <KeyValueTable items={headers} onChange={() => {}} readOnly={true} />
            )}
            {activeTab === 'body' && (
              <CodeBlock
                code={request.requestBody || ''}
                language="json"
                themeConfig={{ background: '#00000000' }}
                editorOptions={{ readOnly: true, minimap: { enabled: false } }}
                className="h-full"
              />
            )}
            {activeTab === 'auth' && (
              <AuthEditor config={authConfig} onChange={() => {}} readOnly={true} />
            )}
            {activeTab === 'docs' && <DocsEditor value="" onChange={() => {}} readOnly={true} />}
          </div>
        </div>
      </div>

      {/* Bottom: Response Pane */}
      <div className="flex flex-col h-full bg-background overflow-hidden border-t border-border">
        <div className="flex border-b border-border bg-muted/10 items-center justify-between h-10 shrink-0">
          <div className="flex px-2">
            <button
              onClick={() => setResTab('body')}
              className={cn(
                'px-3 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-2',
                resTab === 'body'
                  ? 'border-primary bg-background'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20',
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              Body
            </button>
            <button
              onClick={() => setResTab('headers')}
              className={cn(
                'px-3 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-2',
                resTab === 'headers'
                  ? 'border-primary bg-background'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20',
              )}
            >
              <Braces className="w-3.5 h-3.5" />
              Headers
            </button>
          </div>

          {/* Status Info */}
          <div className="flex items-center gap-3 px-4">
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'text-xs font-bold px-1.5 py-0.5 rounded',
                  request.status >= 200 && request.status < 300
                    ? 'bg-green-500/10 text-green-500'
                    : request.status >= 400
                      ? 'bg-red-500/10 text-red-500'
                      : 'bg-yellow-500/10 text-yellow-500',
                )}
              >
                {request.status}
              </span>
            </div>
            <div className="text-xs font-mono text-muted-foreground">{request.time}</div>
            <div className="text-xs font-mono text-muted-foreground">{request.size}</div>
          </div>
        </div>

        <div className="flex-1 overflow-hidden relative">
          <div className="absolute inset-0 overflow-auto p-0">
            {resTab === 'body' && (
              <CodeBlock
                code={request.responseBody || ''}
                language="json"
                themeConfig={{ background: '#00000000' }}
                editorOptions={{ readOnly: true, minimap: { enabled: false } }}
                className="h-full"
              />
            )}
            {resTab === 'headers' && (
              <KeyValueTable items={resHeaders} onChange={() => {}} readOnly={true} />
            )}
          </div>
        </div>
      </div>
    </ResizableSplit>
  );
}

export function ControlFlowPanel({
  onClose,
  onOpenFlow,
  flows,
  onDeleteFlow,
  onUpdateFlow,
  activeFlowData,
  selectedRequest,
}: ControlFlowPanelProps) {
  const [editingFlowId, setEditingFlowId] = useState<string | null>(null);
  const [editJson, setEditJson] = useState('');

  const openEditMode = (flow: FlowCard) => {
    setEditingFlowId(flow.id);
    setEditJson(JSON.stringify({ nodes: flow.nodes, edges: flow.edges }, null, 2));
  };

  const closeEditor = () => {
    setEditingFlowId(null);
    setEditJson('');
  };

  const handleSaveEdit = () => {
    if (!editingFlowId) return;
    try {
      const parsed = JSON.parse(editJson);
      onUpdateFlow(editingFlowId, parsed);
      closeEditor();
    } catch (e) {
      alert('Invalid JSON');
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Delete this flow?')) {
      onDeleteFlow(id);
    }
  };

  const handleView = (flow: FlowCard) => {
    onOpenFlow({ nodes: flow.nodes, edges: flow.edges });
  };

  const editingFlow = (flows || []).find((f) => f.id === editingFlowId);

  // If a flow is open/active, show the split view or placeholder
  if (activeFlowData) {
    return (
      <div className="flex flex-col h-full bg-background relative overflow-hidden text-sm">
        {/* Header */}
        <div className="h-10 border-b border-border flex items-center shrink-0 bg-background/50 z-10 px-4 justify-between">
          <div className="flex items-center gap-2 font-medium text-green-400">
            <Network className="w-4 h-4" />
            Flow Details
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        {selectedRequest ? (
          <FlowRequestDetails request={selectedRequest} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-xs p-4 text-center">
            <Network className="w-8 h-8 mb-2 opacity-50" />
            <div>
              Select a node in the flow board
              <br />
              to view details here
            </div>
          </div>
        )}
      </div>
    );
  }

  // Otherwise, show the Flow List / Editor
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

      {/* Content */}
      {editingFlow ? (
        // Edit Mode
        <div className="flex-1 flex flex-col p-4 gap-3 overflow-hidden">
          <div className="text-sm font-medium text-muted-foreground">
            Editing: <span className="text-foreground">{editingFlow.title}</span>
          </div>
          <div className="flex-1 min-h-[200px] border border-border rounded-lg overflow-hidden">
            <CodeBlock
              code={editJson}
              language="json"
              onChange={setEditJson}
              themeConfig={{ background: '#0a0a0a' }}
              editorOptions={{ readOnly: false, formatOnPaste: true, formatOnType: true }}
              showLineNumbers={true}
              className="h-full"
            />
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={closeEditor}
              className="flex-1 py-2 rounded font-medium text-sm border border-border text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              className="flex-1 bg-green-500/10 text-green-500 hover:bg-green-500/20 py-2 rounded font-medium text-sm transition-colors border border-green-500/30"
            >
              Save Changes
            </button>
          </div>
        </div>
      ) : (
        // Card List Mode
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-3">
            {(flows || []).map((flow) => (
              <div
                key={flow.id}
                className="border border-border rounded-lg bg-card p-3 flex flex-col gap-3 hover:border-green-500/50 transition-colors shadow-sm group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm truncate">{flow.title}</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEditMode(flow)}
                      className="p-1.5 hover:bg-blue-500/10 text-muted-foreground hover:text-blue-500 rounded transition-colors"
                      title="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
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

                <div className="text-xs text-muted-foreground">
                  {(flow.nodes || []).length} nodes • {(flow.edges || []).length} edges
                </div>
              </div>
            ))}

            {(flows || []).length === 0 && (
              <div className="text-center py-10 text-muted-foreground text-xs opacity-50">
                No flows created yet.
                <br />
                Use "Create Flow" from the request dropdown menu.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export type { FlowCard };
