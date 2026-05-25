import { useState, useRef, useEffect } from 'react';
import { NetworkRequest } from '../../../../../types/inspector';
import { cn } from '../../../../../shared/lib/utils';
import { GitBranch, GitMerge, GitCommit, GitPullRequest } from 'lucide-react';

interface Node {
  id: string;
  label: string;
  type: 'request' | 'response' | 'dependency';
  request?: NetworkRequest;
  x: number;
  y: number;
}

interface Edge {
  from: string;
  to: string;
  type: 'sequential' | 'parallel' | 'dependency';
}

interface DiagramPanelProps {
  requests?: NetworkRequest[];
  selectedRequestId?: string | null;
  onSelectRequest?: (id: string) => void;
}

export function DiagramPanel({ requests = [], selectedRequestId, onSelectRequest }: DiagramPanelProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Build graph from requests (simplified - groups requests by host/path)
  useEffect(() => {
    if (!requests || requests.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // Group requests by host and path pattern
    const hostGroups = new Map<string, NetworkRequest[]>();
    requests.forEach(req => {
      const key = req.host;
      if (!hostGroups.has(key)) hostGroups.set(key, []);
      hostGroups.get(key)!.push(req);
    });

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Create nodes for each unique host
    let index = 0;
    hostGroups.forEach((groupReqs, host) => {
      const mainRequest = groupReqs[0];
      newNodes.push({
        id: `host-${host}`,
        label: host,
        type: 'dependency',
        request: mainRequest,
        x: 50 + (index % 3) * 150,
        y: 50 + Math.floor(index / 3) * 100,
      });
      index++;
    });

    // Create edges based on referer or timing relationships
    for (let i = 0; i < newNodes.length; i++) {
      for (let j = i + 1; j < newNodes.length; j++) {
        // Simple sequential relationship based on timestamp
        const nodeARequests = Array.from(hostGroups.values())[i];
        const nodeBRequests = Array.from(hostGroups.values())[j];
        
        if (nodeARequests[0] && nodeBRequests[0]) {
          if (nodeARequests[0].timestamp < nodeBRequests[0].timestamp) {
            newEdges.push({
              from: newNodes[i].id,
              to: newNodes[j].id,
              type: 'sequential'
            });
          }
        }
      }
    }

    setNodes(newNodes);
    setEdges(newEdges);
  }, [requests]);

  const handleNodeClick = (node: Node, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNodeId(node.id);
    if (node.request && onSelectRequest) {
      onSelectRequest(node.request.id);
    }
  };

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target === canvasRef.current || (e.target as HTMLElement).classList.contains('canvas-bg')) {
      setIsDragging(true);
      dragStartRef.current = { x: e.clientX - pan.x, y: e.clientY - pan.y };
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStartRef.current.x,
        y: e.clientY - dragStartRef.current.y
      });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.1, 2));
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.1, 0.5));
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const getEdgeColor = (type: Edge['type']) => {
    switch (type) {
      case 'sequential': return 'text-blue-400';
      case 'parallel': return 'text-green-400';
      case 'dependency': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const getNodeColor = (type: Node['type']) => {
    switch (type) {
      case 'request': return 'border-blue-400 bg-blue-500/10';
      case 'response': return 'border-green-400 bg-green-500/10';
      case 'dependency': return 'border-orange-400 bg-orange-500/10';
      default: return 'border-gray-400 bg-gray-500/10';
    }
  };

  return (
    <div className="h-full flex flex-col bg-table-bodyBg">
      {/* Toolbar */}
      <div className="px-3 py-2 border-b border-divider flex items-center justify-between shrink-0 bg-table-headerBg">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4 h-4 text-primary" />
          <span className="text-xs font-semibold text-text-primary">Composer Diagram</span>
          <span className="text-[10px] text-text-secondary">({nodes.length} nodes, {edges.length} edges)</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-sidebar-itemHover transition-colors"
            title="Zoom Out"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
          <span className="text-xs text-text-secondary w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-sidebar-itemHover transition-colors"
            title="Zoom In"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
              <line x1="11" y1="8" x2="11" y2="14"/>
              <line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
          <div className="w-px h-4 bg-divider mx-1" />
          <button
            onClick={handleResetView}
            className="p-1.5 rounded text-text-secondary hover:text-text-primary hover:bg-sidebar-itemHover transition-colors"
            title="Reset View"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
              <path d="M3 3v5h5"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div
        ref={canvasRef}
        className="flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing"
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
      >
        <div
          className="canvas-bg absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgb(var(--border)) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {/* Edges */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
            {edges.map((edge, idx) => {
              const fromNode = nodes.find(n => n.id === edge.from);
              const toNode = nodes.find(n => n.id === edge.to);
              if (!fromNode || !toNode) return null;
              
              const fromX = fromNode.x;
              const fromY = fromNode.y;
              const toX = toNode.x;
              const toY = toNode.y;
              
              return (
                <g key={idx}>
                  <line
                    x1={fromX}
                    y1={fromY}
                    x2={toX}
                    y2={toY}
                    stroke={edge.type === 'sequential' ? '#60A5FA' : edge.type === 'parallel' ? '#34D399' : '#FBBF24'}
                    strokeWidth="2"
                    strokeDasharray={edge.type === 'dependency' ? '5,5' : 'none'}
                    markerEnd="url(#arrowhead)"
                  />
                  <text
                    x={(fromX + toX) / 2}
                    y={(fromY + toY) / 2 - 5}
                    className={cn('text-[8px] fill-current', getEdgeColor(edge.type))}
                  >
                    {edge.type}
                  </text>
                </g>
              );
            })}
            <defs>
              <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <polygon points="0 0, 6 3, 0 6" fill="#60A5FA" />
              </marker>
            </defs>
          </svg>

          {/* Nodes */}
          {nodes.map((node) => {
            const isSelected = selectedNodeId === node.id || (selectedRequestId && node.request?.id === selectedRequestId);
            return (
              <div
                key={node.id}
                onClick={(e) => handleNodeClick(node, e)}
                className={cn(
                  'absolute p-2 rounded-lg border-2 cursor-pointer transition-all hover:shadow-lg',
                  getNodeColor(node.type),
                  isSelected && 'ring-2 ring-primary ring-offset-2 ring-offset-background',
                )}
                style={{
                  left: node.x,
                  top: node.y,
                  transform: `translate(${node.x}px, ${node.y}px)`,
                }}
              >
                <div className="flex items-center gap-2">
                  {node.type === 'request' && <GitCommit className="w-3 h-3" />}
                  {node.type === 'response' && <GitPullRequest className="w-3 h-3" />}
                  {node.type === 'dependency' && <GitBranch className="w-3 h-3" />}
                  <span className="text-xs font-mono font-medium">{node.label}</span>
                </div>
                {node.request && (
                  <div className="text-[10px] text-text-secondary mt-1">
                    {node.request.method} {node.request.status}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-3 py-2 border-t border-divider flex items-center gap-4 shrink-0 bg-table-headerBg text-[10px]">
        <div className="flex items-center gap-1.5">
          <GitBranch className="w-3 h-3 text-orange-400" />
          <span className="text-text-secondary">Dependency</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-blue-400" />
          <span className="text-text-secondary">Sequential</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-green-400" />
          <span className="text-text-secondary">Parallel</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 bg-yellow-400 border-dashed border" />
          <span className="text-text-secondary">Dependency</span>
        </div>
      </div>
    </div>
  );
}