import { NetworkRequest } from '../../types';
import { cn } from '../../../../shared/lib/utils';
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

interface RequestOverviewProps {
  request: NetworkRequest;
}

export function RequestOverview({ request }: RequestOverviewProps) {
  const analysis = request.analysis;

  if (!analysis?.overview) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Request details overview not available
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[120px_1fr] gap-2 p-4 bg-muted/20 rounded border border-border/50">
        <div className="text-muted-foreground">URL</div>
        <div className="break-all">{analysis.overview.url}</div>

        <div className="text-muted-foreground">Method</div>
        <div className="flex gap-4">
          <span className="font-bold">{analysis.overview.method}</span>
          <span className="text-muted-foreground">Status:</span>
          <span
            className={cn(
              'font-bold',
              analysis.overview.statusCode >= 200 && analysis.overview.statusCode < 300
                ? 'text-green-500'
                : analysis.overview.statusCode >= 300 && analysis.overview.statusCode < 400
                  ? 'text-yellow-500'
                  : 'text-red-500',
            )}
          >
            {analysis.overview.statusCode} {analysis.overview.statusText}
          </span>
        </div>

        <div className="text-muted-foreground">Protocol</div>
        <div className="flex gap-4">
          <span>{analysis.overview.protocol}</span>
          <span className="text-muted-foreground">Version:</span>
          <span>{analysis.overview.httpVersion}</span>
        </div>

        <div className="text-muted-foreground">Timestamp</div>
        <div>{new Date(analysis.overview.timestamp).toLocaleString()}</div>

        <div className="text-muted-foreground">Duration</div>
        <div>{analysis.overview.duration}</div>

        <div className="text-muted-foreground">Size</div>
        <div className="flex gap-4 text-xs">
          <span>Req: {analysis.overview.size.request}</span>
          <span>Res: {analysis.overview.size.response}</span>
          <span className="font-bold">Total: {analysis.overview.size.total}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card p-4 rounded border border-border/50">
          <h3 className="text-xs font-bold text-muted-foreground uppercase mb-4">
            Performance Score
          </h3>
          <div className="flex items-center gap-4">
            <div
              className="text-4xl font-bold"
              style={{ color: analysis.overview.scores.overall.color }}
            >
              {analysis.overview.scores.overall.value}
            </div>
            <div className="flex flex-col">
              <span
                className="text-sm font-bold"
                style={{ color: analysis.overview.scores.overall.color }}
              >
                Grade {analysis.overview.scores.overall.grade}
              </span>
              <span className="text-xs text-muted-foreground">
                Security: {analysis.overview.scores.security.grade} (
                {analysis.overview.scores.security.value})
              </span>
              <span className="text-xs text-muted-foreground">
                Performance: {analysis.overview.scores.performance.grade} (
                {analysis.overview.scores.performance.value})
              </span>
            </div>
          </div>
        </div>
        <div className="bg-card p-4 rounded border border-border/50">
          <h3 className="text-xs font-bold text-muted-foreground uppercase mb-4">Summary</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>{analysis.overview.summary.passed} Passed</span>
            </div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <span>{analysis.overview.summary.warnings} Warnings</span>
            </div>
            <div className="flex items-center gap-2">
              <XCircle className="w-4 h-4 text-red-500" />
              <span>{analysis.overview.summary.critical} Critical</span>
            </div>
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-500" />
              <span>{analysis.overview.summary.info} Info</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-xs font-bold text-muted-foreground uppercase mb-4">Quick Insights</h3>
        <div className="space-y-2">
          {analysis.overview.quickInsights.map((insight, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center gap-3 p-3 rounded border',
                insight.type === 'success' &&
                  'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400',
                insight.type === 'warning' &&
                  'bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400',
                insight.type === 'info' &&
                  'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400',
              )}
            >
              <span className="text-lg">{insight.icon}</span>
              <span>{insight.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
