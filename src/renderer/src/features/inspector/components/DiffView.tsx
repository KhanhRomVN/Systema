import { useState } from 'react';
import { NetworkRequest } from '../types';
import { X, ArrowRightLeft } from 'lucide-react';
import { cn } from '../../../shared/lib/utils';
import { CodeBlock } from '../../../components/CodeBlock';

interface DiffViewProps {
  request1: NetworkRequest | null;
  request2: NetworkRequest | null;
  onClose: () => void;
}

type DiffTab = 'body' | 'headers' | 'params' | 'cookies';

export function DiffView({ request1, request2, onClose }: DiffViewProps) {
  const [activeTab, setActiveTab] = useState<DiffTab>('body');

  // Helper to allow switching what we diff (Request Body vs Response Body potentially?)
  // For now, let's implement the tabs requested: Body, Headers.
  // User also mentioned "tabbar phụ bên dưới gồm nhiều mục để so sánh như body, header..."

  // Let's refine the content getter to be more robust.
  const getContent = (req: NetworkRequest | null) => {
    if (!req) return '';
    if (activeTab === 'body') {
      // Priority: Response Body -> Request Body -> Empty
      return req.responseBody || req.requestBody || '';
    }
    if (activeTab === 'headers') {
      return JSON.stringify(req.responseHeaders || {}, null, 2);
    }
    if (activeTab === 'cookies') {
      // Naive cookie extraction from headers
      return JSON.stringify(req.responseHeaders['set-cookie'] || [], null, 2);
    }
    if (activeTab === 'params') {
      // Query params
      const qs = req.path.split('?')[1];
      if (!qs) return '{}';
      const params: Record<string, string> = {};
      qs.split('&').forEach((p) => {
        const [k, v] = p.split('=');
        if (k) params[k] = decodeURIComponent(v || '');
      });
      return JSON.stringify(params, null, 2);
    }
    return '';
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Header */}
      <div className="h-10 border-b border-border flex items-center justify-between px-4 bg-background/50 shrink-0">
        <div className="flex items-center gap-2 font-medium">
          <ArrowRightLeft className="w-4 h-4 text-purple-500" />
          <span>Diff Compare</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
          title="Close Diff View"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content Area - Vertical Split View */}
      <div className="flex-1 flex flex-col overflow-hidden p-2 gap-2">
        {/* Top Side (Request 1) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="h-6 flex items-center px-1 text-xs font-medium text-muted-foreground truncate mb-1">
            {request1 ? (
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    'uppercase',
                    request1.method === 'GET'
                      ? 'text-blue-400'
                      : request1.method === 'POST'
                        ? 'text-green-400'
                        : 'text-foreground',
                  )}
                >
                  {request1.method}
                </span>
                <span className="truncate">
                  {request1.host}
                  {request1.path}
                </span>
              </span>
            ) : (
              'Select Request 1'
            )}
          </div>
          <div className="flex-1 bg-muted/20 border border-border/50 rounded-md overflow-hidden relative min-h-0">
            {request1 ? (
              <CodeBlock
                code={getContent(request1)}
                language="json"
                showLineNumbers
                className="absolute inset-0"
                themeConfig={{ background: '#00000000' }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                Select a request to compare
              </div>
            )}
          </div>
        </div>

        {/* Middle Tabs - Styled */}
        <div className="h-9 bg-muted/40 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
          {(['body', 'headers', 'params', 'cookies'] as const).map((tab) => {
            const isActive = activeTab === tab;
            let activeClass = '';

            switch (tab) {
              case 'body':
                activeClass = 'bg-blue-500/15 text-blue-500';
                break;
              case 'headers':
                activeClass = 'bg-purple-500/15 text-purple-500';
                break;
              case 'params':
                activeClass = 'bg-orange-500/15 text-orange-500';
                break;
              case 'cookies':
                activeClass = 'bg-green-500/15 text-green-500';
                break;
            }

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex-1 h-full text-xs font-medium transition-all duration-200',
                  isActive
                    ? activeClass
                    : 'text-muted-foreground hover:bg-background/50 hover:text-foreground',
                )}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            );
          })}
        </div>

        {/* Bottom Side (Request 2) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="h-6 flex items-center px-1 text-xs font-medium text-muted-foreground truncate mb-1">
            {request2 ? (
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    'uppercase',
                    request2.method === 'GET'
                      ? 'text-blue-400'
                      : request2.method === 'POST'
                        ? 'text-green-400'
                        : 'text-foreground',
                  )}
                >
                  {request2.method}
                </span>
                <span className="truncate">
                  {request2.host}
                  {request2.path}
                </span>
              </span>
            ) : (
              'Select Request 2'
            )}
          </div>
          <div className="flex-1 bg-muted/20 border border-border/50 rounded-md overflow-hidden relative min-h-0">
            {request2 ? (
              <CodeBlock
                code={getContent(request2)}
                language="json"
                showLineNumbers
                className="absolute inset-0"
                themeConfig={{ background: '#00000000' }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                Select a request to compare
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
