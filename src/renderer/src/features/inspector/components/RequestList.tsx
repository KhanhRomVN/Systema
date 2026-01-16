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
import { ArrowUpDown, Search, Copy, Trash2, CaseSensitive, Type, Regex } from 'lucide-react';
import { useDebounce } from 'use-debounce';

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
}: RequestListProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [matchCase, setMatchCase] = useState(false);
  const [matchWholeWord, setMatchWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);

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
        cell: ({ row }) => (
          <span className="truncate block max-w-[200px]">{row.getValue('host')}</span>
        ),
      },
      {
        accessorKey: 'path',
        header: 'Path',
        cell: ({ row }) => (
          <span className="truncate block max-w-[500px]" title={row.getValue('path')}>
            {row.getValue('path')}
          </span>
        ),
        size: 500, // Hint for table sizing
      },
      {
        accessorKey: 'status',
        header: 'Status',
        id: 'status', // Explicitly set ID for the column
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
      },
      {
        accessorKey: 'size',
        header: 'Size',
        cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('size')}</span>,
      },
      {
        accessorKey: 'time',
        header: 'Time',
        cell: ({ row }) => <span className="text-muted-foreground">{row.getValue('time')}</span>,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(
                  `${row.original.method} ${row.original.protocol}://${row.original.host}${row.original.path}`,
                );
              }}
              className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
              title="Copy Request URL"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(row.original.id);
              }}
              className="p-1 hover:bg-red-500/20 rounded text-muted-foreground hover:text-red-500"
              title="Delete Request"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ),
      },
    ],
    [pendingActionIds, onForward, onDrop, onDelete],
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
    estimateSize: () => 35,
    overscan: 10,
  });

  return (
    <div className="h-full w-full flex flex-col bg-background/50 text-sm overflow-hidden">
      {/* Filter Bar */}
      <div className="h-10 flex items-center px-2 border-b border-border/40 gap-2">
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

      <div ref={tableContainerRef} className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-muted/50 sticky top-0 z-10 text-xs font-medium text-muted-foreground">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="px-4 py-2 font-normal">
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = rows[virtualRow.index];
              const isIntercepted = interceptedIds?.has(row.original.id);
              const isPending = pendingActionIds?.has(row.original.id);

              return (
                <tr
                  key={row.id}
                  data-state={row.getValue('id') === selectedId ? 'selected' : undefined}
                  className={cn(
                    'border-b border-border/20 transition-colors cursor-pointer text-xs absolute w-full',
                    isPending
                      ? 'bg-orange-500/10 hover:bg-orange-500/20'
                      : isIntercepted
                        ? 'bg-red-500/10 hover:bg-red-500/20'
                        : 'hover:bg-muted/50',
                    row.original.id === selectedId &&
                      'bg-accent text-accent-foreground hover:bg-accent',
                  )}
                  style={{
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  onClick={() => onSelect(row.original.id)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-1.5 whitespace-nowrap">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No requests found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
