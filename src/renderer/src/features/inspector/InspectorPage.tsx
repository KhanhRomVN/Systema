import { InspectorLayout } from './components/InspectorLayout';
import Dashboard from '../../features/dashboard';
import { useState, useEffect, useCallback } from 'react';
import { NetworkRequest } from './types';
import { InspectorProfile } from './utils/profiles';
import { generateRequestAnalysis } from './utils/analysisGenerator';
import { SSLBypassModal } from './components/SSLBypassModal';
import React from 'react';

export default function InspectorPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [selectedApp, setSelectedApp] = useState<string>('VSCode');
  const [currentAppName, setCurrentAppName] = useState<string>('VSCode');
  const [requests, setRequests] = useState<NetworkRequest[]>([]);
  const [platform, setPlatform] = useState<'web' | 'pc' | 'android' | undefined>();
  const [fridaStatus, setFridaStatus] = useState<
    'running' | 'installed' | 'not_installed' | 'unknown'
  >('unknown');
  const [targetPackage, setTargetPackage] = useState<string>('');
  const [emulatorSerial, setEmulatorSerial] = useState<string>('');
  const [isSSLBypassModalOpen, setIsSSLBypassModalOpen] = useState(false);

  // Track auto-start attempts to prevent infinite loops
  const autoStartAttempted = React.useRef<Set<string>>(new Set());

  const handleLoadProfile = useCallback((profile: InspectorProfile) => {
    // Restore state from profile
    setRequests(profile.requests);
    setSelectedApp(profile.appId || profile.appName);
    setCurrentAppName(profile.appName);
    setPlatform(profile.metadata.platform);
    setIsScanning(true);
    // Check platform and Frida status when app changes
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
          setCurrentAppName(app.name);
          setPlatform(app.platform);
          // If Android and using emulator serial as name
          if (app.platform === 'android' && app.emulatorSerial) {
            const serial = app.emulatorSerial;
            setEmulatorSerial(serial);
            // console.log('[Inspector] 🔍 Checking Frida status for:', serial);
            const status = await window.api.invoke('mobile:check-frida', serial);
            // console.log('[Inspector] Frida status?', status);
            setFridaStatus(status);

            // Auto-Start Logic (Silent)
            if (status === 'installed' && !autoStartAttempted.current.has(serial)) {
              console.log('[Inspector] 🚀 Auto-starting Frida server...');
              autoStartAttempted.current.add(serial);

              // Call API directly for silent auto-start
              window.api.invoke('mobile:start-frida', serial).then(async () => {
                // Re-check status after start attempt
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
      alert('Frida Server installed successfully.');
      // Re-check status
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
      // Re-check status
      const status = await window.api.invoke('mobile:check-frida', app.emulatorSerial);
      setFridaStatus(status);
    } catch (e) {
      console.error('Failed to start Frida', e);
      alert('Failed to start Frida');
    }
  };

  const [installedPackages, setInstalledPackages] = useState<string[]>([]);

  const handleInjectBypass = async () => {
    console.log('[Inspector] 🔍 SSL Bypass button clicked!');

    if (platform !== 'android') {
      console.log('[Inspector] ❌ Not Android platform, aborting');
      return;
    }

    // Fetch packages if not already fetched
    if (emulatorSerial) {
      try {
        console.log('[Inspector] 📦 Fetching installed packages...');
        const packages = await window.api.invoke('mobile:list-packages', emulatorSerial);
        if (Array.isArray(packages)) {
          setInstalledPackages(packages.sort());
        }
      } catch (e) {
        console.error('Failed to list packages', e);
      } finally {
      }
    }

    console.log('[Inspector] 💬 Opening SSL Bypass modal...');
    setIsSSLBypassModalOpen(true);
  };

  const handleConfirmSSLBypass = async (packageName: string) => {
    console.log('[Inspector] 🚀 Confirmed package name:', packageName);
    setTargetPackage(packageName);

    if (!emulatorSerial) {
      console.log('[Inspector] ❌ No emulator serial found');
      alert('Error: No device serial found');
      return;
    }

    try {
      console.log('[Inspector] 🚀 Sending injection command for:', packageName);
      await window.api.invoke('mobile:inject-ssl-bypass', emulatorSerial, packageName);
      alert(
        `✅ SSL Bypass injection started for ${packageName}\n\nCheck console/terminal for Frida output.`,
      );
      console.log('[Inspector] ✅ Injection command sent successfully');
    } catch (e) {
      console.error('[Inspector] ❌ Failed to inject bypass:', e);
      alert('❌ Failed to inject bypass. Check console for details.');
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

      // Check if this is an Android device and configure proxy automatically
      const allApps: any[] = await window.api.invoke('apps:get-all');
      const app = allApps.find((a) => a.id === appName);

      if (app?.platform === 'android' && app?.emulatorSerial) {
        console.log(`[Inspector] 📱 Configuring proxy for Android device ${app.emulatorSerial}`);

        // Configure device to route all traffic through proxy
        const configured = await window.api.invoke(
          'mobile:configure-proxy',
          app.emulatorSerial,
          '127.0.0.1',
          port,
          app.name, // Pass app name as fallback for stale serials
        );

        if (!configured) {
          console.error('[Inspector] ❌ Failed to configure proxy on device');
          alert(
            'Failed to configure proxy on device.\nHTTPS tracking may not work.\n\nPlease ensure the device is connected and ADB is working.',
          );
        } else {
          console.log(`[Inspector] ✅ Proxy configured on device -> 127.0.0.1:${port}`);
        }
      }

      const launched = await window.api.invoke(
        'app:launch',
        appName,
        dynamicProxyUrl,
        customUrl,
        mode,
      );

      if (launched) {
        setIsScanning(true);
        setSelectedApp(appName); // appName here is ACTUALLY the ID passed from Dashboard
        // We'll let the useEffect resolve the name, or we can fetch it here.
        // But useEffect is safer as it handles initial state too.
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
      // Clear proxy from Android device if applicable
      const allApps: any[] = await window.api.invoke('apps:get-all');
      const app = allApps.find((a) => a.id === selectedApp);

      if (app?.platform === 'android' && app?.emulatorSerial) {
        console.log(`[Inspector] 🧹 Clearing proxy from ${app.emulatorSerial}`);
        await window.api.invoke('mobile:clear-proxy', app.emulatorSerial, app.name);
      }

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

  const handleInstallCert = async () => {
    if (platform !== 'android') return;
    const allApps: any[] = await window.api.invoke('apps:get-all');
    const app = allApps.find((a) => a.id === selectedApp);
    if (!app?.emulatorSerial) return;

    if (
      !confirm(
        'This will try to install the Proxy CA Certificate to the device system store.\n\nRequirements:\n- Device must be rooted (adb root)\n- System partition must be writable\n\nContinue?',
      )
    ) {
      return;
    }

    try {
      alert('Installing Certificate... check console for progress.');
      const success = await window.api.invoke('mobile:install-ca-cert', app.emulatorSerial);

      if (success) {
        alert('Certificate installed successfully! You may need to restart the app or device.');
      } else {
        alert('Certificate installation fail or partial. Check console logs.');
      }
    } catch (e) {
      console.error('Failed to install cert', e);
      alert('Failed to install cert');
    }
  };

  if (!isScanning) {
    return <Dashboard onSelect={handleSelectApp} onLoadProfile={handleLoadProfile} />;
  }

  return (
    <div className="h-screen w-screen bg-background">
      <InspectorLayout
        onBack={handleBack}
        requests={requests}
        appName={currentAppName || selectedApp} // Display Name
        appId={selectedApp} // ID
        onDelete={handleDeleteRequest}
        platform={platform}
        fridaStatus={fridaStatus}
        onInstallFrida={handleInstallFrida}
        onStartFrida={handleStartFrida}
        onInjectBypass={handleInjectBypass}
        onInstallCert={handleInstallCert}
        emulatorSerial={emulatorSerial}
      />

      <SSLBypassModal
        isOpen={isSSLBypassModalOpen}
        onClose={() => setIsSSLBypassModalOpen(false)}
        onConfirm={handleConfirmSSLBypass}
        defaultValue={targetPackage}
        packages={installedPackages}
      />
    </div>
  );
}
