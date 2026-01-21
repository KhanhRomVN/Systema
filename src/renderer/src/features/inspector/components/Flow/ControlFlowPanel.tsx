import { useState, useMemo, useEffect, useRef } from 'react';
import { X, Eye, Trash2, Network, Pencil, Braces, FileText } from 'lucide-react';
import { CodeBlock, CodeBlockRef } from '../../../../components/CodeBlock';
import { NetworkRequest } from '../../types';
import { ResizableSplit } from '../../../../components/ResizableSplit';
import { cn } from '../../../../shared/lib/utils';
import { KeyValueTable } from '../ComposerEditors/KeyValueTable';
import { RequestEditor } from '../RequestEditor';

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
  onRequestChange?: (req: NetworkRequest) => void;
}

function FlowRequestDetails({
  request,
  onChange,
}: {
  request: NetworkRequest;
  onChange?: (req: NetworkRequest) => void;
}) {
  const [resTab, setResTab] = useState<'body' | 'headers'>('body');
  const codeBlockRef = useRef<CodeBlockRef>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (resTab === 'body' && request.responseBody) {
      // Small delay to ensure mount
      setTimeout(() => {
        codeBlockRef.current?.format();
      }, 100);
    }
  }, [resTab, request.responseBody]);

  // Response Headers
  const resHeaders = useMemo(() => {
    return Object.entries(request.responseHeaders || {}).map(([key, value]) => ({
      key,
      value: String(value),
      enabled: true,
    }));
  }, [request.responseHeaders]);

  // Handle Send Request
  const handleSend = async () => {
    if (!onChange) return;
    setIsLoading(true);

    try {
      let protocol = (request.protocol || 'https').replace(':', '');
      const host = request.host?.trim();
      const path = request.path?.trim() || '/';

      if (!host) {
        alert('Error: Host is required to send a request.');
        setIsLoading(false);
        return;
      }

      let urlString = `${protocol}://${host}${path}`;

      // Validate URL
      try {
        new URL(urlString);
      } catch (e) {
        alert(`Error: Invalid URL constructed: ${urlString}`);
        setIsLoading(false);
        return;
      }

      // Sanitize Headers
      // net::ERR_INVALID_ARGUMENT can occur if restricted headers like 'Host' or 'Connection' are manually set,
      // or if headers contain invalid characters.
      const cleanHeaders = { ...request.requestHeaders };
      const unsafeHeaders = ['host', 'connection', 'content-length', 'expect'];
      Object.keys(cleanHeaders).forEach((key) => {
        if (unsafeHeaders.includes(key.toLowerCase())) {
          delete cleanHeaders[key];
        }
      });

      console.log('[ControlFlowPanel] Sending request:', {
        url: urlString,
        method: request.method,
        headers: cleanHeaders,
      });

      // Use IPC to send request
      const res = await (window as any).api.invoke('inspector:send-request', {
        url: urlString,
        method: request.method,
        headers: cleanHeaders,
        body:
          request.method !== 'GET' && request.method !== 'HEAD' ? request.requestBody : undefined,
      });

      console.log('[ControlFlowPanel] Response:', res);

      const updatedRequest: NetworkRequest = {
        ...request,
        status: res.status || 0,
        time: res.time ? String(res.time) + 'ms' : '0ms',
        size: res.size ? String(res.size) + ' B' : '0 B',
        responseHeaders: res.headers || {},
        responseBody: res.body || '',
      };

      onChange(updatedRequest);

      if (res.error) {
        console.error(res.error);
      }
    } catch (error: any) {
      console.error(error);
      const updatedRequest: NetworkRequest = {
        ...request,
        status: 0,
        responseBody: `Error: ${error.message}`,
      };
      onChange(updatedRequest);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange?.({ ...request, method: e.target.value });
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    try {
      // Try to parse as full URL first
      const urlObj = new URL(val);
      onChange?.({
        ...request,
        protocol: urlObj.protocol.replace(':', ''),
        host: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
      });
    } catch {
      // If it's just a path update (starts with /)
      if (val.startsWith('/')) {
        onChange?.({ ...request, path: val });
      }
      // Otherwise, we might want to let them type freely,
      // but for strict sync we need valid protocol/host.
      // For now, let's assume they might be pasting a full URL or editing path.
    }
  };

  // Construct display URL
  const displayUrl = useMemo(() => {
    return `${request.protocol || 'https'}://${request.host}${request.path}`;
  }, [request.protocol, request.host, request.path]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Top Control Bar */}
      <div className="h-12 border-b border-border flex items-center px-2 gap-2 shrink-0 bg-muted/5">
        <select
          value={request.method}
          onChange={handleMethodChange}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs font-bold uppercase min-w-[80px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>

        <input
          type="text"
          value={displayUrl}
          onChange={handleUrlChange}
          className="flex-1 h-8 rounded-md border border-input bg-background px-3 text-xs font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          placeholder="https://api.example.com/v1/..."
        />

        <button
          onClick={handleSend}
          disabled={isLoading}
          className={cn(
            'h-8 px-4 rounded-md flex items-center gap-2 text-xs font-medium transition-colors',
            isLoading
              ? 'bg-muted text-muted-foreground cursor-not-allowed'
              : 'bg-primary text-primary-foreground hover:bg-primary/90',
          )}
        >
          {isLoading ? (
            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <Network className="w-3.5 h-3.5" />
          )}
          Send
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        <ResizableSplit direction="vertical" initialSize={50} minSize={20} maxSize={80}>
          {/* Top: Request Pane (Editor) */}
          <div className="flex flex-col h-full bg-background overflow-hidden relative border-b border-border">
            <RequestEditor request={request} onChange={onChange} />
          </div>

          {/* Bottom: Response Pane (Read-only) */}
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
                    ref={codeBlockRef}
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
      </div>
    </div>
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
  onRequestChange,
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
            {activeFlowData.nodes.length === 0 ? 'Replay Request' : 'Flow Details'}
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
          <FlowRequestDetails request={selectedRequest} onChange={onRequestChange} />
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
