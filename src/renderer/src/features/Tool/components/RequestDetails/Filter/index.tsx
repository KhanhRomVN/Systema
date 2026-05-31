import { useState, useRef } from 'react';
import { X, Globe, Link } from 'lucide-react';
import { cn } from '../../../../../shared/lib/utils';
import { Favicon } from '../../../../../shared/utils/faviconUtils';
import { useI18n } from '../../../../../i18n/i18nContext';

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
}

export function parseSize(sizeStr: string): number {
  if (!sizeStr || sizeStr === 'Pending') return 0;
  const units = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
  const match = sizeStr.match(/^([\d.]+)\s*([A-Za-z]+)$/);
  if (!match) return 0;
  const val = parseFloat(match[1]);
  const unit = match[2].toUpperCase() as keyof typeof units;
  return val * (units[unit] || 1);
}

export function parseTime(timeStr: string): number {
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
  const { t } = useI18n();

  // Extract all unique hosts and paths from requests
  const allHosts = Array.from(new Set(requests.map((r) => r.host).filter(Boolean)));

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

  const typeConfig: Record<string, { label: string; color: string }> = {
    xhr: { label: t.networkFilter.types.xhr, color: 'text-cyan-400 border-cyan-400/30 bg-cyan-400/10' },
    js: { label: t.networkFilter.types.js, color: 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10' },
    css: { label: t.networkFilter.types.css, color: 'text-blue-400 border-blue-400/30 bg-blue-400/10' },
    img: { label: t.networkFilter.types.img, color: 'text-purple-400 border-purple-400/30 bg-purple-400/10' },
    media: { label: t.networkFilter.types.media, color: 'text-pink-400 border-pink-400/30 bg-pink-400/10' },
    font: { label: t.networkFilter.types.font, color: 'text-orange-400 border-orange-400/30 bg-orange-400/10' },
    doc: { label: t.networkFilter.types.doc, color: 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' },
    ws: { label: t.networkFilter.types.ws, color: 'text-teal-400 border-teal-400/30 bg-teal-400/10' },
    wasm: { label: t.networkFilter.types.wasm, color: 'text-violet-400 border-violet-400/30 bg-violet-400/10' },
    manifest: { label: t.networkFilter.types.manifest, color: 'text-lime-400 border-lime-400/30 bg-lime-400/10' },
    other: { label: t.networkFilter.types.other, color: 'text-gray-400 border-gray-400/30 bg-gray-400/10' },
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
    <div className="h-full overflow-y-auto min-h-0 bg-table-bodyBg border-l border-border/50 flex flex-col font-sans select-none">
      <div className="p-4 space-y-6">
        {/* Method */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold">{t.networkFilter.method}</h3>
            <div className="flex gap-2"></div>
          </div>
          {availableMethods.length === 0 ? (
            <div className="text-xs text-muted-foreground italic px-2">{t.networkFilter.noMethods}</div>
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
                    title={isVisible ? t.networkFilter.clickToHide : t.networkFilter.clickToShow}
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
          title={t.networkFilter.host}
          lists={filter.host}
          onChange={(newHost) => onChange({ ...filter, host: newHost })}
          allItems={allHosts}
        />

        {/* Status */}
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold">{t.networkFilter.status}</h3>
            <div className="flex gap-2"></div>
          </div>
          {availableStatuses.length === 0 ? (
            <div className="text-xs text-muted-foreground italic px-2">{t.networkFilter.noStatuses}</div>
          ) : (
            <div className="flex flex-wrap gap-2">
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
                      'px-3 py-1 rounded text-xs font-medium border transition-all whitespace-nowrap',
                      isVisible
                        ? color
                        : 'text-muted-foreground border-border bg-transparent opacity-50',
                    )}
                    title={isVisible ? t.networkFilter.clickToHide : t.networkFilter.clickToShow}
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
            <h3 className="text-xs font-semibold">{t.networkFilter.type}</h3>
            <div className="flex gap-2"></div>
          </div>
          {availableTypes.length === 0 ? (
            <div className="text-xs text-muted-foreground italic px-2">{t.networkFilter.noTypes}</div>
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
                    title={isVisible ? t.networkFilter.clickToHide : t.networkFilter.clickToShow}
                  >
                    {config.label}
                  </button>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </div>
  );
}

const badgeColors = [
  'bg-blue-500/10 text-blue-400 border-blue-500/25',
  'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  'bg-purple-500/10 text-purple-400 border-purple-500/25',
  'bg-amber-500/10 text-amber-400 border-amber-500/25',
  'bg-rose-500/10 text-rose-400 border-rose-500/25',
  'bg-cyan-500/10 text-cyan-400 border-cyan-500/25',
  'bg-pink-500/10 text-pink-400 border-pink-500/25',
  'bg-indigo-500/10 text-indigo-400 border-indigo-500/25',
];

const getDeterministicColor = (str: string) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % badgeColors.length;
  return badgeColors[index];
};

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
  const { t } = useI18n();
  const [input, setInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Filter suggestions based on input (show all if input is empty)
  const filteredSuggestions = allItems.filter((item) => {
    if (!input.trim()) return true;
    try {
      const regex = new RegExp(input, 'i');
      return regex.test(item);
    } catch {
      return item.toLowerCase().includes(input.toLowerCase());
    }
  });

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
    const isAlreadyAdded = (lists.whitelist || []).includes(suggestion);
    if (isAlreadyAdded) {
      handleRemove(suggestion);
    } else {
      handleAdd(suggestion);
    }
  };

  return (
    <section>
      <h3 className="text-xs font-semibold mb-2">{title}</h3>
      <div className="space-y-1.5">
        <div className="flex gap-1.5 relative w-full items-center">
          <div className="flex-1">
            <input
              className="w-full bg-zinc-800 border border-zinc-700 hover:border-zinc-600 focus:border-primary/70 rounded px-3 py-2 text-xs focus:bg-zinc-800/80 outline-none h-10 transition-all text-zinc-100 placeholder:text-zinc-400"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAdd(input);
                  setInput('');
                } else if (e.key === 'Escape') {
                  setShowSuggestions(false);
                }
              }}
              onFocus={() => {
                setShowSuggestions(true);
              }}
              placeholder={t.networkFilter.filterPlaceholder.replace('{title}', title)}
            />
          </div>
          {showSuggestions && (
            <button
              onClick={() => setShowSuggestions(false)}
              className="bg-zinc-800 hover:bg-red-500/10 border border-zinc-700 hover:border-red-500/40 rounded text-zinc-400 hover:text-red-500 w-10 h-10 flex items-center justify-center transition-colors shrink-0"
              title={t.networkFilter.closeSuggestions}
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Autocomplete Suggestions Dropdown */}
          {showSuggestions && filteredSuggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute top-full mt-1 left-0 right-0 max-h-64 overflow-y-auto bg-zinc-800 border border-zinc-700 rounded-md shadow-xl z-50"
            >
              <div className="p-1 flex flex-col gap-1">
                {filteredSuggestions.map((suggestion) => {
                  const isAlreadyAdded = (lists.whitelist || []).includes(suggestion);
                  const isHost = title.toLowerCase() === 'host';
                  return (
                    <button
                      key={suggestion}
                      onClick={() => handleSelectSuggestion(suggestion)}
                      className={cn(
                        'w-full text-left px-2 py-2 text-xs rounded transition-colors flex items-center justify-between gap-2 min-w-0',
                        isAlreadyAdded
                          ? 'bg-primary/20 text-primary font-medium hover:bg-primary/30'
                          : 'hover:bg-zinc-700/50 text-zinc-300 hover:text-zinc-100',
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {isHost ? (
                          <Favicon
                              url={`https://${suggestion}`}
                              size={14}
                              className="rounded-sm shrink-0"
                              fallbackIcon={<Globe className="w-3.5 h-3.5 text-zinc-400" />}
                          />
                        ) : (
                          <Link className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        )}
                        <span className="truncate">{suggestion}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
        {(lists.whitelist || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {(lists.whitelist || []).map((item) => {
              const isHost = title.toLowerCase() === 'host';
              const colorClass = getDeterministicColor(item);
              return (
                <span
                  key={item}
                  className={cn(
                    'inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs border cursor-default',
                    colorClass,
                  )}
                >
                  {isHost && (
                    <Favicon
                      url={`https://${item}`}
                      size={12}
                      className="rounded-sm shrink-0"
                      fallbackIcon={<Globe className="w-3 h-3 text-zinc-400" />}
                    />
                  )}
                  <span className="truncate max-w-[200px]">{item}</span>
                  <button
                    onClick={() => handleRemove(item)}
                    className="hover:bg-current/15 rounded-full p-0.5 opacity-70 hover:opacity-100 transition-all shrink-0"
                    title={t.networkFilter.removeFilter}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
