import { NetworkRequest } from '../../../types';
import { cn } from '../../../../../shared/lib/utils';
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
      <div className="text-center text-text-secondary py-8">
        Request details overview not available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-[10px] font-bold text-text-secondary uppercase">General Information</h3>
      <div className="grid grid-cols-[100px_1fr] gap-x-4 gap-y-1 p-3 bg-secondary/20 rounded border border-divider/50">
        <div className="text-text-secondary">URL</div>

        <div className="break-all">
          <HighlightText text={analysis.overview.url} searchTerm={searchTerm} />
        </div>

        <div className="text-text-secondary">Method</div>
        <div className="flex gap-3">
          <span className="font-bold">
            <HighlightText text={analysis.overview.method} searchTerm={searchTerm} />
          </span>
          <span className="text-text-secondary">Status:</span>
          <span
            className={cn(
              'font-bold',
              analysis.overview.statusCode >= 200 && analysis.overview.statusCode < 300
                ? 'text-success'
                : analysis.overview.statusCode >= 300 && analysis.overview.statusCode < 400
                  ? 'text-warning'
                  : 'text-error',
            )}
          >
            {analysis.overview.statusCode} {analysis.overview.statusText}
          </span>
        </div>

        <div className="text-text-secondary">Protocol</div>
        <div className="flex gap-3">
          <span>
            <HighlightText text={analysis.overview.protocol} searchTerm={searchTerm} />
          </span>
          <span className="text-text-secondary">Version:</span>
          <span>{analysis.overview.httpVersion}</span>
        </div>

        <div className="text-text-secondary">Timestamp</div>
        <div>{new Date(analysis.overview.timestamp).toLocaleString()}</div>

        <div className="text-text-secondary">Duration</div>
        <div>{analysis.overview.duration}</div>

        <div className="text-text-secondary">Size</div>
        <div className="flex gap-3 text-[10px] sm:text-xs">
          <span>Req: {analysis.overview.size.request}</span>
          <span>Res: {analysis.overview.size.response}</span>
          <span className="font-bold">Total: {analysis.overview.size.total}</span>
        </div>
      </div>

      <h3 className="text-[10px] font-bold text-text-secondary uppercase mb-2">Analysis</h3>
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-card-background p-3 rounded border border-divider/50">
          <h3 className="text-[10px] font-bold text-text-secondary uppercase mb-2">
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
              <span className="text-[10px] text-text-secondary">
                Security: {analysis.overview.scores.security.grade} (
                {analysis.overview.scores.security.value})
              </span>
              <span className="text-[10px] text-text-secondary">
                Perf: {analysis.overview.scores.performance.grade} (
                {analysis.overview.scores.performance.value})
              </span>
            </div>
          </div>
        </div>
        <div className="bg-card-background p-3 rounded border border-divider/50">
          <h3 className="text-[10px] font-bold text-text-secondary uppercase mb-2">Summary</h3>
          <div className="grid grid-cols-2 gap-1 text-xs">
            <div className="flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5 text-success" />
              <span>{analysis.overview.summary.passed} Passed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-warning" />
              <span>{analysis.overview.summary.warnings} Warn</span>
            </div>
            <div className="flex items-center gap-1.5">
              <XCircle className="w-3.5 h-3.5 text-error" />
              <span>{analysis.overview.summary.critical} Crit</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-primary" />
              <span>{analysis.overview.summary.info} Info</span>
            </div>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-[10px] font-bold text-text-secondary uppercase mb-2">Quick Insights</h3>
        <div className="space-y-1.5">
          {analysis.overview.quickInsights.map((insight, i) => (
            <div
              key={i}
              className={cn(
                'flex items-center gap-2 p-2 rounded border text-xs',
                insight.type === 'success' && 'bg-success/10 border-success/20 text-success',
                insight.type === 'warning' && 'bg-warning/10 border-warning/20 text-warning',
                insight.type === 'info' && 'bg-primary/10 border-primary/20 text-primary',
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
