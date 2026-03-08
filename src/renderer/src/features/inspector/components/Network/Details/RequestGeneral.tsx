import { NetworkRequest } from '../../../types';
import { cn } from '../../../../../shared/lib/utils';

interface RequestGeneralProps {
  request: NetworkRequest;
}

const getMethodColor = (method: string) => {
  switch (method.toUpperCase()) {
    case 'GET':
      return 'text-primary';
    case 'POST':
      return 'text-warning';
    case 'PUT':
      return 'text-warning';
    case 'DELETE':
      return 'text-error';
    case 'PATCH':
      return 'text-indigo-500';
    default:
      return 'text-text-secondary';
  }
};

export function RequestGeneral({ request }: RequestGeneralProps) {
  const analysis = request.analysis;

  if (analysis?.request) {
    return (
      <div className="space-y-3">
        <div>
          <h3 className="text-[10px] font-bold text-text-secondary uppercase mb-1.5">General</h3>
          <div className="grid grid-cols-[100px_1fr] gap-x-4 gap-y-1 p-3 bg-secondary/20 rounded border border-divider/50">
            <div className="text-text-secondary">Method</div>
            <div className={cn('font-bold', getMethodColor(analysis.request.general.method))}>
              {analysis.request.general.method}
            </div>

            <div className="text-text-secondary">URL</div>
            <div className="break-all">{analysis.request.general.url}</div>

            <div className="text-text-secondary">Protocol</div>
            <div>{analysis.request.general.protocol}</div>

            <div className="text-text-secondary">HTTP Version</div>
            <div>{analysis.request.general.httpVersion}</div>

            <div className="text-text-secondary">Host</div>
            <div>{analysis.request.general.host}</div>

            <div className="text-text-secondary">Port</div>
            <div>{analysis.request.general.port}</div>

            <div className="text-text-secondary">Path</div>
            <div className="break-all">{analysis.request.general.path}</div>

            <div className="text-text-secondary">Scheme</div>
            <div>{analysis.request.general.scheme}</div>
          </div>
        </div>

        <div>
          <h3 className="text-[10px] font-bold text-text-secondary uppercase mb-1.5">Query</h3>
          <div className="space-y-3">
            {analysis.request.queryParams &&
              Object.keys(analysis.request.queryParams).length > 0 && (
                <div className="grid grid-cols-[1fr_2fr] gap-x-4 gap-y-1 p-3 bg-secondary/20 rounded border border-divider/50">
                  {Object.entries(analysis.request.queryParams).map(([key, value]) => (
                    <div key={key} className="contents">
                      <div className="text-text-secondary truncate" title={key}>
                        {key}:
                      </div>
                      <div className="break-all text-text-primary/80">{value}</div>
                    </div>
                  ))}
                </div>
              )}
            <div className="p-3 bg-secondary/20 rounded border border-divider/50 break-all font-mono text-xs">
              {analysis.request.queryString || '(empty)'}
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-[10px] font-bold text-text-secondary uppercase mb-1.5">Metadata</h3>
          <div className="grid grid-cols-[100px_1fr] gap-x-4 gap-y-1 p-3 bg-muted/20 rounded border border-border/50">
            <div className="text-text-secondary">Timestamp</div>
            <div>
              {new Date(analysis.request.timestamp).toLocaleString()} ({analysis.request.timestamp})
            </div>

            <div className="text-text-secondary">Size</div>
            <div className="grid grid-cols-3 gap-3 text-xs w-full">
              <div>
                <span className="text-text-secondary block">Headers</span>
                <span>{analysis.request.size.headers}</span>
              </div>
              <div>
                <span className="text-text-secondary block">Body</span>
                <span>{analysis.request.size.body}</span>
              </div>
              <div>
                <span className="text-text-secondary block font-bold">Total</span>
                <span className="font-bold">{analysis.request.size.total}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h3 className="text-xs font-bold text-text-secondary uppercase mb-2">General Info</h3>
      <div className="grid grid-cols-[120px_1fr] gap-2">
        <div className="text-text-secondary">URL</div>
        <div className="break-all">
          {request.protocol}://{request.host}
          {request.path}
        </div>
        <div className="text-text-secondary">Method</div>
        <div className={cn('font-bold', getMethodColor(request.method))}>{request.method}</div>
      </div>
      <div className="text-text-secondary italic mt-4">Detailed analysis not available</div>
    </div>
  );
}
