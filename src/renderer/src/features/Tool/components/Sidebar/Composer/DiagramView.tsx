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
import { NetworkRequest } from '../../../../../types/inspector';
import { X, GitBranch } from 'lucide-react';
import { DiagramNode } from './DiagramNode';

const nodeTypes = { request: DiagramNode };

interface DiagramViewProps {
  request?: NetworkRequest | null;
  onClose?: () => void;
  onNodeClick?: (request: NetworkRequest) => void;
}

function DiagramViewInner({ request, onNodeClick }: DiagramViewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const { screenToFlowPosition } = useReactFlow();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const diagramRequestIdsRef = useRef<Set<string>>(new Set());

  console.log('[DiagramView] render — request:', request?.id, '| nodes:', nodes.length, '| edges:', edges.length, '| selectedNodeId:', selectedNodeId, '| isConnecting:', isConnecting);

  // Effect: add root node when request changes
  useEffect(() => {
    console.log('[DiagramView] useEffect[request.id] fired — request:', request?.id, '| diagramIds:', [...diagramRequestIdsRef.current]);
    if (request && !diagramRequestIdsRef.current.has(request.id)) {
      console.log('[DiagramView] → new request, resetting diagram with root node', request.id);
      diagramRequestIdsRef.current = new Set([request.id]);
      const rootNode: Node = {
        id: `root-${request.id}`,
        type: 'request',
        position: { x: 300, y: 150 },
        data: { request, showHandles: false },
      };
      console.log('[DiagramView] → setNodes([rootNode]):', rootNode);
      setNodes([rootNode]);
      setEdges([]);
    } else {
      console.log('[DiagramView] → request already in diagram or null, skipping reset');
    }
  }, [request?.id]);

  // Effect: sync showHandles on all nodes
  useEffect(() => {
    console.log('[DiagramView] useEffect[selectedNodeId, isConnecting] — selectedNodeId:', selectedNodeId, '| isConnecting:', isConnecting);
    setNodes((nds) => {
      const updated = nds.map((n) => ({
        ...n,
        data: { ...n.data, showHandles: n.id === selectedNodeId || isConnecting, selected: n.id === selectedNodeId },
      }));
      console.log('[DiagramView] → updated showHandles on', updated.length, 'nodes');
      return updated;
    });
  }, [selectedNodeId, isConnecting]);

  // Effect: compute connectionIndex from edges
  useEffect(() => {
    console.log('[DiagramView] useEffect[edges] — edges count:', edges.length, '| edges:', edges.map(e => `${e.source}→${e.target}`));
    const order: string[] = [];
    edges.forEach((e) => {
      if (e.source && !order.includes(e.source)) order.push(e.source);
      if (e.target && !order.includes(e.target)) order.push(e.target);
    });
    console.log('[DiagramView] → connection order:', order);
    setNodes((nds) => {
      const updated = nds.map((n) => {
        const idx = order.indexOf(n.id);
        return { ...n, data: { ...n.data, connectionIndex: idx === -1 ? undefined : idx + 1 } };
      });
      console.log('[DiagramView] → connectionIndex assigned:', updated.map(n => `${n.id}=${n.data.connectionIndex}`));
      return updated;
    });
  }, [edges]);

  const connectStartNodeIdRef = useRef<string | null>(null);
  const connectStartHandleIdRef = useRef<string | null>(null);
  const justConnectedRef = useRef(false);

  const onConnect = useCallback(
    (params: Connection) => {
      console.log('[DiagramView] onConnect — params:', params);
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
        console.log('[DiagramView] → edge added, total edges:', result.length);
        return result;
      });
    },
    [setEdges],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    console.log('[DiagramView] onDragOver');
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const raw = e.dataTransfer.getData('application/requestData');
      console.log('[DiagramView] onDrop — raw data length:', raw?.length, '| raw:', raw?.slice(0, 100));
      if (!raw) {
        console.warn('[DiagramView] onDrop — no requestData in dataTransfer');
        return;
      }
      try {
        const dropped: NetworkRequest = JSON.parse(raw);
        console.log('[DiagramView] onDrop — parsed request:', dropped.id, dropped.method, dropped.host);
        const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        console.log('[DiagramView] onDrop — flow position:', position);
        diagramRequestIdsRef.current.add(dropped.id);
        setNodes((nds) => {
          const newNode: Node = {
            id: `${dropped.id}-${Date.now()}`,
            type: 'request',
            position,
            data: { request: dropped, showHandles: false },
          };
          console.log('[DiagramView] → adding node:', newNode.id, '| total after:', nds.length + 1);
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
          console.log('[DiagramView] onNodesChange — changes:', changes);
          onNodesChange(changes);
        }}
        onEdgesChange={(changes) => {
          console.log('[DiagramView] onEdgesChange — changes:', changes);
          onEdgesChange(changes);
        }}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeClick={(_e, node) => {
          console.log('[DiagramView] onNodeClick — node:', node.id, '| data.request:', (node.data as any)?.request?.id);
          const isDeselect = selectedNodeId === node.id;
          const next = isDeselect ? null : node.id;
          console.log('[DiagramView] → selectedNodeId:', selectedNodeId, '→', next, isDeselect ? '(deselect, skip onNodeClick)' : '');
          setSelectedNodeId(next);
          if (!isDeselect) {
            const req = (node.data as { request?: NetworkRequest }).request;
            if (req && onNodeClick) {
              console.log('[DiagramView] → calling onNodeClick with request:', req.id);
              onNodeClick(req);
            }
          }
        }}
        onPaneClick={() => {
          if (justConnectedRef.current) return;
          console.log('[DiagramView] onPaneClick — clearing selectedNodeId');
          setSelectedNodeId(null);
        }}
        onConnectStart={(_, params) => {
          console.log('[DiagramView] onConnectStart — params:', params);
          connectStartNodeIdRef.current = params.nodeId ?? null;
          connectStartHandleIdRef.current = params.handleId ?? null;
          setIsConnecting(true);
        }}
        onConnectEnd={() => {
          console.log('[DiagramView] onConnectEnd');
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
  const { request, onClose } = props;
  console.log('[DiagramView] DiagramView wrapper render — request:', request?.id);
  return (
    <div className="h-full flex flex-col bg-table-bodyBg">
      <div className="px-4 pt-4 pb-3 border-b border-divider shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-500/15 border border-blue-500/25">
            <GitBranch className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-text-primary">Diagram Composer</h2>
            <p className="text-xs text-text-secondary">
              {request ? `${request.method} ${request.host}` : 'No request selected'}
            </p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1.5 rounded-lg text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
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
