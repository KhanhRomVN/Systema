import { useState } from 'react';
import { X, Search, Filter } from 'lucide-react';
import { cn } from '../../../shared/lib/utils';

export interface InspectorFilter {
  methods: {
    GET: boolean;
    POST: boolean;
    PUT: boolean;
    PATCH: boolean;
    DELETE: boolean;
    HEAD: boolean;
    OPTIONS: boolean;
    TRACE: boolean;
    CONNECT: boolean;
  };
  host: {
    whitelist: string[];
  };
  path: {
    whitelist: string[];
  };
  status: {
    [key: number]: boolean;
  };
  type: {
    xhr: boolean;
    js: boolean;
    css: boolean;
    img: boolean;
    media: boolean;
    font: boolean;
    doc: boolean;
    ws: boolean;
    wasm: boolean;
    manifest: boolean;
    other: boolean;
  };
  size: {
    min: string;
    max: string;
  };
  time: {
    min: string;
    max: string;
  };
}

export const initialFilterState: InspectorFilter = {
  methods: {
    GET: true,
    POST: true,
    PUT: true,
    PATCH: false,
    DELETE: true,
    HEAD: false,
    OPTIONS: true,
    TRACE: false,
    CONNECT: false,
  },
  host: { whitelist: [] },
  path: { whitelist: [] },
  status: {
    200: true,
    201: true,
    202: true,
    204: true,
    206: true,
    301: true,
    302: true,
    304: true,
    307: true,
    308: true,
    400: true,
    401: true,
    403: true,
    404: true,
    405: true,
    409: true,
    422: true,
    429: true,
    500: true,
    501: true,
    502: true,
    503: true,
    504: true,
    505: true,
  },
  type: {
    xhr: true,
    js: true,
    css: true,
    img: true,
    media: true,
    font: true,
    doc: true,
    ws: true,
    wasm: true,
    manifest: true,
    other: true,
  },
  size: { min: '', max: '' },
  time: { min: '', max: '' },
};

interface FilterPanelProps {
  filter: InspectorFilter;
  onChange: (filter: InspectorFilter) => void;
}

export function FilterPanel({ filter, onChange }: FilterPanelProps) {
  return (
    <div className="h-full overflow-auto bg-background/50 border-l border-border/50 flex flex-col font-sans select-none">
      <div className="p-4 space-y-6">
        {/* Method */}
        <section>
          <h3 className="text-xs font-semibold mb-2">Method</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'GET', color: 'text-blue-400 border-blue-400/30 bg-blue-400/10' },
              { key: 'POST', color: 'text-green-400 border-green-400/30 bg-green-400/10' },
              { key: 'PUT', color: 'text-orange-400 border-orange-400/30 bg-orange-400/10' },
              { key: 'PATCH', color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' },
              { key: 'DELETE', color: 'text-red-400 border-red-400/30 bg-red-400/10' },
              { key: 'HEAD', color: 'text-gray-400 border-gray-400/30 bg-gray-400/10' },
              { key: 'OPTIONS', color: 'text-purple-400 border-purple-400/30 bg-purple-400/10' },
              { key: 'TRACE', color: 'text-indigo-400 border-indigo-400/30 bg-indigo-400/10' },
              { key: 'CONNECT', color: 'text-rose-400 border-rose-400/30 bg-rose-400/10' },
            ].map(({ key, color }) => (
              <button
                key={key}
                onClick={() =>
                  onChange({
                    ...filter,
                    methods: {
                      ...filter.methods,
                      [key]: !filter.methods[key as keyof typeof filter.methods],
                    },
                  })
                }
                className={cn(
                  'px-3 py-1 rounded text-xs font-medium border transition-all',
                  filter.methods[key as keyof typeof filter.methods]
                    ? color
                    : 'text-muted-foreground border-border bg-transparent opacity-50',
                )}
              >
                {key}
              </button>
            ))}
          </div>
        </section>

        {/* Host */}
        <ListFilterSection
          title="Host"
          lists={filter.host}
          onChange={(newHost) => onChange({ ...filter, host: newHost })}
        />

        {/* Path */}
        <ListFilterSection
          title="Path"
          lists={filter.path}
          onChange={(newPath) => onChange({ ...filter, path: newPath })}
        />

        {/* Status */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold">Status</h3>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const allTrue = Object.keys(filter.status).every((k) => filter.status[Number(k)]);
                  const newStatus = { ...filter.status };
                  Object.keys(newStatus).forEach((k) => (newStatus[Number(k)] = !allTrue));
                  onChange({ ...filter, status: newStatus });
                }}
                className="text-[10px] text-blue-400 hover:underline"
              >
                Toggle All
              </button>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[
              200, 201, 202, 204, 206, 301, 302, 304, 307, 308, 400, 401, 403, 404, 405, 409, 422,
              429, 500, 501, 502, 503, 504, 505,
            ].map((code) => {
              let color = 'text-gray-400 border-gray-400/30 bg-gray-400/10';
              if (code >= 200 && code < 300)
                color = 'text-green-400 border-green-400/30 bg-green-400/10';
              else if (code >= 300 && code < 400)
                color = 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
              else if (code >= 400 && code < 500)
                color = 'text-red-400 border-red-400/30 bg-red-400/10';
              else if (code >= 500) color = 'text-rose-400 border-rose-400/30 bg-rose-400/10';

              return (
                <button
                  key={code}
                  onClick={() =>
                    onChange({
                      ...filter,
                      status: {
                        ...filter.status,
                        [code]: !filter.status[code],
                      },
                    })
                  }
                  className={cn(
                    'px-1 py-1 rounded text-[10px] font-medium border transition-all text-center',
                    filter.status[code]
                      ? color
                      : 'text-muted-foreground border-border bg-transparent opacity-50',
                  )}
                >
                  {code}
                </button>
              );
            })}
          </div>
        </section>

        {/* Type */}
        <section>
          <h3 className="text-xs font-semibold mb-2">Type</h3>
          <div className="flex flex-wrap gap-2">
            {[
              {
                key: 'xhr',
                label: 'Fetch/XHR',
                color: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10',
              },
              {
                key: 'js',
                label: 'JS',
                color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
              },
              {
                key: 'css',
                label: 'CSS',
                color: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
              },
              {
                key: 'img',
                label: 'Img',
                color: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
              },
              {
                key: 'media',
                label: 'Media',
                color: 'text-pink-400 border-pink-400/30 bg-pink-400/10',
              },
              {
                key: 'font',
                label: 'Font',
                color: 'text-orange-400 border-orange-400/30 bg-orange-400/10',
              },
              {
                key: 'doc',
                label: 'Doc',
                color: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10',
              },
              {
                key: 'ws',
                label: 'WS',
                color: 'text-teal-400 border-teal-400/30 bg-teal-400/10',
              },
              {
                key: 'wasm',
                label: 'Wasm',
                color: 'text-violet-400 border-violet-400/30 bg-violet-400/10',
              },
              {
                key: 'manifest',
                label: 'Manifest',
                color: 'text-lime-400 border-lime-400/30 bg-lime-400/10',
              },
              {
                key: 'other',
                label: 'Other',
                color: 'text-gray-400 border-gray-400/30 bg-gray-400/10',
              },
            ].map(({ key, label, color }) => (
              <button
                key={key}
                onClick={() =>
                  onChange({
                    ...filter,
                    type: { ...filter.type, [key]: !filter.type[key as keyof typeof filter.type] },
                  })
                }
                className={cn(
                  'px-3 py-1 rounded text-xs font-medium border transition-all',
                  filter.type[key as keyof typeof filter.type]
                    ? color
                    : 'text-muted-foreground border-border bg-transparent opacity-50',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Size */}
        <RangeFilterSection
          title="Size"
          values={filter.size}
          onChange={(newSize) => onChange({ ...filter, size: newSize })}
          placeholder={['Min (bytes)', 'Max (bytes)']}
        />

        {/* Time */}
        <RangeFilterSection
          title="Time"
          values={filter.time}
          onChange={(newTime) => onChange({ ...filter, time: newTime })}
          placeholder={['Min (ms)', 'Max (ms)']}
        />
      </div>
    </div>
  );
}

function ListFilterSection({
  title,
  lists,
  onChange,
}: {
  title: string;
  lists: { whitelist: string[] };
  onChange: (lists: { whitelist: string[] }) => void;
}) {
  const [input, setInput] = useState('');

  const handleAdd = (value: string) => {
    if (!value.trim()) return;
    const currentList = lists.whitelist || [];
    if (currentList.includes(value.trim())) return;
    onChange({ ...lists, whitelist: [...currentList, value.trim()] });
  };

  const handleRemove = (value: string) => {
    const currentList = lists.whitelist || [];
    onChange({ ...lists, whitelist: currentList.filter((v) => v !== value) });
  };

  return (
    <section>
      <h3 className="text-xs font-semibold mb-2">{title}</h3>
      <div className="space-y-1.5">
        <div className="flex gap-2">
          <input
            className="flex-1 bg-background border border-border/50 rounded px-2 py-1 text-xs focus:border-primary/50 outline-none"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleAdd(input);
                setInput('');
              }
            }}
            placeholder={`Filter ${title}... (Press Enter to include)`}
          />
        </div>
        {(lists.whitelist || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {(lists.whitelist || []).map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1 bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[10px] border border-primary/20 group cursor-default"
              >
                {item}
                <button
                  onClick={() => handleRemove(item)}
                  className="hover:bg-primary/20 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function RangeFilterSection({
  title,
  values,
  onChange,
  placeholder,
}: {
  title: string;
  values: { min: string; max: string };
  onChange: (val: { min: string; max: string }) => void;
  placeholder: [string, string];
}) {
  return (
    <section>
      <h3 className="text-xs font-semibold mb-2">{title}</h3>
      <div className="flex gap-2">
        <input
          type="number"
          placeholder={placeholder[0]}
          value={values.min}
          onChange={(e) => onChange({ ...values, min: e.target.value })}
          className="flex-1 min-w-0 bg-background border border-border/50 rounded px-2 py-1 text-xs focus:border-primary/50 outline-none"
        />
        <span className="text-muted-foreground">-</span>
        <input
          type="number"
          placeholder={placeholder[1]}
          value={values.max}
          onChange={(e) => onChange({ ...values, max: e.target.value })}
          className="flex-1 min-w-0 bg-background border border-border/50 rounded px-2 py-1 text-xs focus:border-primary/50 outline-none"
        />
      </div>
    </section>
  );
}
