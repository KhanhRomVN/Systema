import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { NetworkRequest } from '../types';
import { cn } from '../../../shared/lib/utils';

interface HttpsRequestNodeData {
  requestId: string;
  request: NetworkRequest;
}

interface HttpsRequestNodeProps {
  data: HttpsRequestNodeData;
  selected?: boolean;
}

function HttpsRequestNodeComponent({ data, selected }: HttpsRequestNodeProps) {
  const { request } = data;

  if (!request) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 min-w-[280px] text-xs text-muted-foreground">
        Request not found
        <Handle type="target" position={Position.Top} className="!bg-green-500 !w-2 !h-2" />
        <Handle type="source" position={Position.Bottom} className="!bg-green-500 !w-2 !h-2" />
        <Handle type="target" position={Position.Left} className="!bg-green-500 !w-2 !h-2" />
        <Handle type="source" position={Position.Right} className="!bg-green-500 !w-2 !h-2" />
      </div>
    );
  }

  const methodColors: Record<string, string> = {
    GET: 'text-blue-400',
    POST: 'text-green-400',
    PUT: 'text-orange-400',
    DELETE: 'text-red-400',
    PATCH: 'text-purple-400',
  };

  return (
    <div
      className={cn(
        'bg-card border rounded-lg min-w-[200px] max-w-[250px] shadow-lg transition-all',
        selected ? 'border-green-500 ring-1 ring-green-500/50 z-10' : 'border-border',
      )}
    >
      {/* Handles for edges */}
      <Handle
        type="target"
        position={Position.Top}
        id="top"
        className="!bg-green-500 !w-2 !h-2 !border-0"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        className="!bg-green-500 !w-2 !h-2 !border-0"
      />
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        className="!bg-green-500 !w-2 !h-2 !border-0"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        className="!bg-green-500 !w-2 !h-2 !border-0"
      />

      {/* Content */}
      <div className="px-3 py-2 bg-card rounded-lg flex flex-col gap-1">
        {/* Line 1: Method + Host */}
        <div className="flex items-center w-full overflow-hidden">
          <span
            className={cn(
              'text-xs font-bold mr-2 uppercase shrink-0',
              methodColors[request.method] || 'text-foreground',
            )}
          >
            {request.method}
          </span>
          <span className="text-xs text-foreground truncate" title={request.host}>
            {request.host}
          </span>
        </div>

        {/* Line 2: Path */}
        <div
          className={cn(
            'text-[10px] text-muted-foreground transition-all duration-200',
            selected
              ? 'whitespace-pre-wrap break-all max-h-[5rem] overflow-y-auto mt-1'
              : 'truncate',
          )}
          title={!selected ? request.path : undefined}
        >
          {request.path}
        </div>
      </div>
    </div>
  );
}

export const HttpsRequestNode = memo(HttpsRequestNodeComponent);
