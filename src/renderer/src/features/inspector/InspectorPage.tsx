import { InspectorLayout } from './components/InspectorLayout';
import { AppSelector } from '../../components/AppSelector';
import { useState, useEffect } from 'react';
import { NetworkRequest } from './types';
import { generateRequestAnalysis } from './utils/analysisGenerator';

export default function InspectorPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [selectedApp, setSelectedApp] = useState<string>('VSCode');
  const [requests, setRequests] = useState<NetworkRequest[]>([]);

  useEffect(() => {
    if (!isScanning) return;

    const handleRequest = (_: any, data: any) => {
      const newRequest: NetworkRequest = {
        id: data.id || Math.random().toString(36).substr(2, 9), // Use ID from proxy if available
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
        requestBody: '',
        responseBody: '',
      };
      // Generate initial analysis
      const analysis = generateRequestAnalysis(newRequest);
      setRequests((prev) => {
        // Prevent duplicates if same ID comes through (e.g. IPC echo)
        if (prev.some((req) => req.id === newRequest.id)) {
          return prev;
        }
        return [{ ...newRequest, analysis }, ...prev];
      });
    };

    const handleRequestBody = (_: any, data: any) => {
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
    };

    const handleResponse = (_: any, data: any) => {
      setRequests((prev) =>
        prev.map((req) => {
          // Use ID for matching if available
          if (req.id === data.id) {
            const contentType = data.headers
              ? data.headers['content-type'] || data.headers['Content-Type'] || ''
              : '';
            const url = req.path; // Or use full URL if available in req, but we have path.

            // Determine Type
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
              // Fallback to extension check if content-type is generic or missing
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
                type = 'XHR'; // Assume API call
            }

            const updatedReq = {
              ...req,
              status: data.statusCode,
              type: type,
              // size and time will be updated in response body or completion
              time: `${Date.now() - req.timestamp}ms`,
              responseHeaders: data.headers || {},
            };
            const analysis = generateRequestAnalysis(updatedReq);
            return { ...updatedReq, analysis };
          }
          // Fallback mechanism (should not be needed with IDs)
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
            // Generate analysis for the new requested with updated status
            const analysis = generateRequestAnalysis(reqWithStatus);
            return { ...reqWithStatus, analysis };
          }
          return req;
        }),
      );
    };

    const handleResponseBody = (_: any, data: any) => {
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
            // Generate analysis with full body data
            const analysis = generateRequestAnalysis(reqWithBody);
            return { ...reqWithBody, analysis };
          }
          return req;
        }),
      );
    };

    window.api.on('proxy:request', handleRequest);
    window.api.on('proxy:request-body', handleRequestBody);
    window.api.on('proxy:response', handleResponse);
    window.api.on('proxy:response-body', handleResponseBody);

    return () => {
      window.api.off('proxy:request', handleRequest);
      window.api.off('proxy:request-body', handleRequestBody);
      window.api.off('proxy:response', handleResponse);
      window.api.off('proxy:response-body', handleResponseBody);
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
        setSelectedApp(appName);
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
      <InspectorLayout onBack={handleBack} requests={requests} appName={selectedApp} />
    </div>
  );
}
