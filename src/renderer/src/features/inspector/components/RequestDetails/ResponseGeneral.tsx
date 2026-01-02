import { NetworkRequest } from '../../types';
import { cn } from '../../../../shared/lib/utils';

interface ResponseGeneralProps {
  request: NetworkRequest;
}

export function ResponseGeneral({ request }: ResponseGeneralProps) {
  const analysis = request.analysis;

  if (analysis?.response) {
    return (
      <div className="space-y-3">
        <div>
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5">General</h3>
          <div className="grid grid-cols-[100px_1fr] gap-x-4 gap-y-1 p-3 bg-muted/20 rounded border border-border/50">
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
                {analysis.response.general.statusCode} {analysis.response.general.statusText}
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
          <h3 className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5">Metadata</h3>
          <div className="grid grid-cols-[100px_1fr] gap-x-4 gap-y-1 p-3 bg-muted/20 rounded border border-border/50">
            <div className="text-muted-foreground">Timestamp</div>
            <div>
              {new Date(analysis.response.timestamp).toLocaleString()} (
              {analysis.response.timestamp})
            </div>

            <div className="text-muted-foreground">Size</div>
            <div className="grid grid-cols-3 gap-3 text-xs w-full">
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
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase mb-1.5">
              Compression
            </h3>
            <div className="grid grid-cols-[100px_1fr] gap-x-4 gap-y-1 p-3 bg-muted/20 rounded border border-border/50">
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">General Info</h3>
      <div className="grid grid-cols-[120px_1fr] gap-2">
        <div className="text-muted-foreground">Status</div>
        <div className="font-bold">{request.status}</div>
      </div>
      <div className="text-muted-foreground italic mt-4">Detailed analysis not available</div>
    </div>
  );
}
