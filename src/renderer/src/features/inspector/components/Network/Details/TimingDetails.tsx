import { NetworkRequest } from '../../../types';
import { cn } from '../../../../../shared/lib/utils';

interface TimingDetailsProps {
  request: NetworkRequest;
}

export function TimingDetails({ request }: TimingDetailsProps) {
  const analysis = request.analysis;

  if (!analysis?.timing) {
    return <div className="text-text-secondary italic">No timing analysis available</div>;
  }

  return (
    <div className="space-y-4">
      {/* Waterfall Visualization */}
      <div className="p-2.5 bg-secondary/20 rounded-lg border border-divider/50">
        <h3 className="text-[10px] font-bold text-text-secondary uppercase mb-2.5">
          Request Waterfall
        </h3>
        <div className="space-y-1.5 relative">
          {Object.entries(analysis.timing.phases).map(([phase, data]: [string, any]) => {
            // Simple mock visualization logic
            // In real app, calculate true start/duration percentages relative to total time
            const styles: Record<string, any> = {
              blocked: {
                left: '0%',
                width: '5%',
                color: 'text-slate-500',
                bg: 'bg-slate-500',
              },
              dns: {
                left: '5%',
                width: '10%',
                color: 'text-warning',
                bg: 'bg-warning',
              },
              tcp: {
                left: '15%',
                width: '15%',
                color: 'text-warning/80',
                bg: 'bg-warning/80',
              },
              ssl: {
                left: '30%',
                width: '20%',
                color: 'text-indigo-500',
                bg: 'bg-indigo-500',
              },
              send: {
                left: '50%',
                width: '5%',
                color: 'text-primary',
                bg: 'bg-primary',
              },
              wait: {
                left: '55%',
                width: '30%',
                color: 'text-success',
                bg: 'bg-success',
              },
              receive: {
                left: '85%',
                width: '15%',
                color: 'text-primary/70',
                bg: 'bg-primary/70',
              },
            };
            const style = styles[phase] || {
              left: '0%',
              width: '10%',
              color: 'text-slate-500',
              bg: 'bg-slate-500',
            };

            return (
              <div
                key={phase}
                className="grid grid-cols-[80px_1fr_50px] gap-2 items-center text-[10px] sm:text-xs group"
              >
                <div
                  className="text-text-secondary text-right capitalize truncate"
                  title={data.description}
                >
                  {phase}
                </div>
                <div className="relative h-3 bg-secondary/50 rounded-sm overflow-hidden">
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
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="p-2 border border-divider/40 rounded bg-secondary/10">
          <div className="text-[10px] text-text-secondary uppercase mb-0.5">Total Time</div>
          <div className="font-bold text-base">{analysis.timing.breakdown.total}</div>
        </div>
        <div className="p-2 border border-divider/40 rounded bg-secondary/10">
          <div className="text-[10px] text-text-secondary uppercase mb-0.5">Time to First Byte</div>
          <div className="font-bold text-base">{analysis.timing.breakdown.timeToFirstByte}</div>
        </div>
        <div className="p-2 border border-divider/40 rounded bg-secondary/10">
          <div className="text-[10px] text-text-secondary uppercase mb-0.5">Latency</div>
          <div className="font-bold text-base">{analysis.timing.performance.latency}</div>
        </div>
        <div className="p-2 border border-divider/40 rounded bg-secondary/10">
          <div className="text-[10px] text-text-secondary uppercase mb-0.5">Download Speed</div>
          <div className="font-bold text-base">{analysis.timing.performance.downloadSpeed}</div>
        </div>
      </div>
    </div>
  );
}
