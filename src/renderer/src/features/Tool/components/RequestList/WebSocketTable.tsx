import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  getFilteredRowModel,
  SortingState,
} from '@tanstack/react-table';
import { useVirtualizer } from '@tanstack/react-virtual';
import { WebSocketConnection, WebSocketMessage } from '../../../../types/inspector';
import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { cn } from '../../../../shared/lib/utils';
import {
  ArrowUpDown,
  Search,
  CaseSensitive,
  Type,
  Regex,
  Trash2,
  Copy,
  Check,
  Target,
  ArrowLeft,
  Wifi,
  WifiOff,
  Clock,
  ArrowUp,
  ArrowDown,
  X,
} from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { useI18n } from '../../../../i18n/i18nContext';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../../../../core/components/common/ui/context-menu';

interface WebSocketTableProps {
  connections: WebSocketConnection[];
  selectedWsId: string | null;
  onSelectConnection: (id: string | null) => void;
  onDeleteConnection: (id: string) => void;
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
}

export function WebSocketTable({
  connections,
  selectedWsId,
  onSelectConnection,
  onDeleteConnection,
  searchTerm,
  onSearchTermChange,
}: WebSocketTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [matchCase, setMatchCase] = useState(false);
  const [matchWholeWord, setMatchWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [rowSelection, setRowSelection] = useState({});

  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const { t } = useI18n();

  const columns = useMemo<ColumnDef<WebSocketConnection>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <button
            onClick={() => table.toggleAllRowsSelected(!table.getIsAllRowsSelected())}
            className={cn(
              'w-3.5 h-3.5 rounded border flex items-center justify-center transition-all cursor-pointer select-none',
              table.getIsAllRowsSelected()
                ? 'bg-primary border-primary text-zinc-950 shadow-sm shadow-primary/20'
                : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-500 text-transparent',
            )}
          >
            <Check className="w-2.5 h-2.5 stroke-[3.5]" />
          </button>
        ),
        cell: ({ row }) => (
          <button
            onClick={(e) => {
              e.stopPropagation();
              row.toggleSelected(!row.getIsSelected());
            }}
            className={cn(
              'w-3.5 h-3.5 rounded border flex items-center justify-center transition-all cursor-pointer select-none',
              row.getIsSelected()
                ? 'bg-primary border-primary text-zinc-950 shadow-sm shadow-primary/20'
                : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-500 text-transparent',
            )}
          >
            <Check className="w-2.5 h-2.5 stroke-[3.5]" />
          </button>
        ),
        size: 35,
      },
      {
        accessorKey: 'status',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 hover:text-foreground"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            {t.websocket.statusLabel}
            <ArrowUpDown className="h-3 w-3" />
          </button>
        ),
        size: 90,
        cell: ({ row }) => {
          const status = row.getValue('status') as string;
          const labels: Record<string, string> = {
            connected: t.websocket.status.open,
            connecting: t.websocket.status.connecting,
            closed: t.websocket.status.closed,
          };
          return (
            <span
              className={cn(
                'px-2 py-0.5 rounded-full text-[10px] font-bold',
                status === 'connected'
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : status === 'connecting'
                    ? 'bg-amber-500/10 text-amber-400'
                    : 'bg-red-500/10 text-red-400',
              )}
            >
              {labels[status] || status.toUpperCase()}
            </span>
          );
        },
      },
      {
        accessorKey: 'url',
        header: t.websocket.url,
        size: 0,
        cell: ({ row }) => (
          <div className="flex items-center gap-2 min-w-0">
            {row.original.status === 'connected' ? (
              <Wifi className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : row.original.status === 'connecting' ? (
              <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-red-400 shrink-0" />
            )}
            <span className="truncate block w-full" title={row.getValue('url')}>
              {row.getValue('url')}
            </span>
          </div>
        ),
      },
      {
        accessorKey: 'host',
        header: t.websocket.host,
        size: 200,
        cell: ({ row }) => (
          <span className="truncate block w-full" title={row.getValue('host')}>
            {row.getValue('host')}
          </span>
        ),
      },
      {
        accessorKey: 'path',
        header: t.websocket.path,
        size: 300,
        cell: ({ row }) => (
          <span className="truncate block w-full" title={row.getValue('path')}>
            {row.getValue('path')}
          </span>
        ),
      },
      {
        id: 'messages',
        header: t.websocket.messages,
        size: 90,
        cell: ({ row }) => {
          const conn = row.original;
          return (
            <div className="flex items-center gap-1 text-xs text-text-primary">
              <ArrowUp className="w-3 h-3 text-sky-400" />
              <span className="text-text-secondary">
                {conn.messages.filter((m) => m.direction === 'client').length}
              </span>
              <ArrowDown className="w-3 h-3 text-purple-400 ml-1" />
              <span className="text-text-secondary">
                {conn.messages.filter((m) => m.direction === 'server').length}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'clientBytesSent',
        header: `↑ ${t.websocket.bytes}`,
        size: 80,
        cell: ({ row }) => (
          <span className="text-text-secondary">{formatBytes(row.getValue('clientBytesSent'))}</span>
        ),
      },
      {
        accessorKey: 'serverBytesSent',
        header: `↓ ${t.websocket.bytes}`,
        size: 80,
        cell: ({ row }) => (
          <span className="text-text-secondary">{formatBytes(row.getValue('serverBytesSent'))}</span>
        ),
      },
    ],
    [t],
  );

  const globalFilterFn = useCallback(
    (row: any, _columnId: string, filterValue: string) => {
      const s = String(filterValue);
      if (!s) return true;
      let regex: RegExp | null = null;
      if (useRegex) {
        try { regex = new RegExp(s, matchCase ? 'g' : 'gi'); } catch {
          regex = new RegExp(s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), matchCase ? '' : 'i');
        }
      } else {
        let p = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (matchWholeWord) p = `\\b${p}\\b`;
        regex = new RegExp(p, matchCase ? '' : 'i');
      }
      const match = (v: unknown) => (v != null && regex ? regex.test(String(v)) : String(v).toLowerCase().includes(s.toLowerCase()));
      const c = row.original as WebSocketConnection;
      return match(c.id) || match(c.url) || match(c.host) || match(c.path) || match(c.status) || match(String(c.totalMessages));
    },
    [useRegex, matchCase, matchWholeWord],
  );

  const table = useReactTable({
    data: connections,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    state: { sorting, globalFilter: debouncedSearchTerm, rowSelection },
    onGlobalFilterChange: onSearchTermChange,
    globalFilterFn,
    getRowId: (row) => row.id,
  });

  const rows = table.getRowModel().rows;
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 32,
    overscan: 10,
  });

  const [showScrollToSelected, setShowScrollToSelected] = useState(false);
  const handleScroll = useCallback(() => {
    const container = tableContainerRef.current;
    if (!container || !selectedWsId) { setShowScrollToSelected(false); return; }
    const idx = rows.findIndex((r) => r.original.id === selectedWsId);
    if (idx === -1) { setShowScrollToSelected(false); return; }
    const rowTop = idx * 32 + 32;
    setShowScrollToSelected(rowTop < container.scrollTop + 16 || rowTop > container.scrollTop + container.clientHeight - 48);
  }, [rows, selectedWsId]);

  useEffect(() => { handleScroll(); }, [selectedWsId, handleScroll]);

  const scrollToSelected = () => {
    const idx = rows.findIndex((r) => r.original.id === selectedWsId);
    if (idx !== -1) rowVirtualizer.scrollToIndex(idx, { align: 'center' });
  };

  const selectedConnection = connections.find((c) => c.id === selectedWsId) || null;
  if (selectedConnection) {
    return <WebSocketMessagesView connection={selectedConnection} onBack={() => onSelectConnection(null)} />;
  }

  return (
    <div className="h-full w-full flex flex-col bg-table-bodyBg text-sm overflow-hidden relative">
      <div className="h-10 flex items-center px-2 border-b border-divider/40 gap-2 shrink-0">
        <Search className="w-4 h-4 text-text-secondary" />
        <input placeholder={t.websocket.filter} className="bg-transparent border-none outline-none text-xs flex-1" value={searchTerm} onChange={(e) => onSearchTermChange(e.target.value)} />
        <div className="flex items-center gap-1 border-l border-border/40 pl-2">
          <button onClick={() => setMatchCase(!matchCase)} className={cn('p-1.5 rounded transition-colors', matchCase ? 'bg-primary/20 text-primary hover:bg-primary/30' : 'text-text-secondary hover:bg-secondary hover:text-text-primary')} title={t.requestList.matchCase}><CaseSensitive className="w-3.5 h-3.5" /></button>
          <button onClick={() => setMatchWholeWord(!matchWholeWord)} className={cn('p-1.5 rounded transition-colors', matchWholeWord ? 'bg-indigo-500/20 text-indigo-500 hover:bg-indigo-500/30' : 'text-text-secondary hover:bg-secondary hover:text-text-primary')} title={t.requestList.matchWholeWord}><Type className="w-3.5 h-3.5" /></button>
          <button onClick={() => setUseRegex(!useRegex)} className={cn('p-1.5 rounded transition-colors', useRegex ? 'bg-success/20 text-success hover:bg-success/30' : 'text-text-secondary hover:bg-secondary hover:text-text-primary')} title={t.requestList.useRegex}><Regex className="w-3.5 h-3.5" /></button>
        </div>
      </div>
      <div ref={tableContainerRef} onScroll={handleScroll} className="flex-1 flex flex-col overflow-auto relative">
        <div className="flex h-10 min-h-10 flex-shrink-0 bg-table-headerBg text-sm font-semibold text-text-secondary border-b border-divider/20 sticky top-0 z-10 w-full min-w-max">
          {table.getHeaderGroups().map((hg) => (
            <div key={hg.id} className="flex w-full h-full">
              {hg.headers.map((header) => {
                if (!header.column.getIsVisible()) return null;
                const isUrl = header.id === 'url', isHost = header.id === 'host', isPath = header.id === 'path';
                return (
                  <div key={header.id} className={cn('h-full flex items-center shrink-0', header.id === 'select' ? 'px-2 justify-center' : 'px-4')}
                    style={{ width: (isUrl || isHost || isPath) ? 0 : header.getSize(), flex: isUrl ? '2 1 0px' : isHost ? '1 1 0px' : isPath ? '1.5 1 0px' : undefined, minWidth: isUrl ? '250px' : isHost ? '150px' : isPath ? '200px' : undefined }}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative', minWidth: 'max-content', width: '100%' }}>
          {rowVirtualizer.getVirtualItems().map((vr) => {
            const row = rows[vr.index];
            return (
              <ContextMenu key={row.id}>
                <ContextMenuTrigger asChild>
                  <div className={cn('flex items-center border-b border-divider/20 transition-colors cursor-pointer text-xs absolute left-0 top-0 hover:bg-table-hoverItemBodyBg', row.original.id === selectedWsId && 'bg-primary/15 text-text-primary hover:bg-primary/20 border-l-2 border-l-primary')}
                    style={{ height: `${vr.size}px`, transform: `translateY(${vr.start}px)`, width: '100%', minWidth: 'max-content' }}
                    onClick={() => onSelectConnection(row.original.id)}>
                    {row.getVisibleCells().map((cell) => {
                      const isUrl = cell.column.id === 'url', isHost = cell.column.id === 'host', isPath = cell.column.id === 'path';
                      return (
                        <div key={cell.id} className={cn('py-1.5 whitespace-nowrap overflow-hidden shrink-0 flex items-center', cell.column.id === 'select' ? 'px-2 justify-center' : 'px-4')}
                          style={{ width: (isUrl || isHost || isPath) ? 0 : cell.column.getSize(), flex: isUrl ? '2 1 0px' : isHost ? '1 1 0px' : isPath ? '1.5 1 0px' : undefined, minWidth: isUrl ? '250px' : isHost ? '150px' : isPath ? '200px' : undefined }}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      );
                    })}
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-56">
                  <ContextMenuItem onClick={() => onSelectConnection(row.original.id)}><span>{t.websocket.viewMessages}</span></ContextMenuItem>
                  <ContextMenuItem onClick={() => navigator.clipboard.writeText(`WebSocket: ${row.original.url}\nHost: ${row.original.host}\nPath: ${row.original.path}\nStatus: ${row.original.status}\nMessages: ${row.original.totalMessages}`)}>
                    <Copy className="mr-2 h-3.5 w-3.5" /><span>{t.websocket.copyInfo}</span>
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem onClick={() => onDeleteConnection(row.original.id)} className="text-error focus:text-error focus:bg-error/10">
                    <Trash2 className="mr-2 h-3.5 w-3.5" /><span>{t.websocket.delete}</span>
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
        </div>
        {rows.length === 0 && <div className="flex-1 flex items-center justify-center text-text-secondary w-full">{t.requestList.noWebsocket}</div>}
      </div>
      <div className="h-6 border-t border-divider flex items-center px-3 gap-4 bg-table-headerBg text-[10px] text-text-secondary select-none shrink-0">
        <span>{connections.length} {t.websocket.connections}</span>
        <span className="text-divider">|</span>
        <span>{connections.filter((c) => c.status === 'connected').length} {t.websocket.open}</span>
        <span className="text-divider">|</span>
        <span>{connections.filter((c) => c.status === 'closed').length} {t.websocket.closed}</span>
      </div>
      {showScrollToSelected && (
        <button onClick={scrollToSelected} className="absolute bottom-8 right-4 z-40 w-8 h-8 rounded-full bg-primary text-zinc-950 flex items-center justify-center shadow-lg hover:bg-primary/85 active:scale-95 transition-all cursor-pointer border border-primary/20">
          <Target className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// ─── Messages Detail View ─────────────────────────────────────────────────
interface WebSocketMessagesViewProps { connection: WebSocketConnection; onBack: () => void; }

function WebSocketMessagesView({ connection, onBack }: WebSocketMessagesViewProps) {
  const [filter, setFilter] = useState<'all' | 'client' | 'server'>('all');
  const [showBinary, setShowBinary] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [rowSelection, setRowSelection] = useState({});
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const { t } = useI18n();

  const filteredMessages = useMemo(() => {
    let msgs = connection.messages;
    if (filter === 'client') msgs = msgs.filter((m) => m.direction === 'client');
    if (filter === 'server') msgs = msgs.filter((m) => m.direction === 'server');
    if (!showBinary) msgs = msgs.filter((m) => m.dataType === 'text');
    return msgs;
  }, [connection.messages, filter, showBinary]);

  const columns = useMemo<ColumnDef<WebSocketMessage>[]>(() => [
    { id: 'select', header: ({ table }) => (<button onClick={() => table.toggleAllRowsSelected(!table.getIsAllRowsSelected())} className={cn('w-3.5 h-3.5 rounded border flex items-center justify-center transition-all cursor-pointer select-none', table.getIsAllRowsSelected() ? 'bg-primary border-primary text-zinc-950 shadow-sm shadow-primary/20' : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-500 text-transparent')}><Check className="w-2.5 h-2.5 stroke-[3.5]" /></button>), cell: ({ row }) => (<button onClick={(e) => { e.stopPropagation(); row.toggleSelected(!row.getIsSelected()); }} className={cn('w-3.5 h-3.5 rounded border flex items-center justify-center transition-all cursor-pointer select-none', row.getIsSelected() ? 'bg-primary border-primary text-zinc-950 shadow-sm shadow-primary/20' : 'border-zinc-700 bg-zinc-800/50 hover:border-zinc-500 text-transparent')}><Check className="w-2.5 h-2.5 stroke-[3.5]" /></button>), size: 35 },
    { accessorKey: 'direction', header: ({ column }) => (<button className="flex items-center gap-1 hover:text-foreground" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>{t.websocket.dir}<ArrowUpDown className="h-3 w-3" /></button>), size: 70, cell: ({ row }) => { const isClient = row.getValue('direction') === 'client'; return (<span className={cn('px-1.5 py-0.5 rounded text-[10px] font-bold', isClient ? 'bg-sky-500/20 text-sky-400' : 'bg-purple-500/20 text-purple-400')}>{isClient ? `▲ ${t.websocket.send}` : `▼ ${t.websocket.recv}`}</span>); } },
    { accessorKey: 'dataType', header: t.websocket.type, size: 70, cell: ({ row }) => (<span className={cn('text-xs font-medium', row.getValue('dataType') === 'binary' ? 'text-amber-400' : 'text-text-secondary')}>{row.getValue('dataType')}</span>) },
    { accessorKey: 'data', header: t.websocket.data, size: 0, cell: ({ row }) => { const data = row.getValue('data') as string; const truncated = data.length > 300 ? data.substring(0, 300) + '...' : data; return (<span className="truncate block w-full font-mono text-xs" title={data}>{truncated}</span>); } },
    { accessorKey: 'size', header: t.websocket.size, size: 70, cell: ({ row }) => (<span className="text-text-secondary">{formatBytes(row.getValue('size'))}</span>) },
    { accessorKey: 'timestamp', header: t.websocket.time, size: 80, cell: ({ row }) => (<span className="text-text-secondary">{new Date(row.getValue('timestamp')).toLocaleTimeString()}</span>) },
  ], [t]);

  const globalFilterFn = useCallback((row: any, _columnId: string, filterValue: string) => {
    const term = String(filterValue).toLowerCase();
    if (!term) return true;
    const msg = row.original as WebSocketMessage;
    return msg.data.toLowerCase().includes(term) || msg.direction.toLowerCase().includes(term) || msg.dataType.toLowerCase().includes(term);
  }, []);

  const table = useReactTable({
    data: filteredMessages, columns, getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection, state: { globalFilter: debouncedSearchTerm, rowSelection }, onGlobalFilterChange: setSearchTerm, globalFilterFn, getRowId: (row) => row.id,
  });

  const rows = table.getRowModel().rows;
  const rowVirtualizer = useVirtualizer({ count: rows.length, getScrollElement: () => tableContainerRef.current, estimateSize: () => 40, overscan: 10 });

  return (
    <div className="h-full w-full flex flex-col bg-table-bodyBg text-sm overflow-hidden relative">
      <div className="h-10 flex items-center px-2 border-b border-divider/40 gap-2 shrink-0 bg-table-headerBg">
        <button onClick={onBack} className="p-1 rounded-lg hover:bg-sidebar-itemHover text-text-secondary hover:text-text-primary transition-colors shrink-0"><ArrowLeft className="w-4 h-4" /></button>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-text-primary truncate">{connection.url}</span>
          <span className="text-xs text-text-secondary ml-2">{connection.host}{' • '}<span className={cn(connection.status === 'connected' ? 'text-emerald-400' : connection.status === 'connecting' ? 'text-amber-400' : 'text-red-400')}>{connection.status.toUpperCase()}</span></span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setFilter('all')} className={cn('px-2 py-1 rounded text-xs font-medium transition-colors', filter === 'all' ? 'bg-blue-500/10 text-blue-400' : 'text-text-secondary hover:text-text-primary')}>{t.websocket.all}</button>
          <button onClick={() => setFilter('client')} className={cn('px-2 py-1 rounded text-xs font-medium transition-colors', filter === 'client' ? 'bg-sky-500/10 text-sky-400' : 'text-text-secondary hover:text-text-primary')}><ArrowUp className="w-3 h-3 inline mr-0.5" />{t.websocket.client}</button>
          <button onClick={() => setFilter('server')} className={cn('px-2 py-1 rounded text-xs font-medium transition-colors', filter === 'server' ? 'bg-purple-500/10 text-purple-400' : 'text-text-secondary hover:text-text-primary')}><ArrowDown className="w-3 h-3 inline mr-0.5" />{t.websocket.server}</button>
          <label className="flex items-center gap-1 text-xs text-text-secondary cursor-pointer ml-1"><input type="checkbox" checked={showBinary} onChange={(e) => setShowBinary(e.target.checked)} className="w-3 h-3 rounded" />{t.websocket.binary}</label>
        </div>
      </div>
      <div className="h-10 flex items-center px-2 border-b border-divider/40 gap-2 shrink-0">
        <Search className="w-4 h-4 text-text-secondary" />
        <input placeholder={t.websocket.filterMessages} className="bg-transparent border-none outline-none text-xs flex-1" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>
      <div ref={tableContainerRef} className="flex-1 flex flex-col overflow-auto relative">
        <div className="flex h-10 min-h-10 flex-shrink-0 bg-table-headerBg text-sm font-semibold text-text-secondary border-b border-divider/20 sticky top-0 z-10 w-full min-w-max">
          {table.getHeaderGroups().map((hg) => (<div key={hg.id} className="flex w-full h-full">{hg.headers.map((header) => { if (!header.column.getIsVisible()) return null; const isData = header.id === 'data'; return (<div key={header.id} className={cn('h-full flex items-center shrink-0', header.id === 'select' ? 'px-2 justify-center' : 'px-4')} style={{ width: isData ? 0 : header.getSize(), flex: isData ? '2 1 0px' : undefined, minWidth: isData ? '300px' : undefined }}>{header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}</div>); })}</div>))}
        </div>
        <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative', minWidth: 'max-content', width: '100%' }}>
          {rowVirtualizer.getVirtualItems().map((vr) => { const row = rows[vr.index]; const isClient = row.original.direction === 'client'; return (<ContextMenu key={row.id}><ContextMenuTrigger asChild><div className={cn('flex items-center border-b border-divider/20 transition-colors cursor-pointer text-xs absolute left-0 top-0 hover:bg-table-hoverItemBodyBg', isClient ? 'border-l-2 border-l-sky-500/30' : 'border-l-2 border-l-purple-500/30')} style={{ height: `${vr.size}px`, transform: `translateY(${vr.start}px)`, width: '100%', minWidth: 'max-content' }}>{row.getVisibleCells().map((cell) => { const isData = cell.column.id === 'data'; return (<div key={cell.id} className={cn('py-1.5 whitespace-nowrap overflow-hidden shrink-0 flex items-center', cell.column.id === 'select' ? 'px-2 justify-center' : 'px-4')} style={{ width: isData ? 0 : cell.column.getSize(), flex: isData ? '2 1 0px' : undefined, minWidth: isData ? '300px' : undefined }}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>); })}</div></ContextMenuTrigger><ContextMenuContent className="w-48"><ContextMenuItem onClick={() => navigator.clipboard.writeText(row.original.data)}><Copy className="mr-2 h-3.5 w-3.5" /><span>{t.common.copy} {t.websocket.data}</span></ContextMenuItem></ContextMenuContent></ContextMenu>); })}
        </div>
        {rows.length === 0 && (<div className="flex-1 flex items-center justify-center text-text-secondary w-full">{connection.messages.length === 0 ? t.websocket.noMessages : t.websocket.noMatch}</div>)}
      </div>
      <div className="h-6 border-t border-divider flex items-center px-3 gap-4 bg-table-headerBg text-[10px] text-text-secondary select-none shrink-0">
        <span>{connection.messages.length} {t.websocket.messages}</span><span className="text-divider">|</span>
        <span>↑ {connection.messages.filter((m) => m.direction === 'client').length}</span><span>↓ {connection.messages.filter((m) => m.direction === 'server').length}</span><span className="text-divider">|</span>
        <span>↑ {formatBytes(connection.clientBytesSent)}</span><span>↓ {formatBytes(connection.serverBytesSent)}</span>
      </div>
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}