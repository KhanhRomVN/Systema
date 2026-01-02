import { NetworkRequest } from '../types';
import { cn } from '../../../shared/lib/utils';
import { useState } from 'react';

interface RequestDetailsProps {
  request: NetworkRequest | null;
}

export function RequestDetails({ request }: RequestDetailsProps) {
  const [activeTab, setActiveTab] = useState<
    'headers' | 'request' | 'payload' | 'response' | 'preview' | 'cookies' | 'raw'
  >('headers');

  if (!request) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground bg-background/50">
        Select a request to view details
      </div>
    );
  }

  const tabs = [
    { id: 'headers', label: 'Headers' },
    { id: 'request', label: 'Request' },
    { id: 'payload', label: 'Payload' },
    { id: 'response', label: 'Response' },
    { id: 'preview', label: 'Preview' },
    { id: 'cookies', label: 'Cookie' },
    { id: 'raw', label: 'Raw' },
  ] as const;

  const queryParams = new URLSearchParams(request.path.split('?')[1] || {});
  const queryEntries = Array.from(queryParams.entries());

  const getCookies = (headerValue: string | string[] | undefined) => {
    if (!headerValue) return [];

    // If it's an array (common for Set-Cookie), flatten it
    if (Array.isArray(headerValue)) {
      return headerValue.flatMap((h) =>
        h
          .split(';')
          .map((c) => c.trim())
          .filter(Boolean),
      );
    }

    // Simple split by semicolon for cookie string
    return headerValue
      .split(';')
      .map((c) => c.trim())
      .filter(Boolean);
  };

  const requestCookies = getCookies(
    request.requestHeaders['cookie'] || request.requestHeaders['Cookie'],
  );
  const responseCookies = getCookies(
    request.responseHeaders['set-cookie'] || request.responseHeaders['Set-Cookie'],
  );

  return (
    <div className="h-full flex flex-col bg-background/50 border-t border-border/50">
      <div className="flex items-center border-b border-border/50 px-2 bg-muted/20 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 border-transparent transition-colors hover:text-foreground whitespace-nowrap',
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

        {activeTab === 'request' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">
                Query Parameters
              </h3>
              {queryEntries.length > 0 ? (
                <div className="grid grid-cols-[1fr_2fr] gap-x-4 gap-y-1">
                  {queryEntries.map(([key, value]) => (
                    <div key={key} className="contents">
                      <div className="text-muted-foreground truncate" title={key}>
                        {key}:
                      </div>
                      <div className="break-all text-foreground/80">{value}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground italic">No query parameters</div>
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
          <div className="h-full relative font-mono text-xs">
            {(() => {
              const contentType = (
                request.contentType ||
                request.responseHeaders['content-type'] ||
                ''
              ).toLowerCase();

              const isImage = contentType.startsWith('image/');
              const isJson = contentType.includes('application/json');
              const isHtml = contentType.includes('text/html');
              // const isCss = contentType.includes('text/css');
              // const isJs = contentType.includes('javascript') || contentType.includes('application/x-javascript');

              if (request.responseBody === undefined || request.responseBody === null) {
                return (
                  <div className="h-full flex items-center justify-center text-muted-foreground italic">
                    No response body available
                  </div>
                );
              }

              if (isImage) {
                // Determine source for image
                let src = '';
                if (request.isBinary && request.responseBody) {
                  // If binary, use base64 data URI
                  src = `data:${contentType};base64,${request.responseBody}`;
                } else if (
                  request.requestHeaders &&
                  request.method === 'GET' &&
                  !request.isBinary
                ) {
                  // Fallback to URL if not available (note: might re-trigger request)
                  // Use proxy url if needed? Ideally use captured data.
                  // If we don't have binary body yet, maybe it's too large or not captured?
                  // For now, assume if isBinary is set we use it.
                  src = `data:${contentType};base64,${request.responseBody}`;
                }

                if (!src && !request.responseBody) {
                  return (
                    <div className="h-full flex items-center justify-center text-muted-foreground">
                      Image data not captured
                    </div>
                  );
                }

                return (
                  <div className="h-full flex items-center justify-center bg-muted/10 p-4">
                    <img
                      src={src}
                      alt="Preview"
                      className="max-w-full max-h-full object-contain shadow-sm border border-border/50 rounded"
                    />
                  </div>
                );
              }

              if (isJson) {
                try {
                  const json = JSON.parse(request.responseBody);
                  return (
                    <pre className="h-full overflow-auto bg-muted/30 p-2 rounded border border-border/50 whitespace-pre-wrap">
                      {JSON.stringify(json, null, 2)}
                    </pre>
                  );
                } catch {
                  return (
                    <pre className="h-full overflow-auto bg-muted/30 p-2 rounded border border-border/50 whitespace-pre-wrap text-red-400">
                      Error keying JSON: {request.responseBody}
                    </pre>
                  );
                }
              }

              if (isHtml) {
                return (
                  <iframe
                    title="HTML Preview"
                    srcDoc={request.responseBody}
                    className="w-full h-full bg-white border border-border/50 rounded"
                    sandbox="allow-scripts"
                  />
                );
              }

              if (request.isBinary) {
                return (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
                    <div className="text-4xl">📦</div>
                    <div className="font-bold">Binary Data</div>
                    <div>Type: {contentType || 'Unknown'}</div>
                    <div className="text-xs bg-muted p-1 rounded">Size: {request.size}</div>
                  </div>
                );
              }

              // Fallback for text/other
              return (
                <pre className="h-full overflow-auto bg-muted/30 p-2 rounded border border-border/50 whitespace-pre-wrap">
                  {request.responseBody}
                </pre>
              );
            })()}
          </div>
        )}

        {activeTab === 'cookies' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">
                Request Cookies
              </h3>
              {requestCookies.length > 0 ? (
                <div className="space-y-1">
                  {requestCookies.map((cookie, index) => (
                    <div key={index} className="text-foreground/80 break-all">
                      {cookie}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground italic">No request cookies</div>
              )}
            </div>
            <div>
              <h3 className="text-xs font-bold text-muted-foreground uppercase mb-2">
                Response Cookies
              </h3>
              {responseCookies.length > 0 ? (
                <div className="space-y-1">
                  {responseCookies.map((cookie, index) => (
                    <div key={index} className="text-foreground/80 break-all">
                      {cookie}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-muted-foreground italic">No response cookies</div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'raw' && (
          <div className="h-full">
            <pre className="h-full overflow-auto bg-muted/30 p-4 rounded border border-border/50 text-xs whitespace-pre-wrap font-mono">
              {/* Metadata Section */}
              {'# METADATA'.padEnd(80, '=')}
              {'\n'}
              Request ID: {request.id}
              {'\n'}
              Protocol: {request.protocol.toUpperCase()}
              {'\n'}
              Type: {request.type}
              {'\n'}
              Size: {request.size}
              {'\n'}
              Duration: {request.time}
              {'\n'}
              Timestamp: {new Date(request.timestamp).toISOString()} ({request.timestamp}){'\n\n'}
              {'# HTTP REQUEST'.padEnd(80, '=')}
              {'\n\n'}
              {/* Request Line */}
              {request.method} {request.path} HTTP/1.1
              {'\n'}
              Host: {request.host}
              {'\n'}
              {/* Request Headers */}
              {Object.entries(request.requestHeaders).length > 0
                ? Object.entries(request.requestHeaders)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join('\n')
                : '(no request headers)'}
              {'\n\n'}
              {/* Request Body */}
              {request.requestBody || '(no request body)'}
              {'\n\n'}
              {'# HTTP RESPONSE'.padEnd(80, '=')}
              {'\n\n'}
              {/* Status Line */}
              HTTP/1.1 {request.status}
              {'\n'}
              {/* Response Headers */}
              {Object.entries(request.responseHeaders).length > 0
                ? Object.entries(request.responseHeaders)
                    .map(([key, value]) => `${key}: ${value}`)
                    .join('\n')
                : '(no response headers)'}
              {'\n\n'}
              {/* Response Body */}
              {request.responseBody || '(no response body)'}
              {'\n'}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
