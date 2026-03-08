import { NetworkRequest } from '../../../types';
import { cn } from '../../../../../shared/lib/utils';

import { HighlightText } from './HighlightText';

interface CookiesDetailsProps {
  request: NetworkRequest;
  searchTerm: string;
}

export function CookiesDetails({ request, searchTerm }: CookiesDetailsProps) {
  const analysis = request.analysis;

  return (
    <div className="space-y-4">
      {/* Cookie Summary */}
      {analysis?.cookies?.summary && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-secondary/20 p-2 rounded-lg border border-divider/50 text-center">
            <div className="text-xl font-bold">
              {analysis.cookies.summary.totalRequest + analysis.cookies.summary.totalResponse}
            </div>
            <div className="text-[10px] text-text-secondary uppercase font-bold tracking-wider">
              Total Cookies
            </div>
          </div>
          <div className="bg-success/10 p-2 rounded-lg border border-success/20 text-center">
            <div className="text-xl font-bold text-success">
              {analysis.cookies.summary.secureCount}
            </div>
            <div className="text-[10px] text-success/80 uppercase font-bold tracking-wider">
              Secure
            </div>
          </div>
          <div
            className={cn(
              'p-2 rounded-lg border text-center',
              analysis.cookies.summary.issues.critical + analysis.cookies.summary.issues.warning > 0
                ? 'bg-warning/10 border-warning/20'
                : 'bg-secondary/20 border-divider/50',
            )}
          >
            <div
              className={cn(
                'text-xl font-bold',
                analysis.cookies.summary.issues.critical + analysis.cookies.summary.issues.warning >
                  0
                  ? 'text-warning'
                  : '',
              )}
            >
              {analysis.cookies.summary.issues.critical + analysis.cookies.summary.issues.warning}
            </div>
            <div
              className={cn(
                'text-[10px] uppercase font-bold tracking-wider',
                analysis.cookies.summary.issues.critical + analysis.cookies.summary.issues.warning >
                  0
                  ? 'text-warning'
                  : 'text-text-secondary',
              )}
            >
              Issues
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
        {/* Request Cookies */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-text-secondary uppercase pb-1.5 border-b border-divider/50">
            Request Cookies
          </h3>
          {analysis?.cookies?.request && analysis.cookies.request.length > 0 ? (
            <div className="space-y-2">
              {analysis.cookies.request.map((cookie, i) => (
                <div
                  key={i}
                  className="flex flex-col border border-divider/40 rounded-md bg-table-bodyBg overflow-hidden p-2 hover:bg-secondary/20 transition-colors"
                >
                  <div className="flex justify-between items-start mb-1.5 ">
                    <span className="font-bold font-mono text-xs">
                      <HighlightText text={cookie.name} searchTerm={searchTerm} />
                    </span>
                    <div className="flex gap-1">
                      {cookie.analysis?.security === 'warning' && (
                        <span className="text-[9px] bg-warning/10 text-warning px-1.5 py-0.5 rounded uppercase font-bold">
                          Insecure
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="font-mono text-xs text-text-primary/80 break-all mb-1.5 pl-2 border-l-2 border-primary/20">
                    <HighlightText text={cookie.value} searchTerm={searchTerm} />
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-[10px] text-muted-foreground/80 mt-auto pt-1.5 border-t border-border/30 border-dashed">
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
            <div className="text-xs text-muted-foreground italic">No request cookies</div>
          )}
        </div>

        {/* Response Cookies */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-text-secondary uppercase pb-1.5 border-b border-divider/50">
            Response Cookies
          </h3>
          {analysis?.cookies?.response && analysis.cookies.response.length > 0 ? (
            <div className="space-y-2">
              {analysis.cookies.response.map((cookie, i) => (
                <div
                  key={i}
                  className="flex flex-col border border-border/40 rounded-md bg-background overflow-hidden p-2 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <span className="font-bold font-mono text-xs">
                      <HighlightText text={cookie.name} searchTerm={searchTerm} />
                    </span>
                    <div className="flex gap-1">
                      {cookie.secure && (
                        <span className="text-[9px] bg-success/10 text-success px-1.5 py-0.5 rounded uppercase font-bold">
                          Secure
                        </span>
                      )}
                      {cookie.httpOnly && (
                        <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded uppercase font-bold">
                          HttpOnly
                        </span>
                      )}
                      {cookie.sameSite && (
                        <span className="text-[9px] bg-secondary text-text-secondary px-1.5 py-0.5 rounded uppercase font-bold border border-divider/30">
                          SameSite: {cookie.sameSite}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="font-mono text-xs text-text-primary/80 break-all mb-1.5 pl-2 border-l-2 border-primary/20">
                    <HighlightText text={cookie.value} searchTerm={searchTerm} />
                  </div>

                  <div className="flex flex-wrap gap-1.5 text-[10px] text-text-secondary/80 mt-auto pt-1.5 border-t border-divider/30 border-dashed">
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
                      <span className="px-1.5 py-0.5 bg-secondary rounded border border-divider/30">
                        Domain: {cookie.domain}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-text-secondary italic">No response cookies</div>
          )}
        </div>
      </div>

      {/* Issues Analysis */}
      {analysis?.cookies?.summary?.issues &&
        (analysis.cookies.summary.issues.critical > 0 ||
          analysis.cookies.summary.issues.warning > 0) && (
          <div>
            <h3 className="text-[10px] font-bold text-text-secondary uppercase mb-2 border-b border-divider/50 pb-1.5">
              Cookie Issues
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {[...analysis.cookies.request, ...analysis.cookies.response]
                .filter((c) => c.analysis?.issues && c.analysis.issues.length > 0)
                .map((c, i) => (
                  <div
                    key={i}
                    className="flex flex-col bg-warning/5 border border-warning/20 p-2 rounded text-xs relative"
                  >
                    <div className="font-bold font-mono text-xs mb-1">{c.name}</div>
                    <ul className="list-disc list-inside text-text-secondary text-[10px] space-y-0.5">
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
  );
}
