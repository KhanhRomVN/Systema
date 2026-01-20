import { useCallback, useMemo, DragEvent, useEffect, useState, useRef } from 'react';
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
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { X, Network, ArrowRightFromLine, ArrowDownFromLine, GitFork } from 'lucide-react';
import { HttpsRequestNode } from '../HttpsRequestNode';
import { IfNode } from '../IfNode';
import { NetworkRequest } from '../../types';
import { FlowLayoutContext } from './FlowContext';

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
  ifNode: IfNode,
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
  const { screenToFlowPosition } = useReactFlow();
  const [direction, setDirection] = useState<'vertical' | 'horizontal'>('vertical');
  const isInitialMount = useRef(true);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Convert initial nodes to include request data
  const initialNodes = useMemo(() => {
    return (initialData.nodes || []).map((node: any) => {
      // If the node already has a request object (saved with flow), use it.
      // Otherwise fallback to looking it up by ID (migration/backward compat).
      if (node.type === 'httpsRequest') {
        // Case 1: Already flattened (check for required field like 'method' or 'host' to be safe, or just trust the new state)
        if (node.data?.method) {
          return node;
        }
        // Case 2: Nested 'request' object (Migration from previous step)
        if (node.data?.request) {
          const { request, ...rest } = node.data;
          return {
            ...node,
            data: { ...rest, ...request },
          };
        }
        // Case 3: Legacy 'requestId'
        if (node.data?.requestId) {
          const request = requests.find((r) => r.id === node.data.requestId);
          if (request) {
            const { requestId, ...restData } = node.data;
            return {
              ...node,
              data: { ...restData, ...request },
            };
          }
        }
      }
      return node;
    });
  }, [initialData.nodes, requests]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialData.edges || []);

  const onConnect = useCallback(
    (params: Connection) => {
      // Determine edge color based on source node type
      const sourceNode = nodes.find((n) => n.id === params.source);
      let edgeColor = '#22c55e'; // default green

      if (sourceNode?.type === 'ifNode') {
        edgeColor = '#eab308'; // yellow for ifNode
      }

      const edge = {
        ...params,
        type: 'step',
        style: { stroke: edgeColor, strokeWidth: 2 },
        animated: true,
      };
      setEdges((eds) => addEdge(edge, eds));
    },
    [setEdges, nodes],
  );

  // Expose addNode function to parent
  const addNode = useCallback(
    (request: NetworkRequest) => {
      const nodeCount = nodes.length;
      const newNode: Node = {
        id: `node-${request.id}-${Date.now()}`,
        type: 'httpsRequest',
        position: { x: 100, y: 100 + nodeCount * 200 },
        data: { ...request, sequence: nodeCount + 1 },
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
                ...newReq,
              },
            };
          }
          return node;
        }),
      );
    },
    [setNodes],
  );

  // Smart Edge Handling - Simplified for Layout Mode
  // When in strict vertical/horizontal mode, we might not need dynamic handle switching
  // as much, or we switch logic based on direction.
  const updateEdgeHandles = useCallback(() => {
    // If we want to enforce handles based on layout direction:
    setEdges((currentEdges) => {
      let hasChanges = false;
      const newEdges = currentEdges.map((edge) => {
        const sourceNode = nodes.find((n) => n.id === edge.source);
        const targetNode = nodes.find((n) => n.id === edge.target);

        if (!sourceNode || !targetNode || sourceNode.type === 'ifNode') return edge;

        let newSourceHandle = edge.sourceHandle;
        let newTargetHandle = edge.targetHandle;

        if (direction === 'vertical') {
          // Enforce Bottom -> Top
          newSourceHandle = 'bottom';
          newTargetHandle = 'top';
        } else {
          // Enforce Right -> Left
          newSourceHandle = 'right';
          newTargetHandle = 'left';
        }

        // Special case for IfNode connections (Yellow)?
        // If connecting FROM a yellow dot, handle ID might be specific.
        // We should preserve special handles if they were manually selected/created?
        // For now, let's just stick to the main flow.

        // Only update if it's a standard HTTPS-HTTPS connection
        if (sourceNode.type === 'httpsRequest' && targetNode.type === 'httpsRequest') {
          if (newSourceHandle !== edge.sourceHandle || newTargetHandle !== edge.targetHandle) {
            hasChanges = true;
            return {
              ...edge,
              sourceHandle: newSourceHandle,
              targetHandle: newTargetHandle,
            };
          }
        }
        return edge;
      });
      return hasChanges ? newEdges : currentEdges;
    });
  }, [nodes, setEdges, direction]);

  // Update edges when layout changes
  useEffect(() => {
    updateEdgeHandles();
  }, [direction, updateEdgeHandles]);

  // Trigger edge update on interaction
  const onNodeDrag = useCallback(() => {
    // We can disable dynamic smart routing if we are enforcing layout direction
    // updateEdgeHandles();
  }, []);

  // Register methods with parent
  useEffect(() => {
    onAddNodeRef?.(addNode);
    onMethodsReady?.({ updateNodeRequest });
  }, [addNode, updateNodeRequest, onAddNodeRef, onMethodsReady]);

  // Auto-save flow on changes (debounced)
  useEffect(() => {
    // Skip auto-save on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    // Clear existing timeout
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Debounce auto-save by 500ms
    autoSaveTimeoutRef.current = setTimeout(() => {
      if (onSaveFlow) {
        const cleanNodes = nodes.map((node) => ({
          ...node,
          data: node.data,
        }));
        onSaveFlow({ nodes: cleanNodes, edges });
      }
    }, 500);

    // Cleanup timeout on unmount
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [nodes, edges, onSaveFlow]);

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

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      let request: NetworkRequest | undefined;
      try {
        request = JSON.parse(requestDataStr);
      } catch {
        request = requests.find((r) => r.id === requestId);
      }

      if (!request) return;

      const newNode: Node = {
        id: `node-${request.id}-${Date.now()}`,
        type: 'httpsRequest',
        position,
        data: {
          ...request,
          sequence: nodes.length + 1,
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [requests, setNodes, nodes.length, screenToFlowPosition],
  );

  const handleSave = useCallback(() => {
    // Save the FULL request object in the node data to ensure independence
    const cleanNodes = nodes.map((node) => ({
      ...node,
      data: node.data, // Save everything including 'request' object
    }));
    onSaveFlow?.({ nodes: cleanNodes, edges });
  }, [nodes, edges, onSaveFlow]);

  const addIfNode = () => {
    const newNode: Node = {
      id: `node-if-${Date.now()}`,
      type: 'ifNode',
      position: { x: 250, y: 250 },
      data: { label: 'Condition' },
    };
    setNodes((nds) => [...nds, newNode]);
  };

  return (
    <FlowLayoutContext.Provider value={{ direction }}>
      <div className="flex flex-col h-full w-full">
        {/* Header */}
        <div className="h-12 border-b border-border flex items-center px-4 justify-between bg-card text-card-foreground shadow-sm shrink-0">
          <div className="flex items-center gap-2 font-bold text-green-500">
            <Network className="w-5 h-5" />
            Flow
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-lg">
            <button
              onClick={() => setDirection('vertical')}
              className={`p-1.5 rounded transition-all ${direction === 'vertical' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:bg-background/50'}`}
              title="Vertical Layout"
            >
              <ArrowDownFromLine className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDirection('horizontal')}
              className={`p-1.5 rounded transition-all ${direction === 'horizontal' ? 'bg-background shadow text-foreground' : 'text-muted-foreground hover:bg-background/50'}`}
              title="Horizontal Layout"
            >
              <ArrowRightFromLine className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-border mx-1" />
            <button
              onClick={addIfNode}
              className="flex items-center gap-1 px-2 py-1.5 rounded hover:bg-yellow-500/10 text-yellow-500 text-xs font-medium transition-colors border border-yellow-500/0 hover:border-yellow-500/30"
              title="Add If/Else Node"
            >
              <GitFork className="w-4 h-4" />
              If/Else
            </button>
          </div>

          <div className="flex items-center gap-2">
            {onSaveFlow && (
              <button
                onClick={handleSave}
                className="px-3 py-1.5 rounded bg-green-500/10 text-green-500 hover:bg-green-500/20 text-xs font-medium transition-colors border border-green-500/30"
              >
                Save
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
                onNodeSelect?.(node.id, node.data.request as NetworkRequest);
              } else {
                onNodeSelect?.(null, null);
              }
            }}
            onPaneClick={() => onNodeSelect?.(null, null)}
            onNodeDrag={onNodeDrag}
            fitView
            className="bg-background"
            colorMode="dark"
            defaultEdgeOptions={{
              type: 'step', // Square edges
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
          Drag HTTPS requests to add nodes
        </div>
      </div>
    </FlowLayoutContext.Provider>
  );
}
