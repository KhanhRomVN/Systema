import { useState } from 'react';
import { X, Search, Filter } from 'lucide-react';
import { cn } from '../../../shared/lib/utils';

export interface InspectorFilter {
  methods: {
    GET: boolean;
    POST: boolean;
    PUT: boolean;
    DELETE: boolean;
    OPTIONAL: boolean;
  };
  host: {
    blacklist: string[];
    whitelist: string[];
  };
  path: {
    blacklist: string[];
    whitelist: string[];
  };
  status: {
    success: boolean; // 2xx
    redirect: boolean; // 3xx
    clientError: boolean; // 4xx
    serverError: boolean; // 5xx
    other: boolean;
  };
  type: {
    xhr: boolean;
    js: boolean;
    css: boolean;
    img: boolean;
    media: boolean;
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
  methods: { GET: true, POST: true, PUT: true, DELETE: true, OPTIONAL: true },
  host: { blacklist: [], whitelist: [] },
  path: { blacklist: [], whitelist: [] },
  status: { success: true, redirect: true, clientError: true, serverError: true, other: true },
  type: { xhr: true, js: true, css: true, img: true, media: true, other: true },
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
      <div className="sticky top-0 z-10 px-2 py-2 text-sm font-bold text-muted-foreground border-b border-border/50 bg-muted/20 flex items-center gap-2 backdrop-blur-sm">
        <Filter className="w-4 h-4" />
        FILTERS
      </div>

      <div className="p-4 space-y-6">
        {/* Method */}
        <section>
          <h3 className="text-xs font-semibold mb-2">Method</h3>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'GET', color: 'text-blue-400 border-blue-400/30 bg-blue-400/10' },
              { key: 'POST', color: 'text-green-400 border-green-400/30 bg-green-400/10' },
              { key: 'PUT', color: 'text-orange-400 border-orange-400/30 bg-orange-400/10' },
              { key: 'DELETE', color: 'text-red-400 border-red-400/30 bg-red-400/10' },
              { key: 'OPTIONAL', color: 'text-purple-400 border-purple-400/30 bg-purple-400/10' },
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
          <h3 className="text-xs font-semibold mb-2">Status</h3>
          <div className="flex flex-wrap gap-2">
            {[
              {
                key: 'success',
                label: '2xx',
                color: 'text-green-400 border-green-400/30 bg-green-400/10',
              },
              {
                key: 'redirect',
                label: '3xx',
                color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
              },
              {
                key: 'clientError',
                label: '4xx',
                color: 'text-red-400 border-red-400/30 bg-red-400/10',
              },
              {
                key: 'serverError',
                label: '5xx',
                color: 'text-rose-400 border-rose-400/30 bg-rose-400/10',
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
                    status: {
                      ...filter.status,
                      [key]: !filter.status[key as keyof typeof filter.status],
                    },
                  })
                }
                className={cn(
                  'px-3 py-1 rounded text-xs font-medium border transition-all',
                  filter.status[key as keyof typeof filter.status]
                    ? color
                    : 'text-muted-foreground border-border bg-transparent opacity-50',
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Type */}
        <section>
          <h3 className="text-xs font-semibold mb-2">Type</h3>
          <div className="flex flex-wrap gap-2">
            {[
              {
                key: 'xhr',
                label: 'XHR/Fetch',
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
  lists: { blacklist: string[]; whitelist: string[] };
  onChange: (lists: { blacklist: string[]; whitelist: string[] }) => void;
}) {
  const [blInput, setBlInput] = useState('');
  const [wlInput, setWlInput] = useState('');

  const handleAdd = (type: 'blacklist' | 'whitelist', value: string) => {
    if (!value.trim()) return;
    if (lists[type].includes(value.trim())) return;
    onChange({ ...lists, [type]: [...lists[type], value.trim()] });
  };

  const handleRemove = (type: 'blacklist' | 'whitelist', value: string) => {
    onChange({ ...lists, [type]: lists[type].filter((v) => v !== value) });
  };

  return (
    <section>
      <h3 className="text-xs font-semibold mb-2">{title}</h3>
      <div className="space-y-3">
        {/* Blacklist */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase text-muted-foreground font-bold">Blacklist</label>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-background border border-border/50 rounded px-2 py-1 text-xs focus:border-primary/50 outline-none"
              value={blInput}
              onChange={(e) => setBlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAdd('blacklist', blInput);
                  setBlInput('');
                }
              }}
              placeholder="Add to blacklist..."
            />
          </div>
          {lists.blacklist.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {lists.blacklist.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 bg-red-400/10 text-red-400 px-1.5 py-0.5 rounded text-[10px] border border-red-400/20 group cursor-default"
                >
                  {item}
                  <button
                    onClick={() => handleRemove('blacklist', item)}
                    className="hover:bg-red-400/20 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Whitelist */}
        <div className="space-y-1.5">
          <label className="text-[10px] uppercase text-muted-foreground font-bold">Whitelist</label>
          <div className="flex gap-2">
            <input
              className="flex-1 bg-background border border-border/50 rounded px-2 py-1 text-xs focus:border-primary/50 outline-none"
              value={wlInput}
              onChange={(e) => setWlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAdd('whitelist', wlInput);
                  setWlInput('');
                }
              }}
              placeholder="Add to whitelist..."
            />
          </div>
          {lists.whitelist.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1">
              {lists.whitelist.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-1 bg-green-400/10 text-green-400 px-1.5 py-0.5 rounded text-[10px] border border-green-400/20 group cursor-default"
                >
                  {item}
                  <button
                    onClick={() => handleRemove('whitelist', item)}
                    className="hover:bg-green-400/20 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
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
