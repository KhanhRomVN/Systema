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
import { NetworkRequest } from '../types';
import { useState, useMemo, useRef, useCallback } from 'react';
import { cn } from '../../../shared/lib/utils';
import {
  ArrowUpDown,
  Search,
  Copy,
  Trash2,
  CaseSensitive,
  Type,
  Regex,
  MoreVertical,
  BookmarkPlus,
  Star,
} from 'lucide-react';
import { useDebounce } from 'use-debounce';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../../components/ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '../../../components/ui/context-menu';
import { addRequestToDefaultCollection } from '../utils/collections';

interface RequestActionsProps {
  request: NetworkRequest;
  isHighlighted: boolean;
  onToggleHighlight: (id: string) => void;
  onDelete?: (id: string) => void;
  appId: string;
  onSetCompare1: (req: NetworkRequest) => void;
  onSetCompare2: (req: NetworkRequest) => void;
}

function RequestActions({
  request,
  isHighlighted,
  onToggleHighlight,
  onDelete,
  appId,
}: RequestActionsProps) {
  return (
    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          navigator.clipboard.writeText(
            `${request.method} ${request.protocol}://${request.host}${request.path}`,
          );
        }}
        className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
        title="Copy Request URL"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground outline-none"
            title="More Actions"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onSetCompare1(request);
            }}
          >
            <span>Set as Compare 1</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onSetCompare2(request);
            }}
          >
            <span>Set as Compare 2</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              addRequestToDefaultCollection(appId, request);
            }}
          >
            <BookmarkPlus className="mr-2 h-3.5 w-3.5" />
            <span>Add to Collection</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onToggleHighlight(request.id);
            }}
          >
            <Star
              className={cn(
                'mr-2 h-3.5 w-3.5',
                isHighlighted ? 'fill-yellow-500 text-yellow-500' : '',
              )}
            />
            <span>{isHighlighted ? 'Unhighlight' : 'Highlight'}</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.(request.id);
            }}
            className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

interface RequestListProps {
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
}

export function RequestList({
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
}: RequestListProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [matchCase, setMatchCase] = useState(false);
  const [matchWholeWord, setMatchWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);

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

  // Debounce search term to reduce re-renders
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  const columns = useMemo<ColumnDef<NetworkRequest>[]>(
    () => [
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
        cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('id')}</span>,
        // Hiding detailed ID column to save space, but keeping it in data model
        size: 0,
        enableHiding: true,
      },
      {
        accessorKey: 'method',
        header: 'Method',
        size: 80,
        cell: ({ row }) => {
          const method = row.getValue('method') as string;
          let colorClass = 'text-foreground';
          if (method === 'GET') colorClass = 'text-blue-400';
          if (method === 'POST') colorClass = 'text-green-400';
          if (method === 'PUT') colorClass = 'text-orange-400';
          if (method === 'DELETE') colorClass = 'text-red-400';
          return <span className={cn('font-bold', colorClass)}>{method}</span>;
        },
      },
      {
        accessorKey: 'host',
        header: 'Host',
        size: 200,
        cell: ({ row }) => (
          <span className="truncate block w-full" title={row.getValue('host')}>
            {row.getValue('host')}
          </span>
        ),
      },
      {
        accessorKey: 'path',
        header: 'Path',
        size: 400,
        cell: ({ row }) => (
          <span className="truncate block w-full" title={row.getValue('path')}>
            {row.getValue('path')}
          </span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        id: 'status', // Explicitly set ID for the column
        size: 100,
        cell: ({ row }) => {
          const id = row.original.id;
          const isPending = pendingActionIds?.has(id);
          const status = row.getValue('status') as number;

          if (isPending) {
            return (
              <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <span className="text-orange-500 font-bold animate-pulse text-[10px]">PAUSED</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onForward?.(id);
                  }}
                  className="px-2 py-0.5 bg-green-500/20 text-green-500 hover:bg-green-500/30 rounded text-[10px] border border-green-500/50"
                  title="Forward Request"
                >
                  Fwd
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDrop?.(id);
                  }}
                  className="px-2 py-0.5 bg-red-500/20 text-red-500 hover:bg-red-500/30 rounded text-[10px] border border-red-500/50"
                  title="Drop Request"
                >
                  Drop
                </button>
              </div>
            );
          }

          let colorClass = 'text-foreground';
          if (status >= 200 && status < 300) colorClass = 'text-green-400';
          else if (status >= 300 && status < 400) colorClass = 'text-yellow-400';
          else if (status >= 400) colorClass = 'text-red-400';
          return <span className={colorClass}>{status || 'Pending'}</span>;
        },
      },
      {
        accessorKey: 'type',
        header: 'Type',
        size: 80,
      },
      {
        accessorKey: 'size',
        header: 'Size',
        size: 80,
        cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('size')}</span>,
      },
      {
        accessorKey: 'time',
        header: 'Time',
        size: 80,
        cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('time')}</span>,
      },
      {
        id: 'actions',
        header: 'Actions',
        size: 80,
        cell: ({ row }) => (
          <RequestActions
            request={row.original}
            isHighlighted={highlightedIds.has(row.original.id)}
            onToggleHighlight={toggleHighlight}
            onDelete={onDelete}
            appId={appId}
            onSetCompare1={onSetCompare1}
            onSetCompare2={onSetCompare2}
          />
        ),
      },
    ],
    [
      pendingActionIds,
      onForward,
      onDrop,
      onDelete,
      highlightedIds,
      toggleHighlight,
      onSetCompare1,
      onSetCompare2,
    ],
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
    state: {
      sorting,
      globalFilter: debouncedSearchTerm,
      columnVisibility: { id: false },
    },
    onGlobalFilterChange: onSearchChange,
    globalFilterFn,
  });

  // Virtualization setup
  const rows = table.getRowModel().rows;
  const rowVirtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 32, // Slightly tighter rows
    overscan: 10,
  });

  return (
    <div className="h-full w-full flex flex-col bg-background/50 text-sm overflow-hidden">
      {/* Filter Bar */}
      <div className="h-10 flex items-center px-2 border-b border-border/40 gap-2 shrink-0">
        <Search className="w-4 h-4 text-muted-foreground" />
        <input
          placeholder="Filter requests..."
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
                ? 'bg-blue-500/20 text-blue-500 hover:bg-blue-500/30'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
            title="Match Case"
          >
            <CaseSensitive className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setMatchWholeWord(!matchWholeWord)}
            className={cn(
              'p-1.5 rounded transition-colors',
              matchWholeWord
                ? 'bg-purple-500/20 text-purple-500 hover:bg-purple-500/30'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
            title="Match Whole Word"
          >
            <Type className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setUseRegex(!useRegex)}
            className={cn(
              'p-1.5 rounded transition-colors',
              useRegex
                ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
            title="Use Regular Expression"
          >
            <Regex className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div ref={tableContainerRef} className="flex-1 flex flex-col overflow-auto relative">
        {/* Header - Moved inside scroll container for horizontal scrolling */}
        <div className="flex bg-muted/50 text-xs font-medium text-muted-foreground border-b border-border/20 sticky top-0 z-10 w-full min-w-max">
          {table.getHeaderGroups().map((headerGroup) => (
            <div key={headerGroup.id} className="flex w-full">
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
                      'px-4 py-2 flex items-center font-normal shrink-0',
                      // No flex-1/2 classes to avoid confusion, styles handle it
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
                    className={cn(
                      'flex items-center border-b border-border/20 transition-colors cursor-pointer text-xs absolute left-0 top-0',
                      isPending
                        ? 'bg-orange-500/10 hover:bg-orange-500/20'
                        : isIntercepted
                          ? 'bg-red-500/10 hover:bg-red-500/20'
                          : isHighlighted
                            ? 'bg-blue-500/10 hover:bg-blue-500/20 border-l-2 border-l-blue-500' // Highlight style
                            : 'hover:bg-muted/50',
                      row.original.id === selectedId &&
                        'bg-accent text-accent-foreground hover:bg-accent',
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
                          className="px-4 py-1.5 whitespace-nowrap overflow-hidden shrink-0 flex items-center"
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
                <ContextMenuContent className="w-48">
                  <ContextMenuItem
                    onClick={() => {
                      onSetCompare1(row.original);
                    }}
                  >
                    <span>Set as Compare 1</span>
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() => {
                      onSetCompare2(row.original);
                    }}
                  >
                    <span>Set as Compare 2</span>
                  </ContextMenuItem>
                  <ContextMenuSeparator />

                  <ContextMenuItem
                    onClick={() => {
                      addRequestToDefaultCollection(appId, row.original);
                    }}
                  >
                    <BookmarkPlus className="mr-2 h-3.5 w-3.5" />
                    <span>Add to Collection</span>
                  </ContextMenuItem>

                  <ContextMenuItem
                    onClick={() => {
                      toggleHighlight(row.original.id);
                    }}
                  >
                    <Star
                      className={cn(
                        'mr-2 h-3.5 w-3.5',
                        isHighlighted ? 'fill-yellow-500 text-yellow-500' : '',
                      )}
                    />
                    <span>{isHighlighted ? 'Unhighlight' : 'Highlight'}</span>
                  </ContextMenuItem>

                  <ContextMenuSeparator />

                  <ContextMenuItem
                    onClick={() => {
                      onDelete?.(row.original.id);
                    }}
                    className="text-red-500 focus:text-red-500 focus:bg-red-500/10"
                  >
                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                    <span>Delete</span>
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}

          {rows.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground w-full">
              No requests found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
