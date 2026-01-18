import { memo, useContext } from 'react';
import { Handle, Position, useEdges } from '@xyflow/react';
import { NetworkRequest } from '../types';
import { cn } from '../../../shared/lib/utils';
import { FlowLayoutContext } from './FlowContext';

interface HttpsRequestNodeData extends NetworkRequest {
  sequence?: number; // Add sequence support
}

interface HttpsRequestNodeProps {
  data: HttpsRequestNodeData;
  selected?: boolean;
}

function HttpsRequestNodeComponent({ data, selected, id }: HttpsRequestNodeProps & { id: string }) {
  const { sequence, ...request } = data;
  const { direction } = useContext(FlowLayoutContext);
  const isVertical = direction === 'vertical';
  const edges = useEdges();

  // Compute handle colors based on connections
  const getHandleColor = (handleId: string, handleType: 'source' | 'target') => {
    const connectedEdges = edges.filter((edge) =>
      handleType === 'source'
        ? edge.source === id && edge.sourceHandle === handleId
        : edge.target === id && edge.targetHandle === handleId,
    );

    if (connectedEdges.length === 0) return 'gray';

    // If there are connections, use green color
    return 'green';
  };

  const inColor = getHandleColor('in', 'target');
  const outColor = getHandleColor('out', 'source');

  if (!request.id) {
    return (
      <div className="bg-card border border-border rounded-lg p-3 min-w-[280px] text-xs text-muted-foreground">
        Request not found
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
        'bg-card border rounded-lg min-w-[200px] max-w-[250px] shadow-lg transition-all relative group',
        selected ? 'border-green-500 ring-1 ring-green-500/50 z-10' : 'border-border',
      )}
    >
      {/* Sequence Badge */}
      {sequence !== undefined && (
        <div className="absolute -top-2.5 -left-2.5 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shadow-md z-20 border border-background">
          {sequence}
        </div>
      )}

      {/* Handles - Conditional Rendering based on Layout Context */}

      {/* Target (Input) */}
      <Handle
        type="target"
        position={isVertical ? Position.Top : Position.Left}
        id="in"
        className={cn(
          '!w-2 !h-2 !border-0 transition-colors',
          inColor === 'green' && '!bg-green-500',
          inColor === 'gray' && '!bg-gray-500',
        )}
      />

      {/* Source (Output - Main Flow) */}
      <Handle
        type="source"
        position={isVertical ? Position.Bottom : Position.Right}
        id="out"
        className={cn(
          '!w-2 !h-2 !border-0 transition-colors',
          outColor === 'green' && '!bg-green-500',
          outColor === 'gray' && '!bg-gray-500',
        )}
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
