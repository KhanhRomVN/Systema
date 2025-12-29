import { ResizableSplit } from '../../../components/ResizableSplit';
import { RequestList } from './RequestList';
import { RequestDetails } from './RequestDetails';
import { ParsedInspector } from './ParsedInspector';
import { ChatPanel } from './ChatPanel';
import { useState } from 'react';
import { NetworkRequest } from '../types';

interface InspectorLayoutProps {
  onBack: () => void;
  requests: NetworkRequest[];
}

export function InspectorLayout({ onBack, requests }: InspectorLayoutProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedRequest = requests.find((r) => r.id === selectedId) || null;

  return (
    <div className="h-full w-full bg-background text-foreground flex flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="h-10 border-b border-border flex items-center px-4 bg-muted/40 gap-4">
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground hover:bg-muted/50 px-2 py-1 rounded text-xs border border-transparent hover:border-border transition-all"
        >
          &larr; Back
        </button>
        <div className="h-4 w-px bg-border/50" />
        <span className="font-semibold text-sm">Network Inspector</span>
        <div className="ml-auto text-xs text-muted-foreground">{requests.length} requests</div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <ResizableSplit direction="horizontal" initialSize={70} minSize={30} maxSize={80}>
          <ResizableSplit direction="vertical" initialSize={50} minSize={20} maxSize={80}>
            <RequestList requests={requests} selectedId={selectedId} onSelect={setSelectedId} />

            <ResizableSplit direction="horizontal" initialSize={65} minSize={30} maxSize={80}>
              <RequestDetails request={selectedRequest} />
              <ParsedInspector request={selectedRequest} />
            </ResizableSplit>
          </ResizableSplit>

          <ChatPanel />
        </ResizableSplit>
      </div>
    </div>
  );
}
