import { useState, useEffect, useRef } from 'react';
import { NetworkRequest } from '../types';
import { cn } from '../../../shared/lib/utils';
import { Play, X, Braces, FileText, List, Shield, AlignLeft } from 'lucide-react';
import { CodeBlock, CodeBlockRef } from '../../../components/CodeBlock';
import { KeyValueTable, KeyValueItem } from './ComposerEditors/KeyValueTable';
import { AuthEditor, AuthConfig } from './ComposerEditors/AuthEditor';
import { DocsEditor } from './ComposerEditors/DocsEditor';
import { SavedRequest, RequestHistory, updateSavedRequest } from '../utils/collections';

interface RequestComposerProps {
  initialRequest: NetworkRequest;
  appId?: string;
}

export function RequestComposer({ initialRequest, appId }: RequestComposerProps) {
  const [method, setMethod] = useState(initialRequest.method);
  const [url, setUrl] = useState(
    `${initialRequest.protocol}://${initialRequest.host}${initialRequest.path}`,
  );

  // Tabs
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body' | 'auth' | 'docs'>(
    'params',
  );
  const [responseTab, setResponseTab] = useState<'body' | 'headers'>('body');

  // Editors State
  const [params, setParams] = useState<KeyValueItem[]>([]);
  const [headers, setHeaders] = useState<KeyValueItem[]>([]);
  const [authConfig, setAuthConfig] = useState<AuthConfig>({ type: 'none' });
  const [body, setBody] = useState(initialRequest.requestBody || '');
  const [docs, setDocs] = useState('');

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
  const bodyBlockRef = useRef<CodeBlockRef>(null);
  const responseBlockRef = useRef<CodeBlockRef>(null);

  useEffect(() => {
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

    // Initialize headers
    const initialHeaders = Object.entries(initialRequest.requestHeaders).map(([key, value]) => ({
      key,
      value: value as string,
      enabled: true,
    }));
    setHeaders(initialHeaders);

    // Parse query params from URL
    try {
      const urlObj = new URL(
        `${initialRequest.protocol}://${initialRequest.host}${initialRequest.path}`,
      );
      const initialParams: KeyValueItem[] = [];
      urlObj.searchParams.forEach((value, key) => {
        initialParams.push({ key, value, enabled: true });
      });
      setParams(initialParams);
    } catch (e) {
      // Fallback or ignore invalid URL
    }
  }, [initialRequest]);

  // Update URL when params change
  useEffect(() => {
    try {
      // Only update query part, keep base URL
      const currentUrlObj = new URL(url);
      // Clear existing params
      const newSearchParams = new URLSearchParams();

      params.forEach((p) => {
        if (p.enabled && p.key) {
          newSearchParams.append(p.key, p.value);
        }
      });

      currentUrlObj.search = newSearchParams.toString();
      setUrl(currentUrlObj.toString());
    } catch (e) {
      // If URL is invalid while typing, just ignore updates from params
    }
  }, [params]);

  const handleSend = async () => {
    setIsLoading(true);
    setResponse(null);

    try {
      const headerObj: Record<string, string> = {};

      // 1. Regular Headers
      headers
        .filter((h) => h.enabled && h.key)
        .forEach((h) => {
          headerObj[h.key] = h.value;
        });

      // 2. Auth Headers
      if (authConfig.type === 'bearer' && authConfig.bearerToken) {
        headerObj['Authorization'] = `Bearer ${authConfig.bearerToken}`;
      } else if (authConfig.type === 'basic' && authConfig.basicUsername) {
        const credentials = btoa(`${authConfig.basicUsername}:${authConfig.basicPassword || ''}`);
        headerObj['Authorization'] = `Basic ${credentials}`;
      } else if (
        authConfig.type === 'apikey' &&
        authConfig.apiKeyLocation === 'header' &&
        authConfig.apiKeyKey
      ) {
        headerObj[authConfig.apiKeyKey] = authConfig.apiKeyValue || '';
      } else if (authConfig.type === 'oauth2' && authConfig.oauth2AccessToken) {
        headerObj['Authorization'] = `Bearer ${authConfig.oauth2AccessToken}`;
      }

      // 3. Auth Query Params (if any)
      let finalUrl = url;
      if (
        authConfig.type === 'apikey' &&
        authConfig.apiKeyLocation === 'query' &&
        authConfig.apiKeyKey
      ) {
        const urlObj = new URL(url);
        urlObj.searchParams.append(authConfig.apiKeyKey, authConfig.apiKeyValue || '');
        finalUrl = urlObj.toString();
      }

      const startTime = Date.now();
      const res = await fetch(finalUrl, {
        method,
        headers: headerObj,
        body: method !== 'GET' && method !== 'HEAD' ? body : undefined,
        mode: 'no-cors',
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

      // Save history and last response if it's a saved request
      if (appId && (initialRequest as SavedRequest).collectionId) {
        const historyItem: RequestHistory = {
          timestamp: Date.now(),
          status: res.status,
          statusText: res.statusText,
          time: endTime - startTime,
          size: new Blob([responseBody]).size,
          headers: responseHeaders,
          body: responseBody,
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

  const getMethodColor = (m: string) => {
    switch (m) {
      case 'GET':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'POST':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'PUT':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
      case 'DELETE':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <div className="h-full flex flex-col bg-background text-sm">
      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Request Config (Left) */}
        <div className="flex-1 flex flex-col border-r border-border min-w-0">
          <div className="flex border-b border-border bg-muted/10 items-center justify-between pr-2 h-10">
            <div className="flex">
              {[
                {
                  id: 'params',
                  label: 'Params',
                  icon: List,
                  color: 'text-blue-500',
                  showCount: true,
                },
                {
                  id: 'headers',
                  label: 'Headers',
                  icon: Braces,
                  color: 'text-purple-500',
                  showCount: true,
                },
                {
                  id: 'body',
                  label: 'Body',
                  icon: FileText,
                  color: 'text-orange-500',
                  showDot: true,
                },
                {
                  id: 'auth',
                  label: 'Authorization',
                  icon: Shield,
                  color: 'text-green-500',
                  showDot: true,
                },
                {
                  id: 'docs',
                  label: 'Docs',
                  icon: FileText,
                  color: 'text-gray-500',
                  showDot: true,
                },
              ].map((tab) => {
                // Calculate counts and indicators
                const count =
                  tab.id === 'params'
                    ? params.filter((p) => p.enabled && p.key).length
                    : tab.id === 'headers'
                      ? headers.filter((h) => h.enabled && h.key).length
                      : 0;
                const hasDot =
                  tab.id === 'body'
                    ? body.trim().length > 0
                    : tab.id === 'auth'
                      ? authConfig.type !== 'none'
                      : tab.id === 'docs'
                        ? docs.trim().length > 0
                        : false;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      'px-4 py-2.5 text-xs font-medium border-b-2 transition-all flex items-center gap-2',
                      activeTab === tab.id
                        ? `${tab.color} bg-background`
                        : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20',
                    )}
                    style={
                      activeTab === tab.id
                        ? {
                            borderBottomColor:
                              tab.id === 'params'
                                ? 'rgb(59 130 246)'
                                : tab.id === 'headers'
                                  ? 'rgb(168 85 247)'
                                  : tab.id === 'body'
                                    ? 'rgb(249 115 22)'
                                    : tab.id === 'auth'
                                      ? 'rgb(34 197 94)'
                                      : 'rgb(107 114 128)',
                          }
                        : undefined
                    }
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}

                    {/* Count Badge */}
                    {tab.showCount && count > 0 && (
                      <span
                        className={cn(
                          'ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                          activeTab === tab.id ? 'bg-current/10' : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {count}
                      </span>
                    )}

                    {/* Dot Indicator */}
                    {tab.showDot && hasDot && (
                      <span
                        className={cn(
                          'w-1.5 h-1.5 rounded-full',
                          tab.id === 'body'
                            ? 'bg-orange-500'
                            : tab.id === 'auth'
                              ? 'bg-green-500'
                              : 'bg-gray-500',
                        )}
                      />
                    )}
                  </button>
                );
              })}
            </div>

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
          </div>

          <div className="flex-1 overflow-hidden p-0 relative">
            <div
              className={cn('absolute inset-0 overflow-auto', activeTab === 'auth' ? 'p-4' : 'p-0')}
            >
              {activeTab === 'params' && <KeyValueTable items={params} onChange={setParams} />}

              {activeTab === 'headers' && <KeyValueTable items={headers} onChange={setHeaders} />}

              {activeTab === 'auth' && <AuthEditor config={authConfig} onChange={setAuthConfig} />}

              {activeTab === 'docs' && <DocsEditor value={docs} onChange={setDocs} />}

              {activeTab === 'body' && (
                <div className="h-full flex flex-col">
                  {/* Body Header with Format Button */}
                  <div className="flex-1 border border-border rounded-md overflow-hidden bg-muted/10">
                    <CodeBlock
                      ref={bodyBlockRef}
                      code={body}
                      language="json"
                      onChange={setBody}
                      themeConfig={{ background: '#00000000' }}
                      editorOptions={{ readOnly: false, minimap: { enabled: false } }}
                      className="h-full"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
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
