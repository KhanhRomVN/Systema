import { NetworkRequest } from '../../types';
import { IssuesAnalysis } from '../../analysisTypes';
import { cn } from '../../../../shared/lib/utils';
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
          <div className="bg-red-500/10 border border-red-500/20 p-2 rounded text-center">
            <div className="text-xl font-bold text-red-600 dark:text-red-400">
              {analysis.issues.summary.critical}
            </div>
            <div className="text-[10px] font-bold uppercase text-red-600/80 tracking-wider">
              Critical
            </div>
          </div>
          <div className="bg-orange-500/10 border border-orange-500/20 p-2 rounded text-center">
            <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
              {analysis.issues.summary.high}
            </div>
            <div className="text-[10px] font-bold uppercase text-orange-600/80 tracking-wider">
              High
            </div>
          </div>
          <div className="bg-yellow-500/10 border border-yellow-500/20 p-2 rounded text-center">
            <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">
              {analysis.issues.summary.medium}
            </div>
            <div className="text-[10px] font-bold uppercase text-yellow-600/80 tracking-wider">
              Medium
            </div>
          </div>
          <div className="bg-blue-500/10 border border-blue-500/20 p-2 rounded text-center">
            <div className="text-xl font-bold text-blue-600 dark:text-blue-400">
              {analysis.issues.summary.low}
            </div>
            <div className="text-[10px] font-bold uppercase text-blue-600/80 tracking-wider">
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
              critical: 'border-red-500/30 bg-red-500/5',
              high: 'border-orange-500/30 bg-orange-500/5',
              medium: 'border-yellow-500/30 bg-yellow-500/5',
              low: 'border-blue-500/30 bg-blue-500/5',
              info: 'border-muted bg-muted/20',
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
                            ? 'text-red-500'
                            : severity === 'high'
                              ? 'text-orange-500'
                              : severity === 'medium'
                                ? 'text-yellow-500'
                                : 'text-blue-500',
                        )}
                      />
                      <div className="space-y-1">
                        <div className="font-bold text-sm flex items-center gap-2">
                          {issue.title}
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-background border border-border/20 uppercase text-muted-foreground">
                            {severity}
                          </span>
                        </div>
                        <p className="text-xs text-foreground/80">{issue.description}</p>
                        {issue.recommendation && (
                          <div className="mt-1.5 text-[10px] bg-background/50 p-1.5 rounded border border-border/10 inline-block">
                            <span className="font-bold text-muted-foreground block mb-0.5">
                              Fix:
                            </span>
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
    <div className="text-muted-foreground italic flex flex-col items-center justify-center py-12">
      <CheckCircle2 className="w-12 h-12 text-green-500/20 mb-4" />
      <p>No issues detected</p>
    </div>
  );
}
