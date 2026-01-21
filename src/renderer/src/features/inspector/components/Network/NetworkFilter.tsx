import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '../../../../shared/lib/utils';
import { Slider } from '../../../../components/ui/slider';

export interface NetworkRequest {
  id: string;
  host: string;
  path: string;
  [key: string]: any;
}

// Helper to determine request category (duplicated from InspectorLayout roughly, or we should share it)
// We'll use a simplified version here for availability check
export function getRequestCategory(req: NetworkRequest): string {
  const type = (req.type || '').toLowerCase();

  if (type.includes('xhr') || type.includes('fetch')) return 'xhr';
  if (type.includes('js') || type.includes('script') || req.path.match(/\.js(\?|$)/)) return 'js';
  if (type.includes('css') || req.path.match(/\.css(\?|$)/)) return 'css';
  if (
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
    return 'img';
  if (
    type.includes('media') ||
    type.includes('video') ||
    type.includes('audio') ||
    req.path.match(/\.(mp4|webm|ogg|mp3|wav)(\?|$)/)
  )
    return 'media';
  if (
    type.includes('font') ||
    type.includes('woff') ||
    type.includes('ttf') ||
    req.path.match(/\.(woff|woff2|ttf|otf|eot)(\?|$)/)
  )
    return 'font';
  if (
    type.includes('ws') ||
    type.includes('websocket') ||
    req.protocol === 'ws' ||
    req.protocol === 'wss'
  )
    return 'ws';
  if (type.includes('wasm') || req.path.match(/\.wasm(\?|$)/)) return 'wasm';
  if (type.includes('manifest') || req.path.match(/manifest\.json(\?|$)/)) return 'manifest';
  if (
    type.includes('doc') ||
    type.includes('html') ||
    type.includes('document') ||
    (!type && !req.path.includes('.'))
  )
    return 'doc';

  return 'other';
  return 'other';
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
  return parseFloat(timeStr.replace('ms', '').replace('s', '000'));
}

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

interface NetworkFilterProps {
  filter: InspectorFilter;
  onChange: (filter: InspectorFilter) => void;
  requests?: NetworkRequest[];
}

export function NetworkFilter({ filter, onChange, requests = [] }: NetworkFilterProps) {
  // Extract all unique hosts and paths from requests
  const allHosts = Array.from(new Set(requests.map((r) => r.host).filter(Boolean)));
  const allPaths = Array.from(new Set(requests.map((r) => r.path).filter(Boolean)));

  // Extract unique status codes from HTTPS requests
  const availableStatuses = Array.from(
    new Set(
      requests
        .filter((r) => r.protocol === 'https' && typeof r.status === 'number')
        .map((r) => r.status),
    ),
  ).sort((a, b) => a - b);

  // Extract unique methods
  const availableMethods = Array.from(
    new Set(requests.map((r) => r.method?.toUpperCase()).filter(Boolean)),
  ).sort();

  // Extract unique types (categories)
  const availableTypes = Array.from(
    new Set(requests.map((r) => getRequestCategory(r)).filter(Boolean)),
  ).sort();

  // Calculate Max Size and Max Time from HTTPS requests
  const httpsRequests = requests.filter((r) => r.protocol === 'https');

  const maxSize = Math.max(0, ...httpsRequests.map((r) => parseSize(r.size || '0')));
  const maxTime = Math.max(0, ...httpsRequests.map((r) => parseTime(r.time || '0')));

  // Round up to nice numbers
  const sizeLimit = maxSize > 0 ? Math.ceil(maxSize / 1024) * 1024 : 1024 * 1024 * 5; // Default 5MB if no data
  const timeLimit = maxTime > 0 ? Math.ceil(maxTime / 100) * 100 : 5000; // Default 5s if no data

  const typeConfig: Record<string, { label: string; color: string }> = {
    xhr: { label: 'Fetch/XHR', color: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10' },
    js: { label: 'JS', color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' },
    css: { label: 'CSS', color: 'text-blue-400 border-blue-400/30 bg-blue-400/10' },
    img: { label: 'Img', color: 'text-purple-400 border-purple-400/30 bg-purple-400/10' },
    media: { label: 'Media', color: 'text-pink-400 border-pink-400/30 bg-pink-400/10' },
    font: { label: 'Font', color: 'text-orange-400 border-orange-400/30 bg-orange-400/10' },
    doc: { label: 'Doc', color: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' },
    ws: { label: 'WS', color: 'text-teal-400 border-teal-400/30 bg-teal-400/10' },
    wasm: { label: 'Wasm', color: 'text-violet-400 border-violet-400/30 bg-violet-400/10' },
    manifest: { label: 'Manifest', color: 'text-lime-400 border-lime-400/30 bg-lime-400/10' },
    other: { label: 'Other', color: 'text-gray-400 border-gray-400/30 bg-gray-400/10' },
  };

  const methodColors: Record<string, string> = {
    GET: 'text-blue-400 border-blue-400/30 bg-blue-400/10',
    POST: 'text-green-400 border-green-400/30 bg-green-400/10',
    PUT: 'text-orange-400 border-orange-400/30 bg-orange-400/10',
    PATCH: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
    DELETE: 'text-red-400 border-red-400/30 bg-red-400/10',
    HEAD: 'text-gray-400 border-gray-400/30 bg-gray-400/10',
    OPTIONS: 'text-purple-400 border-purple-400/30 bg-purple-400/10',
    TRACE: 'text-indigo-400 border-indigo-400/30 bg-indigo-400/10',
    CONNECT: 'text-rose-400 border-rose-400/30 bg-rose-400/10',
  };

  return (
    <div className="h-full overflow-y-auto min-h-0 bg-background/50 border-l border-border/50 flex flex-col font-sans select-none">
      <div className="p-4 space-y-6">
        {/* Method */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold">Method</h3>
            <div className="flex gap-2"></div>
          </div>
          {availableMethods.length === 0 ? (
            <div className="text-xs text-muted-foreground italic px-2">No methods detected</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableMethods.map((key) => {
                const color = methodColors[key] || methodColors['GET']; // Fallback
                const isVisible = filter.methods[key as keyof typeof filter.methods] !== false;

                return (
                  <button
                    key={key}
                    onClick={() =>
                      onChange({
                        ...filter,
                        methods: {
                          ...filter.methods,
                          [key]: !isVisible,
                        },
                      })
                    }
                    className={cn(
                      'px-3 py-1 rounded text-xs font-medium border transition-all',
                      isVisible
                        ? color
                        : 'text-muted-foreground border-border bg-transparent opacity-50',
                    )}
                    title={isVisible ? 'Click to hide' : 'Click to show'}
                  >
                    {key}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Host */}
        <ListFilterSection
          title="Host"
          lists={filter.host}
          onChange={(newHost) => onChange({ ...filter, host: newHost })}
          allItems={allHosts}
        />

        {/* Path */}
        <ListFilterSection
          title="Path"
          lists={filter.path}
          onChange={(newPath) => onChange({ ...filter, path: newPath })}
          allItems={allPaths}
        />

        {/* Status */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold">Status (HTTPS)</h3>
            <div className="flex gap-2"></div>
          </div>
          {availableStatuses.length === 0 ? (
            <div className="text-xs text-muted-foreground italic px-2">No statuses detected</div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {availableStatuses.map((code) => {
                let color = 'text-gray-400 border-gray-400/30 bg-gray-400/10';
                if (code >= 200 && code < 300)
                  color = 'text-green-400 border-green-400/30 bg-green-400/10';
                else if (code >= 300 && code < 400)
                  color = 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
                else if (code >= 400 && code < 500)
                  color = 'text-red-400 border-red-400/30 bg-red-400/10';
                else if (code >= 500) color = 'text-rose-400 border-rose-400/30 bg-rose-400/10';

                // Default to true if not explicitly set to false
                const isVisible = filter.status[code] !== false;

                return (
                  <button
                    key={code}
                    onClick={() =>
                      onChange({
                        ...filter,
                        status: {
                          ...filter.status,
                          [code]: !isVisible,
                        },
                      })
                    }
                    className={cn(
                      'px-1 py-1 rounded text-[10px] font-medium border transition-all text-center',
                      isVisible
                        ? color
                        : 'text-muted-foreground border-border bg-transparent opacity-50',
                    )}
                    title={isVisible ? 'Click to hide' : 'Click to show'}
                  >
                    {code}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Type */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold">Type</h3>
            <div className="flex gap-2"></div>
          </div>
          {availableTypes.length === 0 ? (
            <div className="text-xs text-muted-foreground italic px-2">No types detected</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableTypes.map((key) => {
                const config = typeConfig[key] || typeConfig['other'];
                const isVisible = filter.type[key as keyof typeof filter.type] !== false;

                return (
                  <button
                    key={key}
                    onClick={() =>
                      onChange({
                        ...filter,
                        type: {
                          ...filter.type,
                          [key]: !isVisible,
                        },
                      })
                    }
                    className={cn(
                      'px-3 py-1 rounded text-xs font-medium border transition-all',
                      isVisible
                        ? config.color
                        : 'text-muted-foreground border-border bg-transparent opacity-50',
                    )}
                    title={isVisible ? 'Click to hide' : 'Click to show'}
                  >
                    {config.label}
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Size */}
        <RangeSliderSection
          title="Size"
          maxValue={sizeLimit}
          values={filter.size}
          onChange={(newSize) => onChange({ ...filter, size: newSize })}
          formatLabel={(val) => {
            if (val === 0) return '0 B';
            if (val < 1024) return `${val} B`;
            if (val < 1024 * 1024) return `${(val / 1024).toFixed(1)} KB`;
            return `${(val / (1024 * 1024)).toFixed(1)} MB`;
          }}
        />

        {/* Time */}
        <RangeSliderSection
          title="Time"
          maxValue={timeLimit}
          values={filter.time}
          onChange={(newTime) => onChange({ ...filter, time: newTime })}
          formatLabel={(val) => `${val} ms`}
        />
      </div>
    </div>
  );
}

function ListFilterSection({
  title,
  lists,
  onChange,
  allItems = [],
}: {
  title: string;
  lists: { whitelist: string[] };
  onChange: (lists: { whitelist: string[] }) => void;
  allItems?: string[];
}) {
  const [input, setInput] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input
  const filteredSuggestions = input.trim()
    ? allItems.filter((item) => {
        try {
          // Try to match as regex
          const regex = new RegExp(input, 'i');
          return regex.test(item);
        } catch {
          // If invalid regex, fall back to simple substring match
          return item.toLowerCase().includes(input.toLowerCase());
        }
      })
    : [];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    if (showDropdown || showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
    return undefined;
  }, [showDropdown, showSuggestions]);

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

  const handleSelectSuggestion = (suggestion: string) => {
    handleAdd(suggestion);
    setInput('');
    setShowSuggestions(false);
  };

  return (
    <section>
      <h3 className="text-xs font-semibold mb-2">{title}</h3>
      <div className="space-y-1.5">
        <div className="flex gap-2 relative">
          <div className="flex-1 relative">
            <input
              className="w-full bg-background border border-border/50 rounded px-2 py-2 text-xs focus:border-primary/50 outline-none h-9"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setShowSuggestions(e.target.value.trim().length > 0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAdd(input);
                  setInput('');
                  setShowSuggestions(false);
                } else if (e.key === 'Escape') {
                  setShowSuggestions(false);
                }
              }}
              onFocus={() => {
                if (input.trim().length > 0) {
                  setShowSuggestions(true);
                }
              }}
              placeholder={`Filter ${title}...`}
            />

            {/* Autocomplete Suggestions Dropdown */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute top-full mt-1 left-0 right-0 max-h-48 overflow-auto bg-background border border-border rounded-md shadow-lg z-50"
              >
                <div className="p-1">
                  {filteredSuggestions.slice(0, 10).map((suggestion) => {
                    const isAlreadyAdded = (lists.whitelist || []).includes(suggestion);
                    return (
                      <button
                        key={suggestion}
                        onClick={() => handleSelectSuggestion(suggestion)}
                        disabled={isAlreadyAdded}
                        className={cn(
                          'w-full text-left px-2 py-1.5 text-[11px] rounded transition-colors flex items-center justify-between gap-2',
                          isAlreadyAdded
                            ? 'text-muted-foreground/50 cursor-not-allowed'
                            : 'hover:bg-muted/50 cursor-pointer',
                        )}
                      >
                        <span className="truncate">{suggestion}</span>
                        {isAlreadyAdded && (
                          <span className="text-[10px] text-muted-foreground/50 shrink-0">
                            Added
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {filteredSuggestions.length > 10 && (
                    <div className="px-2 py-1 text-[10px] text-muted-foreground text-center border-t border-border/50">
                      +{filteredSuggestions.length - 10} more...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
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

function RangeSliderSection({
  title,
  maxValue,
  values,
  onChange,
  formatLabel,
}: {
  title: string;
  maxValue: number;
  values: { min: string; max: string };
  onChange: (val: { min: string; max: string }) => void;
  formatLabel: (val: number) => string;
}) {
  const minVal = values.min ? parseInt(values.min) : 0;
  const maxVal = values.max ? parseInt(values.max) : maxValue;

  // Local state for smooth dragging
  const [localRange, setLocalRange] = useState<[number, number]>([minVal, maxVal]);

  // Sync local state when external props change (e.g. reset)
  useEffect(() => {
    setLocalRange([
      values.min ? parseInt(values.min) : 0,
      values.max ? parseInt(values.max) : maxValue,
    ]);
  }, [values.min, values.max, maxValue]);

  return (
    <section>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold">{title}</h3>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {formatLabel(localRange[0])} - {formatLabel(localRange[1])}
        </span>
      </div>
      <div className="px-1 py-1">
        <Slider
          defaultValue={[0, maxValue]}
          value={localRange}
          min={0}
          max={maxValue}
          step={1}
          onValueChange={(val) => setLocalRange(val as [number, number])}
          onValueCommit={(val) => {
            // Only update filter on commit (drag end)
            onChange({ min: val[0].toString(), max: val[1].toString() });
          }}
          className="my-2"
        />
      </div>
    </section>
  );
}
