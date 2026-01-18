import React, { useCallback, useMemo, DragEvent } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  ReactFlowProvider,
  Node,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { X, Network } from 'lucide-react';
import { HttpsRequestNode } from './HttpsRequestNode';
import { NetworkRequest } from '../types';

interface FlowBoardProps {
  initialData: { nodes: any[]; edges: any[] };
  onClose: () => void;
  requests: NetworkRequest[];
  onSaveFlow?: (data: { nodes: any[]; edges: any[] }) => void;
  onAddNodeRef?: (addNode: (request: NetworkRequest) => void) => void;
  onSelectRequest?: (request: NetworkRequest | null) => void;
}

// Register custom node types
const nodeTypes = {
  httpsRequest: HttpsRequestNode,
};

export function FlowBoard(props: FlowBoardProps) {
  return (
    <div className="h-full w-full bg-background flex flex-col">
      <ReactFlowProvider>
        <FlowBoardInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}

function FlowBoardInner({
  initialData,
  onClose,
  requests,
  onSaveFlow,
  onAddNodeRef,
  onSelectRequest,
}: FlowBoardProps) {
  // Convert initial nodes to include request data
  const initialNodes = useMemo(() => {
    return (initialData.nodes || []).map((node: any) => {
      if (node.type === 'httpsRequest' && node.data?.requestId) {
        const request = requests.find((r) => r.id === node.data.requestId);
        return {
          ...node,
          data: { ...node.data, request },
        };
      }
      return node;
    });
  }, [initialData.nodes, requests]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData.edges || []);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  // Expose addNode function to parent
  const addNode = useCallback(
    (request: NetworkRequest) => {
      const nodeCount = nodes.length;
      const newNode: Node = {
        id: `node-${request.id}-${Date.now()}`,
        type: 'httpsRequest',
        position: { x: 100, y: 100 + nodeCount * 200 },
        data: { requestId: request.id, request },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [nodes.length, setNodes],
  );

  // Register addNode with parent on mount
  React.useEffect(() => {
    onAddNodeRef?.(addNode);
  }, [addNode, onAddNodeRef]);

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const requestId = event.dataTransfer.getData('application/requestId');
      const requestDataStr = event.dataTransfer.getData('application/requestData');

      if (!requestId) return;

      let request: NetworkRequest | undefined;
      try {
        request = JSON.parse(requestDataStr);
      } catch {
        request = requests.find((r) => r.id === requestId);
      }

      if (!request) return;

      // Get drop position relative to the ReactFlow container
      const reactFlowBounds = event.currentTarget.getBoundingClientRect();
      const position = {
        x: event.clientX - reactFlowBounds.left - 140, // Center the node
        y: event.clientY - reactFlowBounds.top - 50,
      };

      const newNode: Node = {
        id: `node-${requestId}-${Date.now()}`,
        type: 'httpsRequest',
        position,
        data: { requestId, request },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [requests, setNodes],
  );

  const handleSave = useCallback(() => {
    // Clean up request data before saving (only keep requestId)
    const cleanNodes = nodes.map((node) => ({
      ...node,
      data: node.type === 'httpsRequest' ? { requestId: node.data.requestId } : node.data,
    }));
    onSaveFlow?.({ nodes: cleanNodes, edges });
  }, [nodes, edges, onSaveFlow]);

  return (
    <div className="flex flex-col h-full w-full">
      {/* Header */}
      <div className="h-12 border-b border-border flex items-center px-4 justify-between bg-card text-card-foreground shadow-sm shrink-0">
        <div className="flex items-center gap-2 font-bold text-green-500">
          <Network className="w-5 h-5" />
          Flow Visualization
        </div>
        <div className="flex items-center gap-2">
          {onSaveFlow && (
            <button
              onClick={handleSave}
              className="px-3 py-1.5 rounded bg-green-500/10 text-green-500 hover:bg-green-500/20 text-xs font-medium transition-colors border border-green-500/30"
            >
              Save Flow
            </button>
          )}
          <button
            onClick={onClose}
            className="flex items-center gap-1 p-1 rounded-md text-xs font-medium transition-colors hover:text-red-500 hover:bg-red-500/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        className="flex-1 w-full h-full bg-neutral-900/50"
        onDragOver={onDragOver}
        onDrop={onDrop}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => {
            if (node.type === 'httpsRequest' && node.data?.request) {
              onSelectRequest?.(node.data.request as NetworkRequest);
            }
          }}
          onPaneClick={() => onSelectRequest?.(null)}
          fitView
          className="bg-background"
          colorMode="dark"
          defaultEdgeOptions={{
            style: { stroke: '#22c55e', strokeWidth: 2 },
            animated: true,
          }}
        >
          <Background />
          <Controls />
        </ReactFlow>
      </div>

      {/* Drop Zone Hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-xs text-muted-foreground bg-card/80 px-3 py-1.5 rounded-full border border-border/50 pointer-events-none">
        Drag HTTPS requests from the table above to add nodes
      </div>
    </div>
  );
}
