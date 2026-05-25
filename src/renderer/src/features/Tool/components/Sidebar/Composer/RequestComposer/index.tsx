import { useState, useEffect, useRef } from 'react';
import { NetworkRequest } from '../../../../../../types/inspector';
import { cn } from '../../../../../../shared/lib/utils';
import { Play, X, Braces, FileText, List, Shield, Save } from 'lucide-react';
import { CodeBlock, CodeBlockRef } from '../../../../../../core/components/common/CodeBlock';
import { KeyValueTable } from './KeyValueTable';
import { SavedRequest, RequestHistory, updateSavedRequest } from '../../../../../../utils/collections';
import { RequestEditor } from './RequestEditor';

interface RequestComposerProps {
  initialRequest: NetworkRequest;
  appId?: string;
  onRequestChange?: (request: NetworkRequest) => void;
  isTempMode?: boolean;
  onSave?: () => void;
}

export function RequestComposer({ initialRequest, appId, onRequestChange, isTempMode = false, onSave }: RequestComposerProps) {
  const [request, setRequest] = useState<NetworkRequest>(initialRequest);
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body' | 'auth'>('params');
  const [response, setResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [responseTab, setResponseTab] = useState<'body' | 'headers'>('body');
  const responseBlockRef = useRef<CodeBlockRef>(null);

  const handleRequestChange = (newRequest: NetworkRequest) => {
    setRequest(newRequest);
    if (onRequestChange) {
      onRequestChange(newRequest);
    }
  };

  useEffect(() => {
    setRequest(initialRequest);
    const saved = initialRequest as SavedRequest;
    if (saved.lastResponse) {
      setResponse({
        status: saved.lastResponse.status,
        statusText: saved.lastResponse.statusText,
        time: saved.lastResponse.time,
        size: saved.lastResponse.size,
        headers: saved.lastResponse.headers,
        body: saved.lastResponse.body,
      });
      setTimeout(() => responseBlockRef.current?.format(), 100);
    } else {
      setResponse(null);
    }
  }, [initialRequest]);

  const handleSend = async () => {
    setIsLoading(true);
    setResponse(null);

    try {
      const res = await (window as any).api.invoke('inspector:send-request', {
        url: `${request.protocol}://${request.host}${request.path}`,
        method: request.method,
        headers: request.requestHeaders,
        body: request.method !== 'GET' && request.method !== 'HEAD' ? request.requestBody : undefined,
      });

      if (res.error) throw new Error(res.error);

      setResponse({
        status: res.status,
        statusText: res.statusText,
        time: res.time,
        headers: res.headers,
        body: res.body,
        size: res.size,
      });

      if (appId && (initialRequest as SavedRequest).collectionId) {
        const savedReq = initialRequest as SavedRequest;
        updateSavedRequest(appId, savedReq.collectionId, savedReq.id, {
          lastResponse: {
            timestamp: Date.now(),
            status: res.status,
            statusText: res.statusText,
            time: res.time,
            size: res.size,
            headers: res.headers,
            body: res.body,
          },
        });
      }

      setTimeout(() => responseBlockRef.current?.format(), 100);
    } catch (error: any) {
      setResponse({ error: error.message });
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'params', label: 'Params', icon: List },
    { id: 'headers', label: 'Headers', icon: Braces },
    { id: 'body', label: 'Body', icon: FileText },
    { id: 'auth', label: 'Auth', icon: Shield },
  ] as const;

  const renderContent = () => {
    switch (activeTab) {
      case 'params':
        return <div className="p-4 text-text-secondary">Params editor coming soon...</div>;
      case 'headers':
        return (
          <div className="p-0">
            <KeyValueTable
              items={Object.entries(request.requestHeaders || {}).map(([key, value]) => ({
                key,
                value: String(value),
                enabled: true,
              }))}
              onChange={(items) => {
                const newHeaders: Record<string, string> = {};
                items.forEach(item => {
                  if (item.key && item.enabled) newHeaders[item.key] = item.value;
                });
                handleRequestChange({ ...request, requestHeaders: newHeaders });
              }}
            />
          </div>
        );
      case 'body':
        return (
          <div className="h-full">
            <CodeBlock
              code={request.requestBody || ''}
              language="json"
              className="h-full"
              onChange={(value) => handleRequestChange({ ...request, requestBody: value })}
              editorOptions={{ readOnly: false, minimap: { enabled: false }, fontSize: 12 }}
            />
          </div>
        );
      case 'auth':
        return <div className="p-4 text-text-secondary">Auth editor coming soon...</div>;
      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col bg-table-bodyBg">
      {/* Header with Send button */}
      <div className="px-4 pt-4 pb-3 border-b border-divider shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-10 rounded-lg bg-blue-500/15 border border-blue-500/25 shrink-0">
              <Play className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-text-primary">Request Composer</h2>
                {isTempMode && (
                  <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-500 rounded-md uppercase">
                    Temp
                  </span>
                )}
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                {request.method} {request.host}{request.path}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {onSave && (
              <button
                onClick={onSave}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary/90 transition-all flex items-center gap-2"
              >
                <Save className="w-3.5 h-3.5" />
                Save
              </button>
            )}
            <button
              onClick={handleSend}
              disabled={isLoading}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2',
                isLoading
                  ? 'bg-primary/50 text-white cursor-not-allowed'
                  : 'bg-primary text-white hover:bg-primary/90',
              )}
            >
              {isLoading ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-current" />
              )}
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="px-0 border-b border-divider/50 shrink-0 bg-table-headerBg">
        <div className="flex">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'py-2.5 px-4 text-xs font-medium transition-all text-center flex items-center gap-2',
                  isActive
                    ? 'border-b-2 border-primary text-primary bg-table-bodyBg'
                    : 'text-text-secondary hover:text-text-primary hover:bg-sidebar-itemHover',
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto min-h-0">
        {renderContent()}
      </div>

      {/* Response Section */}
      <div className="border-t border-divider shrink-0 flex flex-col max-h-[40%]">
        <div className="px-4 py-2 bg-table-headerBg border-b border-divider/50 flex items-center justify-between">
          <span className="text-xs font-semibold text-text-secondary uppercase">Response</span>
          {response && !response.error && (
            <div className="flex items-center gap-3">
              <span className={cn(
                'text-[10px] font-bold px-1.5 py-0.5 rounded',
                response.status >= 200 && response.status < 300 && 'bg-green-500/10 text-green-500',
                response.status >= 400 && 'bg-red-500/10 text-red-500',
              )}>
                {response.status} {response.statusText}
              </span>
              <span className="text-[10px] text-text-secondary">{response.time}ms</span>
              <span className="text-[10px] text-text-secondary">{response.size} B</span>
            </div>
          )}
        </div>
        <div className="flex-1 overflow-hidden">
          {!response ? (
            <div className="h-full flex items-center justify-center text-text-secondary">
              <div className="text-center">
                <Play className="w-8 h-8 mx-auto mb-2 opacity-20" />
                <p className="text-xs">Click Send to see response</p>
              </div>
            </div>
          ) : response.error ? (
            <div className="p-4 text-red-500 text-xs flex items-center gap-2 h-full">
              <X className="w-4 h-4" />
              Error: {response.error}
            </div>
          ) : (
            <div className="h-full flex flex-col">
              <div className="flex border-b border-divider/50 bg-muted/10">
                <button
                  onClick={() => setResponseTab('body')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium transition-all',
                    responseTab === 'body'
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-text-secondary hover:text-text-primary',
                  )}
                >
                  Body
                </button>
                <button
                  onClick={() => setResponseTab('headers')}
                  className={cn(
                    'px-3 py-1.5 text-xs font-medium transition-all',
                    responseTab === 'headers'
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-text-secondary hover:text-text-primary',
                  )}
                >
                  Headers
                </button>
              </div>
              <div className="flex-1 overflow-auto">
                {responseTab === 'body' && (
                  <CodeBlock
                    ref={responseBlockRef}
                    code={response.body}
                    language="json"
                    themeConfig={{ background: '#00000000' }}
                    editorOptions={{ readOnly: true }}
                    className="h-full"
                  />
                )}
                {responseTab === 'headers' && (
                  <KeyValueTable
                    items={Object.entries(response.headers || {}).map(([key, value]) => ({
                      key,
                      value: String(value),
                      enabled: true,
                    }))}
                    onChange={() => {}}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}