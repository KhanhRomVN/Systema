import { InspectorLayout } from './components/InspectorLayout';
import { AppSelector } from '../../components/AppSelector';
import { useState, useEffect } from 'react';
import { NetworkRequest } from './types';

export default function InspectorPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [requests, setRequests] = useState<NetworkRequest[]>([]);

  useEffect(() => {
    if (!isScanning) return;

    const handleRequest = (_: any, data: any) => {
      // data from proxy wrapper is raw, need to map to NetworkRequest
      const newRequest: NetworkRequest = {
        id: data.id || Math.random().toString(36).substr(2, 9),
        method: data.method,
        protocol: data.protocol || 'https', // Assuming HTTPS proxy primarily
        host: new URL(data.url).hostname,
        path: new URL(data.url).pathname + new URL(data.url).search,
        status: 0, // Pending
        type: 'Pending', // Determine based on response content-type later
        size: '0 B',
        time: 'Pending',
        timestamp: data.timestamp || Date.now(),
        requestHeaders: data.headers || {},
        responseHeaders: {},
        requestBody: '', // Body extraction might need more logic
        responseBody: '',
      };
      setRequests((prev) => [newRequest, ...prev]);
    };

    const handleResponse = (_: any, data: any) => {
      setRequests((prev) =>
        prev.map((req) => {
          // Heuristic matching: same URL and no status yet
          // Ideally, the proxy should send a unique ID with both request and response
          if (
            req.id === data.id ||
            (req.path === new URL(data.url).pathname + new URL(data.url).search && req.status === 0)
          ) {
            return {
              ...req,
              status: data.statusCode,
              type: 'XHR', // Placeholder, refine logic
              size: '1.2 KB', // Placeholder, need actual size
              time: `${Date.now() - req.timestamp}ms`,
              responseHeaders: data.headers || {},
              responseBody: '', // Need body capturing logic
            };
          }
          return req;
        }),
      );
    };

    window.api.on('proxy:request', handleRequest);
    window.api.on('proxy:response', handleResponse);

    return () => {
      window.api.off('proxy:request', handleRequest);
      window.api.off('proxy:response', handleResponse);
      // Ensure app is terminated if component unmounts while scanning
      window.api.invoke('app:terminate');
    };
  }, [isScanning]);

  const handleSelectApp = async (appName: string, proxyUrl: string) => {
    try {
      await window.api.invoke('proxy:start', 8081);
      const launched = await window.api.invoke('app:launch', appName, proxyUrl);
      if (launched) {
        setIsScanning(true);
        setRequests([]); // Clear previous session
      } else {
        console.error('Failed to launch app');
      }
    } catch (error) {
      console.error('Error starting proxy or launching app:', error);
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

  if (!isScanning) {
    return <AppSelector onSelect={handleSelectApp} />;
  }

  return (
    <div className="h-screen w-screen bg-background">
      <InspectorLayout onBack={handleBack} requests={requests} />
    </div>
  );
}
