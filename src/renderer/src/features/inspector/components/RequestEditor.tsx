import { useState, useEffect, useRef } from 'react';
import { NetworkRequest } from '../types';
import { cn } from '../../../shared/lib/utils';
import { List, Braces, FileText, Shield } from 'lucide-react';
import { CodeBlock, CodeBlockRef } from '../../../components/CodeBlock';
import { KeyValueTable, KeyValueItem } from './ComposerEditors/KeyValueTable';
import { AuthEditor, AuthConfig } from './ComposerEditors/AuthEditor';
// import { DocsEditor } from './ComposerEditors/DocsEditor';

interface RequestEditorProps {
  request: NetworkRequest;
  onChange?: (updatedRequest: NetworkRequest) => void;
  readOnly?: boolean;
  toolbarContent?: React.ReactNode;
}

export function RequestEditor({
  request,
  onChange,
  readOnly = false,
  toolbarContent,
}: RequestEditorProps) {
  // Tabs
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body' | 'auth' | 'docs'>(
    'params',
  );

  // Editors State
  const [params, setParams] = useState<KeyValueItem[]>([]);
  const [headers, setHeaders] = useState<KeyValueItem[]>([]);
  const [authConfig, setAuthConfig] = useState<AuthConfig>({ type: 'none' });
  const [body, setBody] = useState('');
  // const [docs, setDocs] = useState('');

  const bodyBlockRef = useRef<CodeBlockRef>(null);

  // Initialize from request prop
  useEffect(() => {
    // 1. Headers
    const initialHeaders = Object.entries(request.requestHeaders || {}).map(([key, value]) => ({
      key,
      value: String(value),
      enabled: true,
    }));
    setHeaders(initialHeaders);

    // 2. Params from URL
    try {
      // Use a dummy base if protocol/host/path are empty/invalid, though they should be present
      const urlStr = `${request.protocol}://${request.host}${request.path}`;
      const urlObj = new URL(urlStr);
      const initialParams: KeyValueItem[] = [];
      urlObj.searchParams.forEach((value, key) => {
        initialParams.push({ key, value, enabled: true });
      });
      setParams(initialParams);
    } catch (e) {
      // Fallback
      setParams([]);
    }

    // 3. Body
    setBody(request.requestBody || '');

    // 4. Auth (Simple detection)
    const authHeader =
      request.requestHeaders?.['Authorization'] || request.requestHeaders?.['authorization'];

    let detectedAuth: AuthConfig = { type: 'none' };
    if (typeof authHeader === 'string') {
      if (authHeader.startsWith('Bearer ')) {
        detectedAuth = { type: 'bearer', bearerToken: authHeader.slice(7) };
      } else if (authHeader.startsWith('Basic ')) {
        try {
          const creds = atob(authHeader.slice(6));
          const [u, p] = creds.split(':');
          detectedAuth = { type: 'basic', basicUsername: u, basicPassword: p };
        } catch {
          detectedAuth = { type: 'basic' };
        }
      }
    }
    setAuthConfig(detectedAuth);
  }, [request.id]);

  // Propagate changes
  const updateRequest = (
    newParams: KeyValueItem[],
    newHeaders: KeyValueItem[],
    newBody: string,
    newAuth: AuthConfig,
  ) => {
    if (!onChange) return;

    // Constuct new URL from params
    let newPath = request.path.split('?')[0];
    try {
      const searchParams = new URLSearchParams();
      newParams.forEach((p) => {
        if (p.enabled && p.key) searchParams.append(p.key, p.value);
      });
      const qs = searchParams.toString();
      if (qs) newPath += `?${qs}`;
    } catch (e) {}

    // Construct headers
    const headerObj: Record<string, string> = {};
    newHeaders
      .filter((h) => h.enabled && h.key)
      .forEach((h) => {
        headerObj[h.key] = h.value;
      });

    // Apply Auth
    if (newAuth.type === 'bearer' && newAuth.bearerToken) {
      headerObj['Authorization'] = `Bearer ${newAuth.bearerToken}`;
    } else if (newAuth.type === 'basic' && newAuth.basicUsername) {
      const credentials = btoa(`${newAuth.basicUsername}:${newAuth.basicPassword || ''}`);
      headerObj['Authorization'] = `Basic ${credentials}`;
    } else if (
      newAuth.type === 'apikey' &&
      newAuth.apiKeyLocation === 'header' &&
      newAuth.apiKeyKey
    ) {
      headerObj[newAuth.apiKeyKey] = newAuth.apiKeyValue || '';
    } else if (newAuth.type === 'oauth2' && newAuth.oauth2AccessToken) {
      headerObj['Authorization'] = `Bearer ${newAuth.oauth2AccessToken}`;
    }

    if (newAuth.type === 'apikey' && newAuth.apiKeyLocation === 'query' && newAuth.apiKeyKey) {
      const separator = newPath.includes('?') ? '&' : '?';
      newPath += `${separator}${newAuth.apiKeyKey}=${encodeURIComponent(newAuth.apiKeyValue || '')}`;
    }

    onChange({
      ...request,
      path: newPath,
      requestHeaders: headerObj,
      requestBody: newBody,
    });
  };

  // Handlers
  const handleParamsChange = (val: KeyValueItem[]) => {
    setParams(val);
    updateRequest(val, headers, body, authConfig);
  };
  const handleHeadersChange = (val: KeyValueItem[]) => {
    setHeaders(val);
    updateRequest(params, val, body, authConfig);
  };
  const handleBodyChange = (val: string) => {
    setBody(val);
    updateRequest(params, headers, val, authConfig);
  };
  const handleAuthChange = (val: AuthConfig) => {
    setAuthConfig(val);
    updateRequest(params, headers, body, val);
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-hidden relative">
      {/* Tabs */}
      <div className="flex border-b border-border bg-muted/10 items-center overflow-x-auto no-scrollbar px-2 h-10 shrink-0">
        <div className="flex flex-1 items-center overflow-auto no-scrollbar">
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
                  : false;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'px-3 py-2 text-xs font-medium border-b-2 transition-all flex items-center gap-2 shrink-0',
                  activeTab === tab.id
                    ? `${tab.color} bg-background border-current`
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/20',
                )}
                style={activeTab === tab.id ? { borderBottomColor: undefined } : undefined}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                {tab.showCount && count > 0 && (
                  <span
                    className={cn(
                      'px-1.5 py-0.5 rounded-full text-[10px] font-bold',
                      activeTab === tab.id ? 'bg-current/10' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    {count}
                  </span>
                )}
                {tab.showDot && hasDot && (
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full',
                      tab.id === 'body' ? 'bg-orange-500' : 'bg-green-500',
                    )}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Toolbar Actions (Send Button, etc) */}
        {toolbarContent && (
          <div className="flex items-center gap-2 pl-2 border-l border-border/50 ml-2">
            {toolbarContent}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden relative">
        <div className={cn('absolute inset-0 overflow-auto', activeTab === 'auth' ? 'p-4' : 'p-0')}>
          {activeTab === 'params' && (
            <KeyValueTable items={params} onChange={handleParamsChange} readOnly={readOnly} />
          )}
          {activeTab === 'headers' && (
            <KeyValueTable items={headers} onChange={handleHeadersChange} readOnly={readOnly} />
          )}
          {activeTab === 'body' && (
            <CodeBlock
              ref={bodyBlockRef}
              code={body}
              language="json"
              onChange={!readOnly ? handleBodyChange : undefined}
              themeConfig={{ background: '#00000000' }}
              editorOptions={{ readOnly: readOnly, minimap: { enabled: false } }}
              className="h-full"
            />
          )}
          {activeTab === 'auth' && (
            <AuthEditor config={authConfig} onChange={handleAuthChange} readOnly={readOnly} />
          )}
        </div>
      </div>
    </div>
  );
}
