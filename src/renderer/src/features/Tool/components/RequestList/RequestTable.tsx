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
import { NetworkRequest } from '../../../../types/inspector';
import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { cn } from '../../../../shared/lib/utils';
import {
  ArrowUpDown,
  Search,
  CaseSensitive,
  Type,
  Regex,
  BookmarkPlus,
  Star,
  Trash2,
  Copy,
  Check,
  Target,
  Zap,
  Cookie,
} from 'lucide-react';
import { useDebounce } from 'use-debounce';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '../../../../core/components/common/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../../core/components/common/ui/dropdown-menu';
import { addRequestToDefaultCollection } from '../../../../utils/collections';
import { useI18n } from '../../../../i18n/i18nContext';

interface RequestTableProps {
  requests: NetworkRequest[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  interceptedIds?: Set<string>;
  pendingActionIds?: Set<string>;
  onForward?: (id: string) => void;
  onDrop?: (id: string) => void;
  onDelete?: (id: string) => void;
  appId: string;
  onSetCompare1: (req: NetworkRequest) => void;
  onSetCompare2: (req: NetworkRequest) => void;
  onAnalyzeRequest?: (req: NetworkRequest) => void;
  onSendToFuzzer?: (req: NetworkRequest) => void;
}

export function RequestTable({
  requests,
  selectedId,
  onSelect,
  searchTerm,
  onSearchChange,
  interceptedIds,
  pendingActionIds,
  onForward,
  onDrop,
  onDelete,
  appId,
  onSetCompare1,
  onSetCompare2,
  onAnalyzeRequest,
  onSendToFuzzer,
}: RequestTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [matchCase, setMatchCase] = useState(false);
  const [matchWholeWord, setMatchWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [rowSelection, setRowSelection] = useState({});
  const { t } = useI18n();

  // Feature: Highlighted Rows
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const toggleHighlight = useCallback((id: string) => {
    setHighlightedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const formatRequestForCopy = (req: NetworkRequest): string => {
    let output = `${req.method} ${req.host}${req.path}\n\n`;

    output += 'Headers:\n';
    if (req.requestHeaders && Object.keys(req.requestHeaders).length > 0) {
      output += Object.entries(req.requestHeaders)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
    } else {
      output += '(No headers)';
    }
    output += '\n\n';

    output += 'Body:\n';
    output += req.requestBody || '(No body)';

    return output;
  };

  const handleCopySingle = (req: NetworkRequest) => {
    const text = formatRequestForCopy(req);
    navigator.clipboard.writeText(text);
  };

  const formatRequestToMarkdown = (req: NetworkRequest): string => {
    let output = `### \`${req.method}\` ${req.url}\n\n`;

    output += '**Headers:**\n';
    output += '```http\n';
    if (req.requestHeaders && Object.keys(req.requestHeaders).length > 0) {
      output += Object.entries(req.requestHeaders)
        .map(([k, v]) => `${k}: ${v}`)
        .join('\n');
    } else {
      output += '(No headers)';
    }
    output += '\n```\n\n';

    output += '**Body:**\n';
    if (req.requestBody) {
      const trimmed = req.requestBody.trim();
      if (
        (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))
      ) {
        try {
          const parsed = JSON.parse(trimmed);
          output += '```json\n' + JSON.stringify(parsed, null, 2) + '\n```';
        } catch {
          output += '```\n' + req.requestBody + '\n```';
        }
      } else {
        output += '```\n' + req.requestBody + '\n```';
      }
    } else {
      output += '*(No body)*';
    }

    return output;
  };

  const handleCopySelectedAsMarkdown = () => {
    const selectedRows = table.getSelectedRowModel().rows;
    if (selectedRows.length === 0) return;

    const text = selectedRows
      .map((row) => formatRequestToMarkdown(row.original))
      .join('\n\n---\n\n');

    navigator.clipboard.writeText(text);
  };

  const handleCopySelectedAsJson = () => {
    const selectedRows = table.getSelectedRowModel().rows;
    if (selectedRows.length === 0) return;

    const selectedData = selectedRows.map((row) => row.original);
    navigator.clipboard.writeText(JSON.stringify(selectedData, null, 2));
  };

  // Debounce search term to reduce re-renders
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  const columns = useMemo<ColumnDef<NetworkRequest>[]>(
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
        accessorKey: 'id',
        header: ({ column }) => {
          return (
            <button
              className="flex items-center gap-1 hover:text-foreground"
              onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            >
              #
              <ArrowUpDown className="h-3 w-3" />
            </button>
          );
        },
        cell: ({ row }) => <span className="text-text-secondary">{row.getValue('id')}</span>,
        // Hiding detailed ID column to save space, but keeping it in data model
        size: 0,
        enableHiding: true,
      },
      {
        accessorKey: 'method',
        header: t.requestTable.method,
        size: 100,
        cell: ({ row }) => {
          const method = row.getValue('method') as string;
          let colorClass = 'text-text-primary';
          if (method === 'GET') colorClass = 'text-primary';
          if (method === 'POST') colorClass = 'text-success';
          if (method === 'PUT') colorClass = 'text-warning';
          if (method === 'DELETE') colorClass = 'text-error';
          return <span className={cn('font-bold', colorClass)}>{method}</span>;
        },
      },
      {
        accessorKey: 'host',
        header: t.requestTable.host,
        size: 200,
        cell: ({ row }) => (
          <span className="truncate block w-full" title={row.getValue('host')}>
            {row.getValue('host')}
          </span>
        ),
      },
      {
        accessorKey: 'path',
        header: t.requestTable.path,
        size: 400,
        cell: ({ row }) => (
          <span className="truncate block w-full" title={row.getValue('path')}>
            {row.getValue('path')}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: t.requestTable.status,
        id: 'status', // Explicitly set ID for the column
        size: 110,
        cell: ({ row }) => {
          const id = row.original.id;
          const isPending = pendingActionIds?.has(id);
          const status = row.getValue('status') as number;

          if (isPending) {
            return (
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <svg className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
                <span className="text-amber-400 font-bold animate-pulse text-xs tracking-wider">{t.requestTable.held}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onForward?.(id);
                  }}
                  className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded text-[10px] font-bold border border-emerald-500/40 transition-colors"
                  title="Forward Request to Server"
                >
                  ▶ {t.requestTable.fwd}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDrop?.(id);
                  }}
                  className="px-2 py-0.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-[10px] font-bold border border-red-500/40 transition-colors"
                  title="Drop Request"
                >
                  ✕ {t.requestTable.drop}
                </button>
              </div>
            );
          }

          let colorClass = 'text-text-primary';
          if (status >= 200 && status < 300) colorClass = 'text-success';
          else if (status >= 300 && status < 400) colorClass = 'text-warning';
          else if (status >= 400) colorClass = 'text-error';
          return <span className={colorClass}>{status || t.requestTable.pending}</span>;
        },
      },
      {
        accessorKey: 'type',
        header: t.requestTable.type,
        size: 80,
      },
      {
        id: 'tags',
        header: t.requestTable.tags,
        size: 100,
        cell: ({ row }) => {
          const req = row.original;
          const tags: { label: string; tooltip: string; className: string; icon?: React.ReactNode }[] = [];

          // Detect WASM
          const isWasm =
            (req.path && /\.wasm(\?|#|$)/i.test(req.path)) ||
            (req.type && req.type.toLowerCase() === 'wasm') ||
            (req.responseHeaders &&
              Object.entries(req.responseHeaders).some(
                ([k, v]) =>
                  k.toLowerCase() === 'content-type' &&
                  String(v).toLowerCase().includes('application/wasm'),
              ));

          if (isWasm) {
            tags.push({
              label: 'WASM',
              tooltip: t.requestTable.wasmTag,
              className: 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 font-bold',
            });
          }

          // Detect SSE (Server-Sent Events)
          const isSse =
            req.responseHeaders &&
            Object.entries(req.responseHeaders).some(
              ([k, v]) =>
                k.toLowerCase() === 'content-type' &&
                String(v).toLowerCase().includes('text/event-stream'),
            );

          if (isSse) {
            tags.push({
              label: 'SSE',
              tooltip: t.requestTable.sseTag,
              className:
                'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold',
            });
          }

          // Detect Cookies
          const hasCookies =
            (req.requestCookies && Object.keys(req.requestCookies).length > 0) ||
            (req.responseCookies && Object.keys(req.responseCookies).length > 0) ||
            (req.requestHeaders &&
              Object.keys(req.requestHeaders).some(
                (k) => k.toLowerCase() === 'cookie',
              )) ||
            (req.responseHeaders &&
              Object.keys(req.responseHeaders).some(
                (k) => k.toLowerCase() === 'set-cookie',
              ));

          if (hasCookies) {
            tags.push({
              label: '',
              tooltip: t.requestTable.cookieTag,
              className: 'bg-amber-500/15 text-amber-400 border border-amber-500/30 font-bold',
              icon: <Cookie className="w-3 h-3" />,
            });
          }

          // Security issues — only show badge if there are high severity issues
          const secIssues = req.securityIssues || [];
          const highCount = secIssues.filter((i) => i.severity === 'high').length;
          if (highCount > 0) {
            tags.push({
              label: '⚠',
              tooltip: `${secIssues.length} security issue(s) detected (${highCount} high)`,
              className: 'bg-red-500/15 text-red-400 border border-red-500/30 font-bold',
            });
          }

          if (tags.length === 0) return null;

          return (
            <div className="flex gap-1 flex-wrap">
              {tags.map((tag) => (
                <span
                  key={tag.label}
                  className={cn('px-1.5 py-0.5 rounded text-[10px] tracking-wide inline-flex items-center gap-1', tag.className)}
                  title={tag.tooltip}
                >
                  {tag.icon}
                  {tag.label ? <span>{tag.label}</span> : null}
                </span>
              ))}
            </div>
          );
        },
      },
      {
        accessorKey: 'size',
        header: t.requestTable.size,
        size: 95,
        cell: ({ row }) => <span className="text-text-secondary">{row.getValue('size')}</span>,
      },
      {
        accessorKey: 'time',
        header: t.requestTable.time,
        size: 95,
        cell: ({ row }) => <span className="text-text-secondary">{row.getValue('time')}</span>,
      },
    ],
    [pendingActionIds, onForward, onDrop, highlightedIds, toggleHighlight, t],
  );

  // Memoized global filter function with pre-compiled regex
  const globalFilterFn = useCallback(
    (row: any, _columnId: string, filterValue: string) => {
      const searchTerm = String(filterValue);
      if (!searchTerm) return true;

      let regex: RegExp | null = null;

      // Build regex based on options
      if (useRegex) {
        try {
          const flags = matchCase ? 'g' : 'gi';
          regex = new RegExp(searchTerm, flags);
        } catch {
          // invalid regex, fallback to literal
          const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          regex = new RegExp(escaped, matchCase ? '' : 'i');
        }
      } else {
        // Literal search
        let pattern = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (matchWholeWord) {
          pattern = `\\b${pattern}\\b`;
        }
        regex = new RegExp(pattern, matchCase ? '' : 'i');
      }

      const match = (value: unknown): boolean => {
        if (value == null) return false;
        const str = String(value);
        if (regex) {
          return regex.test(str);
        }
        return matchCase
          ? str.includes(searchTerm)
          : str.toLowerCase().includes(searchTerm.toLowerCase());
      };

      const request = row.original;

      // Check top-level fields
      if (
        match(request.id) ||
        match(request.method) ||
        match(request.protocol) ||
        match(request.host) ||
        match(request.path) ||
        match(request.status) ||
        match(request.type) ||
        match(request.size) ||
        match(request.time)
      ) {
        return true;
      }

      // Check headers
      const checkHeaders = (headers: Record<string, string>) => {
        return Object.entries(headers).some(([k, v]) => match(k) || match(v));
      };

      if (checkHeaders(request.requestHeaders) || checkHeaders(request.responseHeaders)) {
        return true;
      }

      // Check bodies (limit to first 10KB for performance)
      const limitedRequestBody = request.requestBody?.substring(0, 10240) || '';
      const limitedResponseBody = request.responseBody?.substring(0, 10240) || '';

      if (match(limitedRequestBody) || match(limitedResponseBody)) {
        return true;
      }

      return false;
    },
    [useRegex, matchCase, matchWholeWord],
  );

  const table = useReactTable({
    data: requests,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      globalFilter: debouncedSearchTerm,
      columnVisibility: { id: false },
      rowSelection,
    },
    onGlobalFilterChange: onSearchChange,
    globalFilterFn,
    getRowId: (row) => row.id,
  });

  // Virtualization setup
  const rows = table.getRowModel().rows;
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 32, // Slightly tighter rows
    overscan: 10,
  });

  const [showScrollToSelected, setShowScrollToSelected] = useState(false);

  const handleScroll = useCallback(() => {
    const container = tableContainerRef.current;
    if (!container || !selectedId) {
      setShowScrollToSelected(false);
      return;
    }

    const idx = rows.findIndex((row) => row.original.id === selectedId);
    if (idx === -1) {
      setShowScrollToSelected(false);
      return;
    }

    const rowTop = idx * 32 + 32;
    const scrollTop = container.scrollTop;
    const clientHeight = container.clientHeight;

    const isOutOfView = rowTop < scrollTop + 16 || rowTop > scrollTop + clientHeight - 48;
    setShowScrollToSelected(isOutOfView);
  }, [rows, selectedId]);

  useEffect(() => {
    handleScroll();
  }, [selectedId, handleScroll]);

  const scrollToSelected = () => {
    const idx = rows.findIndex((row) => row.original.id === selectedId);
    if (idx !== -1) {
      rowVirtualizer.scrollToIndex(idx, { align: 'center' });
    }
  };

return (
    <div className="h-full w-full flex flex-col bg-table-bodyBg text-sm overflow-hidden relative">
      {/* Intercept pulse animation */}
      <style>{`
        @keyframes intercept-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes intercept-border-pulse {
          0%, 100% { border-left-color: rgba(245, 158, 11, 0.4); }
          50% { border-left-color: rgba(245, 158, 11, 0.9); }
        }
        .intercept-pending-row {
          animation: intercept-border-pulse 1.5s ease-in-out infinite;
        }
      `}</style>
      {/* Filter Bar */}
      {/* Intercept pulse animation */}
      <style>{`
        @keyframes intercept-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes intercept-border-pulse {
          0%, 100% { border-left-color: rgba(245, 158, 11, 0.4); }
          50% { border-left-color: rgba(245, 158, 11, 0.9); }
        }
        .intercept-pending-row {
          animation: intercept-border-pulse 1.5s ease-in-out infinite;
        }
      `}</style>
      {/* Filter Bar */}
      <div className="h-10 flex items-center px-2 border-b border-divider/40 gap-2 shrink-0">
        <Search className="w-4 h-4 text-text-secondary" />
        <input
          placeholder={t.requestList.filter}
          className="bg-transparent border-none outline-none text-xs flex-1"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        <div className="flex items-center gap-1 border-l border-border/40 pl-2">
          <button
            onClick={() => setMatchCase(!matchCase)}
            className={cn(
              'p-1.5 rounded transition-colors',
              matchCase
                ? 'bg-primary/20 text-primary hover:bg-primary/30'
                : 'text-text-secondary hover:bg-secondary hover:text-text-primary',
            )}
            title={t.requestList.matchCase}
          >
            <CaseSensitive className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setMatchWholeWord(!matchWholeWord)}
            className={cn(
              'p-1.5 rounded transition-colors',
              matchWholeWord
                ? 'bg-indigo-500/20 text-indigo-500 hover:bg-indigo-500/30'
                : 'text-text-secondary hover:bg-secondary hover:text-text-primary',
            )}
            title={t.requestList.matchWholeWord}
          >
            <Type className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setUseRegex(!useRegex)}
            className={cn(
              'p-1.5 rounded transition-colors',
              useRegex
                ? 'bg-success/20 text-success hover:bg-success/30'
                : 'text-text-secondary hover:bg-secondary hover:text-text-primary',
            )}
            title={t.requestList.useRegex}
          >
            <Regex className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div
        ref={tableContainerRef}
        onScroll={handleScroll}
        className="flex-1 flex flex-col overflow-auto relative"
      >
        {/* Header - Moved inside scroll container for horizontal scrolling */}
        <div className="flex h-10 min-h-10 flex-shrink-0 bg-table-headerBg text-sm font-semibold text-text-secondary border-b border-divider/20 sticky top-0 z-10 w-full min-w-max">
          {table.getHeaderGroups().map((headerGroup) => (
            <div key={headerGroup.id} className="flex w-full h-full">
              {headerGroup.headers.map((header) => {
                // Skip hidden columns totally from layout to avoid empty space if size is not 0
                if (header.column.getIsVisible() === false) return null;

                const isHost = header.id === 'host';
                const isPath = header.id === 'path';
                const isFixed = !isHost && !isPath;

                return (
                  <div
                    key={header.id}
                    className={cn(
                      'h-full flex items-center shrink-0 whitespace-nowrap overflow-hidden text-ellipsis',
                      header.id === 'select' ? 'px-2 justify-center' : 'px-4',
                    )}
                    style={{
                      width: isFixed ? header.getSize() : 0, // Should be 0 for flex cols to allow flex-grow to work properly from 0 basis
                      flex: isHost ? '1 1 0px' : isPath ? '2 1 0px' : undefined,
                      minWidth: isHost ? '150px' : isPath ? '300px' : undefined,
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Rows */}
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: 'relative',
            minWidth: 'max-content',
            width: '100%',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const row = rows[virtualRow.index];
            const isIntercepted = interceptedIds?.has(row.original.id);
            const isPending = pendingActionIds?.has(row.original.id);
            const isHighlighted = highlightedIds.has(row.original.id);

            return (
              <ContextMenu key={row.id}>
                <ContextMenuTrigger asChild>
                  <div
                    data-state={row.getValue('id') === selectedId ? 'selected' : undefined}
                    draggable="true"
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/requestId', row.original.id);
                      e.dataTransfer.setData(
                        'application/requestData',
                        JSON.stringify(row.original),
                      );
                      e.dataTransfer.effectAllowed = 'move';
                    }}
                    className={cn(
                      'flex items-center border-b border-divider/20 transition-colors cursor-pointer text-xs absolute left-0 top-0',
                      isPending
                        ? 'bg-amber-500/15 hover:bg-amber-500/25 border-l-4 border-l-amber-500 intercept-pending-row'
                        : isIntercepted
                          ? 'bg-red-500/15 hover:bg-red-500/25 border-l-4 border-l-red-500'
                          : isHighlighted
                            ? 'bg-primary/10 hover:bg-primary/20 border-l-2 border-l-primary'
                            : 'hover:bg-table-hoverItemBodyBg',
                      row.original.id === selectedId &&
                        'bg-primary/15 text-text-primary hover:bg-primary/20 border-l-2 border-l-primary',
                    )}
                    style={{
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                      width: '100%',
                      minWidth: 'max-content',
                    }}
                    onClick={() => onSelect(row.original.id)}
                  >
                    {row.getVisibleCells().map((cell) => {
                      const isHost = cell.column.id === 'host';
                      const isPath = cell.column.id === 'path';
                      const isFixed = !isHost && !isPath;

                      return (
                        <div
                          key={cell.id}
                          className={cn(
                            'py-1.5 whitespace-nowrap overflow-hidden shrink-0 flex items-center',
                            cell.column.id === 'select' ? 'px-2 justify-center' : 'px-4',
                          )}
                          style={{
                            width: isFixed ? cell.column.getSize() : 0,
                            flex: isHost ? '1 1 0px' : isPath ? '2 1 0px' : undefined,
                            minWidth: isHost ? '150px' : isPath ? '300px' : undefined,
                          }}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </div>
                      );
                    })}
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-64">
                  <ContextMenuItem onClick={() => handleCopySingle(row.original)}>
                    <Copy className="mr-2 h-3.5 w-3.5" />
                    <span>{t.requestTable.copyRequest}</span>
                  </ContextMenuItem>
                  {Object.keys(rowSelection).length > 0 && (
                    <ContextMenuSub>
                      <ContextMenuSubTrigger className="cursor-pointer text-xs">
                        <Copy className="mr-2 h-3.5 w-3.5 text-primary" />
                        <span>{t.requestTable.copySelected.replace('{count}', String(Object.keys(rowSelection).length))}</span>
                      </ContextMenuSubTrigger>
                      <ContextMenuSubContent className="w-44 bg-zinc-950 border border-zinc-800 text-text-primary">
                        <ContextMenuItem
                          onClick={handleCopySelectedAsMarkdown}
                          className="cursor-pointer hover:bg-zinc-900 focus:bg-zinc-900 text-xs"
                        >
                          {t.requestTable.copyMarkdown}
                        </ContextMenuItem>
                        <ContextMenuItem
                          onClick={handleCopySelectedAsJson}
                          className="cursor-pointer hover:bg-zinc-900 focus:bg-zinc-900 text-xs"
                        >
                          {t.requestTable.copyJson}
                        </ContextMenuItem>
                      </ContextMenuSubContent>
                    </ContextMenuSub>
                  )}
                  <ContextMenuSeparator />

                  <ContextMenuItem onClick={() => onSetCompare1(row.original)}>
                    <span>{t.requestTable.setCompare1}</span>
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => onSetCompare2(row.original)}>
                    <span>{t.requestTable.setCompare2}</span>
                  </ContextMenuItem>
                  <ContextMenuSeparator />

                  <ContextMenuItem onClick={() => onAnalyzeRequest?.(row.original)}>
                    <BookmarkPlus className="mr-2 h-3.5 w-3.5" />
                    <span>{t.requestTable.analyzeRequest}</span>
                  </ContextMenuItem>

                  <ContextMenuItem onClick={() => onSendToFuzzer?.(row.original)}>
                    <Zap className="mr-2 h-3.5 w-3.5 text-amber-400" />
                    <span>{t.requestTable.sendToFuzzer}</span>
                  </ContextMenuItem>

                  <ContextMenuItem onClick={() => toggleHighlight(row.original.id)}>
                    <Star
                      className={cn(
                        'mr-2 h-3.5 w-3.5',
                        isHighlighted ? 'fill-warning text-warning' : '',
                      )}
                    />
                    <span>{isHighlighted ? t.requestTable.unhighlight : t.requestTable.highlight}</span>
                  </ContextMenuItem>

                  <ContextMenuSeparator />

                  <ContextMenuItem
                    onClick={() => onDelete?.(row.original.id)}
                    className="text-error focus:text-error focus:bg-error/10"
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    <span>{t.requestTable.delete}</span>
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
        </div>

        {rows.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-text-secondary w-full">
            {t.requestList.noRequests}
          </div>
        )}
      </div>
      {Object.keys(rowSelection).length > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-zinc-900 border border-zinc-700/80 rounded-full shadow-2xl px-4 py-2 flex items-center gap-3 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <span className="text-xs font-medium text-zinc-300">
            {t.requestTable.selected.replace('{count}', String(Object.keys(rowSelection).length))}
          </span>
          <div className="w-[1px] h-3.5 bg-zinc-700" />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="text-xs text-primary hover:text-primary-active font-semibold transition-colors flex items-center gap-1.5 focus:outline-none">
                {t.requestTable.copySelectedBtn}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="center"
              className="w-44 bg-zinc-950 border border-zinc-800 text-text-primary z-50"
            >
              <DropdownMenuItem
                onClick={handleCopySelectedAsMarkdown}
                className="cursor-pointer hover:bg-zinc-900 focus:bg-zinc-900 text-xs"
              >
                {t.requestTable.copyMarkdown}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleCopySelectedAsJson}
                className="cursor-pointer hover:bg-zinc-900 focus:bg-zinc-900 text-xs"
              >
                {t.requestTable.copyJson}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={() => setRowSelection({})}
            className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            {t.requestTable.deselect}
          </button>
        </div>
      )}
      {showScrollToSelected && (
        <button
          onClick={scrollToSelected}
          className="absolute bottom-4 right-4 z-40 w-8 h-8 rounded-full bg-primary text-zinc-950 flex items-center justify-center shadow-lg hover:bg-primary/85 active:scale-95 transition-all cursor-pointer border border-primary/20"
          title="Scroll to focused request"
        >
          <Target className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
