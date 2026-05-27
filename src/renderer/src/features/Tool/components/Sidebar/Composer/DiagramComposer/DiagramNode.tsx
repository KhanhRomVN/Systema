import { Handle, Position } from '@xyflow/react';
import { NetworkRequest } from '../../../../../../types/inspector';
import { cn } from '../../../../../../shared/lib/utils';

const methodColors: Record<string, string> = {
  GET: 'text-blue-400',
  POST: 'text-green-400',
  PUT: 'text-orange-400',
  DELETE: 'text-red-400',
  PATCH: 'text-purple-400',
};

interface DiagramNodeData {
  request: NetworkRequest;
  showHandles?: boolean;
  connectionIndex?: number;
  selected?: boolean;
}

export function DiagramNode({ data }: { data: DiagramNodeData }) {
  const { request, showHandles = false, connectionIndex, selected = false } = data;
  const methodColor = methodColors[request.method] || 'text-gray-400';

  const dotStyle: React.CSSProperties = {
    width: 10,
    height: 10,
    background: '#3b82f6',
    border: '2px solid #0f172a',
    borderRadius: '50%',
    opacity: showHandles ? 1 : 0,
    transition: 'opacity 0.15s',
  };

  return (
    <div className={cn(
      'relative rounded-lg bg-zinc-900 border min-w-[180px] p-2 shadow-md transition-all duration-150',
      selected ? 'border-blue-500' : 'border-zinc-700'
    )}>
      {connectionIndex !== undefined && (
        <span className="absolute -top-2 -left-2 w-4 h-4 flex items-center justify-center rounded-full bg-blue-500 text-[9px] font-bold text-white leading-none">
          {connectionIndex}
        </span>
      )}
      <Handle type="source" position={Position.Top}    id="t" style={dotStyle} />
      <Handle type="target" position={Position.Top}    id="t-in" style={{ opacity: 0, width: 10, height: 10 }} />
      <Handle type="source" position={Position.Bottom} id="b" style={dotStyle} />
      <Handle type="target" position={Position.Bottom} id="b-in" style={{ opacity: 0, width: 10, height: 10 }} />

      <div className="flex items-center gap-2">
        <span className={cn('text-[9px] font-bold shrink-0', methodColor)}>
          {request.method}
        </span>
        <span className="text-xs font-mono text-text-primary truncate">{request.host}</span>
      </div>
      <div className="text-[10px] font-mono text-text-secondary truncate mt-1">{request.path}</div>
    </div>
  );
}
