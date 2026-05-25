import { useState, useCallback, useEffect } from 'react';
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

  useEffect(() => {
    if (request) {
      setNodes([{
        id: `root-${request.id}`,
        type: 'request',
        position: { x: 300, y: 150 },
        data: { request, showHandles: false },
      }]);
      setEdges([]);
    }
  }, [request?.id]);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: { ...n.data, showHandles: n.id === selectedNodeId || isConnecting },
      })),
    );
  }, [selectedNodeId, isConnecting]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source === params.target) return;
      setEdges((eds) =>
        addEdge({
          ...params,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#3b82f6' },
          style: { stroke: '#3b82f6', strokeWidth: 1.5 },
        }, eds),
      );
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
      if (!raw) return;
      try {
        const dropped: NetworkRequest = JSON.parse(raw);
        const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        setNodes((nds) => [
          ...nds,
          {
            id: `${dropped.id}-${Date.now()}`,
            type: 'request',
            position,
            data: { request: dropped, showHandles: false },
          },
        ]);
      } catch {}
    },
    [screenToFlowPosition, setNodes],
  );

  return (
    <div className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onNodeClick={(_e, node) => {
          setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
          const req = (node.data as { request?: NetworkRequest }).request;
          if (req && onNodeClick) onNodeClick(req);
        }}
        onPaneClick={() => setSelectedNodeId(null)}
        onConnectStart={() => setIsConnecting(true)}
        onConnectEnd={() => setIsConnecting(false)}
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
