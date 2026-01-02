import { NetworkRequest } from '../../types';
import { cn } from '../../../../shared/lib/utils';

interface TimingDetailsProps {
  request: NetworkRequest;
}

export function TimingDetails({ request }: TimingDetailsProps) {
  const analysis = request.analysis;

  if (!analysis?.timing) {
    return <div className="text-muted-foreground italic">No timing analysis available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Waterfall Visualization */}
      <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
        <h3 className="text-xs font-bold text-muted-foreground uppercase mb-4">
          Request Waterfall
        </h3>
        <div className="space-y-3 relative">
          {Object.entries(analysis.timing.phases).map(([phase, data]: [string, any]) => {
            // Simple mock visualization logic
            // In real app, calculate true start/duration percentages relative to total time
            const styles: Record<string, any> = {
              blocked: {
                left: '0%',
                width: '5%',
                color: 'text-gray-500',
                bg: 'bg-gray-500',
              },
              dns: {
                left: '5%',
                width: '10%',
                color: 'text-orange-500',
                bg: 'bg-orange-500',
              },
              tcp: {
                left: '15%',
                width: '15%',
                color: 'text-orange-400',
                bg: 'bg-orange-400',
              },
              ssl: {
                left: '30%',
                width: '20%',
                color: 'text-purple-500',
                bg: 'bg-purple-500',
              },
              send: {
                left: '50%',
                width: '5%',
                color: 'text-blue-500',
                bg: 'bg-blue-500',
              },
              wait: {
                left: '55%',
                width: '30%',
                color: 'text-green-500',
                bg: 'bg-green-500',
              },
              receive: {
                left: '85%',
                width: '15%',
                color: 'text-blue-400',
                bg: 'bg-blue-400',
              },
            };
            const style = styles[phase] || {
              left: '0%',
              width: '10%',
              color: 'text-gray-500',
              bg: 'bg-gray-500',
            };

            return (
              <div
                key={phase}
                className="grid grid-cols-[100px_1fr_60px] gap-4 items-center text-xs group"
              >
                <div
                  className="text-muted-foreground text-right capitalize truncate"
                  title={data.description}
                >
                  {phase}
                </div>
                <div className="relative h-4 bg-muted/50 rounded-sm overflow-hidden">
                  <div
                    className={cn(
                      'absolute top-0 bottom-0 rounded-sm opacity-60 group-hover:opacity-100 transition-opacity',
                      style.bg,
                    )}
                    style={{ left: style.left, width: style.width }}
                  />
                </div>
                <div className="font-mono text-right">{data.time}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-3 border border-border/40 rounded bg-muted/10">
          <div className="text-[10px] text-muted-foreground uppercase mb-1">Total Time</div>
          <div className="font-bold text-lg">{analysis.timing.breakdown.total}</div>
        </div>
        <div className="p-3 border border-border/40 rounded bg-muted/10">
          <div className="text-[10px] text-muted-foreground uppercase mb-1">Time to First Byte</div>
          <div className="font-bold text-lg">{analysis.timing.breakdown.timeToFirstByte}</div>
        </div>
        <div className="p-3 border border-border/40 rounded bg-muted/10">
          <div className="text-[10px] text-muted-foreground uppercase mb-1">Latency</div>
          <div className="font-bold text-lg">{analysis.timing.performance.latency}</div>
        </div>
        <div className="p-3 border border-border/40 rounded bg-muted/10">
          <div className="text-[10px] text-muted-foreground uppercase mb-1">Download Speed</div>
          <div className="font-bold text-lg">{analysis.timing.performance.downloadSpeed}</div>
        </div>
      </div>
    </div>
  );
}
