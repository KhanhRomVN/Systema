import { NetworkRequest } from '../../../types';
import { IssuesAnalysis } from '../../../analysisTypes';
import { cn } from '../../../../../shared/lib/utils';
import { AlertOctagon, CheckCircle2 } from 'lucide-react';

interface IssuesDetailsProps {
  request: NetworkRequest;
}

export function IssuesDetails({ request }: IssuesDetailsProps) {
  const analysis = request.analysis;

  if (analysis?.issues && analysis.issues.summary.total > 0) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-2">
          {/* Summary Cards */}
          <div className="bg-error/10 border border-error/20 p-2 rounded text-center">
            <div className="text-xl font-bold text-error">{analysis.issues.summary.critical}</div>
            <div className="text-[10px] font-bold uppercase text-error/80 tracking-wider">
              Critical
            </div>
          </div>
          <div className="bg-warning/10 border border-warning/20 p-2 rounded text-center">
            <div className="text-xl font-bold text-warning">{analysis.issues.summary.high}</div>
            <div className="text-[10px] font-bold uppercase text-warning/80 tracking-wider">
              High
            </div>
          </div>
          <div className="bg-warning/10 border border-warning/20 p-2 rounded text-center">
            <div className="text-xl font-bold text-warning">{analysis.issues.summary.medium}</div>
            <div className="text-[10px] font-bold uppercase text-warning/80 tracking-wider">
              Medium
            </div>
          </div>
          <div className="bg-primary/10 border border-primary/20 p-2 rounded text-center">
            <div className="text-xl font-bold text-primary">{analysis.issues.summary.low}</div>
            <div className="text-[10px] font-bold uppercase text-primary/80 tracking-wider">
              Low
            </div>
          </div>
        </div>

        {/* Issue Lists */}
        <div className="space-y-3">
          {['critical', 'high', 'medium', 'low', 'info'].map((severity) => {
            const items = analysis.issues![severity as keyof IssuesAnalysis] as any[];
            if (
              !items ||
              items.length === 0 ||
              severity === 'summary' ||
              severity === 'recommendations'
            )
              return null;

            const colors: Record<string, string> = {
              critical: 'border-error/30 bg-error/5',
              high: 'border-warning/30 bg-warning/5',
              medium: 'border-warning/30 bg-warning/5',
              low: 'border-primary/30 bg-primary/5',
              info: 'border-divider bg-secondary/20',
            };

            return (
              <div key={severity}>
                {items.map((issue, i) => (
                  <div
                    key={i}
                    className={cn(
                      'p-2.5 rounded-lg border mb-2 last:mb-0',
                      colors[severity] || colors.info,
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <AlertOctagon
                        className={cn(
                          'w-4 h-4 mt-0.5 shrink-0',
                          severity === 'critical'
                            ? 'text-error'
                            : severity === 'high' || severity === 'medium'
                              ? 'text-warning'
                              : 'text-primary',
                        )}
                      />
                      <div className="space-y-1">
                        <div className="font-bold text-sm flex items-center gap-2">
                          {issue.title}
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-dialog-background border border-divider/20 uppercase text-text-secondary">
                            {severity}
                          </span>
                        </div>
                        <p className="text-xs text-text-primary/80">{issue.description}</p>
                        {issue.recommendation && (
                          <div className="mt-1.5 text-[10px] bg-dialog-background/50 p-1.5 rounded border border-divider/10 inline-block">
                            <span className="font-bold text-text-secondary block mb-0.5">Fix:</span>
                            {issue.recommendation}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="text-text-secondary italic flex flex-col items-center justify-center py-12">
      <CheckCircle2 className="w-12 h-12 text-success/20 mb-4" />
      <p>No issues detected</p>
    </div>
  );
}
