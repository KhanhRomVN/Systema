import React, { useCallback, useMemo, DragEvent, useEffect } from 'react';
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
  /**
   * Enhanced selection callback that includes the Node ID.
   * This is crucial for updating the specific node instance.
   */
  onNodeSelect?: (nodeId: string | null, request: NetworkRequest | null) => void;
  /**
   * Exposes methods to manipulate the board state from parent.
   */
  onMethodsReady?: (methods: {
    updateNodeRequest: (nodeId: string, req: NetworkRequest) => void;
  }) => void;
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
  onNodeSelect,
  onMethodsReady,
}: FlowBoardProps) {
  // Convert initial nodes to include request data
  const initialNodes = useMemo(() => {
    return (initialData.nodes || []).map((node: any) => {
      // If the node already has a request object (saved with flow), use it.
      // Otherwise fallback to looking it up by ID (migration/backward compat).
      if (node.type === 'httpsRequest') {
        if (node.data?.request) {
          return node;
        }
        if (node.data?.requestId) {
          const request = requests.find((r) => r.id === node.data.requestId);
          return {
            ...node,
            data: { ...node.data, request },
          };
        }
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

  // Expose updateNodeRequest function
  const updateNodeRequest = useCallback(
    (nodeId: string, newReq: NetworkRequest) => {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === nodeId) {
            return {
              ...node,
              data: {
                ...node.data,
                request: newReq,
                // We also update requestId if the ID changed, though usually it won't here.
                requestId: newReq.id,
              },
            };
          }
          return node;
        }),
      );
    },
    [setNodes],
  );

  // Handle Dynamic Edge Routing (Smart Handles)
  const updateEdgeHandles = useCallback(() => {
    setEdges((currentEdges) => {
      let hasChanges = false;
      const newEdges = currentEdges.map((edge) => {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        const targetNode = nodes.find((n) => n.id === edge.target);

        if (
          !sourceNode ||
          !targetNode ||
          sourceNode.type !== 'httpsRequest' ||
          targetNode.type !== 'httpsRequest'
        ) {
          return edge;
        }

        // Calculate centers
        const sourceCenter = {
          x: sourceNode.position.x + (sourceNode.measured?.width || 200) / 2,
          y: sourceNode.position.y + (sourceNode.measured?.height || 64) / 2,
        };
        const targetCenter = {
          x: targetNode.position.x + (targetNode.measured?.width || 200) / 2,
          y: targetNode.position.y + (targetNode.measured?.height || 64) / 2,
        };

        const dx = targetCenter.x - sourceCenter.x;
        const dy = targetCenter.y - sourceCenter.y;

        let newSourceHandle = edge.sourceHandle;
        let newTargetHandle = edge.targetHandle;

        // Logic:
        // If horizontal distance is greater than vertical, prefer Right->Left
        // If vertical distance is greater, prefer Bottom->Top

        // Threshold to switch to Horizontal
        if (Math.abs(dx) > Math.abs(dy)) {
          // Horizontal
          if (dx > 0) {
            // Target is to the Right
            newSourceHandle = 'right';
            newTargetHandle = 'left';
          } else {
            // Target is to the Left?? Current nodes don't support Left Source / Right Target.
            // We keep default or vertical if we can't support it, or force standard flow?
            // Let's stick to Bottom->Top for backward flow to avoid weird loops from side
            newSourceHandle = 'bottom';
            newTargetHandle = 'top';
          }
        } else {
          // Vertical
          if (dy > 0) {
            // Target is Below
            newSourceHandle = 'bottom';
            newTargetHandle = 'top';
          } else {
            // Target is Above
            // We don't have Top Source, so keep Bottom->Top (will loop around) or use Right->Top?
            newSourceHandle = 'bottom';
            newTargetHandle = 'top';
          }
        }

        if (newSourceHandle !== edge.sourceHandle || newTargetHandle !== edge.targetHandle) {
          hasChanges = true;
          return {
            ...edge,
            sourceHandle: newSourceHandle,
            targetHandle: newTargetHandle,
          };
        }
        return edge;
      });

      return hasChanges ? newEdges : currentEdges;
    });
  }, [nodes, setEdges]);

  // Trigger edge update on interaction
  const onNodeDrag = useCallback(() => {
    updateEdgeHandles();
  }, [updateEdgeHandles]);

  // Register methods with parent
  useEffect(() => {
    onAddNodeRef?.(addNode);
    onMethodsReady?.({ updateNodeRequest });
  }, [addNode, updateNodeRequest, onAddNodeRef, onMethodsReady]);

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
    // Save the FULL request object in the node data to ensure independence
    const cleanNodes = nodes.map((node) => ({
      ...node,
      data: node.data, // Save everything including 'request' object
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
              // Call the new selection handler with ID
              onNodeSelect?.(node.id, node.data.request as NetworkRequest);
            }
          }}
          onPaneClick={() => onNodeSelect?.(null, null)}
          onNodeDrag={onNodeDrag}
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
