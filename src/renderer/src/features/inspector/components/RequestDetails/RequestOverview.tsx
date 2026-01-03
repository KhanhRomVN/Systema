import { NetworkRequest } from '../../types';
import { cn } from '../../../../shared/lib/utils';
import { CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react';

import { HighlightText } from './HighlightText';

interface RequestOverviewProps {
  request: NetworkRequest;
  searchTerm: string;
}

export function RequestOverview({ request, searchTerm }: RequestOverviewProps) {
  const analysis = request.analysis;

  if (!analysis?.overview) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Request details overview not available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-[10px] font-bold text-muted-foreground uppercase">General Information</h3>
      <div className="grid grid-cols-[100px_1fr] gap-x-4 gap-y-1 p-3 bg-muted/20 rounded border border-border/50">
        <div className="text-muted-foreground">URL</div>

        <div className="break-all">
          <HighlightText text={analysis.overview.url} searchTerm={searchTerm} />
        </div>

        <div className="text-muted-foreground">Method</div>
        <div className="flex gap-3">
          <span className="font-bold">
            <HighlightText text={analysis.overview.method} searchTerm={searchTerm} />
          </span>
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
        <div className="flex gap-3">
          <span>
            <HighlightText text={analysis.overview.protocol} searchTerm={searchTerm} />
          </span>
          <span className="text-muted-foreground">Version:</span>
          <span>{analysis.overview.httpVersion}</span>
        </div>

        <div className="text-muted-foreground">Timestamp</div>
        <div>{new Date(analysis.overview.timestamp).toLocaleString()}</div>

        <div className="text-muted-foreground">Duration</div>
        <div>{analysis.overview.duration}</div>

        <div className="text-muted-foreground">Size</div>
        <div className="flex gap-3 text-[10px] sm:text-xs">
          <span>Req: {analysis.overview.size.request}</span>
          <span>Res: {analysis.overview.size.response}</span>
          <span className="font-bold">Total: {analysis.overview.size.total}</span>
        </div>
      </div>

      <h3 className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Analysis</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card p-3 rounded border border-border/50">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase mb-2">
            Performance Score
          </h3>
          <div className="flex items-center gap-3">
            <div
              className="text-2xl font-bold"
              style={{ color: analysis.overview.scores.overall.color }}
            >
              {analysis.overview.scores.overall.value}
            </div>
            <div className="flex flex-col">
              <span
                className="text-xs font-bold"
                style={{ color: analysis.overview.scores.overall.color }}
              >
                Grade {analysis.overview.scores.overall.grade}
              </span>
              <span className="text-[10px] text-muted-foreground">
                Security: {analysis.overview.scores.security.grade} (
                {analysis.overview.scores.security.value})
              </span>
              <span className="text-[10px] text-muted-foreground">
                Perf: {analysis.overview.scores.performance.grade} (
                {analysis.overview.scores.performance.value})
              </span>
            </div>
          </div>
        </div>
        <div className="bg-card p-3 rounded border border-border/50">
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase mb-2">Summary</h3>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-green-500" />
              <span>{analysis.overview.summary.passed} Passed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
              <span>{analysis.overview.summary.warnings} Warn</span>
            </div>
            <div className="flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-red-500" />
              <span>{analysis.overview.summary.critical} Crit</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-blue-500" />
              <span>{analysis.overview.summary.info} Info</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase mb-2">
          Quick Insights
        </h3>
        <div className="space-y-1.5">
          {analysis.overview.quickInsights.map((insight, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center gap-2 p-2 rounded border text-xs',
                insight.type === 'success' &&
                  'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400',
                insight.type === 'warning' &&
                  'bg-yellow-500/10 border-yellow-500/20 text-yellow-700 dark:text-yellow-400',
                insight.type === 'info' &&
                  'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400',
              )}
            >
              <span className="text-base">{insight.icon}</span>
              <span>{insight.message}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
