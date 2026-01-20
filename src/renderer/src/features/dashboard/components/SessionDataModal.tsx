import { X, Cookie, Shield, HardDrive } from 'lucide-react';

interface CookieInfo {
  name: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  expirationDate?: number;
}

interface SessionData {
  cookieCount: number;
  storagePath?: string;
  partition: string;
  cookies: CookieInfo[];
}

interface SessionDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  appName: string;
  data: SessionData | null;
}

export function SessionDataModal({ isOpen, onClose, appName, data }: SessionDataModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Cookie className="w-5 h-5 text-blue-400" />
              Session Data: {appName}
            </h3>
            <p className="text-sm text-gray-400 mt-1">
              Active cookies and storage information for this website profile.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <Cookie className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Cookies</span>
              </div>
              <div className="text-2xl font-bold text-white">{data?.cookieCount || 0}</div>
            </div>
            <div className="p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
              <div className="flex items-center gap-2 text-gray-400 mb-1">
                <HardDrive className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Partition</span>
              </div>
              <div className="text-sm font-mono text-blue-400 truncate" title={data?.partition}>
                {data?.partition}
              </div>
            </div>
          </div>

          {/* Cookies List */}
          <div>
            <h4 className="text-sm font-bold text-gray-400 mb-3 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Active Cookies
            </h4>
            <div className="space-y-2">
              {data?.cookies && data.cookies.length > 0 ? (
                data.cookies.map((cookie, i) => (
                  <div
                    key={i}
                    className="p-3 bg-gray-800/30 border border-gray-800 rounded-lg hover:border-gray-700 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-blue-300 truncate">{cookie.name}</div>
                        <div className="text-[10px] text-gray-500 font-mono truncate">
                          {cookie.domain}
                          {cookie.path}
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        {cookie.secure && (
                          <span className="px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 text-[10px] border border-green-500/20">
                            Secure
                          </span>
                        )}
                        {cookie.httpOnly && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[10px] border border-blue-500/20">
                            HttpOnly
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-600 italic">No cookies found</div>
              )}
            </div>
          </div>

          {/* Storage Path */}
          {data?.storagePath && (
            <div className="p-4 bg-gray-950/50 rounded-xl border border-gray-800">
              <div className="text-xs font-bold text-gray-500 mb-2 uppercase">Storage Location</div>
              <div className="text-[10px] font-mono text-gray-400 break-all bg-black/30 p-2 rounded">
                {data.storagePath}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-800 flex justify-end bg-gray-900/50">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 transition-all shadow-lg shadow-blue-900/20"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
