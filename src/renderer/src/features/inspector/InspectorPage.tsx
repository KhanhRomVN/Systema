import { InspectorLayout } from './components/InspectorLayout';
import Dashboard from '../../features/dashboard';
import { useState, useEffect, useCallback } from 'react';
import { NetworkRequest } from './types';
import { InspectorProfile } from './utils/profiles';
import { generateRequestAnalysis } from './utils/analysisGenerator';

export default function InspectorPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [selectedApp, setSelectedApp] = useState<string>('VSCode');
  const [requests, setRequests] = useState<NetworkRequest[]>([]);
  const [platform, setPlatform] = useState<'web' | 'pc' | 'android' | undefined>();
  const [fridaStatus, setFridaStatus] = useState<'running' | 'stopped' | 'unknown'>('unknown');
  const [targetPackage, setTargetPackage] = useState<string>('');
  const [emulatorSerial, setEmulatorSerial] = useState<string>('');

  const handleLoadProfile = useCallback((profile: InspectorProfile) => {
    // Restore state from profile
    setRequests(profile.requests);
    setSelectedApp(profile.appName);
    setPlatform(profile.metadata.platform);
    setIsScanning(true);
    // Note: We don't launch proxy/app here, just viewing the static data
  }, []);

  // Check platform and Frida status when app changes
  useEffect(() => {
    if (!isScanning || !selectedApp) return;

    const checkStatus = async () => {
      try {
        // Get app details to know platform
        const allApps: any[] = await window.api.invoke('apps:get-all');
        const app = allApps.find((a) => a.id === selectedApp);
        if (app) {
          setPlatform(app.platform);
          // If Android and using emulator serial as name
          if (app.platform === 'android' && app.emulatorSerial) {
            const serial = app.emulatorSerial;
            setEmulatorSerial(serial);
            const isRunning = await window.api.invoke('mobile:check-frida', serial);
            setFridaStatus(isRunning ? 'running' : 'stopped');
          }
        }
      } catch (e) {
        console.error('Failed to check app/frida status', e);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000); // Poll status
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
      alert('Frida Server installed (check console for details).');
      // Re-check status
      const isRunning = await window.api.invoke('mobile:check-frida', app.emulatorSerial);
      setFridaStatus(isRunning ? 'running' : 'stopped');
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
      // Re-check status
      const isRunning = await window.api.invoke('mobile:check-frida', app.emulatorSerial);
      setFridaStatus(isRunning ? 'running' : 'stopped');
    } catch (e) {
      console.error('Failed to start Frida', e);
      alert('Failed to start Frida');
    }
  };

  const handleInjectBypass = async () => {
    if (platform !== 'android') return;
    const allApps: any[] = await window.api.invoke('apps:get-all');
    const app = allApps.find((a) => a.id === selectedApp);
    if (!app?.emulatorSerial) return;

    const pkg = prompt(
      'Enter Android Package Name to inject (e.g. com.example.app):',
      targetPackage,
    );
    if (!pkg) return;
    setTargetPackage(pkg);

    try {
      await window.api.invoke('mobile:inject-ssl-bypass', app.emulatorSerial, pkg);
      alert(`Injection command sent for ${pkg}. Check logs.`);
    } catch (e) {
      console.error('Failed to inject bypass', e);
      alert('Failed to inject bypass');
    }
  };

  // Use useCallback to maintain stable function references
  const handleRequest = useCallback((_: any, data: any) => {
    const newRequest: NetworkRequest = {
      id: data.id || Math.random().toString(36).substr(2, 9),
      method: data.method,
      protocol: data.protocol || 'https',
      host: new URL(data.url).hostname,
      path: new URL(data.url).pathname + new URL(data.url).search,
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
      if (prev.some((req) => req.id === newRequest.id)) {
        return prev;
      }
      return [{ ...newRequest, analysis }, ...prev];
    });
  }, []);

  const handleRequestBody = useCallback((_: any, data: any) => {
    setRequests((prev) =>
      prev.map((req) => {
        if (req.id === data.id) {
          const updatedReq = {
            ...req,
            requestBody: data.body,
          };
          const analysis = generateRequestAnalysis(updatedReq);
          return { ...updatedReq, analysis };
        }
        return req;
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
            type: type,
            time: `${Date.now() - req.timestamp}ms`,
            responseHeaders: data.headers || {},
          };
          const analysis = generateRequestAnalysis(updatedReq);
          return { ...updatedReq, analysis };
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
          const analysis = generateRequestAnalysis(reqWithStatus);
          return { ...reqWithStatus, analysis };
        }
        return req;
      }),
    );
  }, []);

  const handleResponseBody = useCallback((_: any, data: any) => {
    setRequests((prev) =>
      prev.map((req) => {
        if (req.id === data.id) {
          const reqWithBody = {
            ...req,
            responseBody: data.body,
            size: data.size || req.size,
            isBinary: data.isBinary,
            contentType: data.contentType,
          };
          const analysis = generateRequestAnalysis(reqWithBody);
          return { ...reqWithBody, analysis };
        }
        return req;
      }),
    );
  }, []);

  useEffect(() => {
    if (!isScanning) return;

    console.log('[Inspector] 🔌 Attaching event listeners');
    window.api.on('proxy:request', handleRequest);
    window.api.on('proxy:request-body', handleRequestBody);
    window.api.on('proxy:response', handleResponse);
    window.api.on('proxy:response-body', handleResponseBody);

    return () => {
      console.log('[Inspector] 🔌 Detaching event listeners');
      window.api.off('proxy:request', handleRequest);
      window.api.off('proxy:request-body', handleRequestBody);
      window.api.off('proxy:response', handleResponse);
      window.api.off('proxy:response-body', handleResponseBody);
      window.api.invoke('app:terminate').catch(console.error);
    };
  }, [isScanning, handleRequest, handleRequestBody, handleResponse, handleResponseBody]);

  const handleSelectApp = async (
    appName: string,
    _proxyUrl: string,
    customUrl?: string,
    mode?: 'browser' | 'electron',
  ) => {
    try {
      // Request dynamic session from backend
      const port = await window.api.invoke('proxy:create-session', appName);
      const dynamicProxyUrl = `http://127.0.0.1:${port}`;

      console.log(`[Inspector] Starting session for ${appName} on port ${port}`);

      const launched = await window.api.invoke(
        'app:launch',
        appName,
        dynamicProxyUrl,
        customUrl,
        mode,
      );

      if (launched) {
        setIsScanning(true);
        setSelectedApp(appName);
        setRequests([]); // Clear previous session
      } else {
        console.error('[Inspector] ❌ Failed to launch app');
      }
    } catch (error) {
      console.error('[Inspector] ❌ Error starting proxy or launching app:', error);
    }
  };

  const handleBack = async () => {
    try {
      await window.api.invoke('proxy:stop');
      await window.api.invoke('app:terminate');
    } catch (error) {
      console.error('Error stopping proxy:', error);
    }
    setIsScanning(false);
  };

  const handleDeleteRequest = (id: string) => {
    setRequests((prev) => prev.filter((req) => req.id !== id));
  };

  if (!isScanning) {
    return <Dashboard onSelect={handleSelectApp} onLoadProfile={handleLoadProfile} />;
  }

  return (
    <div className="h-screen w-screen bg-background">
      <InspectorLayout
        onBack={handleBack}
        requests={requests}
        appName={selectedApp}
        onDelete={handleDeleteRequest}
        platform={platform}
        fridaStatus={fridaStatus}
        onInstallFrida={handleInstallFrida}
        onStartFrida={handleStartFrida}
        onInjectBypass={handleInjectBypass}
        emulatorSerial={emulatorSerial}
      />
    </div>
  );
}
