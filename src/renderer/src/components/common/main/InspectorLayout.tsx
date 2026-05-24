
import { ResizableSplit } from '../ResizableSplit';
import { initialFilterState, InspectorFilter, getRequestCategory, parseSize, parseTime } from '../../RequestDetails/Filter';
import { SaveProfileModal } from '../modal/SaveProfileModal';
import { DiffTab } from '../../Sidebar/Compare/DiffView';

import { useState, useMemo, useEffect } from 'react';
import { NetworkRequest } from '../../../types/inspector';
import { createProfile } from '../../../utils/profiles';

import { Topbar } from './Topbar';
import { RequestList } from '../../RequestList';
import { DetailSection } from './DetailSection';
import { RightPanel } from './RightPanel';

interface InspectorLayoutProps {
  onOpenTargetSelector: () => void;
  requests: NetworkRequest[];
  appName: string;
  appId?: string; // Should be passed if available
  onDelete: (id: string) => void;
  platform?: 'web' | 'pc' | 'android';
  fridaStatus?: 'running' | 'installed' | 'not_installed' | 'unknown';
  onInstallFrida?: () => void;
  onStartFrida?: () => void;
  onInjectBypass?: () => void;
  onInstallCert?: () => void;
  emulatorSerial?: string;
}

export function InspectorLayout({
  onOpenTargetSelector,
  requests,
  appName,
  appId,
  onDelete,
  platform,
  fridaStatus,
  onInstallFrida,
  onStartFrida,
  onInjectBypass,
  onInstallCert,
  emulatorSerial,
}: InspectorLayoutProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);
  const [detailsTab, setDetailsTab] = useState('headers');
  const [isSaveProfileModalOpen, setIsSaveProfileModalOpen] = useState(false);

  // New Features State
  const [isPaused, setIsPaused] = useState(false);
  const [displayedRequests, setDisplayedRequests] = useState<NetworkRequest[]>([]);

  // Navigation & Comparison State Extensions
  const [initialDiffTab, setInitialDiffTab] = useState<DiffTab | undefined>();
  const [initialDiffSearch, setInitialDiffSearch] = useState<string | undefined>();

  // Auto-save State
  const [autoSaveInterval, setAutoSaveInterval] = useState<number>(0); // 0 = off, minutes
  const [nextSaveTime, setNextSaveTime] = useState<number | null>(null);

  const [lastSavedTime, setLastSavedTime] = useState<number | null>(null);

  // Sync requests to displayedRequests when not paused
  useEffect(() => {
    if (!isPaused) {
      setDisplayedRequests(requests);
    }
  }, [requests, isPaused]);

  // Intercept state
  const [isIntercepting, setIsIntercepting] = useState(false);
  const [interceptedIds, setInterceptedIds] = useState<Set<string>>(new Set());
  const [pendingActionIds, setPendingActionIds] = useState<Set<string>>(new Set());
  const [processedIds] = useState(new Set<string>()); // helper to track seen IDs for interception

  // Comparison State
  const [compareRequest1, setCompareRequest1] = useState<NetworkRequest | null>(null);
  const [compareRequest2, setCompareRequest2] = useState<NetworkRequest | null>(null);

  const handleSetIntercept = (enabled: boolean) => {
    setIsIntercepting(enabled);
    window.api.invoke('proxy:set-intercept', enabled);
    if (!enabled) {
      setPendingActionIds(new Set()); // Clear pending actions when disabled
    }
  };

  const handleForward = async (id: string) => {
    await window.api.invoke('proxy:forward-request', id);
    setPendingActionIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleDrop = async (id: string) => {
    await window.api.invoke('proxy:drop-request', id);
    setPendingActionIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const handleJumpToValue = (requestId: string, tab: string, value: string) => {
    setSelectedId(requestId);
    setDetailsTab(tab);
    setSearchTerm(value);
  };

  const handleCompareRequests = (
    req1: NetworkRequest,
    req2: NetworkRequest,
    initialTab?: DiffTab,
    value?: string,
  ) => {
    setCompareRequest1(req1);
    setCompareRequest2(req2);
    setInitialDiffTab(initialTab);
    setInitialDiffSearch(value);
  };

  // Track new requests for interception
  useEffect(() => {
    let hasNewIntercepted = false;
    let hasNewPending = false;
    const newIntercepted = new Set(interceptedIds);
    const newPending = new Set(pendingActionIds);

    requests.forEach((req) => {
      // If we haven't processed this ID yet
      if (!processedIds.has(req.id)) {
        processedIds.add(req.id); // Mark as seen

        // If request is marked as intercepted by proxy (BLOCKING)
        if (req.isIntercepted) {
          newIntercepted.add(req.id);
          newPending.add(req.id);
          hasNewIntercepted = true;
          hasNewPending = true;
        }
        // Logic solely for local highlighting if enabled (fallback)
        else if (isIntercepting) {
          newIntercepted.add(req.id);
          hasNewIntercepted = true;
        }
      }
    });

    if (hasNewIntercepted) setInterceptedIds(newIntercepted);
    if (hasNewPending) setPendingActionIds(newPending);
  }, [requests, isIntercepting, processedIds]);

  // Make sure we mark all initial/incoming requests as processed even if not intercepting
  // so we don't "catch up" old requests when turning on intercept
  useEffect(() => {
    requests.forEach((req) => {
      if (!processedIds.has(req.id)) {
        processedIds.add(req.id);
      }
    });
  }, [requests]);

  const [filter, setFilter] = useState<InspectorFilter>(() => {
    try {
      const saved = localStorage.getItem(`inspector-filter-state-${appName}`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed) {
        // Migration: Remove blacklist if present (migrated to whitelist)
        if ('blacklist' in parsed.host) delete (parsed.host as any).blacklist;
        if ('blacklist' in parsed.path) delete (parsed.path as any).blacklist;

        // Migration: Check for legacy status keys (success, redirect, etc)
        const statusKeys = Object.keys(parsed.status || {});
        if (
          statusKeys.some((k) =>
            ['success', 'redirect', 'clientError', 'serverError', 'other'].includes(k),
          )
        ) {
          // Found legacy status, reset status to initial (granular)
          parsed.status = initialFilterState.status;
        }

        return { ...initialFilterState, ...parsed };
      }
      return initialFilterState;
    } catch {
      return initialFilterState;
    }
  });

  // Persist filter state whenever it changes
  useEffect(() => {
    if (appName) {
      localStorage.setItem(`inspector-filter-state-${appName}`, JSON.stringify(filter));
    }
  }, [filter, appName]);

  // Auto-save logic
  useEffect(() => {
    if (autoSaveInterval === 0 || !appName) {
      setNextSaveTime(null);
      return;
    }

    const intervalMs = autoSaveInterval * 60 * 1000;
    const timer = setInterval(() => {
      console.log('[Inspector] 💾 Auto-saving profile for:', appName);
      createProfile(
        `${appName} (Auto-saved)`,
        appName,
        appId,
        requests,
        filter,
        selectedId,
        platform,
      );
      setLastSavedTime(Date.now());
      setNextSaveTime(Date.now() + intervalMs);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [autoSaveInterval, appName, appId, requests, filter, selectedId, platform]);

  // Reset timer countdown when interval changes
  useEffect(() => {
    if (autoSaveInterval > 0) {
      setNextSaveTime(Date.now() + autoSaveInterval * 60 * 1000);
    } else {
      setNextSaveTime(null);
    }
  }, [autoSaveInterval]);

  const filteredRequests = useMemo(() => {
    const result = displayedRequests.filter((req) => {
      // 1. Method Filter
      const method = req.method.toUpperCase();
      if (filter.methods && filter.methods[method as keyof typeof filter.methods] === false) {
        return false;
      }

      // 2. Status Code Filter
      if (filter.status && typeof req.status === 'number') {
        const code = req.status;
        if (filter.status[code] === false) {
          return false;
        }
      }

      // 3. Type Filter (CSS, JS, Img, etc)
      if (filter.type) {
        const category = getRequestCategory(req);
        if (filter.type[category as keyof typeof filter.type] === false) {
          return false;
        }
      }

      // 4. Host Whitelist Filter
      if (filter.host?.whitelist?.length > 0) {
        const matched = filter.host.whitelist.some((w) => {
          if (w.startsWith('*.')) {
            const domain = w.slice(2);
            return req.host.endsWith(domain);
          }
          return req.host === w;
        });
        if (!matched) return false;
      }

      // 5. Path Whitelist Filter
      if (filter.path?.whitelist?.length > 0) {
        const matched = filter.path.whitelist.some((w) => {
          const regex = new RegExp(w.replace(/\*/g, '.*'), 'i');
          return regex.test(req.path);
        });
        if (!matched) return false;
      }

      // 6. Size Filter
      if (filter.size?.min) {
        const minBytes = parseSize(filter.size.min);
        const reqBytes = parseSize(req.size || '0');
        if (reqBytes < minBytes) return false;
      }
      if (filter.size?.max) {
        const maxBytes = parseSize(filter.size.max);
        const reqBytes = parseSize(req.size || '0');
        if (reqBytes > maxBytes) return false;
      }

      // 7. Time Filter
      if (filter.time?.min) {
        const minMs = parseTime(filter.time.min);
        const reqMs = parseTime(req.time || '0');
        if (reqMs < minMs) return false;
      }
      if (filter.time?.max) {
        const maxMs = parseTime(filter.time.max);
        const reqMs = parseTime(req.time || '0');
        if (reqMs > maxMs) return false;
      }

      return true;
    });

    return result;
  }, [displayedRequests, filter]);

  const selectedRequest = displayedRequests.find((r) => r.id === selectedId) || null;

  const [composerRequest, setComposerRequest] = useState<NetworkRequest | null>(null);

  return (
    <div className="h-full w-full bg-background text-text-primary flex flex-col overflow-hidden">
      <Topbar
        appId={appId}
        appName={appName}
        onOpenTargetSelector={onOpenTargetSelector}
        composerRequest={composerRequest}
        selectedRequest={selectedRequest}
        requests={requests}
        isPaused={isPaused}
        setIsPaused={setIsPaused}
        isIntercepting={isIntercepting}
        onSetIntercept={handleSetIntercept}
        autoSaveInterval={autoSaveInterval}
        setAutoSaveInterval={setAutoSaveInterval}
        nextSaveTime={nextSaveTime}
        setNextSaveTime={setNextSaveTime}
        lastSavedTime={lastSavedTime}
        platform={platform}
        fridaStatus={fridaStatus}
        onInstallFrida={onInstallFrida}
        onStartFrida={onStartFrida}
        onInjectBypass={onInjectBypass}
        onInstallCert={onInstallCert}
        onOpenSaveProfile={() => setIsSaveProfileModalOpen(true)}
        _emulatorSerial={emulatorSerial}
      />

      <div className="flex-1 overflow-hidden relative">
        <ResizableSplit direction="horizontal" initialSize={70} minSize={30} maxSize={80}>
          <ResizableSplit
            direction="vertical"
            initialSize={50}
            minSize={10}
            maxSize={90}
          >
            <RequestList
              filteredRequests={filteredRequests}
              requests={requests}
              selectedId={selectedId}
              onSelectRequest={setSelectedId}
              onSetComposerRequest={setComposerRequest}
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              interceptedIds={interceptedIds}
              pendingActionIds={pendingActionIds}
              onForward={handleForward}
              onDrop={handleDrop}
              onDeleteRequest={onDelete}
              appId={appId || 'unknown'}
              onSetCompare1={setCompareRequest1}
              onSetCompare2={setCompareRequest2}
              setFilter={setFilter}
            />

            <DetailSection
              composerRequest={composerRequest}
              appId={appId}
              selectedRequest={selectedRequest}
              searchTerm={searchTerm}
              detailsTab={detailsTab}
              setDetailsTab={setDetailsTab}
              isFilterPanelOpen={isFilterPanelOpen}
              setIsFilterPanelOpen={setIsFilterPanelOpen}
              filter={filter}
              setFilter={setFilter}
              requests={requests}
              onSearchTermChange={setSearchTerm}
              setSelectedId={setSelectedId}
              handleJumpToValue={handleJumpToValue}
              handleCompareRequests={handleCompareRequests}
              setCompareRequest1={setCompareRequest1}
              setCompareRequest2={setCompareRequest2}
            />
          </ResizableSplit>

          <RightPanel
            requests={requests}
            filteredRequests={filteredRequests}
            selectedId={selectedId}
            filter={filter}
            setFilter={setFilter}
            setSelectedId={setSelectedId}
            onDelete={onDelete}
            setComposerRequest={setComposerRequest}
            appName={appName}
            emulatorSerial={emulatorSerial || ''}
            appId={appId}
            compareRequest1={compareRequest1}
            compareRequest2={compareRequest2}
            setCompareRequest1={setCompareRequest1}
            setCompareRequest2={setCompareRequest2}
            handleJumpToValue={handleJumpToValue}
            handleCompareRequests={handleCompareRequests}
            initialDiffTab={initialDiffTab}
            initialDiffSearch={initialDiffSearch}
          />
        </ResizableSplit>
      </div>

      <SaveProfileModal
        isOpen={isSaveProfileModalOpen}
        onClose={() => setIsSaveProfileModalOpen(false)}
        defaultName={`${appName} - ${new Date().toLocaleString()}`}
        onSave={(name) => {
          createProfile(name, appName, appId, requests, filter, selectedId, platform);
          setIsSaveProfileModalOpen(false);
        }}
      />
    </div>
  );
}
