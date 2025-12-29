import { NetworkRequest } from '../types';
import { cn } from '../../../shared/lib/utils';
import { useState } from 'react';

interface RequestDetailsProps {
  request: NetworkRequest | null;
}

export function RequestDetails({ request }: RequestDetailsProps) {
  const [activeTab, setActiveTab] = useState<'headers' | 'payload' | 'response' | 'preview'>(
    'headers',
  );

  if (!request) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground bg-background/50">
        Select a request to view details
      </div>
    );
  }

  const tabs = [
    { id: 'headers', label: 'Headers' },
    { id: 'payload', label: 'Payload' },
    { id: 'response', label: 'Response Body' },
    { id: 'preview', label: 'Preview' },
  ] as const;

  return (
    <div className="h-full flex flex-col bg-background/50 border-t border-border/50">
      <div className="flex items-center border-b border-border/50 px-2 bg-muted/20">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 border-transparent transition-colors hover:text-foreground',
              activeTab === tab.id ? 'border-primary text-primary' : 'text-muted-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-4 font-mono text-sm">
        {activeTab === 'headers' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">General</h3>
              <div className="grid grid-cols-[120px_1fr] gap-2">
                <div className="text-muted-foreground">Request URL</div>
                <div className="break-all">
                  {request.protocol}://{request.host}
                  {request.path}
                </div>
                <div className="text-muted-foreground">Request Method</div>
                <div
                  className={cn('font-bold', {
                    'text-blue-400': request.method === 'GET',
                    'text-green-400': request.method === 'POST',
                    'text-orange-400': request.method === 'PUT',
                    'text-red-400': request.method === 'DELETE',
                  })}
                >
                  {request.method}
                </div>
                <div className="text-muted-foreground">Status Code</div>
                <div
                  className={cn('font-bold', {
                    'text-green-400': request.status >= 200 && request.status < 300,
                    'text-yellow-400': request.status >= 300 && request.status < 400,
                    'text-red-400': request.status >= 400,
                  })}
                >
                  {request.status}
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">
                Response Headers
              </h3>
              {Object.entries(request.responseHeaders || {}).length > 0 ? (
                <div className="grid grid-cols-[1fr_2fr] gap-x-4 gap-y-1">
                  {Object.entries(request.responseHeaders).map(([key, value]) => (
                    <div key={key} className="contents">
                      <div className="text-muted-foreground truncate" title={key}>
                        {key}:
                      </div>
                      <div className="truncate text-foreground/80" title={value as string}>
                        {value as string}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground italic">No response headers</div>
              )}
            </div>

            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">
                Request Headers
              </h3>
              {Object.entries(request.requestHeaders || {}).length > 0 ? (
                <div className="grid grid-cols-[1fr_2fr] gap-x-4 gap-y-1">
                  {Object.entries(request.requestHeaders).map(([key, value]) => (
                    <div key={key} className="contents">
                      <div className="text-muted-foreground truncate" title={key}>
                        {key}:
                      </div>
                      <div className="truncate text-foreground/80" title={value as string}>
                        {value as string}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground italic">No request headers</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'payload' && (
          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              {request.method === 'GET' ? 'No Request Body (GET)' : 'Request Body'}
            </div>
            {request.requestBody ? (
              <pre className="overflow-auto bg-muted/30 p-2 rounded border border-border/50 text-xs">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(request.requestBody), null, 2);
                  } catch {
                    return request.requestBody;
                  }
                })()}
              </pre>
            ) : null}
          </div>
        )}

        {activeTab === 'response' && (
          <div className="h-full">
            {request.responseBody ? (
              <pre className="h-full overflow-auto bg-muted/30 p-2 rounded border border-border/50 text-xs whitespace-pre-wrap">
                {(() => {
                  try {
                    return JSON.stringify(JSON.parse(request.responseBody), null, 2);
                  } catch {
                    return request.responseBody;
                  }
                })()}
              </pre>
            ) : (
              <div className="text-muted-foreground italic">No response body</div>
            )}
          </div>
        )}

        {activeTab === 'preview' && (
          <div className="h-full flex items-center justify-center text-muted-foreground">
            Preview not available for this content type.
          </div>
        )}
      </div>
    </div>
  );
}
