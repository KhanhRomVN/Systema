import { NetworkRequest } from '../types';
import { useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';

interface ParsedInspectorProps {
  request: NetworkRequest | null;
}

interface AccordionItemProps {
  title: string;
  count?: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function AccordionItem({ title, count, children, defaultOpen = false }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border/50">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          {isOpen ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
          <span>{title}</span>
        </div>
        {count !== undefined && <span className="text-muted-foreground">{count}</span>}
      </button>
      {isOpen && <div className="p-3 bg-muted/10 text-xs">{children}</div>}
    </div>
  );
}

export function ParsedInspector({ request }: ParsedInspectorProps) {
  if (!request) return <div className="h-full bg-background/50 border-l border-border/50" />;

  const queryParams = new URLSearchParams(request.path.split('?')[1] || {});
  const queryEntries = Array.from(queryParams.entries());

  return (
    <div className="h-full overflow-auto bg-background/50 border-l border-border/50 flex flex-col font-mono">
      <div className="px-3 py-2 text-xs font-bold text-muted-foreground border-b border-border/50 bg-muted/20">
        PARSED DETAILS
      </div>

      <AccordionItem
        title="Query Parameters"
        count={queryEntries.length}
        defaultOpen={queryEntries.length > 0}
      >
        {queryEntries.length > 0 ? (
          <div className="space-y-2">
            {queryEntries.map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <span className="text-blue-400 shrink-0">{key}:</span>
                <span className="text-foreground/80 break-all">{value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground italic">No query parameters</div>
        )}
      </AccordionItem>

      <AccordionItem title="Cookies" count={0}>
        <div className="text-muted-foreground italic">No cookies</div>
      </AccordionItem>

      <AccordionItem title="Timing" defaultOpen>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Total Duration</span>
            <span>{request.time}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Size</span>
            <span>{request.size}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Timestamp</span>
            <span>{new Date(request.timestamp).toLocaleTimeString()}</span>
          </div>
        </div>
      </AccordionItem>
    </div>
  );
}
