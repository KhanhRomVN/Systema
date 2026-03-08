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
      <div className="bg-dialog-background border border-divider rounded-2xl w-full max-w-2xl overflow-hidden shadow-dialogShadow flex flex-col max-h-[80vh]">
        <div className="p-6 border-b border-divider flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2 text-text-primary">
              <Cookie className="w-5 h-5 text-primary" />
              Session Data: {appName}
            </h3>
            <p className="text-sm text-text-secondary mt-1">
              Active cookies and storage information for this website profile.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-sidebar-itemHover rounded-lg text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-secondary rounded-xl border border-divider">
              <div className="flex items-center gap-2 text-text-secondary mb-1">
                <Cookie className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Cookies</span>
              </div>
              <div className="text-2xl font-bold text-text-primary">{data?.cookieCount || 0}</div>
            </div>
            <div className="p-4 bg-secondary rounded-xl border border-divider">
              <div className="flex items-center gap-2 text-text-secondary mb-1">
                <HardDrive className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Partition</span>
              </div>
              <div className="text-sm font-mono text-primary truncate" title={data?.partition}>
                {data?.partition}
              </div>
            </div>
          </div>

          {/* Cookies List */}
          <div>
            <h4 className="text-sm font-bold text-text-secondary mb-3 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Active Cookies
            </h4>
            <div className="space-y-2">
              {data?.cookies && data.cookies.length > 0 ? (
                data.cookies.map((cookie, i) => (
                  <div
                    key={i}
                    className="p-3 bg-secondary/30 border border-divider rounded-lg hover:border-divider transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-primary truncate">{cookie.name}</div>
                        <div className="text-[10px] text-text-secondary font-mono truncate">
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
                <div className="text-center py-8 text-text-secondary italic">No cookies found</div>
              )}
            </div>
          </div>

          {/* Storage Path */}
          {data?.storagePath && (
            <div className="p-4 bg-background/50 rounded-xl border border-divider">
              <div className="text-xs font-bold text-text-secondary mb-2 uppercase">
                Storage Location
              </div>
              <div className="text-[10px] font-mono text-text-secondary break-all bg-black/30 p-2 rounded">
                {data.storagePath}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-divider flex justify-end bg-sidebar-itemHover/50">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg text-sm font-bold text-button-text bg-primary hover:bg-primary/90 transition-all shadow-dialogShadow"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
