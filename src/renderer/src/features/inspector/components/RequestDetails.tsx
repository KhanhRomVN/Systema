import { NetworkRequest } from '../types';
import { cn } from '../../../shared/lib/utils';
import { useState } from 'react';
import {
  BarChart2,
  Upload,
  Download,
  List,
  Cookie,
  Box,
  Lock,
  Scroll,
  Globe,
  Timer,
  AlertTriangle,
  Copy,
  Flower2,
  Filter,
} from 'lucide-react';

import { RequestOverview } from './RequestDetails/RequestOverview';
import { RequestGeneral } from './RequestDetails/RequestGeneral';
import { ResponseGeneral } from './RequestDetails/ResponseGeneral';
import { HeadersDetails } from './RequestDetails/HeadersDetails';
import { CookiesDetails } from './RequestDetails/CookiesDetails';
import { BodyDetails } from './RequestDetails/BodyDetails';
import { SecurityDetails } from './RequestDetails/SecurityDetails';
import { CertDetails } from './RequestDetails/CertDetails';
import { NetworkDetails } from './RequestDetails/NetworkDetails';
import { TimingDetails } from './RequestDetails/TimingDetails';
import { IssuesDetails } from './RequestDetails/IssuesDetails';
import { InspectorFilter, FilterPanel } from './FilterPanel';
import { ResizableSplit } from '../../../components/ResizableSplit';
import { CodeBlock } from '../../../components/CodeBlock';

function Badge({ count, className }: { count: number; className?: string }) {
  if (count === 0) return null;
  return (
    <span
      className={cn(
        'ml-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[10px] font-medium',
        className || 'bg-primary/20 text-primary',
      )}
    >
      {count > 99 ? '99+' : count}
    </span>
  );
}

interface RequestDetailsProps {
  request: NetworkRequest | null;
  searchTerm: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onToggleFilter?: () => void;
  isFilterOpen?: boolean;
  filter: InspectorFilter;
  onFilterChange: (filter: InspectorFilter) => void;
}

export function RequestDetails({
  request,
  searchTerm,
  activeTab: propsActiveTab,
  onTabChange,
  onToggleFilter,
  isFilterOpen,
  filter,
  onFilterChange,
}: RequestDetailsProps) {
  const [internalActiveTab, setInternalActiveTab] = useState('overview');
  const [isRawMode, setIsRawMode] = useState(false);
  const activeTab = propsActiveTab || internalActiveTab;
  const setActiveTab = (tab: string) => {
    setIsRawMode(false);
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalActiveTab(tab);
    }
  };

  const getTabContent = (tabId: string) => {
    if (!request) return null;
    const analysis = request.analysis;

    switch (tabId) {
      case 'overview':
        return analysis?.overview;
      case 'request':
        return analysis?.request;
      case 'response':
        return analysis?.response;
      case 'headers':
        return {
          request: request.requestHeaders,
          response: request.responseHeaders,
        };
      case 'cookies':
        return {
          request: request.requestCookies,
          response: request.responseCookies,
        };
      case 'body':
        return {
          request: request.requestBody,
          response: request.responseBody,
        };
      case 'security':
        return request.securityDetails || analysis?.security;
      case 'cert':
        return request.securityDetails;
      case 'network':
        return {
          timing: request.timing,
          serverIPAddress: request.serverIPAddress,
          connection: request.connection,
        };
      case 'timing':
        return request.timing;
      case 'issues':
        return analysis?.issues;
      default:
        return request;
    }
  };

  const handleCopy = () => {
    const content = getTabContent(activeTab);
    if (content) {
      navigator.clipboard.writeText(JSON.stringify(content, null, 2));
    }
  };

  // Search Match Logic
  const getMatchCount = (data: unknown): number => {
    if (!searchTerm) return 0;
    let regex: RegExp;
    try {
      regex = new RegExp(searchTerm, 'i');
    } catch {
      regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }

    let count = 0;
    const check = (val: unknown) => {
      if (val == null) return;
      if (typeof val === 'object') {
        Object.values(val).forEach(check);
        Object.keys(val).forEach((k) => {
          if (regex.test(k)) count++;
        });
      } else if (Array.isArray(val)) {
        val.forEach(check);
      } else {
        if (regex.test(String(val))) count++;
      }
    };

    check(data);
    return count;
  };

  const getBodyMatchCount = (body?: string) => {
    if (!body || !searchTerm) return 0;
    let regex: RegExp;
    try {
      regex = new RegExp(searchTerm, 'i');
    } catch {
      regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }
    // Just check presence for body, or basic count for small bodies.
    // Counting occurences in large strings can be slow/complex with global regex.
    // For now simple presence = 1
    return regex.test(body) ? 1 : 0;
  };

  const matches = {
    overview: 0,
    request: 0,
    response: 0,
    headers: request
      ? getMatchCount(request.requestHeaders) + getMatchCount(request.responseHeaders)
      : 0,
    cookies: 0,
    body: request
      ? getBodyMatchCount(request.requestBody) + getBodyMatchCount(request.responseBody)
      : 0,
    security: 0,
    cert: 0,
    network: 0,
    timing: 0,
    issues: 0,
  };

  // Basic overview checks
  if (searchTerm && request) {
    let regex: RegExp;
    try {
      regex = new RegExp(searchTerm, 'i');
    } catch {
      regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }
    if (
      regex.test(request.method) ||
      regex.test(request.status.toString()) ||
      regex.test(request.host)
    ) {
      matches.overview++;
    }
  }

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      icon: BarChart2,
      count: matches.overview,
      colors: {
        text: 'text-blue-500 dark:text-blue-400',
        border: 'border-blue-500 dark:border-blue-400',
        badge: 'bg-blue-500/20 text-blue-600 dark:text-blue-300',
        hover: 'hover:bg-blue-500/10',
        activeAction: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
      },
    },
    {
      id: 'request',
      label: 'Request',
      icon: Upload,
      count: matches.request,
      colors: {
        text: 'text-orange-500 dark:text-orange-400',
        border: 'border-orange-500 dark:border-orange-400',
        badge: 'bg-orange-500/20 text-orange-600 dark:text-orange-300',
        hover: 'hover:bg-orange-500/10',
        activeAction: 'bg-orange-500/20 text-orange-600 dark:text-orange-400',
      },
    },
    {
      id: 'response',
      label: 'Response',
      icon: Download,
      count: matches.response,
      colors: {
        text: 'text-green-500 dark:text-green-400',
        border: 'border-green-500 dark:border-green-400',
        badge: 'bg-green-500/20 text-green-600 dark:text-green-300',
        hover: 'hover:bg-green-500/10',
        activeAction: 'bg-green-500/20 text-green-600 dark:text-green-400',
      },
    },
    {
      id: 'headers',
      label: 'Headers',
      icon: List,
      count: matches.headers,
      colors: {
        text: 'text-purple-500 dark:text-purple-400',
        border: 'border-purple-500 dark:border-purple-400',
        badge: 'bg-purple-500/20 text-purple-600 dark:text-purple-300',
        hover: 'hover:bg-purple-500/10',
        activeAction: 'bg-purple-500/20 text-purple-600 dark:text-purple-400',
      },
    },
    {
      id: 'cookies',
      label: 'Cookies',
      icon: Cookie,
      count: matches.cookies,
      colors: {
        text: 'text-yellow-500 dark:text-yellow-400',
        border: 'border-yellow-500 dark:border-yellow-400',
        badge: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-300',
        hover: 'hover:bg-yellow-500/10',
        activeAction: 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400',
      },
    },
    {
      id: 'body',
      label: 'Body',
      icon: Box,
      count: matches.body,
      colors: {
        text: 'text-pink-500 dark:text-pink-400',
        border: 'border-pink-500 dark:border-pink-400',
        badge: 'bg-pink-500/20 text-pink-600 dark:text-pink-300',
        hover: 'hover:bg-pink-500/10',
        activeAction: 'bg-pink-500/20 text-pink-600 dark:text-pink-400',
      },
    },
    {
      id: 'security',
      label: 'Security',
      icon: Lock,
      count: matches.security,
      colors: {
        text: 'text-red-500 dark:text-red-400',
        border: 'border-red-500 dark:border-red-400',
        badge: 'bg-red-500/20 text-red-600 dark:text-red-300',
        hover: 'hover:bg-red-500/10',
        activeAction: 'bg-red-500/20 text-red-600 dark:text-red-400',
      },
    },
    {
      id: 'cert',
      label: 'Certificate',
      icon: Scroll,
      count: matches.cert,
      colors: {
        text: 'text-teal-500 dark:text-teal-400',
        border: 'border-teal-500 dark:border-teal-400',
        badge: 'bg-teal-500/20 text-teal-600 dark:text-teal-300',
        hover: 'hover:bg-teal-500/10',
        activeAction: 'bg-teal-500/20 text-teal-600 dark:text-teal-400',
      },
    },
    {
      id: 'network',
      label: 'Network',
      icon: Globe,
      count: matches.network,
      colors: {
        text: 'text-cyan-500 dark:text-cyan-400',
        border: 'border-cyan-500 dark:border-cyan-400',
        badge: 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300',
        hover: 'hover:bg-cyan-500/10',
        activeAction: 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400',
      },
    },
    {
      id: 'timing',
      label: 'Timing',
      icon: Timer,
      count: matches.timing,
      colors: {
        text: 'text-indigo-500 dark:text-indigo-400',
        border: 'border-indigo-500 dark:border-indigo-400',
        badge: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-300',
        hover: 'hover:bg-indigo-500/10',
        activeAction: 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400',
      },
    },
    {
      id: 'issues',
      label: 'Issues',
      icon: AlertTriangle,
      count: matches.issues,
      colors: {
        text: 'text-rose-500 dark:text-rose-400',
        border: 'border-rose-500 dark:border-rose-400',
        badge: 'bg-rose-500/20 text-rose-600 dark:text-rose-300',
        hover: 'hover:bg-rose-500/10',
        activeAction: 'bg-rose-500/20 text-rose-600 dark:text-rose-400',
      },
    },
  ] as const;

  const content = (
    <div className="flex-1 overflow-hidden h-full">
      {!request ? (
        <div className="h-full flex items-center justify-center text-muted-foreground bg-background/50">
          Select a request to view details
        </div>
      ) : isRawMode ? (
        <CodeBlock
          code={JSON.stringify(getTabContent(activeTab), null, 2)}
          language="json"
          themeConfig={{ background: '#00000000' }} // Transparent background
        />
      ) : (
        <div className="flex-1 overflow-auto h-full p-2 font-mono text-xs">
          {activeTab === 'overview' && (
            <RequestOverview request={request} searchTerm={searchTerm} />
          )}
          {activeTab === 'request' && <RequestGeneral request={request} />}
          {activeTab === 'response' && <ResponseGeneral request={request} />}
          {activeTab === 'headers' && <HeadersDetails request={request} searchTerm={searchTerm} />}
          {activeTab === 'cookies' && <CookiesDetails request={request} />}
          {activeTab === 'body' && <BodyDetails request={request} searchTerm={searchTerm} />}
          {activeTab === 'security' && <SecurityDetails request={request} />}
          {activeTab === 'cert' && <CertDetails request={request} />}
          {activeTab === 'network' && <NetworkDetails request={request} />}
          {activeTab === 'timing' && <TimingDetails request={request} />}
          {activeTab === 'issues' && <IssuesDetails request={request} />}
        </div>
      )}
    </div>
  );

  return (
    <div className="h-full flex flex-col bg-background/50 border-t border-border/50">
      <div className="flex items-center border-b border-border/50 bg-muted/20">
        <div className="flex-1 overflow-x-auto no-scrollbar flex items-center px-2">
          {request &&
            tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              if (isActive) {
                return (
                  <div
                    key={tab.id}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 whitespace-nowrap transition-colors',
                      tab.colors.border,
                      tab.colors.text,
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                    <Badge count={tab.count} className={tab.colors.badge} />
                    <div
                      className={cn(
                        'ml-2 pl-2 border-l flex items-center gap-1 transition-colors',
                        'border-current/20', // use current text color for divider
                      )}
                    >
                      <button
                        onClick={handleCopy}
                        className={cn(
                          'p-0.5 rounded transition-colors text-muted-foreground',
                          'hover:text-current',
                          tab.colors.hover,
                        )}
                        title="Copy Tab Content"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => setIsRawMode(!isRawMode)}
                        className={cn(
                          'p-0.5 rounded transition-colors text-muted-foreground',
                          'hover:text-current',
                          tab.colors.hover,
                          isRawMode && tab.colors.activeAction,
                        )}
                        title="Toggle Raw View"
                      >
                        <Flower2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 border-transparent transition-colors hover:text-foreground text-muted-foreground whitespace-nowrap"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  <Badge count={tab.count} />
                </button>
              );
            })}
        </div>
        {onToggleFilter && (
          <button
            onClick={onToggleFilter}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 border-transparent transition-colors hover:text-foreground whitespace-nowrap',
              isFilterOpen ? 'border-primary text-primary' : 'text-muted-foreground',
            )}
            title={isFilterOpen ? 'Collapse Filters' : 'Expand Filters'}
          >
            <Filter className="w-3.5 h-3.5" />
            Filter
          </button>
        )}
      </div>

      <div className="flex-1 overflow-hidden relative">
        {isFilterOpen ? (
          <ResizableSplit direction="horizontal" initialSize={70} minSize={30} maxSize={80}>
            {content}
            <FilterPanel filter={filter} onChange={onFilterChange} />
          </ResizableSplit>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
