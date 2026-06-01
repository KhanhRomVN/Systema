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
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpDown,
  BookmarkPlus,
  Box,
  CaseSensitive,
  Check,
  ChevronRight,
  Cookie,
  Copy,
  Globe,
  List,
  Regex,
  Search,
  ShieldAlert,
  Star,
  Target,
  Trash2,
  Type,
  Zap,
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
  onSelectionChange?: (selectedIds: string[]) => void;
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
  onSelectionChange,
}: RequestTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [matchCase, setMatchCase] = useState(false);
  const [matchWholeWord, setMatchWholeWord] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const [rowSelection, setRowSelection] = useState({});
  const [contextMenuPage, setContextMenuPage] = useState<string | null>(null);
  const [contextMenuTarget, setContextMenuTarget] = useState<NetworkRequest | null>(null);
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

  const formatRequestToJson = (req: NetworkRequest): string => {
    const entry: any = {
      method: req.method,
      host: req.host,
      path: req.path,
      protocol: req.protocol,
      url: req.url,
      status: req.status,
      type: req.type,
    };
    if (req.requestHeaders && Object.keys(req.requestHeaders).length > 0) {
      entry.requestHeaders = req.requestHeaders;
    }
    if (req.requestBody) {
      entry.requestBody = req.requestBody;
    }
    return JSON.stringify(entry, null, 2);
  };

  const handleCopySingleAsMarkdown = (req: NetworkRequest) => {
    navigator.clipboard.writeText(formatRequestToMarkdown(req));
  };

  const handleCopySingleAsJson = (req: NetworkRequest) => {
    navigator.clipboard.writeText(formatRequestToJson(req));
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

  // Copy Selected with section options
  const [copySections, setCopySections] = useState({
    status: true,
    headers: true,
    body: true,
    security: true,
  });
  const [copyFormat, setCopyFormat] = useState<'json' | 'markdown'>('json');

  const toggleCopySection = (section: keyof typeof copySections) => {
    setCopySections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const formatSelectedWithOptions = (): string => {
    const selectedRows = table.getSelectedRowModel().rows;
    if (selectedRows.length === 0) return '';

    const selectedRequests = selectedRows.map((row) => row.original);

    if (copyFormat === 'json') {
      const data = selectedRequests.map((req) => {
        const entry: any = {};
        if (copySections.status) {
          entry.status = req.status;
          entry.type = req.type;
          entry.host = req.host;
          entry.path = req.path;
          entry.method = req.method;
          entry.protocol = req.protocol;
        }
        if (copySections.headers) {
          entry.requestHeaders = req.requestHeaders;
          entry.responseHeaders = req.responseHeaders;
        }
        if (copySections.body) {
          entry.requestBody = req.requestBody || '';
          entry.responseBody = req.responseBody || '';
        }
        if (copySections.security) {
          entry.securityIssues = req.securityIssues || [];
        }
        return entry;
      });
      return JSON.stringify(data, null, 2);
    }

    // Markdown format
    return selectedRequests
      .map((req) => {
        let md = '';
        if (copySections.status) {
          md += `### \`${req.method}\` ${req.protocol}://${req.host}${req.path}\n\n`;
          md += `| Status | Type |\n|--------|------|\n| ${req.status} | ${req.type} |\n\n`;
        }
        if (copySections.headers) {
          md += '**Request Headers:**\n```http\n';
          md += req.requestHeaders && Object.keys(req.requestHeaders).length > 0
            ? Object.entries(req.requestHeaders).map(([k, v]) => `${k}: ${v}`).join('\n')
            : '(No headers)';
          md += '\n```\n\n';
          md += '**Response Headers:**\n```http\n';
          md += req.responseHeaders && Object.keys(req.responseHeaders).length > 0
            ? Object.entries(req.responseHeaders).map(([k, v]) => `${k}: ${v}`).join('\n')
            : '(No headers)';
          md += '\n```\n\n';
        }
        if (copySections.body) {
          md += '**Request Body:**\n```\n';
          md += req.requestBody || '(No body)';
          md += '\n```\n\n';
          md += '**Response Body:**\n```\n';
          if (req.responseBody) {
            const trimmed = req.responseBody.trim();
            if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
              try {
                md += JSON.stringify(JSON.parse(trimmed), null, 2);
              } catch {
                md += req.responseBody;
              }
            } else {
              md += req.responseBody;
            }
          } else {
            md += '(No body)';
          }
          md += '\n```\n\n';
        }
        if (copySections.security) {
          md += '**Security Issues:**\n';
          const issues = req.securityIssues || [];
          if (issues.length > 0) {
            issues.forEach((issue) => {
              md += `- **${issue.severity.toUpperCase()}**: ${issue.title} - ${issue.description}\n`;
            });
          } else {
            md += '*(No security issues)*\n';
          }
          md += '\n';
        }
        return md;
      })
      .join('\n---\n\n');
  };

  const handleCopySelectedWithOptions = () => {
    const text = formatSelectedWithOptions();
    if (text) {
      navigator.clipboard.writeText(text);
    }
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
        size: 150,
        minSize: 100,
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

  useEffect(() => {
    onSelectionChange?.(Object.keys(rowSelection));
  }, [rowSelection, onSelectionChange]);

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
              <ContextMenu
                key={row.id}
                onOpenChange={(open) => {
                  if (!open) {
                    setContextMenuPage(null);
                    setContextMenuTarget(null);
                  }
                }}
              >
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
                <ContextMenuContent className="w-56">
                  {contextMenuPage === 'copy' && contextMenuTarget ? (
                    <>
                      <ContextMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          setContextMenuPage(null);
                        }}
                        className="cursor-pointer"
                      >
                        <ArrowLeft className="mr-2 h-3.5 w-3.5 text-text-secondary" />
                        <span className="text-text-secondary">Back</span>
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        onClick={() => {
                          handleCopySingleAsMarkdown(contextMenuTarget);
                          setContextMenuPage(null);
                        }}
                        className="cursor-pointer"
                      >
                        {t.requestTable.copyMarkdown}
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={() => {
                          handleCopySingleAsJson(contextMenuTarget);
                          setContextMenuPage(null);
                        }}
                        className="cursor-pointer"
                      >
                        {t.requestTable.copyJson}
                      </ContextMenuItem>
                    </>
                  ) : contextMenuPage === 'compare' && contextMenuTarget ? (
                    <>
                      <ContextMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          setContextMenuPage(null);
                        }}
                        className="cursor-pointer"
                      >
                        <ArrowLeft className="mr-2 h-3.5 w-3.5 text-text-secondary" />
                        <span className="text-text-secondary">Back</span>
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        onClick={() => {
                          onSetCompare1(contextMenuTarget);
                          setContextMenuPage(null);
                        }}
                        className="cursor-pointer"
                      >
                        {t.requestTable.setCompare1}
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={() => {
                          onSetCompare2(contextMenuTarget);
                          setContextMenuPage(null);
                        }}
                        className="cursor-pointer"
                      >
                        {t.requestTable.setCompare2}
                      </ContextMenuItem>
                    </>
                  ) : (
                    <>
                      <ContextMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          setContextMenuPage('copy');
                          setContextMenuTarget(row.original);
                        }}
                        className="cursor-pointer"
                      >
                        <Copy className="mr-2 h-3.5 w-3.5 text-blue-400" />
                        <span>{t.common.copy}</span>
                        <ChevronRight className="ml-auto h-3.5 w-3.5 text-text-secondary" />
                      </ContextMenuItem>

                      <ContextMenuSeparator />

                      <ContextMenuItem
                        onSelect={(e) => {
                          e.preventDefault();
                          setContextMenuPage('compare');
                          setContextMenuTarget(row.original);
                        }}
                        className="cursor-pointer"
                      >
                        <ArrowLeftRight className="mr-2 h-3.5 w-3.5 text-emerald-400" />
                        <span>{t.requestTable.sendToCompare}</span>
                        <ChevronRight className="ml-auto h-3.5 w-3.5 text-text-secondary" />
                      </ContextMenuItem>

                      <ContextMenuSeparator />

                      <ContextMenuItem onClick={() => onAnalyzeRequest?.(row.original)}>
                        <BookmarkPlus className="mr-2 h-3.5 w-3.5 text-indigo-400" />
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
                            isHighlighted ? 'fill-warning text-warning' : 'text-yellow-400',
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
                    </>
                  )}
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
              sideOffset={10}
              className="min-w-[340px]"
            >
              {/* Header */}
              <div className="flex items-center gap-2 px-2.5 py-2">
                <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Copy className="w-3.5 h-3.5 text-primary" />
                </div>
                <div>
                  <div className="text-xs font-semibold text-zinc-200">
                    {t.requestTable.copySelectedBtn}
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    {Object.keys(rowSelection).length} {t.requestTable.selected.replace('{count}', '')}
                  </div>
                </div>
              </div>

              <div className="h-px bg-zinc-800/60 mx-1" />

              {/* Sections */}
              <div className="px-2 pt-2 pb-1">
                <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-1">
                  {t.requestTable.copySections || 'Sections'}
                </div>
                <div className="space-y-0.5">
                  {([
                    { key: 'status' as const, label: t.requestTable.copySectionStatus || 'Status + Type + Host + Path', icon: Globe },
                    { key: 'headers' as const, label: t.requestTable.copySectionHeaders || 'Headers', icon: List },
                    { key: 'body' as const, label: t.requestTable.copySectionBody || 'Body', icon: Box },
                    { key: 'security' as const, label: t.requestTable.copySectionSecurity || 'Security', icon: ShieldAlert },
                  ]).map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCopySection(key); }}
                      className={cn(
                        'w-full flex items-center gap-5 px-2.5 py-2 rounded-lg transition-all duration-150 text-xs',
                        copySections[key]
                          ? 'bg-zinc-800/80 text-zinc-200'
                          : 'text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800/40',
                      )}
                    >
                      <Icon className={cn(
                        'w-3.5 h-3.5 shrink-0 transition-colors',
                        copySections[key] ? 'text-primary' : 'text-zinc-600',
                      )} />
                      <span className="flex-1 text-left">{label}</span>
                      <div className={cn(
                        'w-7 h-4 rounded-md relative transition-all duration-200 shrink-0',
                        copySections[key]
                          ? 'bg-primary/40 border border-primary/50'
                          : 'bg-zinc-700/50 border border-zinc-600/50',
                      )}>
                        <div className={cn(
                          'absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-sm transition-all duration-200 shadow-sm',
                          copySections[key]
                            ? 'left-[calc(100%-0.85rem)] bg-primary'
                            : 'left-0.5 bg-zinc-400',
                        )} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-px bg-zinc-800/60 mx-1 mt-1" />

              {/* Format */}
              <div className="px-2 pt-2 pb-1">
                <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2 px-1">
                  {t.requestTable.copyFormatLabel || 'Format'}
                </div>
                <div className="flex gap-1 p-0.5 bg-zinc-900 rounded-lg border border-zinc-800">
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCopyFormat('json'); }}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
                      copyFormat === 'json'
                        ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-400',
                    )}
                  >
                    <span className="text-[10px] font-mono font-bold bg-primary/10 text-primary px-1 rounded">&#123;&#125;</span>
                    JSON
                  </button>
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setCopyFormat('markdown'); }}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all duration-150',
                      copyFormat === 'markdown'
                        ? 'bg-zinc-800 text-zinc-100 shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-400',
                    )}
                  >
                    <span className="text-[10px] font-mono font-bold text-amber-400/80">M↓</span>
                    Markdown
                  </button>
                </div>
              </div>

              <div className="h-px bg-zinc-800/60 mx-1 mt-1" />

              {/* Copy Button */}
              <div className="px-2 py-2">
                <button
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleCopySelectedWithOptions(); }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-white text-xs font-semibold transition-all duration-150 active:scale-[0.98] shadow-sm shadow-primary/20"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {t.requestTable.copyToClipboard || 'Copy to Clipboard'}
                </button>
              </div>
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
