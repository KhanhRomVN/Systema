import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Globe } from 'lucide-react';
import { cn } from '../../shared/lib/utils';
import { MemoryMonitor } from '../../core/components/common/MemoryMonitor';
import { ResizableSplit } from '../../core/components/common/ResizableSplit';
import { SaveProfileModal } from '../../core/components/common/modal/SaveProfileModal';
import { SSLBypassModal } from '../../core/components/common/modal/SSLBypassModal';
import { NetworkRequest } from '../../types/inspector';
import { InspectorProfile, createProfile } from '../../utils/profiles';
import { generateRequestAnalysis } from '../../utils/analysisGenerator';
import { RequestList } from './components/RequestList';
import { RequestDetails } from './components/RequestDetails';
import { ChatContainer, InspectorContext } from './components/Sidebar';
import {
  initialFilterState,
  InspectorFilter,
  getRequestCategory,
  parseSize,
  parseTime,
} from './components/RequestDetails/Filter';
import { DiffTab } from './components/Sidebar/Compare/DiffView';

// ─── Main Component ──────────────────────────────────────────────────────────
export default function InspectorPage() {
  const [isScanning, setIsScanning] = useState(true);
  const [selectedApp, setSelectedApp] = useState<string>('');
  const [currentAppName, setCurrentAppName] = useState<string>('');
  const [requests, setRequests] = useState<NetworkRequest[]>([]);
  const [platform, setPlatform] = useState<'web' | 'pc' | 'android' | undefined>();
  const [fridaStatus, setFridaStatus] = useState<
    'running' | 'installed' | 'not_installed' | 'unknown'
  >('unknown');
  const [targetPackage, setTargetPackage] = useState<string>('');
  const [emulatorSerial, setEmulatorSerial] = useState<string>('');
  const [isSSLBypassModalOpen, setIsSSLBypassModalOpen] = useState(false);
  const autoStartAttempted = React.useRef<Set<string>>(new Set());

  const handleLoadProfile = useCallback((profile: InspectorProfile) => {
    setRequests(profile.requests);
    setSelectedApp(profile.appId || profile.appName);
    setCurrentAppName(profile.appName);
    setPlatform(profile.metadata.platform);
    setIsScanning(true);
  }, []);

  useEffect(() => {
    if (!isScanning || !selectedApp) return;
    const checkStatus = async () => {
      try {
        const allApps: any[] = await window.api.invoke('apps:get-all');
        const app = allApps.find((a) => a.id === selectedApp);
        if (app) {
          setCurrentAppName(app.name);
          setPlatform(app.platform);
          if (app.platform === 'android' && app.emulatorSerial) {
            const serial = app.emulatorSerial;
            setEmulatorSerial(serial);
            const status = await window.api.invoke('mobile:check-frida', serial);
            setFridaStatus(status);
            if (status === 'installed' && !autoStartAttempted.current.has(serial)) {
              autoStartAttempted.current.add(serial);
              window.api.invoke('mobile:start-frida', serial).then(async () => {
                const newStatus = await window.api.invoke('mobile:check-frida', serial);
                setFridaStatus(newStatus);
              });
            }
          }
        }
      } catch (e) {
        console.error('Failed to check app/frida status', e);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, [isScanning, selectedApp]);

  const handleInstallFrida = async () => {
    if (platform !== 'android') return;
    const allApps: any[] = await window.api.invoke('apps:get-all');
    const app = allApps.find((a) => a.id === selectedApp);
    if (!app?.emulatorSerial) return;
    try {
      alert('Installing Frida Server... process logs will appear in console/terminal.');
      await window.api.invoke('mobile:install-frida', app.emulatorSerial);
      alert('Frida Server installed successfully.');
      const status = await window.api.invoke('mobile:check-frida', app.emulatorSerial);
      setFridaStatus(status);
    } catch (e) {
      console.error('Failed to install Frida', e);
      alert('Failed to install Frida');
    }
  };

  const handleStartFrida = async () => {
    if (platform !== 'android') return;
    const allApps: any[] = await window.api.invoke('apps:get-all');
    const app = allApps.find((a) => a.id === selectedApp);
    if (!app?.emulatorSerial) return;
    try {
      await window.api.invoke('mobile:start-frida', app.emulatorSerial);
      const status = await window.api.invoke('mobile:check-frida', app.emulatorSerial);
      setFridaStatus(status);
    } catch (e) {
      console.error('Failed to start Frida', e);
      alert('Failed to start Frida');
    }
  };

  const [installedPackages, setInstalledPackages] = useState<string[]>([]);

  const handleInjectBypass = async () => {
    if (platform !== 'android') return;
    if (emulatorSerial) {
      try {
        const packages = await window.api.invoke('mobile:list-packages', emulatorSerial);
        if (Array.isArray(packages)) setInstalledPackages(packages.sort());
      } catch (e) {
        console.error('Failed to list packages', e);
      }
    }
    setIsSSLBypassModalOpen(true);
  };

  const handleConfirmSSLBypass = async (packageName: string) => {
    setTargetPackage(packageName);
    if (!emulatorSerial) {
      alert('Error: No device serial found');
      return;
    }
    try {
      await window.api.invoke('mobile:inject-ssl-bypass', emulatorSerial, packageName);
      alert(
        `✅ SSL Bypass injection started for ${packageName}\n\nCheck console/terminal for Frida output.`,
      );
    } catch (e) {
      console.error('[Inspector] ❌ Failed to inject bypass:', e);
      alert('❌ Failed to inject bypass. Check console for details.');
    }
  };

  const handleRequest = useCallback((_: any, data: any) => {
    const newRequest: NetworkRequest = {
      id: data.id || Math.random().toString(36).substr(2, 9),
      method: data.method,
      protocol: data.protocol || 'https',
      host: new URL(data.url).hostname,
      path: new URL(data.url).pathname + new URL(data.url).search,
      url: data.url,
      status: 0,
      type: 'Pending',
      size: '0 B',
      time: 'Pending',
      timestamp: data.timestamp || Date.now(),
      requestHeaders: data.headers || {},
      responseHeaders: {},
      requestBody: '',
      responseBody: '',
      isIntercepted: data.isIntercepted,
      initiator: data.initiator,
    };
    const analysis = generateRequestAnalysis(newRequest);
    setRequests((prev) => {
      if (prev.some((req) => req.id === newRequest.id)) return prev;
      return [{ ...newRequest, analysis }, ...prev];
    });
  }, []);

  const handleRequestBody = useCallback((_: any, data: any) => {
    setRequests((prev) =>
      prev.map((req) => {
        if (req.id !== data.id) return req;
        const updatedReq = {
          ...req,
          requestBody: data.body,
          requestHeaders: {
            ...req.requestHeaders,
            'content-encoding': data.contentEncoding || req.requestHeaders['content-encoding'],
          },
        };
        return { ...updatedReq, analysis: generateRequestAnalysis(updatedReq) };
      }),
    );
  }, []);

  const handleResponse = useCallback((_: any, data: any) => {
    setRequests((prev) =>
      prev.map((req) => {
        if (req.id === data.id) {
          const contentType = data.headers
            ? data.headers['content-type'] || data.headers['Content-Type'] || ''
            : '';
          const url = req.path;
          let type = 'Other';
          if (
            contentType.includes('json') ||
            contentType.includes('xml') ||
            contentType.includes('protobuf')
          )
            type = 'XHR';
          else if (contentType.includes('javascript') || contentType.includes('ecmascript'))
            type = 'JS';
          else if (contentType.includes('css')) type = 'CSS';
          else if (contentType.includes('image')) type = 'Img';
          else if (contentType.includes('video') || contentType.includes('audio')) type = 'Media';
          else if (contentType.includes('font')) type = 'Font';
          else if (contentType.includes('html')) type = 'Doc';
          else {
            if (url.match(/\.js(\?|$)/)) type = 'JS';
            else if (url.match(/\.css(\?|$)/)) type = 'CSS';
            else if (url.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)(\?|$)/)) type = 'Img';
            else if (url.match(/\.(mp4|webm|ogg|mp3|wav)(\?|$)/)) type = 'Media';
            else if (url.match(/\.(woff|woff2|ttf|otf|eot)(\?|$)/)) type = 'Font';
            else if (url.match(/\.wasm(\?|$)/)) type = 'Wasm';
            else if (url.match(/manifest\.json(\?|$)/)) type = 'Manifest';
            else if (req.protocol === 'ws' || req.protocol === 'wss') type = 'WS';
            else if (
              type === 'Other' &&
              (req.method === 'GET' || req.method === 'POST') &&
              !url.includes('.')
            )
              type = 'XHR';
          }
          const updatedReq = {
            ...req,
            status: data.statusCode,
            type,
            time: `${Date.now() - req.timestamp}ms`,
            responseHeaders: data.headers || {},
          };
          return { ...updatedReq, analysis: generateRequestAnalysis(updatedReq) };
        }
        if (
          !data.id &&
          req.path === new URL(data.url).pathname + new URL(data.url).search &&
          req.status === 0
        ) {
          const reqWithStatus = {
            ...req,
            status: data.statusCode,
            time: `${Date.now() - req.timestamp}ms`,
            responseHeaders: data.headers || {},
          };
          return { ...reqWithStatus, analysis: generateRequestAnalysis(reqWithStatus) };
        }
        return req;
      }),
    );
  }, []);

  const handleResponseBody = useCallback((_: any, data: any) => {
    setRequests((prev) =>
      prev.map((req) => {
        if (req.id !== data.id) return req;
        const reqWithBody = {
          ...req,
          responseBody: data.body,
          size: data.size || req.size,
          isBinary: data.isBinary,
          contentType: data.contentType,
        };
        return { ...reqWithBody, analysis: generateRequestAnalysis(reqWithBody) };
      }),
    );
  }, []);

  useEffect(() => {
    if (!isScanning) return;
    window.api.on('proxy:request', handleRequest);
    window.api.on('proxy:request-body', handleRequestBody);
    window.api.on('proxy:response', handleResponse);
    window.api.on('proxy:response-body', handleResponseBody);
    window.api.on('cdp:request', handleRequest);
    window.api.on('cdp:response', handleResponse);
    window.api.on('cdp:response-body', handleResponseBody);
    return () => {
      window.api.off('proxy:request', handleRequest);
      window.api.off('proxy:request-body', handleRequestBody);
      window.api.off('proxy:response', handleResponse);
      window.api.off('proxy:response-body', handleResponseBody);
      window.api.off('cdp:request', handleRequest);
      window.api.off('cdp:response', handleResponse);
      window.api.off('cdp:response-body', handleResponseBody);
      window.api.invoke('app:terminate').catch(console.error);
    };
  }, [isScanning, handleRequest, handleRequestBody, handleResponse, handleResponseBody]);

  const handleStopSession = async () => {
    try {
      if (selectedApp) {
        const allApps: any[] = await window.api.invoke('apps:get-all');
        const app = allApps.find((a) => a.id === selectedApp);
        if (app?.platform === 'android' && app?.emulatorSerial) {
          await window.api.invoke('mobile:clear-proxy', app.emulatorSerial, app.name);
        }
      }
      await window.api.invoke('proxy:stop');
      await window.api.invoke('app:terminate');
    } catch (error) {
      console.error('Error stopping proxy:', error);
    }
    setSelectedApp('');
    setCurrentAppName('');
    setPlatform(undefined);
    // Do NOT clear requests array when stopping
  };

  const [isConfirmSwitchOpen, setIsConfirmSwitchOpen] = useState(false);
  const [isConfirmStopOpen, setIsConfirmStopOpen] = useState(false);
  const [pendingSwitchData, setPendingSwitchData] = useState<{
    appName: string;
    proxyUrl: string;
    customUrl?: string;
    mode?: 'browser' | 'electron' | 'native';
  } | null>(null);

  const executeLaunchApp = async (
    appName: string,
    _proxyUrl: string,
    customUrl?: string,
    mode?: 'browser' | 'electron' | 'native',
  ) => {
    try {
      const port = await window.api.invoke('proxy:create-session', appName);
      const dynamicProxyUrl = `http://127.0.0.1:${port}`;
      const allApps: any[] = await window.api.invoke('apps:get-all');
      const app = allApps.find((a) => a.id === appName);
      if (app?.platform === 'android' && app?.emulatorSerial) {
        const configured = await window.api.invoke(
          'mobile:configure-proxy',
          app.emulatorSerial,
          '127.0.0.1',
          port,
          app.name,
        );
        if (!configured)
          alert(
            'Failed to configure proxy on device.\nHTTPS tracking may not work.\n\nPlease ensure the device is connected and ADB is working.',
          );
      }
      const launched = await window.api.invoke(
        'app:launch',
        appName,
        dynamicProxyUrl,
        customUrl,
        mode,
      );
      if (launched) {
        setSelectedApp(appName);
        setRequests([]);
      } else console.error('[Inspector] ❌ Failed to launch app');
    } catch (error) {
      console.error('[Inspector] ❌ Error starting proxy or launching app:', error);
    }
  };

  const handleSelectApp = async (
    appName: string,
    _proxyUrl: string,
    customUrl?: string,
    mode?: 'browser' | 'electron' | 'native',
  ) => {
    if (selectedApp) {
      setPendingSwitchData({ appName, proxyUrl: _proxyUrl, customUrl, mode });
      setIsConfirmSwitchOpen(true);
      return;
    }
    await executeLaunchApp(appName, _proxyUrl, customUrl, mode);
  };

  const handleConfirmSwitch = async () => {
    if (!pendingSwitchData) return;
    await handleStopSession();
    await executeLaunchApp(
      pendingSwitchData.appName,
      pendingSwitchData.proxyUrl,
      pendingSwitchData.customUrl,
      pendingSwitchData.mode,
    );
    setPendingSwitchData(null);
    setIsConfirmSwitchOpen(false);
  };

  const handleConfirmStop = async () => {
    await handleStopSession();
    setIsConfirmStopOpen(false);
  };

  const handleDeleteRequest = (id: string) =>
    setRequests((prev) => prev.filter((req) => req.id !== id));

  const handleInstallCert = async () => {
    if (platform !== 'android') return;
    const allApps: any[] = await window.api.invoke('apps:get-all');
    const app = allApps.find((a) => a.id === selectedApp);
    if (!app?.emulatorSerial) return;
    if (
      !confirm(
        'This will try to install the Proxy CA Certificate to the device system store.\n\nRequirements:\n- Device must be rooted (adb root)\n- System partition must be writable\n\nContinue?',
      )
    )
      return;
    try {
      alert('Installing Certificate... check console for progress.');
      const success = await window.api.invoke('mobile:install-ca-cert', app.emulatorSerial);
      if (success)
        alert('Certificate installed successfully! You may need to restart the app or device.');
      else alert('Certificate installation fail or partial. Check console logs.');
    } catch (e) {
      console.error('Failed to install cert', e);
      alert('Failed to install cert');
    }
  };

  // ─── Layout State ────────────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(true);
  const [detailsTab, setDetailsTab] = useState('headers');
  const [isSaveProfileModalOpen, setIsSaveProfileModalOpen] = useState(false);
  const [isPaused] = useState(false);
  const [displayedRequests, setDisplayedRequests] = useState<NetworkRequest[]>([]);
  const [initialDiffTab, setInitialDiffTab] = useState<DiffTab | undefined>();
  const [initialDiffSearch, setInitialDiffSearch] = useState<string | undefined>();
  const [isIntercepting] = useState(false);
  const [interceptedIds, setInterceptedIds] = useState<Set<string>>(new Set());
  const [pendingActionIds, setPendingActionIds] = useState<Set<string>>(new Set());
  const [processedIds] = useState(new Set<string>());
  const [compareRequest1, setCompareRequest1] = useState<NetworkRequest | null>(null);
  const [compareRequest2, setCompareRequest2] = useState<NetworkRequest | null>(null);
  const [analyzingRequest, setAnalyzingRequest] = useState<NetworkRequest | null>(null);
  const [activeSidebarTab, setActiveSidebarTab] = useState<string>('chat');

  const [filter, setFilter] = useState<InspectorFilter>(() => {
    try {
      const saved = localStorage.getItem(`inspector-filter-state-${currentAppName}`);
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed) {
        if ('blacklist' in parsed.host) delete (parsed.host as any).blacklist;
        if ('blacklist' in parsed.path) delete (parsed.path as any).blacklist;
        const statusKeys = Object.keys(parsed.status || {});
        if (
          statusKeys.some((k) =>
            ['success', 'redirect', 'clientError', 'serverError', 'other'].includes(k),
          )
        ) {
          parsed.status = initialFilterState.status;
        }
        return { ...initialFilterState, ...parsed };
      }
      return initialFilterState;
    } catch {
      return initialFilterState;
    }
  });

  useEffect(() => {
    if (!isPaused) setDisplayedRequests(requests);
  }, [requests, isPaused]);

  // Reload filter when currentAppName changes (switch target)
  useEffect(() => {
    if (!currentAppName) return;
    try {
      const saved = localStorage.getItem(`inspector-filter-state-${currentAppName}`);
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed) {
        if ('blacklist' in parsed.host) delete (parsed.host as any).blacklist;
        if ('blacklist' in parsed.path) delete (parsed.path as any).blacklist;
        const statusKeys = Object.keys(parsed.status || {});
        if (
          statusKeys.some((k) =>
            ['success', 'redirect', 'clientError', 'serverError', 'other'].includes(k),
          )
        ) {
          parsed.status = initialFilterState.status;
        }
        setFilter({ ...initialFilterState, ...parsed });
      } else {
        setFilter(initialFilterState);
      }
    } catch {
      setFilter(initialFilterState);
    }
  }, [currentAppName]);

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

  useEffect(() => {
    let hasNewIntercepted = false,
      hasNewPending = false;
    const newIntercepted = new Set(interceptedIds);
    const newPending = new Set(pendingActionIds);
    requests.forEach((req) => {
      if (!processedIds.has(req.id)) {
        processedIds.add(req.id);
        if (req.isIntercepted) {
          newIntercepted.add(req.id);
          newPending.add(req.id);
          hasNewIntercepted = true;
          hasNewPending = true;
        } else if (isIntercepting) {
          newIntercepted.add(req.id);
          hasNewIntercepted = true;
        }
      }
    });
    if (hasNewIntercepted) setInterceptedIds(newIntercepted);
    if (hasNewPending) setPendingActionIds(newPending);
  }, [requests, isIntercepting, processedIds]);

  useEffect(() => {
    requests.forEach((req) => {
      if (!processedIds.has(req.id)) processedIds.add(req.id);
    });
  }, [requests]);

  useEffect(() => {
    if (currentAppName)
      localStorage.setItem(`inspector-filter-state-${currentAppName}`, JSON.stringify(filter));
  }, [filter, currentAppName]);

  const filteredRequests = useMemo(() => {
    return displayedRequests.filter((req) => {
      const method = req.method.toUpperCase();
      if (filter.methods && filter.methods[method as keyof typeof filter.methods] === false)
        return false;
      if (filter.status && typeof req.status === 'number' && filter.status[req.status] === false)
        return false;
      if (filter.type) {
        const category = getRequestCategory(req);
        if (filter.type[category as keyof typeof filter.type] === false) return false;
      }
      if (filter.host?.whitelist?.length > 0) {
        const matched = filter.host.whitelist.some((w) =>
          w.startsWith('*.') ? req.host.endsWith(w.slice(2)) : req.host === w,
        );
        if (!matched) return false;
      }
      if (filter.path?.whitelist?.length > 0) {
        const matched = filter.path.whitelist.some((w) =>
          new RegExp(w.replace(/\*/g, '.*'), 'i').test(req.path),
        );
        if (!matched) return false;
      }
      if (filter.size?.min && parseSize(req.size || '0') < parseSize(filter.size.min)) return false;
      if (filter.size?.max && parseSize(req.size || '0') > parseSize(filter.size.max)) return false;
      if (filter.time?.min && parseTime(req.time || '0') < parseTime(filter.time.min)) return false;
      if (filter.time?.max && parseTime(req.time || '0') > parseTime(filter.time.max)) return false;
      return true;
    });
  }, [displayedRequests, filter]);

  const selectedRequest = displayedRequests.find((r) => r.id === selectedId) || null;
  const appName = currentAppName || selectedApp;

  const handleSelectSavedRequest = useCallback((request: NetworkRequest) => {
    console.log('Saved request selected:', request);
  }, []);
  const handleClearAnalyzing = useCallback(() => {
    setAnalyzingRequest(null);
    setActiveSidebarTab('collections');
  }, []);
  const handleClearComparison = useCallback(() => {
    setCompareRequest1(null);
    setCompareRequest2(null);
  }, []);
  const handleCloseConfirmSwitch = useCallback(() => {
    setIsConfirmSwitchOpen(false);
    setPendingSwitchData(null);
  }, []);
  const handleCloseConfirmStop = useCallback(() => setIsConfirmStopOpen(false), []);
  const handleOpenStopConfirm = useCallback(() => setIsConfirmStopOpen(true), []);
  const handleNodeClick = useCallback((request: NetworkRequest) => {
    setAnalyzingRequest(request);
    setDetailsTab('composer');
  }, []);

  const inspectorContext = useMemo<InspectorContext>(() => {
    return {
      requests,
      filteredRequests,
      selectedRequestId: selectedId,
      filter,
      onSetFilter: setFilter,
      onSelectRequest: setSelectedId,
      onDeleteRequest: handleDeleteRequest,
      onSelectSavedRequest: handleSelectSavedRequest,
      analyzingRequest,
      onClearAnalyzing: handleClearAnalyzing,
      activeSidebarTab,
      onSetActiveSidebarTab: setActiveSidebarTab,
      targetApp: appName,
      emulatorSerial: emulatorSerial || '',
      appId: selectedApp || '',
      compareRequest1,
      compareRequest2,
      onClearComparison: handleClearComparison,
      onJumpToValue: handleJumpToValue,
      onCompareRequests: handleCompareRequests,
      initialDiffTab,
      initialDiffSearch,
      onSelectApp: handleSelectApp,
      onStopSession: handleStopSession,
      onLoadProfile: handleLoadProfile,
      isConfirmSwitchOpen,
      onCloseConfirmSwitch: handleCloseConfirmSwitch,
      onConfirmSwitch: handleConfirmSwitch,
      currentAppName,
      newAppName: pendingSwitchData?.appName || '',
      isConfirmStopOpen,
      onCloseConfirmStop: handleCloseConfirmStop,
      onConfirmStop: handleConfirmStop,
      onOpenStopConfirm: handleOpenStopConfirm,
      onNodeClick: handleNodeClick,
    };
  }, [
    requests, filteredRequests, selectedId, filter, handleDeleteRequest,
    handleSelectSavedRequest, analyzingRequest, handleClearAnalyzing,
    activeSidebarTab, appName, emulatorSerial, selectedApp,
    compareRequest1, compareRequest2, handleClearComparison,
    handleJumpToValue, handleCompareRequests, initialDiffTab, initialDiffSearch,
    handleSelectApp, handleStopSession, handleLoadProfile,
    isConfirmSwitchOpen, handleCloseConfirmSwitch, handleConfirmSwitch,
    currentAppName, pendingSwitchData?.appName, isConfirmStopOpen,
    handleCloseConfirmStop, handleConfirmStop, handleOpenStopConfirm, handleNodeClick,
  ]);

  return (
    <div className="h-screen w-screen bg-background">
      {/* ── Topbar ── */}
      <div className="h-10 border-b border-divider flex items-center px-3 bg-table-headerBg gap-3 select-none">
        <span className="text-sm font-bold text-text-primary">Systema</span>
        <div className="h-4 w-px bg-divider/50" />
        <div
          className={cn(
            'text-xs px-2.5 rounded font-bold flex items-center gap-1.5 border select-none self-stretch',
            selectedApp
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-primary/10 text-primary border-primary/20',
          )}
        >
          {selectedApp ? (
            <>
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              Target: {appName}
            </>
          ) : (
            <>
              <Globe className="w-3.5 h-3.5" />
              No Target
            </>
          )}
        </div>

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <div
            title={`${requests.filter((r) => r.protocol === 'https').length} HTTPS requests`}
            className="flex items-center gap-1.5 px-2 rounded bg-primary/10 text-primary text-xs whitespace-nowrap self-stretch"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <span className="font-medium">
              {requests.filter((r) => r.protocol === 'https').length}
            </span>
          </div>
          <MemoryMonitor />
        </div>

        {platform === 'android' && (
          <div className="flex items-center gap-2 border-l border-divider/50 pl-2">
            <span className="text-xs text-text-secondary">Frida:</span>
            {fridaStatus === 'running' ? (
              <>
                <span className="text-xs text-success font-medium flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-success" />
                  Running
                </span>
                <button
                  onClick={handleInjectBypass}
                  className="px-2 py-1 rounded text-xs bg-indigo-600/10 text-indigo-500 hover:bg-indigo-600/20 border border-indigo-500/30 transition-colors"
                  title="Inject Universal SSL Pinning Bypass"
                >
                  SSL Bypass
                </button>
                <button
                  onClick={handleInstallCert}
                  className="px-2 py-1 rounded text-xs bg-warning/10 text-warning hover:bg-warning/20 border border-warning/30 transition-colors"
                  title="Install Proxy CA Certificate (Requires Root)"
                >
                  Install Cert
                </button>
              </>
            ) : fridaStatus === 'installed' ? (
              <button
                onClick={handleStartFrida}
                className="px-2 py-1 rounded text-xs bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 transition-colors"
                title="Start Frida Server"
              >
                Start
              </button>
            ) : (
              <button
                onClick={handleInstallFrida}
                className="px-2 py-1 rounded text-xs bg-secondary hover:bg-secondary/80 border border-divider transition-colors"
                title="Install Frida Server on Device"
              >
                Install
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Main Layout ── */}
      <div className="h-[calc(100vh-2.5rem-1.5rem)] w-full bg-background text-text-primary overflow-hidden">
        <ResizableSplit direction="horizontal" initialSize={70} minSize={30} maxSize={80}>
          <ResizableSplit direction="vertical" initialSize={50} minSize={10} maxSize={90}>
            <RequestList
              filteredRequests={filteredRequests}
              requests={requests}
              selectedId={selectedId}
              onSelectRequest={setSelectedId}
              searchTerm={searchTerm}
              onSearchTermChange={setSearchTerm}
              interceptedIds={interceptedIds}
              pendingActionIds={pendingActionIds}
              onForward={handleForward}
              onDrop={handleDrop}
              onDeleteRequest={handleDeleteRequest}
              appId={selectedApp || 'unknown'}
              onSetCompare1={setCompareRequest1}
              onSetCompare2={setCompareRequest2}
              setFilter={setFilter}
              onAnalyzeRequest={(req) => {
                setAnalyzingRequest(req);
                // setDetailsTab('composer');
                setActiveSidebarTab('composer');
              }}
            />

            {/* ── RequestDetails (DetailSection) ── */}
            <RequestDetails
              request={selectedRequest}
              searchTerm={searchTerm}
              activeTab={detailsTab}
              onTabChange={setDetailsTab}
              onToggleFilter={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
              isFilterOpen={isFilterPanelOpen}
              filter={filter}
              onFilterChange={setFilter}
              requests={requests}
              onSearchTermChange={setSearchTerm}
              onSelectRequest={setSelectedId}
              onJumpToValue={handleJumpToValue}
              onCompareRequests={handleCompareRequests}
              onSetCompare1={setCompareRequest1}
              onSetCompare2={setCompareRequest2}
              appId={selectedApp}
              initialComposerRequest={analyzingRequest}
            />
          </ResizableSplit>

          {/* ── Sidebar (RightPanel) ── */}
          <ChatContainer inspectorContext={inspectorContext} />
        </ResizableSplit>
      </div>

      {/* ── FootBar ── */}
      {(() => {
        const httpsCount = requests.filter((r) => r.protocol === 'https').length;
        const totalSize = requests.reduce((acc, r) => {
          const n = parseFloat(r.size);
          if (isNaN(n)) return acc;
          if (r.size.toLowerCase().includes('kb')) return acc + n * 1024;
          if (r.size.toLowerCase().includes('mb')) return acc + n * 1024 * 1024;
          return acc + n;
        }, 0);
        const sizeStr = totalSize > 1024 * 1024
          ? `${(totalSize / 1024 / 1024).toFixed(1)} MB`
          : totalSize > 1024
          ? `${(totalSize / 1024).toFixed(1)} KB`
          : `${totalSize.toFixed(0)} B`;
        const times = requests.map((r) => parseFloat(r.time)).filter((n) => !isNaN(n) && n > 0);
        const avgTime = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
        const errCount = requests.filter((r) => r.status >= 400).length;
        return (
          <div className="h-6 border-t border-divider flex items-center px-3 gap-4 bg-table-headerBg text-[10px] text-text-secondary select-none shrink-0">
            <span>{requests.length} requests</span>
            <span className="text-divider">|</span>
            <span>{httpsCount} HTTPS</span>
            <span className="text-divider">|</span>
            <span>{sizeStr} transferred</span>
            <span className="text-divider">|</span>
            <span>{avgTime > 0 ? `${avgTime}ms avg` : '—'}</span>
            {errCount > 0 && (
              <>
                <span className="text-divider">|</span>
                <span className="text-red-400">{errCount} errors</span>
              </>
            )}
            {filteredRequests.length !== requests.length && (
              <>
                <span className="text-divider">|</span>
                <span className="text-warning">{filteredRequests.length} shown</span>
              </>
            )}
          </div>
        );
      })()}

      <SSLBypassModal
        isOpen={isSSLBypassModalOpen}
        onClose={() => setIsSSLBypassModalOpen(false)}
        onConfirm={handleConfirmSSLBypass}
        defaultValue={targetPackage}
        packages={installedPackages}
      />

      <SaveProfileModal
        isOpen={isSaveProfileModalOpen}
        onClose={() => setIsSaveProfileModalOpen(false)}
        defaultName={`${appName} - ${new Date().toLocaleString()}`}
        onSave={(name) => {
          createProfile(name, appName, selectedApp, requests, filter, selectedId, platform);
          setIsSaveProfileModalOpen(false);
        }}
      />
    </div>
  );
}
