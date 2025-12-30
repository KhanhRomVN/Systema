import { useState, useEffect } from 'react';
import { ChatStorage } from '../../../../services/ChatStorage';
import { ChatSession } from '../TabPanel/TabList';
import { Clock, MessageSquare, ArrowRight, Trash2 } from 'lucide-react';

interface HistoryPanelProps {
  onClose: () => void;
  onSelectSession: (id: string) => void;
}

export function HistoryPanel({ onClose, onSelectSession }: HistoryPanelProps) {
  const [history, setHistory] = useState<ChatSession[]>([]);

  useEffect(() => {
    setHistory(ChatStorage.getHistory());
  }, []);

  const handleSelect = (id: string) => {
    onSelectSession(id);
    onClose();
  };

  const handleClear = () => {
    ChatStorage.clearHistory();
    setHistory([]);
  };

  return (
    <div className="h-full w-full bg-background flex flex-col">
      <div className="h-10 flex items-center px-4 border-b border-border bg-muted/40 justify-between">
        <span className="font-semibold text-sm">History</span>
        <div className="flex gap-2">
          <button
            onClick={handleClear}
            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> Clear
          </button>
          <button onClick={onClose} className="text-xs text-muted-foreground hover:text-foreground">
            Close
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4 space-y-2">
        {history.length === 0 ? (
          <div className="text-center text-muted-foreground text-xs mt-10">
            <Clock className="w-8 h-8 mx-auto mb-2 opacity-20" />
            No history yet
          </div>
        ) : (
          history.map((session) => (
            <div
              key={session.id}
              onClick={() => handleSelect(session.id)}
              className="p-3 border border-border rounded-lg hover:bg-muted/50 cursor-pointer group transition-colors"
            >
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-sm">{session.title}</span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(session.timestamp).toLocaleTimeString()}
                </span>
              </div>
              <div className="text-xs text-muted-foreground truncate mb-2">{session.preview}</div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                  {session.provider}
                </span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" /> {session.messageCount}
                </span>
                <ArrowRight className="w-3 h-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
