import { useState, useEffect, useRef } from 'react';
import { NetworkRequest } from '../types';
import { cn } from '../../../shared/lib/utils';
import { Play, X, Braces, FileText } from 'lucide-react';
import { CodeBlock, CodeBlockRef } from '../../../components/CodeBlock';
import { KeyValueTable } from './ComposerEditors/KeyValueTable';
import { SavedRequest, RequestHistory, updateSavedRequest } from '../utils/collections';
import { RequestEditor } from './RequestEditor';

interface RequestComposerProps {
  initialRequest: NetworkRequest;
  appId?: string;
}

export function RequestComposer({ initialRequest, appId }: RequestComposerProps) {
  const [request, setRequest] = useState<NetworkRequest>(initialRequest);
  const [responseTab, setResponseTab] = useState<'body' | 'headers'>('body');

  // Initialize response from saved history if available
  const [response, setResponse] = useState<any>(() => {
    const saved = initialRequest as SavedRequest;
    if (saved.lastResponse) {
      return {
        status: saved.lastResponse.status,
        statusText: saved.lastResponse.statusText,
        time: saved.lastResponse.time,
        size: saved.lastResponse.size,
        headers: saved.lastResponse.headers,
        body: saved.lastResponse.body,
        type: 'response', // Marker
      };
    }
    return null;
  });

  const [isLoading, setIsLoading] = useState(false);
  const responseBlockRef = useRef<CodeBlockRef>(null);

  useEffect(() => {
    // Reset state when initialRequest changes (switching requests)
    setRequest(initialRequest);

    // Restore response for this specific request
    const saved = initialRequest as SavedRequest;
    if (saved.lastResponse) {
      setResponse({
        status: saved.lastResponse.status,
        statusText: saved.lastResponse.statusText,
        time: saved.lastResponse.time,
        size: saved.lastResponse.size,
        headers: saved.lastResponse.headers,
        body: saved.lastResponse.body,
        type: 'response',
      });
      // Auto-format response after a short delay to let editor mount
      setTimeout(() => {
        responseBlockRef.current?.format();
      }, 100);
    } else {
      setResponse(null);
    }
  }, [initialRequest]); // Dependency on initialRequest ensures we reset when selecting a different one.

  const handleSend = async () => {
    setIsLoading(true);
    setResponse(null);

    try {
      // Use IPC to send request from main process to avoid CORS
      // We pass the fully constructed request object which RequestEditor keeps updated
      const res = await (window as any).api.invoke('inspector:send-request', {
        url: `${request.protocol}://${request.host}${request.path}`,
        method: request.method,
        headers: request.requestHeaders,
        body:
          request.method !== 'GET' && request.method !== 'HEAD' ? request.requestBody : undefined,
      });

      if (res.error) {
        throw new Error(res.error);
      }

      setResponse({
        status: res.status,
        statusText: res.statusText,
        time: res.time,
        headers: res.headers,
        body: res.body,
        size: res.size,
        type: 'response',
      });

      // Save history and last response if it's a saved request
      if (appId && (initialRequest as SavedRequest).collectionId) {
        const historyItem: RequestHistory = {
          timestamp: Date.now(),
          status: res.status,
          statusText: res.statusText,
          time: res.time,
          size: res.size,
          headers: res.headers,
          body: res.body,
        };

        const savedReq = initialRequest as SavedRequest;

        // Update local storage
        updateSavedRequest(appId, savedReq.collectionId, savedReq.id, {
          lastResponse: historyItem,
        });
      }

      // Auto-format response body
      setTimeout(() => {
        responseBlockRef.current?.format();
      }, 100);
    } catch (error: any) {
      setResponse({
        error: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-background text-sm">
      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Request Config (Left) */}
        <div className="flex-1 flex flex-col border-r border-border min-w-0">
          <RequestEditor
            request={request}
            onChange={setRequest}
            toolbarContent={
              <button
                onClick={handleSend}
                disabled={isLoading}
                className={cn(
                  'p-2 text-primary hover:bg-primary/10 rounded-md transition-all flex items-center justify-center',
                  isLoading && 'opacity-50 cursor-not-allowed',
                )}
                title="Send Request"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play className="w-4 h-4 fill-current" />
                )}
              </button>
            }
          />
        </div>

        {/* Response Viewer (Right) */}
        <div className="flex-1 flex flex-col bg-muted/5 min-w-0 border-l border-border/50">
          {!response ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
              <div className="w-12 h-12 rounded-full bg-muted/20 flex items-center justify-center mb-3">
                <Play className="w-5 h-5 opacity-20" />
              </div>
              <span className="text-xs">Enter URL and click Send to get a response</span>
            </div>
          ) : response.error ? (
            <div className="p-4 text-red-500 text-xs flex items-center gap-2 bg-red-500/5 m-4 rounded border border-red-500/20">
              <X className="w-4 h-4" />
              Error: {response.error}
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex border-b border-border bg-muted/10 items-center justify-between h-10">
                {/* Left: Tabs */}
                <div className="flex">
                  <button
                    onClick={() => setResponseTab('body')}
                    className={cn(
                      'px-4 py-2.5 text-xs font-medium border-b-2 transition-all flex items-center gap-2',
                      responseTab === 'body'
                        ? 'border-primary bg-background'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20',
                    )}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Body
                  </button>
                  <button
                    onClick={() => setResponseTab('headers')}
                    className={cn(
                      'px-4 py-2.5 text-xs font-medium border-b-2 transition-all flex items-center gap-2',
                      responseTab === 'headers'
                        ? 'border-primary bg-background'
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20',
                    )}
                  >
                    <Braces className="w-3.5 h-3.5" />
                    Headers
                  </button>
                </div>

                {/* Right: Status Info */}
                <div className="flex items-center gap-4 px-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">
                      Status
                    </span>
                    <span
                      className={cn(
                        'text-xs font-bold px-1.5 py-0.5 rounded',
                        response.status >= 200 && response.status < 300
                          ? 'bg-green-500/10 text-green-500'
                          : response.status >= 400
                            ? 'bg-red-500/10 text-red-500'
                            : 'bg-yellow-500/10 text-yellow-500',
                      )}
                    >
                      {response.status} {response.statusText}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">
                      Time
                    </span>
                    <span className="text-xs font-mono">{response.time}ms</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">
                      Size
                    </span>
                    <span className="text-xs font-mono">{response.size} B</span>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-hidden relative">
                <div className="absolute inset-0 overflow-auto p-0">
                  {responseTab === 'body' && (
                    <CodeBlock
                      ref={responseBlockRef}
                      code={response.body}
                      language="json" // TODO: Detect from header
                      themeConfig={{ background: '#00000000' }}
                      editorOptions={{ readOnly: true }}
                      className="h-full"
                    />
                  )}
                  {responseTab === 'headers' && (
                    <div className="p-0">
                      <KeyValueTable
                        items={Object.entries(response.headers as Record<string, string>).map(
                          ([key, value]) => ({
                            key,
                            value,
                            enabled: true,
                          }),
                        )}
                        onChange={() => {}} // Read only
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
