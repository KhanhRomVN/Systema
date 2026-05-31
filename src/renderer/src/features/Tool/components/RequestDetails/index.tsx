import { NetworkRequest } from '../../../../types/inspector';
import { cn } from '../../../../shared/lib/utils';
import { useState, useRef, useEffect } from 'react';
import {
  List,
  Box,
  Globe,
  Copy,
  Flower2,
  Filter,
  ScanEye,
  KeyRound,
  Send,
  ShieldAlert,
  Cookie,
} from 'lucide-react';

import { HeadersDetails } from './Headers';
import { BodyDetails, BodyDetailsRef } from './Body';
import { NetworkDetails as NetworkDetailsSub } from './Network';
import { SecurityDetails } from './Security';
import { DiffTab } from '../Sidebar/Compare/DiffView';
import { InspectorFilter, NetworkFilter } from './Filter';
import { ResizableSplit } from '../../../../core/components/common/ResizableSplit';
import { CodeBlock } from '../../../../core/components/common/CodeBlock';
import { Composer } from './Composer';
import { CookieDetails } from './Cookie';
import { useI18n } from '../../../../i18n/i18nContext';

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

interface NetworkDetailsProps {
  request: NetworkRequest | null;
  searchTerm: string;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onToggleFilter?: () => void;
  isFilterOpen?: boolean;
  filter: InspectorFilter;
  onFilterChange: (filter: InspectorFilter) => void;
  requests?: NetworkRequest[];
  onSearchTermChange?: (term: string) => void;
  onSelectRequest?: (id: string) => void;
  onJumpToValue?: (requestId: string, tab: string, value: string) => void;
  onCompareRequests?: (
    req1: NetworkRequest,
    req2: NetworkRequest,
    initialTab?: DiffTab,
    value?: string,
  ) => void;
  onSetCompare1?: (req: NetworkRequest) => void;
  onSetCompare2?: (req: NetworkRequest) => void;
  appId?: string;
  initialComposerRequest?: NetworkRequest | null;
  showComposerTab?: boolean;
}

function TextSelectionMenu({
  x,
  y,
  onAddToCrypto,
  onUseInSearch,
  onClose,
}: {
  x: number;
  y: number;
  selectedText: string;
  onAddToCrypto: () => void;
  onUseInSearch: () => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  useEffect(() => {
    const handleClickOutside = () => onClose();
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('click', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  return (
    <div
      className="fixed z-50 bg-dialog-background border border-divider rounded-md shadow-lg py-1 min-w-[160px]"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => {
          onAddToCrypto();
          onClose();
        }}
        className="w-full px-3 py-1.5 text-xs text-left hover:bg-pink-500/10 hover:text-pink-500 transition-colors flex items-center gap-2"
      >
        <KeyRound className="w-3 h-3" />
        {t.requestDetails.addToCrypto}
      </button>
      <button
        onClick={() => {
          onUseInSearch();
          onClose();
        }}
        className="w-full px-3 py-1.5 text-xs text-left hover:bg-primary/10 hover:text-primary transition-colors flex items-center gap-2"
      >
        <Filter className="w-3 h-3" />
        {t.requestDetails.useInSearch}
      </button>
    </div>
  );
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
  requests = [],
  onSearchTermChange,
  onSelectRequest,
  onJumpToValue: _onJumpToValue,
  onCompareRequests: _onCompareRequests,
  onSetCompare1,
  onSetCompare2,
  appId,
  initialComposerRequest,
  showComposerTab = false,
}: NetworkDetailsProps) {
  const [internalActiveTab, setInternalActiveTab] = useState('headers');
  const [isRawMode, setIsRawMode] = useState(false);
  const { t } = useI18n();

  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    selectedText: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    selectedText: '',
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const bodyDetailsRef = useRef<BodyDetailsRef>(null);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

  const activeTab = propsActiveTab || internalActiveTab;

  useEffect(() => {
    setCurrentMatchIndex(-1);
  }, [activeTab, searchTerm]);

  useEffect(() => {
    setContextMenu({ visible: false, x: 0, y: 0, selectedText: '' });
  }, [activeTab, request]);

  const setActiveTab = (tab: string) => {
    setIsRawMode(false);
    if (tab === 'trace' && isFilterOpen && onToggleFilter) {
      onToggleFilter();
    }
    if (onTabChange) {
      onTabChange(tab);
    } else {
      setInternalActiveTab(tab);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() || '';

    if (selectedText) {
      setContextMenu({
        visible: true,
        x: e.clientX,
        y: e.clientY,
        selectedText,
      });
    }
  };

  const handleAddToCrypto = () => {
    window.dispatchEvent(
      new CustomEvent('add-to-crypto', {
        detail: { text: contextMenu.selectedText },
      }),
    );
  };

  const handleUseInSearch = () => {
    if (onSearchTermChange) {
      onSearchTermChange(contextMenu.selectedText);
    }
  };

  const handleCloseContextMenu = () => {
    setContextMenu({ visible: false, x: 0, y: 0, selectedText: '' });
  };

  const getTabContent = (tabId: string) => {
    if (!request) return null;

    switch (tabId) {
      case 'headers':
        return {
          request: request.requestHeaders,
          response: request.responseHeaders,
        };
      case 'body':
        return {
          request: request.requestBody,
          response: request.responseBody,
        };
      case 'network':
        return {
          timing: request.timing,
          serverIPAddress: request.serverIPAddress,
          connection: request.connection,
        };
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
      regex = new RegExp(searchTerm, 'gi');
    } catch {
      regex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    }
    const matches = body.match(regex);
    return matches ? matches.length : 0;
  };

  const matches = {
    headers: request
      ? getMatchCount(request.requestHeaders) + getMatchCount(request.responseHeaders)
      : 0,
    body: 0,
    network: 0,
  };

  if (request && request.analysis) {
    const analysis = request.analysis;
    const reqBody = analysis?.body?.request?.formatted
      ? JSON.stringify(analysis.body.request.formatted, null, 2)
      : analysis?.body?.request?.raw || '';

    const resBody = analysis?.body?.response?.formatted
      ? JSON.stringify(analysis.body.response.formatted, null, 2)
      : analysis?.body?.response?.raw || '';

    matches.body = getBodyMatchCount(reqBody) + getBodyMatchCount(resBody);
  } else if (request) {
    matches.body = getBodyMatchCount(request.requestBody) + getBodyMatchCount(request.responseBody);
  }

  const tabs = [
    {
      id: 'headers',
      label: t.requestDetails.headers,
      icon: List,
      count: matches.headers,
      importantCount: 0,
      colors: {
        text: 'text-indigo-500',
        border: 'border-indigo-500',
        badge: 'bg-indigo-500/20 text-indigo-500',
        hover: 'hover:bg-indigo-500/10',
        activeAction: 'bg-indigo-500/20 text-indigo-500',
      },
    },
    {
      id: 'body',
      label: t.requestDetails.body,
      icon: Box,
      count: matches.body,
      importantCount: 0,
      colors: {
        text: 'text-pink-500 dark:text-pink-400',
        border: 'border-pink-500 dark:border-pink-400',
        badge: 'bg-pink-500/20 text-pink-600 dark:text-pink-300',
        hover: 'hover:bg-pink-500/10',
        activeAction: 'bg-pink-500/20 text-pink-600 dark:text-pink-400',
      },
    },
    {
      id: 'network',
      label: t.requestDetails.network,
      icon: Globe,
      count: matches.network,
      importantCount: 0,
      colors: {
        text: 'text-cyan-500 dark:text-cyan-400',
        border: 'border-cyan-500 dark:border-cyan-400',
        badge: 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300',
        hover: 'hover:bg-cyan-500/10',
        activeAction: 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-400',
      },
    },
    ...(showComposerTab ? [{
      id: 'composer',
      label: t.requestDetails.composer,
      icon: Send,
      count: 0,
      importantCount: 0,
      colors: {
        text: 'text-blue-500',
        border: 'border-blue-500',
        badge: 'bg-blue-500/20 text-blue-500',
        hover: 'hover:bg-blue-500/10',
        activeAction: 'bg-blue-500/20 text-blue-500',
      },
    }] : []),
    ...(request?.protocol === 'https' && (request?.securityIssues?.length ?? 0) > 0 ? [{
      id: 'security',
      label: t.requestDetails.security,
      icon: ShieldAlert,
      count: request.securityIssues!.length,
      importantCount: 0,
      colors: {
        text: 'text-red-400',
        border: 'border-red-400',
        badge: 'bg-red-500/20 text-red-400',
        hover: 'hover:bg-red-500/10',
        activeAction: 'bg-red-500/20 text-red-400',
      },
    }] : []),
    ...(request?.protocol === 'https' && (
      (request?.requestCookies && Object.keys(request.requestCookies).length > 0) ||
      (request?.responseCookies && Object.keys(request.responseCookies).length > 0) ||
      (request?.requestHeaders && Object.keys(request.requestHeaders).some(k => k.toLowerCase() === 'cookie')) ||
      (request?.responseHeaders && Object.keys(request.responseHeaders).some(k => k.toLowerCase() === 'set-cookie'))
    ) ? [{
      id: 'cookies',
      label: t.requestDetails.cookies,
      icon: Cookie,
      count: 0,
      importantCount: 0,
      colors: {
        text: 'text-amber-400',
        border: 'border-amber-400',
        badge: 'bg-amber-500/20 text-amber-400',
        hover: 'hover:bg-amber-500/10',
        activeAction: 'bg-amber-500/20 text-amber-400',
      },
    }] : []),
  ] as const;

  const scrollToNextMatch = () => {
    if (activeTab === 'body') {
      bodyDetailsRef.current?.nextMatch();
      return;
    }

    if (!scrollContainerRef.current) return;

    const marks = scrollContainerRef.current.querySelectorAll('mark');
    if (marks.length === 0) return;

    let nextIndex = currentMatchIndex + 1;
    if (nextIndex >= marks.length) {
      nextIndex = 0;
    }

    const targetMark = marks[nextIndex];
    targetMark.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });

    setCurrentMatchIndex(nextIndex);
  };

  const isComposerTab = activeTab === 'composer';
  const isSecurityTab = activeTab === 'security';
  const isCookieTab = activeTab === 'cookies';

  const content = (
    <div className="flex-1 overflow-hidden h-full" onContextMenu={handleContextMenu}>
      {!request && !isComposerTab ? (
        <div className="h-full flex items-center justify-center text-text-secondary bg-table-bodyBg">
          {t.requestDetails.selectRequest}
        </div>
      ) : isComposerTab ? (
        <div className="h-full w-full">
          <Composer appId={appId || 'unknown'} initialRequest={initialComposerRequest} />
        </div>
      ) : isSecurityTab && request ? (
        <div className="flex-1 overflow-auto h-full">
          <SecurityDetails request={request} onJumpToEvidence={(tab, term) => {
            setActiveTab(tab);
            if (onSearchTermChange) onSearchTermChange(term);
          }} />
        </div>
      ) : isCookieTab && request ? (
        <div className="flex-1 overflow-auto h-full">
          <CookieDetails request={request} />
        </div>
      ) : isRawMode ? (
        <CodeBlock
          code={JSON.stringify(getTabContent(activeTab), null, 2)}
          language="json"
          themeConfig={{ background: '#00000000' }}
        />
      ) : (
        <div ref={scrollContainerRef} className="flex-1 overflow-auto h-full p-2 font-mono text-xs">
          {activeTab === 'headers' && request && <HeadersDetails request={request} searchTerm={searchTerm} />}
          {activeTab === 'body' && request && (
            <BodyDetails ref={bodyDetailsRef} request={request} searchTerm={searchTerm} />
          )}
          {activeTab === 'network' && request && <NetworkDetailsSub request={request} />}
          {activeTab === 'security' && request && <SecurityDetails request={request} />}
        </div>
      )}
    </div>
  );

  const currentTabHasMatches =
    searchTerm && !isRawMode && !isComposerTab && !isSecurityTab && !isCookieTab && (matches[activeTab as keyof typeof matches] || 0) > 0;

  return (
    <div className="h-full">
      <div className="h-full flex flex-col bg-table-bodyBg border-t border-divider/50">
        <div className="flex h-10 items-center border-b border-divider/50 bg-table-headerBg">
          <div className="flex-1 overflow-x-auto no-scrollbar flex items-center h-full">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              if (isActive) {
                return (
                  <div
                    key={tab.id}
                    className={cn(
                      'flex h-full items-center gap-1.5 px-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors bg-table-bodyBg',
                      tab.colors.border,
                      tab.colors.text,
                    )}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                    <Badge count={tab.count} className={tab.colors.badge} />

                    {tab.id !== 'composer' && tab.id !== 'security' && tab.id !== 'cookies' && (
                      <div
                        className={cn(
                          'ml-2 pl-2 border-l flex items-center gap-1 transition-colors',
                          'border-current/20',
                        )}
                      >
                        {currentTabHasMatches && (
                          <button
                            onClick={scrollToNextMatch}
                            className={cn(
                              'p-0.5 rounded transition-colors text-text-secondary',
                              'hover:text-current',
                              tab.colors.hover,
                              'animate-in fade-in zoom-in duration-200',
                            )}
                          title={t.requestDetails.nextMatch}
                          >
                            <ScanEye className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          onClick={handleCopy}
                          className={cn(
                            'p-0.5 rounded transition-colors text-text-secondary',
                            'hover:text-current',
                            tab.colors.hover,
                          )}
                          title={t.requestDetails.copyTab}
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setIsRawMode(!isRawMode)}
                          className={cn(
                            'p-0.5 rounded transition-colors text-text-secondary',
                            'hover:text-current',
                            tab.colors.hover,
                            isRawMode && tab.colors.activeAction,
                          )}
                          title={t.requestDetails.toggleRaw}
                        >
                          <Flower2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              }

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex h-full items-center gap-1.5 px-3 text-sm font-semibold border-b-2 border-transparent transition-colors hover:text-text-primary hover:bg-secondary/40 text-text-secondary whitespace-nowrap"
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  <Badge count={tab.count} />
                </button>
              );
            })}
          </div>
          {onToggleFilter && (
            <div className="flex h-full border-l border-divider/50">
              <button
                onClick={onToggleFilter}
                className={cn(
                  'flex h-full items-center gap-1.5 px-3 text-sm font-semibold border-b-2 border-transparent transition-colors hover:text-text-primary hover:bg-secondary/40 whitespace-nowrap',
                  isFilterOpen
                    ? 'border-primary text-primary bg-table-bodyBg'
                    : 'text-text-secondary',
                )}
                title={isFilterOpen ? t.requestDetails.collapseFilters : t.requestDetails.expandFilters}
              >
                <Filter className="w-3.5 h-3.5" />
                {t.requestDetails.filter}
              </button>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-hidden relative">
          {isFilterOpen && activeTab !== 'composer' && activeTab !== 'security' && activeTab !== 'cookies' ? (
            <ResizableSplit direction="horizontal" initialSize={70} minSize={30} maxSize={80}>
              {content}
              <NetworkFilter filter={filter} onChange={onFilterChange} requests={requests} />
            </ResizableSplit>
          ) : (
            content
          )}
        </div>
      </div>

      {contextMenu.visible && (
        <TextSelectionMenu
          x={contextMenu.x}
          y={contextMenu.y}
          selectedText={contextMenu.selectedText}
          onAddToCrypto={handleAddToCrypto}
          onUseInSearch={handleUseInSearch}
          onClose={handleCloseContextMenu}
        />
      )}
    </div>
  );
}