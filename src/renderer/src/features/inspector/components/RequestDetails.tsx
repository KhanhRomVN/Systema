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

function Badge({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="ml-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-primary/20 px-1 text-[10px] font-medium text-primary">
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
  const activeTab = propsActiveTab || internalActiveTab;
  const setActiveTab = (tab: string) => {
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalActiveTab(tab);
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
    { id: 'overview', label: 'Overview', icon: BarChart2, count: matches.overview },
    { id: 'request', label: 'Request', icon: Upload, count: matches.request },
    { id: 'response', label: 'Response', icon: Download, count: matches.response },
    { id: 'headers', label: 'Headers', icon: List, count: matches.headers },
    { id: 'cookies', label: 'Cookies', icon: Cookie, count: matches.cookies },
    { id: 'body', label: 'Body', icon: Box, count: matches.body },
    { id: 'security', label: 'Security', icon: Lock, count: matches.security },
    { id: 'cert', label: 'Certificate', icon: Scroll, count: matches.cert },
    { id: 'network', label: 'Network', icon: Globe, count: matches.network },
    { id: 'timing', label: 'Timing', icon: Timer, count: matches.timing },
    { id: 'issues', label: 'Issues', icon: AlertTriangle, count: matches.issues },
  ] as const;

  const content = (
    <div className="flex-1 overflow-auto p-2 font-mono text-xs">
      {!request ? (
        <div className="h-full flex items-center justify-center text-muted-foreground bg-background/50">
          Select a request to view details
        </div>
      ) : (
        <>
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
        </>
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
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 border-transparent transition-colors hover:text-foreground whitespace-nowrap',
                    activeTab === tab.id ? 'border-primary text-primary' : 'text-muted-foreground',
                  )}
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
