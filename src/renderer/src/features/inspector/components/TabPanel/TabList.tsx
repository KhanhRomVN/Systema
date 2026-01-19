import { Activity, Zap, Folder } from 'lucide-react';
import { cn } from '../../../../shared/lib/utils';

export interface ChatSession {
  id: string;
  title: string;
  timestamp: number;
  messageCount: number;
  preview: string;
  status?: 'free' | 'busy' | 'sleep';
  provider?: string;
  requestCount?: number;
  containerName?: string;
  conversationId?: string;
}

interface TabListProps {
  sessions: ChatSession[];
  onSelect: (id: string) => void;
  onNewChat: () => void;
}

export function TabList({ sessions, onSelect }: TabListProps) {
  const getStatusColor = (status: string = 'free') => {
    if (status === 'busy') return 'text-yellow-500';
    if (status === 'sleep') return 'text-purple-500';
    return 'text-green-500';
  };

  const getStatusLabel = (status: string = 'free') => {
    if (status === 'busy') return 'Processing';
    if (status === 'sleep') return 'Sleeping';
    return 'Free';
  };

  return (
    <div className="flex-1 overflow-auto p-4 space-y-3">
      {/* Header Removed */}

      {sessions.map((session) => (
        <button
          key={session.id}
          onClick={() => onSelect(session.id)}
          className="w-full text-left p-3 rounded-lg border border-border bg-card/50 hover:bg-muted/50 transition-all group relative overflow-hidden"
        >
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20">
                <Zap className="w-3 h-3" />
                {session.provider || 'Systema'}
              </span>
              <span className="text-sm font-semibold truncate flex-1 text-foreground/90">
                {session.title}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-medium">
              <span className="font-mono opacity-80">ID: {session.id.substring(0, 1)}</span>
              <span className="opacity-50">•</span>
              <span>{session.messageCount} requests</span>
              <span className="opacity-50">•</span>
              <span className={cn(getStatusColor(session.status))}>
                {getStatusLabel(session.status)}
              </span>
              {session.containerName && (
                <>
                  <span className="opacity-50">•</span>
                  <span className="flex items-center gap-1 text-indigo-400">
                    <Folder className="w-3 h-3" />
                    {session.containerName}
                  </span>
                </>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
