import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Plus, GitBranch, X, ArrowLeft, Trash2, Tag, Search, Check } from 'lucide-react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  Node,
  Edge,
  NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { cn } from '../../../../../shared/lib/utils';
import { tracePanelNodeTypes, VALUE_COLORS } from '../../RequestDetails/Trace';
import { NetworkRequest } from '../../../../../types/inspector';
import { useI18n } from '../../../../../i18n/i18nContext';

const nodeTypes = tracePanelNodeTypes;

interface Trace {
  id: string;
  name: string;
  createdAt: number;
}

function getStorageKey(appId: string): string {
  return `systema-traces-${appId}`;
}

function loadTraces(appId: string): Trace[] {
  const key = getStorageKey(appId);
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function saveTraces(traces: Trace[], appId: string) {
  const key = getStorageKey(appId);
  localStorage.setItem(key, JSON.stringify(traces));
}

// ── Data extraction ───────────────────────────────────────────────────────────
type DataSection = 'Header Req' | 'Header Res' | 'Body Req' | 'Body Res';

interface DataItem {
  section: DataSection;
  field: string;   // e.g. "content-type"
  value: string;
  label: string;   // display: "Header Req.content-type: application/json"
}

function flattenObject(obj: any, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const key of Object.keys(obj ?? {})) {
    const val = obj[key];
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
      Object.assign(result, flattenObject(val, fullKey));
    } else {
      result[fullKey] = String(val ?? '');
    }
  }
  return result;
}

function parseBody(body?: string): Record<string, string> {
  if (!body) return {};
  try { return flattenObject(JSON.parse(body)); } catch { return { _raw: body }; }
}

function extractDataItems(req: NetworkRequest): DataItem[] {
  const items: DataItem[] = [];
  const add = (section: DataSection, field: string, value: string) => {
    items.push({ section, field, value, label: `${section}.${field}: ${value}` });
  };
  Object.entries(req.requestHeaders ?? {}).forEach(([k, v]) => add('Header Req', k, v));
  Object.entries(req.responseHeaders ?? {}).forEach(([k, v]) => add('Header Res', k, v));
  Object.entries(parseBody(req.requestBody)).forEach(([k, v]) => add('Body Req', k, v));
  Object.entries(parseBody(req.responseBody)).forEach(([k, v]) => add('Body Res', k, v));
  return items;
}

const SECTION_COLORS: Record<DataSection, string> = {
  'Header Req': 'text-blue-400',
  'Header Res': 'text-green-400',
  'Body Req':   'text-orange-400',
  'Body Res':   'text-purple-400',
};

// ── Attribute Drawer ──────────────────────────────────────────────────────────
function AttributeDrawer({
  sourceRequest,
  requests,
  onConfirm,
  onClose,
  initialAttribute,
}: {
  sourceRequest: NetworkRequest | undefined;
  requests: NetworkRequest[];
  onConfirm: (selected: NetworkRequest[], attribute: DataItem) => void;
  onClose: () => void;
  initialAttribute?: { field: string; value: string };
}) {
  const { t } = useI18n();
  const dataItems = sourceRequest ? extractDataItems(sourceRequest) : [];
  const [query, setQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<DataItem | null>(() => {
    if (initialAttribute) {
      const match = dataItems.find(
        (d) => d.field === initialAttribute.field && d.value === initialAttribute.value
      );
      if (match) return match;
      return {
        section: 'Header Req',
        field: initialAttribute.field,
        value: initialAttribute.value,
        label: `${initialAttribute.field}: ${initialAttribute.value}`,
      };
    }
    return null;
  });
  const [selectedReqs, setSelectedReqs] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50); }, []);

  const filteredItems = query.trim()
    ? dataItems.filter((d) => d.label.toLowerCase().includes(query.toLowerCase()))
    : dataItems;

  // When a dataItem is selected, find all requests that have the same field=value
  const matchingRequests = selectedItem
    ? requests.filter((r) => {
        const items = extractDataItems(r);
        return items.some(
          (d) => d.section === selectedItem.section &&
                 d.field === selectedItem.field &&
                 d.value === selectedItem.value,
        );
      })
    : [];

  const toggleReq = (id: string) =>
    setSelectedReqs((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const handleConfirm = () => {
    const picked = requests.filter((r) => selectedReqs.has(r.id));
    if (picked.length && selectedItem) onConfirm(picked, selectedItem);
    onClose();
  };

  return (
    <>
      <div className="absolute inset-0 bg-black/40 z-20" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 bg-background border-t border-border z-30 flex flex-col h-[60%]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
          <div>
            <div className="text-sm font-medium">{t.trace.addAttribute}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {t.trace.addAttributeDesc}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded bg-muted/40 hover:bg-red-500/20 hover:text-red-500 transition-colors shrink-0 ml-3"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="p-3 border-b border-border shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setSelectedItem(null); setSelectedReqs(new Set()); }}
              placeholder={t.trace.searchField}
              className="w-full pl-9 pr-3 py-2.5 text-sm bg-muted/30 border border-border rounded outline-none focus:border-primary"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          {/* Step 1: pick a data item */}
          {!selectedItem && (
            <div className="p-2">
              {filteredItems.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">{t.trace.noFields}</p>
              )}
              {(['Header Req', 'Header Res', 'Body Req', 'Body Res'] as DataSection[]).map((section) => {
                const sectionItems = filteredItems.filter((d) => d.section === section);
                if (sectionItems.length === 0) return null;
                return (
                  <div key={section}>
                    <div className={cn('px-2 py-1.5 text-xs font-semibold uppercase tracking-wider', SECTION_COLORS[section])}>
                      {section}
                    </div>
                    <div className="mx-2 mb-2 rounded-md border border-border/50">
                      {sectionItems.map((item, i) => (
                        <div
                          key={i}
                          onClick={() => { setSelectedItem(item); setSelectedReqs(new Set()); }}
                          className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer hover:bg-muted/40 transition-colors text-sm"
                        >
                          <span className="text-muted-foreground shrink-0">{item.field}:</span>
                          <span className="truncate">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Step 2: pick matching requests */}
          {selectedItem && (
            <div className="flex flex-col h-full">
              <div className="px-3 py-2 border-b border-border shrink-0 flex items-center gap-2">
                <button
                  onClick={() => { setSelectedItem(null); setSelectedReqs(new Set()); }}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← {t.trace.back}
                </button>
                <span className={cn('text-[10px] font-medium', SECTION_COLORS[selectedItem.section])}>
                  {selectedItem.section}
                </span>
                <span className="text-xs text-muted-foreground">{selectedItem.field}:</span>
                <span className="text-xs font-medium truncate">{selectedItem.value}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {matchingRequests.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">{t.compare.noMatching}</p>
                )}
                {matchingRequests.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => toggleReq(r.id)}
                    className={cn(
                      'flex items-center gap-2 p-2 rounded cursor-pointer transition-colors text-xs border',
                      selectedReqs.has(r.id)
                        ? 'bg-primary/10 border-primary/40'
                        : 'bg-muted/10 border-transparent hover:bg-muted/30',
                    )}
                  >
                    <div className={cn(
                      'w-4 h-4 rounded border flex items-center justify-center shrink-0',
                      selectedReqs.has(r.id) ? 'bg-primary border-primary' : 'border-border',
                    )}>
                      {selectedReqs.has(r.id) && <Check className="w-2.5 h-2.5 text-primary-foreground" />}
                    </div>
                    <span className={cn('font-medium shrink-0', {
                      'text-blue-400': r.method === 'GET',
                      'text-green-400': r.method === 'POST',
                      'text-orange-400': r.method === 'PUT',
                      'text-red-400': r.method === 'DELETE',
                    })}>{r.method}</span>
                    <span className="text-muted-foreground shrink-0 truncate max-w-[80px]">{r.host}</span>
                    <span className="truncate flex-1">{r.path}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Confirm */}
        {selectedItem && (
          <div className="p-3 border-t border-border shrink-0">
            <button
              onClick={handleConfirm}
              disabled={selectedReqs.size === 0}
              className="w-full py-2 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {t.trace.addNode}{selectedReqs.size > 0 ? ` (${selectedReqs.size})` : ''}
            </button>
          </div>
        )}
      </div>
    </>
  );
}

// ── Context Menu ──────────────────────────────────────────────────────────────
function NodeContextMenu({
  x, y, onDelete, onAddAttribute, onClose, t,
}: {
  x: number; y: number;
  onDelete: () => void;
  onAddAttribute: () => void;
  onClose: () => void;
  t: any;
}) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div
        className="fixed z-20 bg-background border border-border rounded-lg shadow-xl py-1 min-w-[160px] text-xs"
        style={{ left: x, top: y }}
      >
        <button
          onClick={() => { onAddAttribute(); onClose(); }}
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left"
        >
          <Tag className="w-3.5 h-3.5 text-primary" />
          {t.trace.addAttributeCtx}
        </button>
        <div className="h-px bg-border mx-2 my-1" />
        <button
          onClick={() => { onDelete(); onClose(); }}
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-500/10 text-red-500 transition-colors text-left"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {t.trace.deleteNode}
        </button>
      </div>
    </>
  );
}

function AttributeContextMenu({
  x, y, onDelete, onAddNode, onClose, t,
}: {
  x: number; y: number;
  onDelete: () => void;
  onAddNode: () => void;
  onClose: () => void;
  t: any;
}) {
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={onClose} />
      <div
        className="fixed z-20 bg-background border border-border rounded-lg shadow-xl py-1 min-w-[160px] text-xs"
        style={{ left: x, top: y }}
      >
        <button
          onClick={() => { onAddNode(); onClose(); }}
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-muted/50 transition-colors text-left"
        >
          <Plus className="w-3.5 h-3.5 text-primary" />
          {t.trace.addNode}
        </button>
        <div className="h-px bg-border mx-2 my-1" />
        <button
          onClick={() => { onDelete(); onClose(); }}
          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-red-500/10 text-red-500 transition-colors text-left"
        >
          <Trash2 className="w-3.5 h-3.5" />
          {t.trace.deleteAttribute}
        </button>
      </div>
    </>
  );
}

// ── Diagram View ──────────────────────────────────────────────────────────────
function DiagramView({
  trace, onBack, requests, onSelectRequest, t,
}: {
  trace: Trace;
  onBack: () => void;
  requests: NetworkRequest[];
  onSelectRequest: (id: string) => void;
  t: any;
}) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { screenToFlowPosition } = useReactFlow();
  const flowRef = useRef<HTMLDivElement>(null);

  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [attrCtxMenu, setAttrCtxMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
    field: string;
    value: string;
  } | null>(null);
  const [attrDrawerOpen, setAttrDrawerOpen] = useState(false);
  const [attrTargetNodeId, setAttrTargetNodeId] = useState<string | null>(null);
  const [initialAttribute, setInitialAttribute] = useState<{ field: string; value: string } | null>(null);

  const rootValsArray = useMemo(() => {
    const vals = new Set<string>();
    nodes.forEach((node) => {
      const matches = (node.data?.matches as any[]) || [];
      matches.forEach((m: any) => {
        if (m.value) vals.add(m.value);
      });
    });
    return Array.from(vals);
  }, [nodes]);

  const onAttributeContextMenu = useCallback((e: React.MouseEvent, nodeId: string, field: string, value: string) => {
    e.preventDefault();
    e.stopPropagation();
    setAttrCtxMenu({ x: e.clientX, y: e.clientY, nodeId, field, value });
  }, []);

  const nodesWithRootVals = useMemo(() => {
    return nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        rootValsArray,
        onAttributeContextMenu: (e: React.MouseEvent, field: string, value: string) => {
          onAttributeContextMenu(e, node.id, field, value);
        },
      },
    }));
  }, [nodes, rootValsArray, onAttributeContextMenu]);

  const edgesWithColors = useMemo(() => {
    return edges.map((edge) => {
      const val = edge.data?.val;
      if (typeof val !== 'string') return edge;
      const idx = rootValsArray.indexOf(val);
      const edgeColor = idx === -1 ? '#3b82f6' : VALUE_COLORS[idx % VALUE_COLORS.length];
      return {
        ...edge,
        style: {
          ...edge.style,
          stroke: edgeColor,
          strokeWidth: 1.8,
          opacity: 1,
        },
      };
    });
  }, [edges, rootValsArray]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/requestData');
    if (!raw) return;
    try {
      const request = JSON.parse(raw);
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      setNodes((nds) => [...nds, {
        id: `${request.id}-${Date.now()}`,
        type: 'request',
        position,
        data: { request, isRoot: false, matches: [], sameHost: false },
      }]);
    } catch {}
  }, [screenToFlowPosition, setNodes]);

  const onNodeClick: NodeMouseHandler = useCallback((_e, node) => {
    const reqId = (node.data as any).request?.id;
    if (reqId) onSelectRequest(reqId);
  }, [onSelectRequest]);

  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
    e.preventDefault();
    setCtxMenu({ x: e.clientX, y: e.clientY, nodeId: node.id });
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
  }, [setNodes, setEdges]);

  const deleteAttribute = useCallback((nodeId: string, _field: string, value: string) => {
    const directChildIds = edges
      .filter((e) => e.source === nodeId && e.sourceHandle === value)
      .map((e) => e.target);

    const toDelete = new Set<string>();
    const queue = [...directChildIds];
    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (!toDelete.has(currentId)) {
        toDelete.add(currentId);
        edges.forEach((edge) => {
          if (edge.source === currentId) {
            queue.push(edge.target);
          }
        });
      }
    }

    setNodes((nds) => nds.filter((n) => !toDelete.has(n.id)));
    setEdges((eds) =>
      eds.filter(
        (e) =>
          !toDelete.has(e.source) &&
          !toDelete.has(e.target) &&
          !(e.source === nodeId && e.sourceHandle === value)
      )
    );

    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== nodeId) return n;
        const matches = (n.data?.matches as any[]) || [];
        return {
          ...n,
          data: {
            ...n.data,
            matches: matches.filter((m) => m.value !== value),
          },
        };
      })
    );
  }, [edges, setNodes, setEdges]);

  const handleCloseDrawer = () => {
    setAttrDrawerOpen(false);
    setAttrTargetNodeId(null);
    setInitialAttribute(null);
  };

  const handleAttrConfirm = useCallback((picked: NetworkRequest[], attribute: DataItem) => {
    if (!attrTargetNodeId) return;

    setNodes((nds) =>
      nds.map((n) => {
        if (n.id !== attrTargetNodeId) return n;
        const matches = (n.data?.matches as any[]) || [];
        const exists = matches.some((m: any) => m.value === attribute.value);
        const newMatches = exists
          ? matches.map((m: any) =>
              m.value === attribute.value ? { ...m, hasOutgoing: true } : m
            )
          : [
              ...matches,
              {
                field: attribute.field,
                value: attribute.value,
                hasIncoming: false,
                hasOutgoing: true,
              },
            ];
        return {
          ...n,
          data: {
            ...n.data,
            matches: newMatches,
          },
        };
      })
    );

    const sourceNode = nodes.find((n) => n.id === attrTargetNodeId);
    const baseX = sourceNode?.position.x ?? 0;
    const baseY = (sourceNode?.position.y ?? 0) + 150;

    const newNodes = picked.map((r, i) => {
      const nodeId = `${r.id}-${Date.now()}-${i}`;
      return {
        id: nodeId,
        type: 'request',
        position: { x: baseX + i * 280, y: baseY },
        data: {
          request: r,
          isRoot: false,
          sameHost: false,
          matches: [
            {
              field: attribute.field,
              value: attribute.value,
              hasIncoming: true,
              hasOutgoing: false,
            },
          ],
        },
      };
    });

    setNodes((nds) => [...nds, ...newNodes]);

    const newEdges = newNodes.map((newNode) => ({
      id: `e-${attrTargetNodeId}-${newNode.id}-${attribute.value}`,
      source: attrTargetNodeId,
      target: newNode.id,
      sourceHandle: attribute.value,
      targetHandle: attribute.value,
      data: { val: attribute.value },
      style: {},
    }));

    setEdges((eds) => [...eds, ...newEdges]);
  }, [nodes, attrTargetNodeId, setNodes, setEdges]);

  return (
    <div className="h-full flex flex-col bg-table-bodyBg relative">
      <div className="h-10 border-b border-border flex items-center px-3 gap-2 shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t.trace.back}
        </button>
        <div className="h-4 w-px bg-border" />
        <GitBranch className="w-3.5 h-3.5 text-primary" />
        <span className="text-xs font-medium">{trace.name}</span>
      </div>

      <div className="flex-1" ref={flowRef} onDragOver={onDragOver} onDrop={onDrop}>
          <ReactFlow
            nodes={nodesWithRootVals}
            edges={edgesWithColors}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            onNodeClick={onNodeClick}
            onNodeContextMenu={onNodeContextMenu}
            fitView
            colorMode="dark"
          >
            <Background />
            <Controls style={{ background: 'rgb(var(--table-body-bg))', border: '1px solid rgb(var(--border))' }} />
            <MiniMap style={{ background: 'rgb(var(--table-body-bg))' }} />
          </ReactFlow>
      </div>

      {ctxMenu && (
        <NodeContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          onDelete={() => deleteNode(ctxMenu.nodeId)}
          onAddAttribute={() => {
            setAttrTargetNodeId(ctxMenu.nodeId);
            setAttrDrawerOpen(true);
          }}
          onClose={() => setCtxMenu(null)}
          t={t}
        />
      )}

      {attrCtxMenu && (
        <AttributeContextMenu
          x={attrCtxMenu.x}
          y={attrCtxMenu.y}
          onDelete={() => deleteAttribute(attrCtxMenu.nodeId, attrCtxMenu.field, attrCtxMenu.value)}
          onAddNode={() => {
            setAttrTargetNodeId(attrCtxMenu.nodeId);
            setInitialAttribute({ field: attrCtxMenu.field, value: attrCtxMenu.value });
            setAttrDrawerOpen(true);
          }}
          onClose={() => setAttrCtxMenu(null)}
          t={t}
        />
      )}

      {attrDrawerOpen && (
        <AttributeDrawer
          sourceRequest={(nodes.find((n) => n.id === attrTargetNodeId)?.data as any)?.request as NetworkRequest | undefined}
          requests={requests}
          onConfirm={handleAttrConfirm}
          onClose={handleCloseDrawer}
          initialAttribute={initialAttribute || undefined}
        />
      )}
    </div>
  );
}

// ── TraceTab ──────────────────────────────────────────────────────────────────
export function TraceTab({
  requests = [],
  onSelectRequest,
  appId = 'global',
}: {
  requests?: NetworkRequest[];
  onSelectRequest?: (id: string) => void;
  appId?: string;
}) {
  const { t } = useI18n();
  const [traces, setTraces] = useState<Trace[]>(() => loadTraces(appId));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [traceName, setTraceName] = useState('');
  const [activeTrace, setActiveTrace] = useState<Trace | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (drawerOpen) setTimeout(() => inputRef.current?.focus(), 50);
  }, [drawerOpen]);

  const handleCreate = () => {
    const name = traceName.trim();
    if (!name) return;
    const newTrace: Trace = { id: crypto.randomUUID(), name, createdAt: Date.now() };
    const updated = [...traces, newTrace];
    setTraces(updated);
    saveTraces(updated, appId);
    setTraceName('');
    setDrawerOpen(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = traces.filter((t) => t.id !== id);
    setTraces(updated);
    saveTraces(updated, appId);
    if (activeTrace?.id === id) setActiveTrace(null);
  };

  if (activeTrace) {
    return (
      <ReactFlowProvider>
        <DiagramView
          trace={activeTrace}
          onBack={() => setActiveTrace(null)}
          requests={requests}
          onSelectRequest={onSelectRequest ?? (() => {})}
          t={t}
        />
      </ReactFlowProvider>
    );
  }

  const [traceSearchTerm, setTraceSearchTerm] = useState('');
  
  const filteredTraces = traces.filter(trace =>
    trace.name.toLowerCase().includes(traceSearchTerm.toLowerCase())
  );

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-table-bodyBg">
      <div className="px-4 pt-4 pb-3 border-b border-divider shrink-0 flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-10 rounded-lg bg-pink-500/15 border border-pink-500/25 shrink-0">
          <GitBranch className="w-4 h-4 text-pink-400" />
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-bold text-text-primary">{t.trace.title}</h2>
          <p className="text-xs text-text-secondary mt-0.5">{t.trace.desc}</p>
        </div>
      </div>

      {/* Search and Add Bar */}
      <div className="px-3 py-2 border-b border-divider flex gap-2 items-center shrink-0">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
          <input
            type="text"
            placeholder={t.trace.searchTraces}
            value={traceSearchTerm}
            onChange={(e) => setTraceSearchTerm(e.target.value)}
            className="w-full h-11 bg-input-background border border-input-border-default rounded-lg pl-8 pr-3 text-sm text-text-primary focus:border-primary/50 outline-none"
          />
        </div>
        <button
          onClick={() => setDrawerOpen(true)}
          disabled={!appId}
          className={cn(
            "flex items-center justify-center w-11 h-11 rounded-lg border transition-all active:scale-95 shrink-0",
            appId
              ? "bg-secondary hover:bg-primary/20 hover:text-primary text-text-secondary border-divider hover:border-primary/30"
              : "bg-zinc-800/50 text-zinc-600 border-zinc-800/80 cursor-not-allowed opacity-50"
          )}
          title={appId ? t.trace.newTrace : t.trace.selectTargetFirst}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {filteredTraces.length === 0 && traceSearchTerm ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-xl bg-pink-500/15 flex items-center justify-center mb-4 border border-pink-500/25">
              <Search className="w-8 h-8 text-pink-400" />
            </div>
            <p className="text-sm text-text-primary font-medium">{t.trace.noMatchingTraces}</p>
            <p className="text-xs text-text-secondary mt-1">{t.trace.noMatchingTracesDesc}</p>
          </div>
        ) : filteredTraces.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-xl bg-pink-500/15 flex items-center justify-center mb-4 border border-pink-500/25">
              <GitBranch className="w-8 h-8 text-pink-400" />
            </div>
            <p className="text-sm text-text-primary font-medium">{t.trace.noTraces}</p>
            <p className="text-xs text-text-secondary mt-1">{t.trace.noTracesDesc}</p>
          </div>
        ) : (
          filteredTraces.map((trace) => (
            <div
              key={trace.id}
              onClick={() => setActiveTrace(trace)}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors group"
            >
              <div className="flex items-center gap-2 min-w-0">
                <GitBranch className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-xs font-medium truncate">{trace.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">
                  {new Date(trace.createdAt).toLocaleDateString()}
                </span>
                <button
                  onClick={(e) => handleDelete(trace.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-500/20 hover:text-red-500 text-muted-foreground transition-all"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {drawerOpen && (
        <>
          <div className="absolute inset-0 bg-black/40 z-40" onClick={() => setDrawerOpen(false)} />
          <div
            className="absolute bottom-0 left-0 right-0 z-50 bg-dialog-background border-t border-divider rounded-t-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300"
            style={{ maxHeight: '80%' }}
          >
            {/* Header */}
            <div className="px-4 pt-4 pb-3 border-b border-divider flex items-center gap-3 shrink-0">
              <div className="flex items-center justify-center w-9 h-10 rounded-lg bg-pink-500/15 border border-pink-500/25 shrink-0">
                <GitBranch className="w-4 h-4 text-pink-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-text-primary">{t.trace.newTrace}</h3>
                <p className="text-xs text-text-secondary mt-0.5">{t.trace.newTraceDesc}</p>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg bg-secondary text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">{t.trace.traceName}</label>
                <input
                  ref={inputRef}
                  type="text"
                  value={traceName}
                  onChange={(e) => setTraceName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  placeholder={t.trace.traceNamePlaceholder}
                  className="w-full bg-table-headerBg border border-input-border-default rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="px-5 py-4 border-t border-divider flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setDrawerOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-sidebar-itemHover transition-colors"
              >
                {t.common.cancel}
              </button>
              <button
                onClick={handleCreate}
                disabled={!traceName.trim()}
                className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                {t.trace.createTrace}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
