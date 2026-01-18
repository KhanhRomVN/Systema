import { useCallback } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { X, Network } from 'lucide-react';

interface FlowBoardProps {
  initialData: { nodes: any[]; edges: any[] };
  onClose: () => void;
}

// Wrapper to provide ReactFlow context if needed
export function FlowBoard(props: FlowBoardProps) {
  return (
    <div className="h-full w-full bg-background flex flex-col">
      <ReactFlowProvider>
        <FlowBoardInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}

function FlowBoardInner({ initialData, onClose }: FlowBoardProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialData.nodes || []);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData.edges || []);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="h-12 border-b border-border flex items-center px-4 justify-between bg-card text-card-foreground shadow-sm shrink-0">
        <div className="flex items-center gap-2 font-bold text-green-500">
          <Network className="w-5 h-5" />
          Flow Visualization
        </div>
        <button
          onClick={onClose}
          className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-xs font-medium transition-colors"
        >
          <X className="w-4 h-4" />
          Exit Flow View
        </button>
      </div>

      <div className="flex-1 w-full h-full bg-neutral-900/50">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          fitView
          className="bg-background"
          colorMode="dark"
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>
    </div>
  );
}
