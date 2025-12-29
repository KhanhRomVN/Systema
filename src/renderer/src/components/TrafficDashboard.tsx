import React, { useState, useEffect } from 'react';

interface RequestLog {
  id: string;
  method: string;
  url: string;
  statusCode?: number;
  headers: any;
  timestamp: number;
  bodyChunks?: string[];
}

interface TrafficDashboardProps {
  onBack: () => void;
}

export const TrafficDashboard: React.FC<TrafficDashboardProps> = ({ onBack }) => {
  const [logs, setLogs] = useState<RequestLog[]>([]);
  const [selectedLogId, setSelectedLogId] = useState<string | null>(null);

  useEffect(() => {
    // Listen for IPC events
    const handleRequest = (_: any, data: any) => {
      setLogs((prev) => [...prev, { ...data, bodyChunks: [] }]);
    };

    // In a real app we would match responses to requests by ID.
    // For this MVP, we might receive them separately.
    // However, the proxy logs showed we get request then response.
    // We'll simplify: just list them as they come for now,
    // or try to find the last matching request for the URL.
    const handleResponse = (_: any, data: any) => {
      setLogs((prev) =>
        prev.map((log) => {
          if (log.url === data.url && !log.statusCode) {
            // Simple matching heuristic
            return { ...log, statusCode: data.statusCode };
          }
          return log;
        }),
      );
    };

    window.api.on('proxy:request', handleRequest);
    window.api.on('proxy:response', handleResponse);

    return () => {
      window.api.off('proxy:request', handleRequest);
      window.api.off('proxy:response', handleResponse);
    };
  }, []);

  const selectedLog = logs.find((l) => l.id === selectedLogId);

  return (
    <div className="flex flex-col h-screen bg-gray-900 text-white">
      {/* Toolbar */}
      <div className="h-12 bg-gray-800 border-b border-gray-700 flex items-center px-4 space-x-4">
        <button onClick={onBack} className="text-gray-400 hover:text-white">
          &larr; Back
        </button>
        <h1 className="font-semibold">Live Traffic</h1>
        <div className="flex-1"></div>
        <span className="text-xs text-gray-500">{logs.length} requests captured</span>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Pane: Table */}
        <div className="w-1/2 border-r border-gray-700 flex flex-col">
          <div className="bg-gray-800 text-xs font-bold text-gray-400 py-2 px-4 flex">
            <div className="w-16">Method</div>
            <div className="flex-1">URL</div>
            <div className="w-16">Status</div>
          </div>
          <div className="flex-1 overflow-auto">
            {logs.map((log, idx) => (
              <div
                key={idx}
                className={`flex py-2 px-4 text-sm border-b border-gray-800 cursor-pointer hover:bg-gray-800 ${selectedLogId === log.id ? 'bg-blue-900' : ''}`}
                onClick={() => setSelectedLogId(log.id)}
              >
                <div className={`w-16 font-mono font-bold ${getMethodColor(log.method)}`}>
                  {log.method}
                </div>
                <div className="flex-1 truncate pr-4 text-gray-300" title={log.url}>
                  {log.url}
                </div>
                <div className={`w-16 ${getStatusColor(log.statusCode)}`}>
                  {log.statusCode || '...'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Pane: Details */}
        <div className="w-1/2 flex flex-col bg-gray-900">
          {selectedLog ? (
            <div className="flex-1 overflow-auto p-4">
              <h2 className="text-lg font-bold mb-4 break-all">{selectedLog.url}</h2>

              <div className="mb-4">
                <h3 className="text-xs uppercase font-bold text-gray-500 mb-2">Request Headers</h3>
                <pre className="bg-gray-800 p-2 rounded text-xs overflow-auto max-h-40">
                  {JSON.stringify(selectedLog.headers, null, 2)}
                </pre>
              </div>

              {/* Placeholder for Response/Body details since we just have basic logs now */}
              <div className="mb-4">
                <h3 className="text-xs uppercase font-bold text-gray-500 mb-2">Details</h3>
                <p className="text-sm text-gray-400">
                  Timestamp: {new Date(selectedLog.timestamp).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-600">
              Select a request to view details
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function getMethodColor(method: string) {
  switch (method) {
    case 'GET':
      return 'text-blue-400';
    case 'POST':
      return 'text-green-400';
    case 'PUT':
      return 'text-orange-400';
    case 'DELETE':
      return 'text-red-400';
    default:
      return 'text-gray-400';
  }
}

function getStatusColor(status?: number) {
  if (!status) return 'text-gray-500';
  if (status >= 200 && status < 300) return 'text-green-400';
  if (status >= 300 && status < 400) return 'text-yellow-400';
  if (status >= 400) return 'text-red-400';
  return 'text-gray-400';
}
