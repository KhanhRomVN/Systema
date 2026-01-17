import React, { useState, useEffect } from 'react';
import { X, Loader2, QrCode, Wifi, Check, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface ConnectDeviceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: () => void; // Callback after successful connection
}

export const ConnectDeviceModal: React.FC<ConnectDeviceModalProps> = ({
  isOpen,
  onClose,
  onConnect,
}) => {
  const [activeTab, setActiveTab] = useState<'qrcode' | 'wireless'>('qrcode');
  const [isLoading, setIsLoading] = useState(false);

  // QR Code State
  const [qrData, setQrData] = useState<{ qrCode: string; setupUrl: string } | null>(null);

  // Wireless State
  const [ip, setIp] = useState('');
  const [port, setPort] = useState('5555');
  const [connectError, setConnectError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadQrCode();
    }
  }, [isOpen]);

  const loadQrCode = async () => {
    setIsLoading(true);
    try {
      const data = await window.api.invoke('mobile:get-qr-code');
      setQrData(data);
    } catch (e) {
      console.error('Failed to get QR Code', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWirelessConnect = async () => {
    if (!ip || !port) return;
    setIsLoading(true);
    setConnectError('');
    try {
      const result = await window.api.invoke('mobile:connect-wireless', ip, port);
      if (result.success) {
        onConnect();
        onClose();
      } else {
        setConnectError(result.error || result.message || 'Failed to connect');
      }
    } catch (e: any) {
      setConnectError(e.message || 'Connection failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between bg-gray-900">
          <div>
            <h3 className="text-xl font-bold text-white">Connect Device</h3>
            <p className="text-sm text-gray-400 mt-1">Connect a real Android device.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          <button
            onClick={() => setActiveTab('qrcode')}
            className={cn(
              'flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors border-b-2',
              activeTab === 'qrcode'
                ? 'border-blue-500 text-blue-400 bg-gray-800/50'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/30',
            )}
          >
            <QrCode className="w-4 h-4" />
            QR Code / Proxy
          </button>
          <button
            onClick={() => setActiveTab('wireless')}
            className={cn(
              'flex-1 py-3 text-sm font-medium flex items-center justify-center gap-2 transition-colors border-b-2',
              activeTab === 'wireless'
                ? 'border-blue-500 text-blue-400 bg-gray-800/50'
                : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-gray-800/30',
            )}
          >
            <Wifi className="w-4 h-4" />
            Wireless ADB
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 bg-gray-950/50 min-h-[300px] flex flex-col items-center justify-center">
          {activeTab === 'qrcode' && (
            <div className="flex flex-col items-center text-center space-y-4 w-full">
              {isLoading || !qrData ? (
                <div className="py-10 flex flex-col items-center">
                  <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-2" />
                  <p className="text-gray-500">Generating QR Code...</p>
                </div>
              ) : (
                <>
                  <div className="bg-white p-4 rounded-xl shadow-lg">
                    <img src={qrData.qrCode} alt="QR Code" className="w-48 h-48" />
                  </div>
                  <p className="text-sm text-gray-400">
                    Scan to download CA Certificate
                    <br />
                    and configure proxy.
                  </p>
                  <div className="bg-gray-900 rounded-lg px-3 py-2 border border-gray-800 text-xs font-mono text-gray-300 break-all">
                    {qrData.setupUrl}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'wireless' && (
            <div className="w-full space-y-4">
              <p className="text-sm text-gray-400 text-center mb-4">
                Ensure device is on the same network and
                <br />
                ADB over TCP/IP is enabled (port 5555).
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Device IP Address
                </label>
                <div className="relative">
                  <Wifi className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <input
                    type="text"
                    value={ip}
                    onChange={(e) => setIp(e.target.value)}
                    placeholder="192.168.1.x"
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-4 py-3 text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Port
                </label>
                <input
                  type="text"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="5555"
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 outline-none font-mono"
                />
              </div>

              {connectError && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2 text-sm text-red-400">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{connectError}</span>
                </div>
              )}

              <button
                onClick={handleWirelessConnect}
                disabled={isLoading || !ip || !port}
                className="w-full mt-4 flex items-center justify-center py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/20"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Connect
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
