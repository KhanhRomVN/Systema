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

interface RequestDetailsProps {
  request: NetworkRequest | null;
}

export function RequestDetails({ request }: RequestDetailsProps) {
  const [activeTab, setActiveTab] = useState<
    | 'overview'
    | 'request'
    | 'response'
    | 'headers'
    | 'cookies'
    | 'body'
    | 'security'
    | 'cert'
    | 'network'
    | 'timing'
    | 'issues'
  >('overview');

  if (!request) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground bg-background/50">
        Select a request to view details
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart2 },
    { id: 'request', label: 'Request', icon: Upload },
    { id: 'response', label: 'Response', icon: Download },
    { id: 'headers', label: 'Headers', icon: List },
    { id: 'cookies', label: 'Cookies', icon: Cookie },
    { id: 'body', label: 'Body', icon: Box },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'cert', label: 'Certificate', icon: Scroll },
    { id: 'network', label: 'Network', icon: Globe },
    { id: 'timing', label: 'Timing', icon: Timer },
    { id: 'issues', label: 'Issues', icon: AlertTriangle },
  ] as const;

  return (
    <div className="h-full flex flex-col bg-background/50 border-t border-border/50">
      <div className="flex items-center border-b border-border/50 px-2 bg-muted/20 overflow-x-auto no-scrollbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 border-transparent transition-colors hover:text-foreground whitespace-nowrap',
                activeTab === tab.id ? 'border-primary text-primary' : 'text-muted-foreground',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-auto p-2 font-mono text-xs">
        {activeTab === 'overview' && <RequestOverview request={request} />}
        {activeTab === 'request' && <RequestGeneral request={request} />}
        {activeTab === 'response' && <ResponseGeneral request={request} />}
        {activeTab === 'headers' && <HeadersDetails request={request} />}
        {activeTab === 'cookies' && <CookiesDetails request={request} />}
        {activeTab === 'body' && <BodyDetails request={request} />}
        {activeTab === 'security' && <SecurityDetails request={request} />}
        {activeTab === 'cert' && <CertDetails request={request} />}
        {activeTab === 'network' && <NetworkDetails request={request} />}
        {activeTab === 'timing' && <TimingDetails request={request} />}
        {activeTab === 'issues' && <IssuesDetails request={request} />}
      </div>
    </div>
  );
}
