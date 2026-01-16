import { useState, useEffect } from 'react';
import { NetworkRequest } from '../types';
import { cn } from '../../../shared/lib/utils';
import { Play, Plus, Trash2, X } from 'lucide-react';
import { HighlightText } from './RequestDetails/HighlightText';

interface RequestComposerProps {
  initialRequest: NetworkRequest;
  onBack: () => void;
}

export function RequestComposer({ initialRequest, onBack }: RequestComposerProps) {
  const [method, setMethod] = useState(initialRequest.method);
  const [url, setUrl] = useState(
    `${initialRequest.protocol}://${initialRequest.host}${initialRequest.path}`,
  );
  const [headers, setHeaders] = useState<{ key: string; value: string; enabled: boolean }[]>([]);
  const [body, setBody] = useState(initialRequest.requestBody || '');
  const [response, setResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body' | 'auth'>('params');

  useEffect(() => {
    // Initialize headers
    const initialHeaders = Object.entries(initialRequest.requestHeaders).map(([key, value]) => ({
      key,
      value: value as string,
      enabled: true,
    }));
    setHeaders(initialHeaders);
  }, [initialRequest]);

  const handleSend = async () => {
    setIsLoading(true);
    setResponse(null);

    try {
      const headerObj: Record<string, string> = {};
      headers
        .filter((h) => h.enabled && h.key)
        .forEach((h) => {
          headerObj[h.key] = h.value;
        });

      const startTime = Date.now();
      const res = await fetch(url, {
        method,
        headers: headerObj,
        body: method !== 'GET' && method !== 'HEAD' ? body : undefined,
      });

      const endTime = Date.now();
      const responseBody = await res.text();

      const responseHeaders: Record<string, string> = {};
      res.headers.forEach((val, key) => {
        responseHeaders[key] = val;
      });

      setResponse({
        status: res.status,
        statusText: res.statusText,
        time: endTime - startTime,
        headers: responseHeaders,
        body: responseBody,
        size: new Blob([responseBody]).size,
      });
    } catch (error: any) {
      setResponse({
        error: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '', enabled: true }]);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const updateHeader = (index: number, field: 'key' | 'value' | 'enabled', value: any) => {
    const newHeaders = [...headers];
    newHeaders[index] = { ...newHeaders[index], [field]: value };
    setHeaders(newHeaders);
  };

  return (
    <div className="h-full flex flex-col bg-background text-sm">
      {/* Top Bar */}
      <div className="h-12 border-b border-border flex items-center px-4 gap-3 bg-muted/20">
        <button
          onClick={onBack}
          className="text-xs px-2 py-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
        >
          &larr; Back
        </button>
        <div className="flex-1 flex gap-2">
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="h-8 bg-background border border-border rounded px-2 font-bold text-xs outline-none focus:border-primary"
          >
            {['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="flex-1 h-8 bg-background border border-border rounded px-3 text-xs outline-none focus:border-primary font-mono"
            placeholder="Enter request URL"
          />
          <button
            onClick={handleSend}
            disabled={isLoading}
            className={cn(
              'h-8 px-4 bg-primary text-primary-foreground rounded text-xs font-medium flex items-center gap-2 transition-opacity',
              isLoading && 'opacity-70 cursor-not-allowed',
            )}
          >
            <Play className="w-3 h-3 fill-current" />
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Request Config (Left) */}
        <div className="flex-1 flex flex-col border-r border-border min-w-0">
          <div className="flex border-b border-border">
            {(['params', 'headers', 'body', 'auth'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-4 py-2 text-xs font-medium border-b-2 transition-colors capitalize',
                  activeTab === tab
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-auto p-4">
            {activeTab === 'headers' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-medium text-muted-foreground">Headers</h3>
                  <button onClick={addHeader} className="p-1 hover:bg-muted rounded">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {headers.map((h, i) => (
                  <div key={i} className="flex gap-2 items-center group">
                    <input
                      type="checkbox"
                      checked={h.enabled}
                      onChange={(e) => updateHeader(i, 'enabled', e.target.checked)}
                      className="rounded border-border"
                    />
                    <input
                      value={h.key}
                      onChange={(e) => updateHeader(i, 'key', e.target.value)}
                      placeholder="Key"
                      className="flex-1 h-7 bg-background border border-border rounded px-2 text-xs outline-none focus:border-primary font-mono"
                    />
                    <input
                      value={h.value}
                      onChange={(e) => updateHeader(i, 'value', e.target.value)}
                      placeholder="Value"
                      className="flex-1 h-7 bg-background border border-border rounded px-2 text-xs outline-none focus:border-primary font-mono"
                    />
                    <button
                      onClick={() => removeHeader(i)}
                      className="p-1.5 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'body' && (
              <div className="h-full flex flex-col">
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="flex-1 w-full bg-muted/20 border border-border rounded p-2 text-xs font-mono outline-none focus:border-primary resize-none"
                  placeholder="Request body..."
                />
              </div>
            )}

            {activeTab === 'params' && (
              <div className="text-center text-muted-foreground text-xs mt-10">
                URL Parameters (Coming Soon)
              </div>
            )}
            {activeTab === 'auth' && (
              <div className="text-center text-muted-foreground text-xs mt-10">
                Authorization (Coming Soon)
              </div>
            )}
          </div>
        </div>

        {/* Response Viewer (Right) */}
        <div className="flex-1 flex flex-col bg-muted/5 min-w-0">
          {!response ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs">
              Click Send to make a request
            </div>
          ) : response.error ? (
            <div className="p-4 text-red-500 text-xs">Error: {response.error}</div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="h-10 border-b border-border flex items-center px-4 gap-4 bg-muted/10">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium">Status:</span>
                  <span
                    className={cn(
                      'text-xs font-bold',
                      response.status >= 200 && response.status < 300
                        ? 'text-green-500'
                        : 'text-red-500',
                    )}
                  >
                    {response.status} {response.statusText}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium">Time:</span>
                  <span className="text-xs text-muted-foreground">{response.time}ms</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium">Size:</span>
                  <span className="text-xs text-muted-foreground">{response.size} B</span>
                </div>
              </div>

              <div className="flex-1 overflow-auto p-4">
                <div className="bg-background border border-border rounded-md overflow-hidden">
                  <pre className="p-3 text-xs font-mono overflow-auto max-h-[500px]">
                    {response.body}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
