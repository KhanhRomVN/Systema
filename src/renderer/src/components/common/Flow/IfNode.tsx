// IfNode component for conditional logic in Flow
import { memo, useContext } from 'react';
import { Handle, Position, useEdges, useReactFlow } from '@xyflow/react';
import { cn } from '../../../shared/lib/utils';
import { GitFork, Plus, Minus } from 'lucide-react';
import { FlowLayoutContext } from './FlowContext';

interface IfNodeData {
  label?: string;
  inputCount?: number; // Number of input conditions
}

interface IfNodeProps {
  data: IfNodeData;
  selected?: boolean;
}

function IfNodeComponent({ data, selected, id }: IfNodeProps & { id: string }) {
  const { direction } = useContext(FlowLayoutContext);
  const isVertical = direction === 'vertical';
  const edges = useEdges();
  const { setNodes } = useReactFlow();

  // Get input count from data, default to 1
  const inputCount = data.inputCount || 1;
  const requiredOutputEdges = inputCount + 1;

  // Count actual output edges
  const outputEdges = edges.filter((edge) => edge.source === id);
  const hasCorrectEdgeCount = outputEdges.length === requiredOutputEdges;

  // Compute handle colors based on connections
  const getHandleColor = (handleId: string, handleType: 'source' | 'target') => {
    const connectedEdges = edges.filter((edge) =>
      handleType === 'source'
        ? edge.source === id && edge.sourceHandle === handleId
        : edge.target === id && edge.targetHandle === handleId,
    );

    if (connectedEdges.length === 0) return 'gray';
    return 'yellow';
  };

  const inColor = getHandleColor('in', 'target');

  // Update input count
  const updateInputCount = (newCount: number) => {
    if (newCount < 1) return;
    setNodes((nodes) =>
      nodes.map((node) =>
        node.id === id ? { ...node, data: { ...node.data, inputCount: newCount } } : node,
      ),
    );
  };

  return (
    <div
      className={cn(
        'bg-card border-2 rounded-lg min-w-[160px] shadow-lg transition-all relative group',
        selected
          ? 'border-yellow-500 ring-1 ring-yellow-500/50 z-20'
          : 'border-yellow-500/50 hover:border-yellow-500',
      )}
    >
      {/* Target Handle (Input) */}
      <Handle
        type="target"
        position={isVertical ? Position.Top : Position.Left}
        id="in"
        className={cn(
          '!w-3 !h-3 !border-0 transition-colors',
          inColor === 'yellow' && '!bg-yellow-500',
          inColor === 'gray' && '!bg-gray-500',
        )}
      />

      {/* Dynamic Source Handles (Outputs) */}
      {Array.from({ length: requiredOutputEdges }).map((_, index) => {
        const handleId = `out-${index}`;
        const outColor = getHandleColor(handleId, 'source');

        // Calculate position offset for multiple handles
        const totalHandles = requiredOutputEdges;
        const offset = totalHandles > 1 ? (index / (totalHandles - 1)) * 100 : 50;

        return (
          <Handle
            key={handleId}
            type="source"
            position={isVertical ? Position.Bottom : Position.Right}
            id={handleId}
            className={cn(
              '!w-3 !h-3 !border-0 transition-colors',
              outColor === 'yellow' && '!bg-yellow-500',
              outColor === 'gray' && '!bg-gray-500',
            )}
            style={isVertical ? { left: `${offset}%` } : { top: `${offset}%` }}
          />
        );
      })}

      {/* Content */}
      <div className="px-4 py-3 bg-card/50 rounded-lg flex flex-col items-center justify-center gap-2 text-yellow-500">
        <GitFork className="w-5 h-5" />
        <span className="text-xs font-bold uppercase tracking-wider">
          {data.label || 'Condition'}
        </span>

        {/* Input Count Controls */}
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={() => updateInputCount(inputCount - 1)}
            disabled={inputCount <= 1}
            className="p-1 rounded hover:bg-yellow-500/20 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Remove input"
          >
            <Minus className="w-3 h-3" />
          </button>
          <span className="text-[10px] font-mono bg-yellow-500/10 px-2 py-0.5 rounded">
            {inputCount} in → {requiredOutputEdges} out
          </span>
          <button
            onClick={() => updateInputCount(inputCount + 1)}
            className="p-1 rounded hover:bg-yellow-500/20 transition-colors"
            title="Add input"
          >
            <Plus className="w-3 h-3" />
          </button>
        </div>

        {/* Validation Indicator */}
        {!hasCorrectEdgeCount && (
          <div className="text-[9px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded mt-1">
            Need {requiredOutputEdges} edges (has {outputEdges.length})
          </div>
        )}
        {hasCorrectEdgeCount && outputEdges.length > 0 && (
          <div className="text-[9px] text-green-400 bg-green-500/10 px-2 py-0.5 rounded mt-1">
            ✓ Valid
          </div>
        )}
      </div>
    </div>
  );
}

export const IfNode = memo(IfNodeComponent);
