import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
} from '@tanstack/react-table';
import { NetworkRequest } from '../types';
import { useState } from 'react';
import { cn } from '../../../shared/lib/utils';
import { ArrowUpDown } from 'lucide-react';

interface RequestListProps {
  requests: NetworkRequest[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const columns: ColumnDef<NetworkRequest>[] = [
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
    cell: ({ row }) => <span className="truncate block max-w-[200px]">{row.getValue('host')}</span>,
  },
  {
    accessorKey: 'path',
    header: 'Path',
    cell: ({ row }) => (
      <span className="truncate block max-w-[300px]" title={row.getValue('path')}>
        {row.getValue('path')}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as number;
      let colorClass = 'text-foreground';
      if (status >= 200 && status < 300) colorClass = 'text-green-400';
      else if (status >= 300 && status < 400) colorClass = 'text-yellow-400';
      else if (status >= 400) colorClass = 'text-red-400';
      return <span className={colorClass}>{status}</span>;
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
];

export function RequestList({ requests, selectedId, onSelect }: RequestListProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data: requests,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
  });

  return (
    <div className="h-full w-full overflow-auto bg-background/50 text-sm">
      <table className="w-full text-left border-collapse">
        <thead className="bg-muted/50 sticky top-0 z-10 backdrop-blur-sm">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} className="border-b border-border/50">
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className="h-8 px-4 font-medium text-muted-foreground select-none"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                data-state={row.getValue('id') === selectedId ? 'selected' : undefined}
                className={cn(
                  'border-b border-border/20 hover:bg-muted/50 transition-colors cursor-pointer text-xs',
                  row.original.id === selectedId &&
                    'bg-accent text-accent-foreground hover:bg-accent',
                )}
                onClick={() => onSelect(row.original.id)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-4 py-1.5 whitespace-nowrap">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                No requests recorded.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
