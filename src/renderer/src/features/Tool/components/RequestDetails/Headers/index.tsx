import { NetworkRequest } from '../../../../../types/inspector';
import { cn } from '../../../../../shared/lib/utils';
import { useI18n } from '../../../../../i18n/i18nContext';
import { HighlightText } from './HighlightText';

interface HeadersDetailsProps {
  request: NetworkRequest;
  searchTerm: string;
}

export function HeadersDetails({ request, searchTerm }: HeadersDetailsProps) {
  const analysis = request.analysis;
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Request Headers */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-text-secondary uppercase pb-1.5 border-b border-divider/50">
            {t.requestDetails.requestHeaders}
          </h3>
          {analysis?.headers?.request ? (
            <div className="space-y-4">
              {Object.entries(analysis.headers.request).map(([section, headers]) => (
                <div key={section}>
                  <h4 className="text-[10px] font-bold text-primary/80 uppercase tracking-wider mb-1.5">
                    {section}
                  </h4>
                  <div className="border border-divider/40 rounded-md bg-table-bodyBg overflow-hidden text-xs">
                    {(headers as any[]).map((h, i) => (
                      <div
                        key={i}
                        className="flex flex-col sm:flex-row border-b border-divider/40 last:border-0 hover:bg-secondary/30 transition-colors"
                      >
                        <div className="w-full sm:w-[140px] flex-shrink-0 p-1.5 sm:border-r border-divider/40 bg-secondary/10">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="font-bold font-mono text-xs break-all text-text-primary/90">
                              <HighlightText text={h.name} searchTerm={searchTerm} />
                            </span>
                            {h.status && (
                              <span
                                className={cn(
                                  'text-[9px] px-1 py-0.5 rounded uppercase font-bold tracking-tight',
                                  h.status === 'good'
                                    ? 'bg-success/15 text-success'
                                    : h.status === 'warning'
                                      ? 'bg-warning/15 text-warning'
                                      : 'bg-secondary text-text-secondary',
                                )}
                              >
                                {h.status}
                              </span>
                            )}
                          </div>
                          {h.description && (
                            <div
                              className="text-[9px] text-text-secondary leading-tight line-clamp-2"
                              title={h.description}
                            >
                              {h.description}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 p-1.5 min-w-0">
                          <div className="font-mono text-xs text-text-primary/80 break-all whitespace-pre-wrap">
                            <HighlightText text={h.value} searchTerm={searchTerm} />
                          </div>
                          {h.parsed && Object.keys(h.parsed).length > 0 && (
                            <div className="mt-1.5 text-[10px] bg-secondary/30 p-1.5 rounded border border-divider/20">
                              <div className="font-semibold text-text-secondary/70 mb-1 pointer-events-none select-none">
                                {t.requestDetails.parsedValues}
                              </div>
                              <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
                                {Object.entries(h.parsed).map(([k, v]) => (
                                  <div key={k} className="contents">
                                    <span className="text-text-secondary text-right">{k}:</span>
                                    <span className="font-mono text-text-primary">{String(v)}</span>
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
            <div className="text-text-secondary italic text-xs">{t.requestDetails.noRequestHeaders}</div>
          )}
        </div>

        {/* Response Headers */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-text-secondary uppercase pb-1.5 border-b border-divider/50">
            {t.requestDetails.responseHeaders}
          </h3>
          {analysis?.headers?.response ? (
            <div className="space-y-4">
              {Object.entries(analysis.headers.response).map(([section, headers]) => (
                <div key={section}>
                  <h4 className="text-[10px] font-bold text-primary/80 uppercase tracking-wider mb-1.5">
                    {section}
                  </h4>
                  <div className="border border-divider/40 rounded-md bg-table-bodyBg overflow-hidden text-xs">
                    {(headers as any[]).map((h, i) => (
                      <div
                        key={i}
                        className="flex flex-col sm:flex-row border-b border-divider/40 last:border-0 hover:bg-secondary/30 transition-colors"
                      >
                        <div className="w-full sm:w-[140px] flex-shrink-0 p-1.5 sm:border-r border-divider/40 bg-secondary/10">
                          <div className="flex items-center gap-1.5 mb-1">
                            <span className="font-bold font-mono text-xs break-all text-text-primary/90">
                              <HighlightText text={h.name} searchTerm={searchTerm} />
                            </span>
                            {h.status && (
                              <span
                                className={cn(
                                  'text-[9px] px-1 py-0.5 rounded uppercase font-bold tracking-tight',
                                  h.status === 'good'
                                    ? 'bg-success/15 text-success'
                                    : h.status === 'warning'
                                      ? 'bg-warning/15 text-warning'
                                      : 'bg-secondary text-text-secondary',
                                )}
                              >
                                {h.status}
                              </span>
                            )}
                          </div>
                          {h.description && (
                            <div
                              className="text-[9px] text-text-secondary leading-tight line-clamp-2"
                              title={h.description}
                            >
                              {h.description}
                            </div>
                          )}
                        </div>

                        <div className="flex-1 p-1.5 min-w-0">
                          <div className="font-mono text-xs text-text-primary/80 break-all whitespace-pre-wrap">
                            <HighlightText text={h.value} searchTerm={searchTerm} />
                          </div>
                          {h.parsed && Object.keys(h.parsed).length > 0 && (
                            <div className="mt-1.5 text-[10px] bg-secondary/30 p-1.5 rounded border border-divider/20">
                              <div className="font-semibold text-text-secondary/70 mb-1 pointer-events-none select-none">
                                {t.requestDetails.parsedValues}
                              </div>
                              <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
                                {Object.entries(h.parsed).map(([k, v]) => (
                                  <div key={k} className="contents">
                                    <span className="text-text-secondary text-right">{k}:</span>
                                    <span className="font-mono text-text-primary">{String(v)}</span>
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
            <div className="text-text-secondary italic text-xs">{t.requestDetails.noResponseHeaders}</div>
          )}
        </div>
      </div>

      {analysis?.headers?.missing && analysis.headers.missing.length > 0 && (
        <div>
          <h3 className="text-[10px] font-bold text-text-secondary uppercase mb-2 border-b border-divider/50 pb-1.5">
            {t.requestDetails.missingHeaders}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {analysis.headers.missing.map((h, i) => (
              <div
                key={i}
                className="flex flex-col bg-warning/5 hover:bg-warning/10 transition-colors border border-warning/20 p-2 rounded text-xs relative group"
              >
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-bold font-mono text-xs">{h.name}</span>
                  <span className="text-[9px] bg-warning/10 text-warning px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">
                    {h.severity}
                  </span>
                </div>
                <div className="text-text-secondary text-[10px] leading-relaxed mb-1.5 flex-grow">
                  {h.description}
                </div>
                <div className="mt-auto pt-1.5 border-t border-warning/10 text-[10px] font-medium text-warning/90 flex gap-1">
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
  );
}
