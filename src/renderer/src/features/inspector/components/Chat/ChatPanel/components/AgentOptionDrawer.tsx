import { X, Shield, Zap, Power, Ban } from 'lucide-react';
import { useEffect, useState } from 'react';

export type ToolPermission = 'always' | 'auto' | 'off';

interface AgentOptionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  permissions: Record<string, ToolPermission>;
  onPermissionChange: (tool: string, value: ToolPermission) => void;
}

const TOOLS = [
  { id: 'list_requests', label: 'List Requests', description: 'Fetch recent network logs' },
  { id: 'search_requests', label: 'Search Requests', description: 'Filter by query/path' },
  { id: 'get_request_details', label: 'Get Details', description: 'Inspect headers & body' },
  { id: 'set_filter', label: 'Set Filter', description: 'Apply active view filters' },
  { id: 'export_har', label: 'Export HAR', description: 'Download traffic dumps' },
  { id: 'generate_table', label: 'Generate Table', description: 'Create data tables' },
];

export function AgentOptionDrawer({
  isOpen,
  onClose,
  permissions,
  onPermissionChange,
}: AgentOptionDrawerProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300); // Animation duration
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isOpen]);

  if (!isVisible && !isOpen) return null;

  return (
    <div
      className={`absolute inset-x-0 bottom-0 z-50 flex flex-col transition-transform duration-300 ease-in-out ${isOpen ? 'translate-y-0' : 'translate-y-full'}`}
    >
      {/* Backdrop (invisible but blocks clicks? Or maybe just the drawer itself) */}
      <div className="bg-background border-t border-border shadow-2xl rounded-t-xl overflow-hidden flex flex-col max-h-[80%] w-full">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-semibold">Agent Capabilities</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-md transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="overflow-y-auto p-4 space-y-3">
          {TOOLS.map((tool) => {
            const current = permissions[tool.id] || 'off'; // Default to off

            return (
              <div
                key={tool.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-card hover:bg-muted/10 transition-colors"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium font-mono">{tool.label}</span>
                  <span className="text-xs text-muted-foreground">{tool.description}</span>
                </div>

                <div className="flex items-center bg-muted/20 rounded-lg p-1 border border-border/30">
                  {/* OFF */}
                  <button
                    onClick={() => onPermissionChange(tool.id, 'off')}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all ${
                      current === 'off'
                        ? 'bg-destructive/10 text-destructive shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Disable Tool"
                  >
                    <Ban className="w-3 h-3" />
                    Off
                  </button>

                  <div className="w-px h-4 bg-border/40 mx-1" />

                  {/* AUTO (Ask) */}
                  <button
                    onClick={() => onPermissionChange(tool.id, 'auto')}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all ${
                      current === 'auto'
                        ? 'bg-orange-500/10 text-orange-500 shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Require Approval"
                  >
                    <Power className="w-3 h-3" />
                    Auto
                  </button>

                  <div className="w-px h-4 bg-border/40 mx-1" />

                  {/* ALWAYS */}
                  <button
                    onClick={() => onPermissionChange(tool.id, 'always')}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-all ${
                      current === 'always'
                        ? 'bg-emerald-500/10 text-emerald-500 shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                    title="Always Allow"
                  >
                    <Zap className="w-3 h-3" />
                    Always
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
