import { ResizableSplit } from '../../../components/ResizableSplit';
import { RequestList } from './RequestList';
import { RequestDetails } from './RequestDetails';
import { FilterPanel, initialFilterState, InspectorFilter } from './FilterPanel';
import { ChatContainer } from './ChatContainer';
import { useState, useMemo, useEffect } from 'react';
import { NetworkRequest } from '../types';

interface InspectorLayoutProps {
  onBack: () => void;
  requests: NetworkRequest[];
  appName: string;
}

export function InspectorLayout({ onBack, requests, appName }: InspectorLayoutProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<InspectorFilter>(() => {
    try {
      const saved = localStorage.getItem('inspector-filter-state');
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const parsed = saved ? JSON.parse(saved) : null;
      if (parsed) {
        // Migration: Remove blacklist if present (migrated to whitelist)
        if ('blacklist' in parsed.host) delete (parsed.host as any).blacklist;
        if ('blacklist' in parsed.path) delete (parsed.path as any).blacklist;

        // Migration: Check for legacy status keys (success, redirect, etc)
        const statusKeys = Object.keys(parsed.status || {});
        if (
          statusKeys.some((k) =>
            ['success', 'redirect', 'clientError', 'serverError', 'other'].includes(k),
          )
        ) {
          // Found legacy status, reset status to initial (granular)
          parsed.status = initialFilterState.status;
        }

        return { ...initialFilterState, ...parsed };
      }
      return initialFilterState;
    } catch {
      return initialFilterState;
    }
  });

  useEffect(() => {
    localStorage.setItem('inspector-filter-state', JSON.stringify(filter));
  }, [filter]);

  const filteredRequests = useMemo(() => {
    return requests.filter((req) => {
      // Method
      if (!filter.methods[req.method as keyof typeof filter.methods]) {
        return false;
      }

      // Host
      // Host (Whitelist)
      const hostWhitelist = filter.host.whitelist || [];
      if (hostWhitelist.length > 0 && !hostWhitelist.some((allowed) => req.host.includes(allowed)))
        return false;

      // Path (Whitelist)
      const pathWhitelist = filter.path.whitelist || [];
      if (pathWhitelist.length > 0 && !pathWhitelist.some((allowed) => req.path.includes(allowed)))
        return false;

      // Status
      // If status is 0 (Pending), usually we treat it as 'Other' or maybe enable if we want to see pending requests.
      // For now, let's map 0 to something or check if 'other' is enabled if we can't find it.
      // But the requirement says "granular status".
      // If the status is not in our list (e.g. 0), we might default to showing it or check 'other' if we had one (we removed 'other' from status).
      // Let's assume pending requests (status 0) should be shown if we aren't filtering them out explicitly,
      // BUT with granular filters, if we select 200, we probably only want 200.
      // If the user hasn't selected "0" (which isn't an option), maybe pending requests shouldn't show?
      // Or maybe we treat unknown status as enabled?
      // Let's check against the map. If the status is in the map, use the value.
      // If not in the map (like 0 or some obscure code), maybe we want to show it?
      // Wait, the user wanted specific codes. If we receive 418 (Teapot) and it's not in the list, what happens?
      // Usually "filter" means "include only these". So if 418 is not in the list, it's hidden.
      // However, 0 is "pending". Usually we want to see pending requests.
      // Let's assume pending requests are always visible OR maybe we should map them to a dummy "pending" status if we want to filter them.
      // For now, let's strictly value the filter. If status is 0, checking filter.status[0] will be undefined.
      // Let's treat undefined as TRUE for safely showing things not in the list? No, that defeats the purpose of "only show 200".
      // Let's treat undefined as FALSE, EXCEPT for status 0 (Pending) which we might want to show until it resolves?
      // Actually, standard behavior: if I click "200", I only want to see 200s. Pending requests (0) are NOT 200s. So they should disappear.
      // BUT, that makes it hard to see requests in progress.
      // Let's implement strict filtering. If status is 0, it's hidden if 0 isn't enabled.
      // Since 0 isn't in the UI, pending requests will effectively be hidden if we strictly filter.
      // OPTION: Add '0' or 'Pending' to the UI? The user didn't ask for it.
      // OPTION: Use 'other' status logic? User removed 'other' category from status.
      // Let's stick to strict filtering. If the code is in the list, check it. If not in the list (including 0), default to false?
      // That might hide everything pending.
      // Let's check if the user request implied "status code is one of these".
      // "liệt kê toàn bộ badge status gồm..." -> "List all badge status including...".
      // If I only check these, 0 is excluded.
      // HACK: Let's assume if status is 0, we show it (allow it to pass status filter) so user sees activity.
      // Once it completes, it gets a real status and then gets filtered.
      if (
        req.status !== 0 &&
        typeof filter.status[req.status] !== 'undefined' &&
        !filter.status[req.status]
      ) {
        return false;
      }
      // If it is a status code NOT in our list (e.g. 418), and not 0, it falls through here.
      // If we want strict "white list", we should return false if undefined.
      // But the UI initializes all known codes to TRUE. So "undefined" means "unknown code".
      // Let's show unknown codes by default or hide?
      // Let's show them.

      // Type
      const type = req.type.toLowerCase();
      let typeKey: keyof typeof filter.type = 'other';

      // Improved Type Detection
      if (type.includes('xhr') || type.includes('fetch')) typeKey = 'xhr';
      else if (type.includes('js') || type.includes('script') || req.path.match(/\.js(\?|$)/))
        typeKey = 'js';
      else if (type.includes('css') || req.path.match(/\.css(\?|$)/)) typeKey = 'css';
      else if (
        type.includes('img') ||
        type.includes('image') ||
        type.includes('png') ||
        type.includes('jpg') ||
        type.includes('jpeg') ||
        type.includes('gif') ||
        type.includes('svg') ||
        type.includes('ico') ||
        type.includes('webp') ||
        req.path.match(/\.(png|jpg|jpeg|gif|svg|ico|webp)(\?|$)/)
      )
        typeKey = 'img';
      else if (
        type.includes('media') ||
        type.includes('video') ||
        type.includes('audio') ||
        req.path.match(/\.(mp4|webm|ogg|mp3|wav)(\?|$)/)
      )
        typeKey = 'media';
      else if (
        type.includes('font') ||
        type.includes('woff') ||
        type.includes('ttf') ||
        req.path.match(/\.(woff|woff2|ttf|otf|eot)(\?|$)/)
      )
        typeKey = 'font';
      else if (
        type.includes('ws') ||
        type.includes('websocket') ||
        req.protocol === 'ws' ||
        req.protocol === 'wss'
      )
        typeKey = 'ws';
      else if (type.includes('wasm') || req.path.match(/\.wasm(\?|$)/)) typeKey = 'wasm';
      else if (type.includes('manifest') || req.path.match(/manifest\.json(\?|$)/))
        // Simple check
        typeKey = 'manifest';
      else if (
        type.includes('doc') ||
        type.includes('html') ||
        type.includes('document') ||
        (!typeKey && !req.path.includes('.')) // no extension often implies doc/api
      )
        typeKey = 'doc';

      if (!filter.type[typeKey]) return false;

      // Size
      if (filter.size.min || filter.size.max) {
        const sizeBytes = parseSize(req.size);
        if (filter.size.min && sizeBytes < parseInt(filter.size.min)) return false;
        if (filter.size.max && sizeBytes > parseInt(filter.size.max)) return false;
      }

      // Time
      if (filter.time.min || filter.time.max) {
        const timeMs = parseTime(req.time);
        if (filter.time.min && timeMs < parseInt(filter.time.min)) return false;
        if (filter.time.max && timeMs > parseInt(filter.time.max)) return false;
      }

      return true;
    });
  }, [requests, filter]);

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
        <div className="ml-auto text-xs text-muted-foreground">
          {filteredRequests.length} / {requests.length} requests
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <ResizableSplit direction="horizontal" initialSize={70} minSize={30} maxSize={80}>
          <ResizableSplit direction="vertical" initialSize={50} minSize={20} maxSize={80}>
            <RequestList
              requests={filteredRequests}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />

            <ResizableSplit direction="horizontal" initialSize={65} minSize={30} maxSize={80}>
              <RequestDetails request={selectedRequest} />
              <FilterPanel filter={filter} onChange={setFilter} />
            </ResizableSplit>
          </ResizableSplit>

          <ChatContainer
            inspectorContext={{
              requests,
              filteredRequests, // Pass the filtered list
              selectedRequestId: selectedId,
              filter,
              onSetFilter: setFilter,
              onSelectRequest: setSelectedId,
              targetApp: appName,
            }}
          />
        </ResizableSplit>
      </div>
    </div>
  );
}

function parseSize(sizeStr: string): number {
  if (!sizeStr || sizeStr === 'Pending') return 0;
  const units = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
  const match = sizeStr.match(/^([\d.]+)\s*([A-Za-z]+)$/);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const unit = match[2].toUpperCase() as keyof typeof units;
  return val * (units[unit] || 1);
}

function parseTime(timeStr: string): number {
  if (!timeStr || timeStr === 'Pending') return 0;
  return parseFloat(timeStr.replace('ms', '').replace('s', '000')); // simplistic
}
