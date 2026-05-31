import { useState, useCallback, useEffect, useRef, memo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
  addEdge,
  Connection,
  Edge,
  Node,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { NetworkRequest } from '../../../../../../types/inspector';
import { X, GitBranch, Save } from 'lucide-react';
import { DiagramNode } from './DiagramNode';
import { useI18n } from '../../../../../../i18n/i18nContext';

const nodeTypes = { request: DiagramNode };

interface DiagramViewProps {
  request?: NetworkRequest | null;
  onClose?: () => void;
  onNodeClick?: (request: NetworkRequest) => void;
  composerName?: string;
  composerDescription?: string;
  isTemp?: boolean;
}

function DiagramViewInner({ request, onNodeClick }: DiagramViewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { screenToFlowPosition } = useReactFlow();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const diagramRequestIdsRef = useRef<Set<string>>(new Set());


  // Effect: add root node when request changes
  useEffect(() => {
    if (request && !diagramRequestIdsRef.current.has(request.id)) {
      diagramRequestIdsRef.current = new Set([request.id]);
      const rootNode: Node = {
        id: `root-${request.id}`,
        type: 'request',
        position: { x: 300, y: 150 },
        data: { request, showHandles: false },
      };
      setNodes([rootNode]);
      setEdges([]);
    } else {
    }
  }, [request?.id]);

  // Effect: sync showHandles on all nodes
  useEffect(() => {
    setNodes((nds) => {
      const updated = nds.map((n) => ({
        ...n,
        data: { ...n.data, showHandles: n.id === selectedNodeId || isConnecting, selected: n.id === selectedNodeId },
      }));
      return updated;
    });
  }, [selectedNodeId, isConnecting]);

  // Effect: compute connectionIndex from edges
  useEffect(() => {
    const order: string[] = [];
    edges.forEach((e) => {
      if (e.source && !order.includes(e.source)) order.push(e.source);
      if (e.target && !order.includes(e.target)) order.push(e.target);
    });
    setNodes((nds) => {
      const updated = nds.map((n) => {
        const idx = order.indexOf(n.id);
        return { ...n, data: { ...n.data, connectionIndex: idx === -1 ? undefined : idx + 1 } };
      });
      return updated;
    });
  }, [edges]);

  const connectStartNodeIdRef = useRef<string | null>(null);
  const connectStartHandleIdRef = useRef<string | null>(null);
  const justConnectedRef = useRef(false);

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source === params.target) {
        console.warn('[DiagramView] onConnect — self-loop blocked');
        return;
      }
      // Use the node that the user actually started dragging from (stored in onConnectStart)
      const startNodeId = connectStartNodeIdRef.current;
      const startHandleId = connectStartHandleIdRef.current;
      // If user started from nodeA but ReactFlow put nodeA as target (swapped), swap back
      const isReversed = startNodeId && startNodeId === params.target;
      const normalizedParams: Connection = isReversed
        ? {
            source: params.target,
            sourceHandle: startHandleId?.replace('-in', '') ?? null,
            target: params.source,
            targetHandle: params.sourceHandle?.endsWith('-in') ? params.sourceHandle : (params.sourceHandle ? params.sourceHandle + '-in' : null),
          }
        : { ...params, sourceHandle: params.sourceHandle?.replace('-in', '') ?? params.sourceHandle };
      setEdges((eds) => {
        const result = addEdge(normalizedParams, eds).map((e) =>
          e.source === normalizedParams.source && e.target === normalizedParams.target
            ? { ...e, animated: true, markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' }, style: { stroke: '#3b82f6', strokeWidth: 1.5, strokeDasharray: '6 3' } }
            : e
        );
        return result;
      });
    },
    [setEdges],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData('application/requestData');
      if (!raw) {
        console.warn('[DiagramView] onDrop — no requestData in dataTransfer');
        return;
      }
      try {
        const dropped: NetworkRequest = JSON.parse(raw);
        const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        diagramRequestIdsRef.current.add(dropped.id);
        setNodes((nds) => {
          const newNode: Node = {
            id: `${dropped.id}-${Date.now()}`,
            type: 'request',
            position,
            data: { request: dropped, showHandles: false },
          };
          return [...nds, newNode];
        });
      } catch (err) {
        console.error('[DiagramView] onDrop — JSON.parse failed:', err, '| raw:', raw);
      }
    },
    [screenToFlowPosition, setNodes],
  );

  return (
    <div className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={(changes) => {
          onNodesChange(changes);
        }}
        onEdgesChange={(changes) => {
          onEdgesChange(changes);
        }}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeClick={(_e, node) => {
          const isDeselect = selectedNodeId === node.id;
          const next = isDeselect ? null : node.id;
          setSelectedNodeId(next);
          if (!isDeselect) {
            const req = (node.data as { request?: NetworkRequest }).request;
            if (req && onNodeClick) {
              onNodeClick(req);
            }
          }
        }}
        onPaneClick={() => {
          if (justConnectedRef.current) return;
          setSelectedNodeId(null);
        }}
        onConnectStart={(_, params) => {
          connectStartNodeIdRef.current = params.nodeId ?? null;
          connectStartHandleIdRef.current = params.handleId ?? null;
          setIsConnecting(true);
        }}
        onConnectEnd={() => {
          setIsConnecting(false);
          justConnectedRef.current = true;
          setTimeout(() => { justConnectedRef.current = false; }, 0);
        }}
        onError={(id, msg) => {
          console.error('[DiagramView] ReactFlow onError — id:', id, '| msg:', msg);
        }}
        connectionMode={'loose' as any}
        fitView
        colorMode="dark"
        deleteKeyCode="Delete"
      >
        <Background />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}

export function DiagramView(props: DiagramViewProps) {
  const { t } = useI18n();
  const { request, onClose, composerName, composerDescription, isTemp } = props;
  const [isSaveDrawerOpen, setIsSaveDrawerOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');

  return (
    <div className="h-full flex flex-col bg-table-bodyBg">
      <div className="px-4 pt-4 pb-3 border-b border-divider shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-500/15 border border-blue-500/25">
            <GitBranch className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-text-primary">
                {composerName || (isTemp ? <span className="text-text-secondary italic">{t.composer.untitled}</span> : t.composer.diagramComposer)}
              </h2>
              {isTemp && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-warning/15 text-warning border border-warning/30">{t.composer.temp}</span>
              )}
            </div>
            <p className="text-xs text-text-secondary">
              {composerDescription || (isTemp ? <span className="italic">{t.composer.noDescription}</span> : (request ? `${request.method} ${request.host}` : t.composer.noRequestSelected))}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {isTemp && (
            <button
              onClick={() => setIsSaveDrawerOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-all"
            >
              <Save className="w-3.5 h-3.5" />
              {t.composer.save}
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="p-1.5 rounded-lg text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Save Drawer */}
      {isSaveDrawerOpen && (
        <>
          <div className="absolute inset-0 bg-black/40 z-40" onClick={() => setIsSaveDrawerOpen(false)} />
          <div
            className="absolute bottom-0 left-0 right-0 z-50 bg-dialog-background border-t border-divider rounded-t-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300"
            style={{ height: '45%' }}
          >
            <div className="px-4 pt-4 pb-3 border-b border-divider flex items-center gap-3 shrink-0">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/15 border border-primary/25 shrink-0">
                <Save className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-text-primary">{t.composer.saveDiagram}</h3>
                <p className="text-xs text-text-secondary mt-0.5">{t.composer.saveDiagramDesc}</p>
              </div>
              <button onClick={() => setIsSaveDrawerOpen(false)} className="p-1.5 rounded-lg bg-secondary text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">{t.composer.name}</label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder={t.composer.diagramNamePlaceholder}
                  className="w-full bg-table-headerBg border border-input-border-default rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">{t.composer.description}</label>
                <textarea
                  value={saveDesc}
                  onChange={(e) => setSaveDesc(e.target.value)}
                  placeholder={t.composer.diagramDescPlaceholder}
                  rows={3}
                  className="w-full bg-table-headerBg border border-input-border-default rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary resize-none"
                />
              </div>
            </div>
            <div className="px-5 py-4 border-t border-divider flex justify-end gap-3 shrink-0">
              <button onClick={() => setIsSaveDrawerOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-sidebar-itemHover transition-colors">
                {t.composer.cancel}
              </button>
              <button
                onClick={() => setIsSaveDrawerOpen(false)}
                disabled={!saveName.trim()}
                className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                {t.composer.saveDiagram}
              </button>
            </div>
          </div>
        </>
      )}

      <ReactFlowProvider>
        <DiagramViewInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}

// Re-export as memoized — only re-renders when request.id, onClose, or onNodeClick change
export { DiagramView as DiagramViewBase };
const MemoizedDiagramView = memo(DiagramView, (prev, next) =>
  prev.request?.id === next.request?.id &&
  prev.onClose === next.onClose &&
  prev.onNodeClick === next.onNodeClick
);
export { MemoizedDiagramView as DiagramViewMemo };
