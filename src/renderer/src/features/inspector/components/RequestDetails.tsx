import { NetworkRequest } from '../types';
import { IssuesAnalysis } from '../analysisTypes';
import { cn } from '../../../shared/lib/utils';
import { useState } from 'react';
import {
  BarChart2,
  Upload,
  Download,
  List,
  Cookie,
  Box,
  Lock,
  Scroll,
  Globe,
  Timer,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  AlertOctagon,
  Activity,
  MapPin,
  CheckCircle2,
} from 'lucide-react';

interface RequestDetailsProps {
  request: NetworkRequest | null;
}

export function RequestDetails({ request }: RequestDetailsProps) {
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'request'
    | 'response'
    | 'headers'
    | 'cookies'
    | 'body'
    | 'security'
    | 'cert'
    | 'network'
    | 'timing'
    | 'issues'
  >('overview');

  if (!request) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground bg-background/50">
        Select a request to view details
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'request', label: 'Request', icon: Upload },
    { id: 'response', label: 'Response', icon: Download },
    { id: 'headers', label: 'Headers', icon: List },
    { id: 'cookies', label: 'Cookies', icon: Cookie },
    { id: 'body', label: 'Body', icon: Box },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'cert', label: 'Certificate', icon: Scroll },
    { id: 'network', label: 'Network', icon: Globe },
    { id: 'timing', label: 'Timing', icon: Timer },
    { id: 'issues', label: 'Issues', icon: AlertTriangle },
  ] as const;

  const analysis = request.analysis;

  return (
    <div className="h-full flex flex-col bg-background/50 border-t border-border/50">
      <div className="flex items-center border-b border-border/50 px-2 bg-muted/20 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 border-transparent transition-colors hover:text-foreground whitespace-nowrap',
                activeTab === tab.id ? 'border-primary text-primary' : 'text-muted-foreground',
              )}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-auto p-4 font-mono text-sm">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {analysis?.overview ? (
              <>
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
                          : analysis.overview.statusCode >= 300 &&
                              analysis.overview.statusCode < 400
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
                    <h3 className="text-xs font-bold text-muted-foreground uppercase mb-4">
                      Summary
                    </h3>
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
                  <h3 className="text-xs font-bold text-muted-foreground uppercase mb-4">
                    Quick Insights
                  </h3>
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
              </>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                Request details overview not available
              </div>
            )}
          </div>
        )}

        {activeTab === 'request' && (
          <div className="space-y-6">
            {analysis?.request ? (
              <>
                <div>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">
                    General
                  </h3>
                  <div className="grid grid-cols-[120px_1fr] gap-2 p-4 bg-muted/20 rounded border border-border/50">
                    <div className="text-muted-foreground">Method</div>
                    <div className="font-bold">{analysis.request.general.method}</div>

                    <div className="text-muted-foreground">URL</div>
                    <div className="break-all">{analysis.request.general.url}</div>

                    <div className="text-muted-foreground">Protocol</div>
                    <div>{analysis.request.general.protocol}</div>

                    <div className="text-muted-foreground">HTTP Version</div>
                    <div>{analysis.request.general.httpVersion}</div>

                    <div className="text-muted-foreground">Host</div>
                    <div>{analysis.request.general.host}</div>

                    <div className="text-muted-foreground">Port</div>
                    <div>{analysis.request.general.port}</div>

                    <div className="text-muted-foreground">Path</div>
                    <div className="break-all">{analysis.request.general.path}</div>

                    <div className="text-muted-foreground">Scheme</div>
                    <div>{analysis.request.general.scheme}</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">
                    Query String
                  </h3>
                  <div className="p-4 bg-muted/20 rounded border border-border/50 break-all font-mono text-xs">
                    {analysis.request.queryString || '(empty)'}
                  </div>
                </div>

                {analysis.request.queryParams &&
                  Object.keys(analysis.request.queryParams).length > 0 && (
                    <div>
                      <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">
                        Query Parameters
                      </h3>
                      <div className="grid grid-cols-[1fr_2fr] gap-x-4 gap-y-1 p-4 bg-muted/20 rounded border border-border/50">
                        {Object.entries(analysis.request.queryParams).map(([key, value]) => (
                          <div key={key} className="contents">
                            <div className="text-muted-foreground truncate" title={key}>
                              {key}:
                            </div>
                            <div className="break-all text-foreground/80">{value}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                <div>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">
                    Metadata
                  </h3>
                  <div className="grid grid-cols-[120px_1fr] gap-2 p-4 bg-muted/20 rounded border border-border/50">
                    <div className="text-muted-foreground">Timestamp</div>
                    <div>
                      {new Date(analysis.request.timestamp).toLocaleString()} (
                      {analysis.request.timestamp})
                    </div>

                    <div className="text-muted-foreground">Size</div>
                    <div className="grid grid-cols-3 gap-4 text-xs w-full">
                      <div>
                        <span className="text-muted-foreground block">Headers</span>
                        <span>{analysis.request.size.headers}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Body</span>
                        <span>{analysis.request.size.body}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block font-bold">Total</span>
                        <span className="font-bold">{analysis.request.size.total}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="space-y-6">
                <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">
                  General Info
                </h3>
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <div className="text-muted-foreground">URL</div>
                  <div className="break-all">
                    {request.protocol}://{request.host}
                    {request.path}
                  </div>
                  <div className="text-muted-foreground">Method</div>
                  <div className="font-bold">{request.method}</div>
                </div>
                <div className="text-muted-foreground italic mt-4">
                  Detailed analysis not available
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'response' && (
          <div className="space-y-6">
            {analysis?.response ? (
              <>
                <div>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">
                    General
                  </h3>
                  <div className="grid grid-cols-[120px_1fr] gap-2 p-4 bg-muted/20 rounded border border-border/50">
                    <div className="text-muted-foreground">Status</div>
                    <div className="flex gap-2 items-center">
                      <span
                        className={cn(
                          'font-bold',
                          analysis.response.general.statusCode >= 200 &&
                            analysis.response.general.statusCode < 300
                            ? 'text-green-500'
                            : analysis.response.general.statusCode >= 300 &&
                                analysis.response.general.statusCode < 400
                              ? 'text-yellow-500'
                              : 'text-red-500',
                        )}
                      >
                        {analysis.response.general.statusCode}{' '}
                        {analysis.response.general.statusText}
                      </span>
                    </div>

                    <div className="text-muted-foreground">Protocol</div>
                    <div>{analysis.response.general.protocol}</div>

                    <div className="text-muted-foreground">HTTP Version</div>
                    <div>{analysis.response.general.httpVersion}</div>

                    <div className="text-muted-foreground">Redirect URL</div>
                    <div className="break-all">{analysis.response.redirectURL || '(none)'}</div>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">
                    Metadata
                  </h3>
                  <div className="grid grid-cols-[120px_1fr] gap-2 p-4 bg-muted/20 rounded border border-border/50">
                    <div className="text-muted-foreground">Timestamp</div>
                    <div>
                      {new Date(analysis.response.timestamp).toLocaleString()} (
                      {analysis.response.timestamp})
                    </div>

                    <div className="text-muted-foreground">Size</div>
                    <div className="grid grid-cols-3 gap-4 text-xs w-full">
                      <div>
                        <span className="text-muted-foreground block">Headers</span>
                        <span>{analysis.response.size.headers}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Body</span>
                        <span>{analysis.response.size.body}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block font-bold">Total</span>
                        <span className="font-bold">{analysis.response.size.total}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {analysis.response.compression && (
                  <div>
                    <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">
                      Compression
                    </h3>
                    <div className="grid grid-cols-[120px_1fr] gap-2 p-4 bg-muted/20 rounded border border-border/50">
                      <div className="text-muted-foreground">Algorithm</div>
                      <div>{analysis.response.compression.algorithm}</div>

                      <div className="text-muted-foreground">Original</div>
                      <div>{analysis.response.compression.originalSize}</div>

                      <div className="text-muted-foreground">Compressed</div>
                      <div>{analysis.response.compression.compressedSize}</div>

                      <div className="text-muted-foreground">Ratio</div>
                      <div>{analysis.response.compression.ratio}</div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-6">
                <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">
                  General Info
                </h3>
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <div className="text-muted-foreground">Status</div>
                  <div className="font-bold">{request.status}</div>
                </div>
                <div className="text-muted-foreground italic mt-4">
                  Detailed analysis not available
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'headers' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Request Headers */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase pb-2 border-b border-border/50">
                  Request Headers
                </h3>
                {analysis?.headers?.request ? (
                  <div className="space-y-6">
                    {Object.entries(analysis.headers.request).map(([section, headers]) => (
                      <div key={section}>
                        <h4 className="text-[11px] font-bold text-primary/80 uppercase tracking-wider mb-2">
                          {section}
                        </h4>
                        <div className="border border-border/40 rounded-md bg-background overflow-hidden text-sm">
                          {(headers as any[]).map((h, i) => (
                            <div
                              key={i}
                              className="flex flex-col sm:flex-row border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors"
                            >
                              <div className="w-full sm:w-[180px] flex-shrink-0 p-2 sm:border-r border-border/40 bg-muted/10">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold font-mono text-xs break-all text-foreground/90">
                                    {h.name}
                                  </span>
                                  {h.status && (
                                    <span
                                      className={cn(
                                        'text-[9px] px-1 py-0.5 rounded uppercase font-bold tracking-tight',
                                        h.status === 'good'
                                          ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                                          : h.status === 'warning'
                                            ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400'
                                            : 'bg-muted text-muted-foreground',
                                      )}
                                    >
                                      {h.status}
                                    </span>
                                  )}
                                </div>
                                {h.description && (
                                  <div
                                    className="text-[10px] text-muted-foreground leading-tight line-clamp-2"
                                    title={h.description}
                                  >
                                    {h.description}
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 p-2 min-w-0">
                                <div className="font-mono text-xs text-foreground/80 break-all whitespace-pre-wrap">
                                  {h.value}
                                </div>
                                {h.parsed && Object.keys(h.parsed).length > 0 && (
                                  <div className="mt-2 text-[11px] bg-muted/30 p-2 rounded border border-border/20">
                                    <div className="font-semibold text-muted-foreground/70 mb-1 pointer-events-none select-none">
                                      Parsed Values
                                    </div>
                                    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                                      {Object.entries(h.parsed).map(([k, v]) => (
                                        <div key={k} className="contents">
                                          <span className="text-muted-foreground text-right">
                                            {k}:
                                          </span>
                                          <span className="font-mono text-foreground">
                                            {String(v)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground italic text-sm">No request headers</div>
                )}
              </div>

              {/* Response Headers */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase pb-2 border-b border-border/50">
                  Response Headers
                </h3>
                {analysis?.headers?.response ? (
                  <div className="space-y-6">
                    {Object.entries(analysis.headers.response).map(([section, headers]) => (
                      <div key={section}>
                        <h4 className="text-[11px] font-bold text-primary/80 uppercase tracking-wider mb-2">
                          {section}
                        </h4>
                        <div className="border border-border/40 rounded-md bg-background overflow-hidden text-sm">
                          {(headers as any[]).map((h, i) => (
                            <div
                              key={i}
                              className="flex flex-col sm:flex-row border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors"
                            >
                              <div className="w-full sm:w-[180px] flex-shrink-0 p-2 sm:border-r border-border/40 bg-muted/10">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold font-mono text-xs break-all text-foreground/90">
                                    {h.name}
                                  </span>
                                  {h.status && (
                                    <span
                                      className={cn(
                                        'text-[9px] px-1 py-0.5 rounded uppercase font-bold tracking-tight',
                                        h.status === 'good'
                                          ? 'bg-green-500/15 text-green-600 dark:text-green-400'
                                          : h.status === 'warning'
                                            ? 'bg-yellow-500/15 text-yellow-600 dark:text-yellow-400'
                                            : 'bg-muted text-muted-foreground',
                                      )}
                                    >
                                      {h.status}
                                    </span>
                                  )}
                                </div>
                                {h.description && (
                                  <div
                                    className="text-[10px] text-muted-foreground leading-tight line-clamp-2"
                                    title={h.description}
                                  >
                                    {h.description}
                                  </div>
                                )}
                              </div>

                              <div className="flex-1 p-2 min-w-0">
                                <div className="font-mono text-xs text-foreground/80 break-all whitespace-pre-wrap">
                                  {h.value}
                                </div>
                                {h.parsed && Object.keys(h.parsed).length > 0 && (
                                  <div className="mt-2 text-[11px] bg-muted/30 p-2 rounded border border-border/20">
                                    <div className="font-semibold text-muted-foreground/70 mb-1 pointer-events-none select-none">
                                      Parsed Values
                                    </div>
                                    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                                      {Object.entries(h.parsed).map(([k, v]) => (
                                        <div key={k} className="contents">
                                          <span className="text-muted-foreground text-right">
                                            {k}:
                                          </span>
                                          <span className="font-mono text-foreground">
                                            {String(v)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground italic text-sm">No response headers</div>
                )}
              </div>
            </div>

            {analysis?.headers?.missing && analysis.headers.missing.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-muted-foreground uppercase mb-3 border-b border-border/50 pb-2">
                  Missing Headers
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analysis.headers.missing.map((h, i) => (
                    <div
                      key={i}
                      className="flex flex-col bg-yellow-500/5 hover:bg-yellow-500/10 transition-colors border border-yellow-500/20 p-3 rounded text-sm relative group"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold font-mono text-xs">{h.name}</span>
                        <span className="text-[9px] bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                          {h.severity}
                        </span>
                      </div>
                      <div className="text-muted-foreground text-xs leading-relaxed mb-2 flex-grow">
                        {h.description}
                      </div>
                      <div className="mt-auto pt-2 border-t border-yellow-500/10 text-[10px] font-medium text-yellow-600/90 dark:text-yellow-400/90 flex gap-1">
                        <span className="shrink-0 font-bold uppercase text-[9px] opacity-70 mt-px">
                          Fix:
                        </span>
                        <span>{h.recommendation}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'cookies' && (
          <div className="space-y-6">
            {/* Cookie Summary */}
            {analysis?.cookies?.summary && (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted/20 p-3 rounded-lg border border-border/50 text-center">
                  <div className="text-2xl font-bold">
                    {analysis.cookies.summary.totalRequest + analysis.cookies.summary.totalResponse}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">
                    Total Cookies
                  </div>
                </div>
                <div className="bg-green-500/10 p-3 rounded-lg border border-green-500/20 text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {analysis.cookies.summary.secureCount}
                  </div>
                  <div className="text-xs text-green-600/80 dark:text-green-400/80 uppercase font-bold tracking-wider">
                    Secure
                  </div>
                </div>
                <div
                  className={cn(
                    'p-3 rounded-lg border text-center',
                    analysis.cookies.summary.issues.critical +
                      analysis.cookies.summary.issues.warning >
                      0
                      ? 'bg-yellow-500/10 border-yellow-500/20'
                      : 'bg-muted/20 border-border/50',
                  )}
                >
                  <div
                    className={cn(
                      'text-2xl font-bold',
                      analysis.cookies.summary.issues.critical +
                        analysis.cookies.summary.issues.warning >
                        0
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : '',
                    )}
                  >
                    {analysis.cookies.summary.issues.critical +
                      analysis.cookies.summary.issues.warning}
                  </div>
                  <div
                    className={cn(
                      'text-xs uppercase font-bold tracking-wider',
                      analysis.cookies.summary.issues.critical +
                        analysis.cookies.summary.issues.warning >
                        0
                        ? 'text-yellow-600/80 dark:text-yellow-400/80'
                        : 'text-muted-foreground',
                    )}
                  >
                    Issues
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Request Cookies */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase pb-2 border-b border-border/50">
                  Request Cookies
                </h3>
                {analysis?.cookies?.request && analysis.cookies.request.length > 0 ? (
                  <div className="space-y-3">
                    {analysis.cookies.request.map((cookie, i) => (
                      <div
                        key={i}
                        className="flex flex-col border border-border/40 rounded-md bg-background overflow-hidden p-3 hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold font-mono text-sm">{cookie.name}</span>
                          <div className="flex gap-1">
                            {cookie.analysis?.security === 'warning' && (
                              <span className="text-[9px] bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 px-1.5 py-0.5 rounded uppercase font-bold">
                                Insecure
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="font-mono text-xs text-foreground/80 break-all mb-2 pl-2 border-l-2 border-primary/20">
                          {cookie.value}
                        </div>

                        <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground/80 mt-auto pt-2 border-t border-border/30 border-dashed">
                          <span className="px-1.5 py-0.5 bg-muted rounded border border-border/30">
                            Domain: {cookie.domain}
                          </span>
                          <span className="px-1.5 py-0.5 bg-muted rounded border border-border/30">
                            Path: {cookie.path}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic">No request cookies</div>
                )}
              </div>

              {/* Response Cookies */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-muted-foreground uppercase pb-2 border-b border-border/50">
                  Response Cookies
                </h3>
                {analysis?.cookies?.response && analysis.cookies.response.length > 0 ? (
                  <div className="space-y-3">
                    {analysis.cookies.response.map((cookie, i) => (
                      <div
                        key={i}
                        className="flex flex-col border border-border/40 rounded-md bg-background overflow-hidden p-3 hover:bg-muted/20 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <span className="font-bold font-mono text-sm">{cookie.name}</span>
                          <div className="flex gap-1">
                            {cookie.secure && (
                              <span className="text-[9px] bg-green-500/10 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded uppercase font-bold">
                                Secure
                              </span>
                            )}
                            {cookie.httpOnly && (
                              <span className="text-[9px] bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded uppercase font-bold">
                                HttpOnly
                              </span>
                            )}
                            {cookie.sameSite && (
                              <span className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded uppercase font-bold border border-border/30">
                                SameSite: {cookie.sameSite}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="font-mono text-xs text-foreground/80 break-all mb-2 pl-2 border-l-2 border-primary/20">
                          {cookie.value}
                        </div>

                        <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground/80 mt-auto pt-2 border-t border-border/30 border-dashed">
                          {cookie.expires && (
                            <span className="px-1.5 py-0.5 bg-muted rounded border border-border/30 text-nowrap">
                              Expires: {new Date(cookie.expires).toLocaleDateString()}
                            </span>
                          )}
                          {cookie.maxAge && (
                            <span className="px-1.5 py-0.5 bg-muted rounded border border-border/30 text-nowrap">
                              Max-Age: {cookie.maxAge}
                            </span>
                          )}
                          {cookie.domain && cookie.domain !== request.host && (
                            <span className="px-1.5 py-0.5 bg-muted rounded border border-border/30">
                              Domain: {cookie.domain}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground italic">No response cookies</div>
                )}
              </div>
            </div>

            {/* Issues Analysis */}
            {analysis?.cookies?.summary?.issues &&
              (analysis.cookies.summary.issues.critical > 0 ||
                analysis.cookies.summary.issues.warning > 0) && (
                <div>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase mb-3 border-b border-border/50 pb-2">
                    Cookie Issues
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[...analysis.cookies.request, ...analysis.cookies.response]
                      .filter((c) => c.analysis?.issues && c.analysis.issues.length > 0)
                      .map((c, i) => (
                        <div
                          key={i}
                          className="flex flex-col bg-yellow-500/5 border border-yellow-500/20 p-3 rounded text-sm relative"
                        >
                          <div className="font-bold font-mono text-xs mb-1">{c.name}</div>
                          <ul className="list-disc list-inside text-muted-foreground text-xs space-y-1">
                            {c.analysis!.issues.map((issue, idx) => (
                              <li key={idx}>{issue}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                  </div>
                </div>
              )}
          </div>
        )}

        {activeTab === 'body' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
              {/* Request Body */}
              <div className="flex flex-col h-full space-y-2">
                <div className="flex justify-between items-center border-b border-border/50 pb-2">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase">
                    Request Body
                  </h3>
                  <div className="flex gap-2 text-[10px]">
                    <span className="bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                      {analysis?.body?.request?.contentType}
                    </span>
                    <span className="bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                      {analysis?.body?.request?.size}
                    </span>
                  </div>
                </div>

                <div className="flex-1 bg-muted/20 border border-border/50 rounded-md overflow-hidden flex flex-col">
                  {analysis?.body?.request?.formatted ? (
                    <pre className="flex-1 p-3 overflow-auto text-xs font-mono language-json">
                      {JSON.stringify(analysis.body.request.formatted, null, 2)}
                    </pre>
                  ) : (
                    <pre className="flex-1 p-3 overflow-auto text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                      {analysis?.body?.request?.raw || 'No Content'}
                    </pre>
                  )}
                </div>
              </div>

              {/* Response Body */}
              <div className="flex flex-col h-full space-y-2">
                <div className="flex justify-between items-center border-b border-border/50 pb-2">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase">
                    Response Body
                  </h3>
                  <div className="flex gap-2 text-[10px]">
                    {analysis?.body?.response?.compression !== 'none' && (
                      <span className="bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded font-bold uppercase">
                        {analysis?.body?.response?.compression}
                      </span>
                    )}
                    <span className="bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                      {analysis?.body?.response?.contentType}
                    </span>
                    <span className="bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                      {analysis?.body?.response?.size}
                    </span>
                  </div>
                </div>

                <div className="flex-1 bg-muted/20 border border-border/50 rounded-md overflow-hidden flex flex-col">
                  {analysis?.body?.response?.formatted ? (
                    <pre className="flex-1 p-3 overflow-auto text-xs font-mono text-foreground language-json">
                      {JSON.stringify(analysis.body.response.formatted, null, 2)}
                    </pre>
                  ) : (
                    <pre className="flex-1 p-3 overflow-auto text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                      {analysis?.body?.response?.raw || 'No Content'}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            {analysis?.security ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Protocol Card */}
                  <div className="p-4 bg-muted/20 rounded-lg border border-border/50 relative overflow-hidden">
                    <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2">
                      Protocol
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="text-2xl font-bold">{analysis.security.protocol.version}</div>
                      <div
                        className={cn(
                          'text-lg font-bold mb-0.5',
                          analysis.security.protocol.grade === 'A+'
                            ? 'text-green-500'
                            : 'text-yellow-500',
                        )}
                      >
                        {analysis.security.protocol.grade}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground mt-2">
                      {analysis.security.protocol.details}
                    </div>
                  </div>

                  {/* Certificate Card */}
                  <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
                    <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2">
                      Certificate
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="font-bold truncate">
                        {analysis.security.certificate.commonName}
                      </div>
                      {analysis.security.certificate.valid && (
                        <span className="bg-green-500/10 text-green-500 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">
                          Valid
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Expires in {analysis.security.certificate.daysRemaining} days
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-2 font-mono">
                      {analysis.security.certificate.issuer.split(',')[0]}
                    </div>
                  </div>

                  {/* Cipher Card */}
                  <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
                    <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-2">
                      Cipher Suite
                    </div>
                    <div
                      className="font-bold text-sm truncate"
                      title={analysis.security.cipher.suite}
                    >
                      {analysis.security.cipher.suite}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-muted-foreground">
                        {analysis.security.cipher.strength}
                      </span>
                      <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] uppercase font-bold text-muted-foreground">
                        FS: {analysis.security.cipher.supportsForwardSecrecy ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Security Headers */}
                <div>
                  <h3 className="text-xs font-bold text-muted-foreground uppercase mb-3 border-b border-border/50 pb-2">
                    Security Headers
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(analysis.security.securityHeaders).map(
                      ([key, header]: [string, any]) => (
                        <div
                          key={key}
                          className="flex justify-between items-center p-3 rounded border border-border/40 hover:bg-muted/10 transition-colors"
                        >
                          <div className="flex flex-col">
                            <span className="font-mono text-sm font-medium">
                              {key.replace(/([A-Z])/g, '-$1').toLowerCase()}
                            </span>
                            <span
                              className="text-[10px] text-muted-foreground truncate max-w-[200px]"
                              title={header.value || 'Missing'}
                            >
                              {header.value || 'Not set'}
                            </span>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span
                              className={cn(
                                'text-[10px] px-1.5 py-0.5 rounded uppercase font-bold',
                                header.status === 'good'
                                  ? 'bg-green-500/10 text-green-600'
                                  : header.status === 'warning'
                                    ? 'bg-yellow-500/10 text-yellow-600'
                                    : 'bg-red-500/10 text-red-600',
                              )}
                            >
                              {header.status}
                            </span>
                            {header.grade && (
                              <span className="text-[10px] font-bold text-muted-foreground">
                                Grade: {header.grade}
                              </span>
                            )}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-muted-foreground italic">No security analysis available</div>
            )}
          </div>
        )}

        {activeTab === 'cert' && (
          <div className="space-y-6">
            {analysis?.certificateChain ? (
              <div className="relative border-l-2 border-border/50 ml-3 space-y-8 py-2">
                {analysis.certificateChain.certificates.map((cert, i) => (
                  <div key={i} className="relative pl-6">
                    {/* Timeline dot */}
                    <div
                      className={cn(
                        'absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-background',
                        i === 0
                          ? 'bg-green-500'
                          : i === analysis.certificateChain!.certificates.length - 1
                            ? 'bg-primary'
                            : 'bg-muted-foreground',
                      )}
                    />

                    <div className="bg-muted/10 p-4 rounded-lg border border-border/50">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider mb-0.5">
                            {cert.level}
                          </div>
                          <div className="font-bold text-base">{cert.subject.commonName}</div>
                        </div>
                        <div className="text-right">
                          <div
                            className={cn(
                              'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase',
                              cert.validity.isValid
                                ? 'bg-green-500/10 text-green-600'
                                : 'bg-red-500/10 text-red-600',
                            )}
                          >
                            {cert.validity.isValid ? 'Valid' : 'Expired'}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs mt-4 pt-3 border-t border-border/30">
                        <div>
                          <span className="text-muted-foreground block mb-1">Issuer</span>
                          <span className="font-mono">{cert.issuer.commonName}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground block mb-1">Valid Until</span>
                          <span className="font-mono">
                            {new Date(cert.validity.notAfter).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-muted-foreground block mb-1">
                            Fingerprint (SHA256)
                          </span>
                          <span className="font-mono text-[10px] break-all text-muted-foreground/80">
                            {cert.fingerprint.sha256}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground italic">No certificate chain available</div>
            )}
          </div>
        )}

        {activeTab === 'network' && (
          <div className="space-y-6">
            {analysis?.network ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Connection Info */}
                  <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase mb-3 flex items-center gap-2">
                      <Activity className="w-3 h-3" /> Connection
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b border-border/30 pb-1">
                        <span className="text-muted-foreground">Protocol</span>
                        <span className="font-mono">{analysis.network.connection.protocol}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/30 pb-1">
                        <span className="text-muted-foreground">Remote Address</span>
                        <span className="font-mono">
                          {analysis.network.connection.remoteAddress}:
                          {analysis.network.connection.remotePort}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-border/30 pb-1">
                        <span className="text-muted-foreground">Local Address</span>
                        <span className="font-mono">
                          {analysis.network.connection.localAddress}:
                          {analysis.network.connection.localPort}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Connection Reused</span>
                        <span
                          className={cn(
                            'font-bold',
                            analysis.network.connection.connectionReused
                              ? 'text-green-500'
                              : 'text-muted-foreground',
                          )}
                        >
                          {analysis.network.connection.connectionReused ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* DNS Info */}
                  <div className="p-4 bg-muted/20 rounded-lg border border-border/50">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase mb-3 flex items-center gap-2">
                      <Globe className="w-3 h-3" /> DNS Resolution
                    </h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between border-b border-border/30 pb-1">
                        <span className="text-muted-foreground">Hostname</span>
                        <span className="font-mono text-right truncate max-w-[150px]">
                          {analysis.network.dns.hostname}
                        </span>
                      </div>
                      <div className="flex justify-between border-b border-border/30 pb-1">
                        <span className="text-muted-foreground">DNS Server</span>
                        <span className="font-mono">{analysis.network.dns.dnsServer}</span>
                      </div>
                      <div className="flex justify-between border-b border-border/30 pb-1">
                        <span className="text-muted-foreground">Lookup Time</span>
                        <span className="font-mono">{analysis.network.dns.lookupTime}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block mb-1">Resolved IPs</span>
                        <div className="flex flex-wrap gap-1">
                          {analysis.network.dns.resolvedIPs.map((ip, i) => (
                            <span
                              key={i}
                              className="bg-background border border-border/50 px-1.5 py-0.5 rounded font-mono text-[10px]"
                            >
                              {ip.ip}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Geolocation */}
                  <div className="p-4 bg-muted/20 rounded-lg border border-border/50 md:col-span-2">
                    <h3 className="text-xs font-bold text-muted-foreground uppercase mb-3 flex items-center gap-2">
                      <MapPin className="w-3 h-3" /> Geolocation
                    </h3>
                    {analysis.network.geolocation ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                        <div>
                          <div className="text-muted-foreground mb-0.5">Country</div>
                          <div className="font-medium flex items-center gap-1.5">
                            <span className="text-lg">
                              {analysis.network.geolocation.countryCode === 'US' ? '🇺🇸' : '🏳️'}
                            </span>
                            {analysis.network.geolocation.country}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground mb-0.5">City</div>
                          <div className="font-medium">
                            {analysis.network.geolocation.city},{' '}
                            {analysis.network.geolocation.region}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground mb-0.5">ISP</div>
                          <div
                            className="font-medium truncate"
                            title={analysis.network.geolocation.isp}
                          >
                            {analysis.network.geolocation.isp}
                          </div>
                        </div>
                        <div>
                          <div className="text-muted-foreground mb-0.5">Timezone</div>
                          <div className="font-mono">{analysis.network.geolocation.timezone}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-muted-foreground italic text-xs">
                        Geolocation data not available
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-muted-foreground italic">No network analysis available</div>
            )}
          </div>
        )}

        {activeTab === 'timing' && (
          <div className="space-y-6">
            {analysis?.timing ? (
              <>
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
                    <div className="text-[10px] text-muted-foreground uppercase mb-1">
                      Total Time
                    </div>
                    <div className="font-bold text-lg">{analysis.timing.breakdown.total}</div>
                  </div>
                  <div className="p-3 border border-border/40 rounded bg-muted/10">
                    <div className="text-[10px] text-muted-foreground uppercase mb-1">
                      Time to First Byte
                    </div>
                    <div className="font-bold text-lg">
                      {analysis.timing.breakdown.timeToFirstByte}
                    </div>
                  </div>
                  <div className="p-3 border border-border/40 rounded bg-muted/10">
                    <div className="text-[10px] text-muted-foreground uppercase mb-1">Latency</div>
                    <div className="font-bold text-lg">{analysis.timing.performance.latency}</div>
                  </div>
                  <div className="p-3 border border-border/40 rounded bg-muted/10">
                    <div className="text-[10px] text-muted-foreground uppercase mb-1">
                      Download Speed
                    </div>
                    <div className="font-bold text-lg">
                      {analysis.timing.performance.downloadSpeed}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-muted-foreground italic">No timing analysis available</div>
            )}
          </div>
        )}

        {activeTab === 'issues' && (
          <div className="space-y-6">
            {analysis?.issues && analysis.issues.summary.total > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-2">
                  {/* Summary Cards */}
                  <div className="bg-red-500/10 border border-red-500/20 p-3 rounded text-center">
                    <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                      {analysis.issues.summary.critical}
                    </div>
                    <div className="text-[10px] font-bold uppercase text-red-600/80 tracking-wider">
                      Critical
                    </div>
                  </div>
                  <div className="bg-orange-500/10 border border-orange-500/20 p-3 rounded text-center">
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {analysis.issues.summary.high}
                    </div>
                    <div className="text-[10px] font-bold uppercase text-orange-600/80 tracking-wider">
                      High
                    </div>
                  </div>
                  <div className="bg-yellow-500/10 border border-yellow-500/20 p-3 rounded text-center">
                    <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                      {analysis.issues.summary.medium}
                    </div>
                    <div className="text-[10px] font-bold uppercase text-yellow-600/80 tracking-wider">
                      Medium
                    </div>
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/20 p-3 rounded text-center">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {analysis.issues.summary.low}
                    </div>
                    <div className="text-[10px] font-bold uppercase text-blue-600/80 tracking-wider">
                      Low
                    </div>
                  </div>
                </div>

                {/* Issue Lists */}
                <div className="space-y-4">
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
                              'p-4 rounded-lg border mb-3 last:mb-0',
                              colors[severity] || colors.info,
                            )}
                          >
                            <div className="flex items-start gap-3">
                              <AlertOctagon
                                className={cn(
                                  'w-5 h-5 mt-0.5 shrink-0',
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
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-background border border-border/20 uppercase text-muted-foreground">
                                    {severity}
                                  </span>
                                </div>
                                <p className="text-sm text-foreground/80">{issue.description}</p>
                                {issue.recommendation && (
                                  <div className="mt-2 text-xs bg-background/50 p-2 rounded border border-border/10 inline-block">
                                    <span className="font-bold text-muted-foreground">Fix:</span>{' '}
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
              </>
            ) : (
              <div className="text-muted-foreground italic flex flex-col items-center justify-center py-12">
                <CheckCircle2 className="w-12 h-12 text-green-500/20 mb-4" />
                <p>No issues detected</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
