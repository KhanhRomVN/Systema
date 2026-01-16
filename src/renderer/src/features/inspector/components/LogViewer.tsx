import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Search, Trash2, Copy, Pause, Play, Download, Filter, ChevronDown, X } from 'lucide-react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import { cn } from '../../../shared/lib/utils';

interface LogEntry {
  timestamp: string;
  level: 'V' | 'D' | 'I' | 'W' | 'E' | 'F';
  tag: string;
  pid: string;
  message: string;
  raw: string;
}

interface LogViewerProps {
  emulatorSerial?: string;
}

const MAX_LOGS = 10000;

export function LogViewer({ emulatorSerial }: LogViewerProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [levelFilter, setLevelFilter] = useState<Record<string, boolean>>({
    V: true,
    D: true,
    I: true,
    W: true,
    E: true,
    F: true,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [packageFilter, setPackageFilter] = useState('');
  const [hiddenTags, setHiddenTags] = useState<Set<string>>(new Set());
  const [installedPackages, setInstalledPackages] = useState<string[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<Set<string>>(new Set());
  const [showPackageDropdown, setShowPackageDropdown] = useState(false);
  const [packageSearchTerm, setPackageSearchTerm] = useState('');
  const packageDropdownRef = useRef<HTMLDivElement>(null);
  const logContainerRef = useRef<VirtuosoHandle>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const logBufferRef = useRef<LogEntry[]>([]);
  const rafRef = useRef<number | null>(null);
  const lastFlushTime = useRef<number>(Date.now());

  useEffect(() => {
    console.log('[LogViewer] Mounted with emulatorSerial:', emulatorSerial);

    if (!emulatorSerial) return;

    let removeListener: (() => void) | null = null;
    let flushInterval: NodeJS.Timeout | null = null;

    const startLogcat = async () => {
      try {
        console.log('[LogViewer] Starting logcat for:', emulatorSerial);
        await window.api.invoke('mobile:start-logcat', emulatorSerial);
        setIsRunning(true);
        console.log('[LogViewer] Logcat started successfully');

        removeListener = window.api.on('mobile:logcat-output', (_, data: string) => {
          if (isPaused) {
            return;
          }

          const entry = parseLogLine(data);
          if (entry) {
            logBufferRef.current.push(entry);
          }
        });

        // Optimized buffer flushing with requestAnimationFrame
        const flushLogs = () => {
          const now = Date.now();
          const timeSinceLastFlush = now - lastFlushTime.current;
          const shouldFlush = logBufferRef.current.length >= 50 || timeSinceLastFlush >= 250;

          if (shouldFlush && logBufferRef.current.length > 0) {
            setLogs((prev) => {
              const newLogs = [...prev, ...logBufferRef.current];
              logBufferRef.current = [];
              lastFlushTime.current = now;
              // Limit buffer size
              if (newLogs.length > MAX_LOGS) {
                return newLogs.slice(newLogs.length - MAX_LOGS);
              }
              return newLogs;
            });
          }

          rafRef.current = requestAnimationFrame(flushLogs);
        };

        rafRef.current = requestAnimationFrame(flushLogs);

        console.log('[LogViewer] Event listener attached');
      } catch (e) {
        console.error('[LogViewer] Failed to start logcat:', e);
      }
    };

    startLogcat();

    return () => {
      console.log('[LogViewer] Cleanup - stopping logcat');
      if (removeListener) {
        window.api.off('mobile:logcat-output', removeListener);
      }
      if (flushInterval) {
        clearInterval(flushInterval);
      }
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      window.api.invoke('mobile:stop-logcat', emulatorSerial).catch(console.error);
      setIsRunning(false);
    };
  }, [emulatorSerial, isPaused]);

  // Fetch installed packages
  useEffect(() => {
    const fetchPackages = async () => {
      if (!emulatorSerial) return;
      try {
        const packages = await window.api.invoke('mobile:list-packages', emulatorSerial);
        setInstalledPackages(packages.sort());
      } catch (e) {
        console.error('[LogViewer] Failed to fetch packages:', e);
      }
    };
    fetchPackages();
  }, [emulatorSerial]);

  // Close package dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        packageDropdownRef.current &&
        !packageDropdownRef.current.contains(event.target as Node)
      ) {
        setShowPackageDropdown(false);
      }
    };
    if (showPackageDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPackageDropdown]);

  const parseLogLine = (line: string): LogEntry | null => {
    // Android logcat format: MM-DD HH:MM:SS.mmm PID TID LEVEL TAG: message
    const match = line.match(
      /^(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3})\s+(\d+)\s+(\d+)\s+([VDIWEF])\s+(.+?):\s+(.*)$/,
    );

    if (match) {
      return {
        timestamp: match[1],
        pid: match[2],
        level: match[4] as LogEntry['level'],
        tag: match[5],
        message: match[6],
        raw: line,
      };
    }

    // Fallback for simple format
    const simpleMatch = line.match(/^([VDIWEF])\/(.+?)\(\s*(\d+)\):\s+(.*)$/);
    if (simpleMatch) {
      return {
        timestamp: new Date().toLocaleTimeString(),
        pid: simpleMatch[3],
        level: simpleMatch[1] as LogEntry['level'],
        tag: simpleMatch[2],
        message: simpleMatch[4],
        raw: line,
      };
    }

    // Format: MM-DD HH:MM:SS.mmm L/Tag(PID): Msg
    // Example: 01-16 19:01:42.123 I/WifiService(1234): message
    const timeMatch = line.match(
      /^(\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}\.\d{3})\s+([VDIWEF])\/(.+?)\(\s*(\d+)\):\s+(.*)$/,
    );
    if (timeMatch) {
      return {
        timestamp: timeMatch[1],
        pid: timeMatch[4],
        level: timeMatch[2] as LogEntry['level'],
        tag: timeMatch[3],
        message: timeMatch[5],
        raw: line,
      };
    }

    // Fallback for unparsed lines (show as Info)
    return {
      timestamp: new Date().toLocaleTimeString(),
      pid: '?',
      level: 'I',
      tag: 'RAW',
      message: line,
      raw: line,
    };
  };

  const handleClear = () => {
    setLogs([]);
  };

  const handleCopy = () => {
    const text = filteredLogs.map((log) => log.raw).join('\n');
    navigator.clipboard.writeText(text);
  };

  const handleDownload = () => {
    const text = filteredLogs.map((log) => log.raw).join('\n');
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logcat-${new Date().toISOString()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Tag grouping and counting
  const tagCounts = useMemo(() => {
    const counts = new Map<string, number>();
    logs.forEach((log) => {
      counts.set(log.tag, (counts.get(log.tag) || 0) + 1);
    });
    // Sort by count descending
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [logs]);

  const toggleTagVisibility = useCallback((tag: string) => {
    setHiddenTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) {
        next.delete(tag);
      } else {
        next.add(tag);
      }
      return next;
    });
  }, []);

  // Memoized filtering with pre-compiled search
  const filteredLogs = useMemo(() => {
    // Pre-compile search term
    const lowerSearch = searchTerm ? searchTerm.toLowerCase() : null;

    return logs.filter((log) => {
      // Fast-path checks first
      if (!levelFilter[log.level]) return false;
      if (hiddenTags.has(log.tag)) return false;

      // Package filter - check if log tag matches any selected packages
      if (selectedPackages.size > 0) {
        const matchesPackage = Array.from(selectedPackages).some((pkg) =>
          log.tag.toLowerCase().includes(pkg.toLowerCase()),
        );
        if (!matchesPackage) return false;
      }

      // Search filter
      if (lowerSearch) {
        const lowerTag = log.tag.toLowerCase();
        const lowerMessage = log.message.toLowerCase();
        return (
          lowerTag.includes(lowerSearch) ||
          lowerMessage.includes(lowerSearch) ||
          log.pid.includes(lowerSearch)
        );
      }

      return true;
    });
  }, [logs, levelFilter, hiddenTags, selectedPackages, searchTerm]);

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'E':
      case 'F':
        return 'text-red-400';
      case 'W':
        return 'text-amber-400';
      case 'I':
        return 'text-cyan-400';
      case 'D':
        return 'text-slate-400';
      case 'V':
        return 'text-zinc-500';
      default:
        return 'text-foreground';
    }
  };

  const getLevelBgColor = (level: string) => {
    switch (level) {
      case 'E':
      case 'F':
        return 'bg-red-500/5';
      case 'W':
        return 'bg-amber-500/5';
      case 'I':
        return 'bg-cyan-500/5';
      case 'D':
        return 'bg-slate-500/5';
      case 'V':
        return 'bg-zinc-500/5';
      default:
        return 'bg-muted/10';
    }
  };

  const getTagColor = (tag: string) => {
    // Generate consistent color based on tag name hash
    let hash = 0;
    for (let i = 0; i < tag.length; i++) {
      hash = tag.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 60%)`;
  };

  // Memoized highlight function with caching
  const highlightMessage = useMemo(() => {
    const cache = new Map<string, JSX.Element>();
    const MAX_CACHE_SIZE = 1000;

    return (message: string): JSX.Element => {
      // Check cache first
      if (cache.has(message)) {
        return cache.get(message)!;
      }

      // Disable highlighting for very long messages (performance)
      if (message.length > 1000 || filteredLogs.length > 2000) {
        return <span>{message}</span>;
      }

      // Simple syntax highlighting for common patterns
      const parts: JSX.Element[] = [];
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const jsonRegex = /(\{[^}]*\}|\[[^\]]*\])/g;
      const numberRegex = /\b(\d+)\b/g;

      let lastIndex = 0;
      const matches: Array<{ index: number; length: number; type: string; value: string }> = [];

      // Find all URL matches
      message.replace(urlRegex, (match, _p1, offset) => {
        matches.push({ index: offset, length: match.length, type: 'url', value: match });
        return match;
      });

      // Find all JSON matches
      message.replace(jsonRegex, (match, _p1, offset) => {
        matches.push({ index: offset, length: match.length, type: 'json', value: match });
        return match;
      });

      // Find all number matches
      message.replace(numberRegex, (match, _p1, offset) => {
        matches.push({ index: offset, length: match.length, type: 'number', value: match });
        return match;
      });

      // Sort by index to process in order
      matches.sort((a, b) => a.index - b.index);

      // Remove overlapping matches
      const nonOverlapping: typeof matches = [];
      let prevEnd = 0;
      for (const match of matches) {
        if (match.index >= prevEnd) {
          nonOverlapping.push(match);
          prevEnd = match.index + match.length;
        }
      }

      // Build the highlighted message
      if (nonOverlapping.length === 0) {
        const result = <span>{message}</span>;
        if (cache.size < MAX_CACHE_SIZE) cache.set(message, result);
        return result;
      }

      nonOverlapping.forEach((match, idx) => {
        // Add text before the match
        if (match.index > lastIndex) {
          parts.push(<span key={`text-${idx}`}>{message.substring(lastIndex, match.index)}</span>);
        }

        // Add the highlighted match
        const className =
          match.type === 'url'
            ? 'text-blue-400 underline decoration-blue-400/40'
            : match.type === 'json'
              ? 'text-purple-400'
              : 'text-emerald-400';

        parts.push(
          <span key={`match-${idx}`} className={className}>
            {match.value}
          </span>,
        );

        lastIndex = match.index + match.length;
      });

      // Add remaining text
      if (lastIndex < message.length) {
        parts.push(<span key="text-end">{message.substring(lastIndex)}</span>);
      }

      const result = <>{parts}</>;
      if (cache.size < MAX_CACHE_SIZE) {
        cache.set(message, result);
      }
      return result;
    };
  }, [filteredLogs.length]);

  if (!emulatorSerial) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <div className="text-center">
          <p className="text-sm">No emulator selected</p>
          <p className="text-xs mt-1">Launch an Android app to view logs</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Toolbar */}
      <div className="h-10 border-b border-border flex items-center px-3 gap-2 bg-muted/40">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search logs (tag, message, PID)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-7 pr-3 py-1 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'p-1.5 rounded transition-all',
            showFilters
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
          title="Toggle filters"
        >
          <Filter className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-6 bg-border" />

        <button
          onClick={() => setIsPaused(!isPaused)}
          className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
          title={isPaused ? 'Resume' : 'Pause'}
        >
          {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
        </button>

        <button
          onClick={() => setAutoScroll(!autoScroll)}
          className={cn(
            'px-2 py-1 text-xs rounded border transition-all',
            autoScroll
              ? 'bg-primary/10 text-primary border-primary/30'
              : 'text-muted-foreground border-border hover:bg-muted',
          )}
          title="Auto-scroll"
        >
          Auto
        </button>

        <button
          onClick={handleClear}
          className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
          title="Clear logs"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleCopy}
          className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
          title="Copy logs"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleDownload}
          className="p-1.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
          title="Download logs"
        >
          <Download className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Filter Section */}
      {showFilters && (
        <div className="border-b border-border bg-muted/20 p-2 space-y-2">
          <div className="flex items-center gap-4">
            {/* Level Filters */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground mr-1">Level:</span>
              {(['V', 'D', 'I', 'W', 'E'] as const).map((level) => (
                <button
                  key={level}
                  onClick={() => setLevelFilter((prev) => ({ ...prev, [level]: !prev[level] }))}
                  className={cn(
                    'px-2 py-1 text-xs font-mono rounded border transition-all',
                    levelFilter[level]
                      ? `${getLevelColor(level)} border-current bg-current/10`
                      : 'text-muted-foreground border-border bg-background',
                  )}
                >
                  {level}
                </button>
              ))}
            </div>

            <div className="w-px h-4 bg-border" />

            {/* Package Multi-Select Dropdown */}
            <div className="flex items-center gap-2 flex-1 max-w-xs" ref={packageDropdownRef}>
              <span className="text-xs text-muted-foreground whitespace-nowrap">Package:</span>
              <div className="relative flex-1">
                <button
                  onClick={() => setShowPackageDropdown(!showPackageDropdown)}
                  className="w-full px-2 py-1 text-xs bg-background border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary h-6 flex items-center justify-between text-left"
                >
                  <span className="truncate">
                    {selectedPackages.size === 0
                      ? 'Select packages...'
                      : `${selectedPackages.size} selected`}
                  </span>
                  <ChevronDown className="w-3 h-3 ml-1 flex-shrink-0" />
                </button>

                {showPackageDropdown && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-background border border-border rounded shadow-lg max-h-[200px] overflow-hidden flex flex-col">
                    {/* Dropdown Header */}
                    <div className="p-2 border-b border-border space-y-1">
                      <input
                        type="text"
                        value={packageSearchTerm}
                        onChange={(e) => setPackageSearchTerm(e.target.value)}
                        placeholder="Search packages..."
                        className="w-full px-2 py-1 text-xs bg-muted border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPackages(new Set(installedPackages));
                          }}
                          className="flex-1 px-2 py-0.5 text-[10px] bg-primary/10 text-primary rounded hover:bg-primary/20"
                        >
                          Select All
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPackages(new Set());
                          }}
                          className="flex-1 px-2 py-0.5 text-[10px] bg-muted text-muted-foreground rounded hover:bg-muted/80"
                        >
                          Clear All
                        </button>
                      </div>
                    </div>

                    {/* Package List */}
                    <div className="overflow-y-auto">
                      {installedPackages
                        .filter((pkg) =>
                          packageSearchTerm
                            ? pkg.toLowerCase().includes(packageSearchTerm.toLowerCase())
                            : true,
                        )
                        .map((pkg) => (
                          <label
                            key={pkg}
                            className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted cursor-pointer text-xs"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              className="w-3 h-3 rounded border-border"
                              checked={selectedPackages.has(pkg)}
                              onChange={(e) => {
                                const newSelected = new Set(selectedPackages);
                                if (e.target.checked) {
                                  newSelected.add(pkg);
                                } else {
                                  newSelected.delete(pkg);
                                }
                                setSelectedPackages(newSelected);
                              }}
                            />
                            <span className="truncate flex-1">{pkg}</span>
                          </label>
                        ))}
                      {installedPackages.filter((pkg) =>
                        packageSearchTerm
                          ? pkg.toLowerCase().includes(packageSearchTerm.toLowerCase())
                          : true,
                      ).length === 0 && (
                        <div className="px-2 py-4 text-xs text-muted-foreground text-center">
                          No packages found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {selectedPackages.size > 0 && (
                <button
                  onClick={() => setSelectedPackages(new Set())}
                  className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                  title="Clear package filter"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="h-px bg-border/50" />

          {/* Tag Groups */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Detected Tags ({tagCounts.length})</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setHiddenTags(new Set())}
                  className="hover:text-foreground hover:underline"
                >
                  Show All
                </button>
                <button
                  onClick={() => {
                    const allTags = tagCounts.map(([tag]) => tag);
                    setHiddenTags(new Set(allTags));
                  }}
                  className="hover:text-foreground hover:underline"
                >
                  Hide All
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1 max-h-[120px] overflow-y-auto pr-1">
              {tagCounts.map(([tag, count]) => (
                <label
                  key={tag}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1 rounded text-xs border cursor-pointer select-none transition-colors',
                    hiddenTags.has(tag)
                      ? 'bg-muted/30 text-muted-foreground border-transparent opacity-60'
                      : 'bg-background border-border hover:border-primary/50',
                  )}
                >
                  <input
                    type="checkbox"
                    className="w-3 h-3 rounded border-border"
                    checked={!hiddenTags.has(tag)}
                    onChange={() => toggleTagVisibility(tag)}
                  />
                  <span
                    className="truncate flex-1"
                    style={{ color: !hiddenTags.has(tag) ? getTagColor(tag) : undefined }}
                  >
                    {tag}
                  </span>
                  <span className="text-[10px] bg-muted px-1 rounded-full text-muted-foreground">
                    {count}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Logs - Virtualized */}
      <div className="flex-1 bg-background/50">
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {isRunning ? 'Waiting for logs...' : 'No logs available'}
          </div>
        ) : (
          <Virtuoso
            ref={logContainerRef}
            data={filteredLogs}
            followOutput={autoScroll}
            defaultItemHeight={60}
            className="font-mono text-xs custom-scrollbar"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgb(148 163 184 / 0.3) transparent',
            }}
            itemContent={(_index, log) => (
              <div
                className={cn(
                  'py-2 px-3 mx-3 my-0.5 rounded-md flex flex-col gap-1 group transition-all',
                  'hover:bg-muted/5',
                  getLevelBgColor(log.level).replace('bg-muted/10', '').replace('bg-', 'hover:bg-'),
                )}
              >
                {/* Header: Level Time Tag PID */}
                <div className="flex items-center gap-2 text-[10px] leading-none opacity-80 select-none">
                  <span
                    className={cn(
                      'font-bold px-1.5 py-0.5 rounded text-[9px]',
                      getLevelColor(log.level),
                      'bg-current/10',
                    )}
                  >
                    {log.level}
                  </span>
                  <span className="font-mono text-muted-foreground">{log.timestamp}</span>
                  <span className="text-muted-foreground/30">•</span>
                  <span
                    className="font-semibold truncate max-w-[120px]"
                    style={{ color: getTagColor(log.tag) }}
                  >
                    {log.tag}
                  </span>
                  <span className="text-muted-foreground/30">•</span>
                  <span className="font-mono text-muted-foreground/50">{log.pid}</span>
                </div>

                {/* Message Body */}
                <div className="text-foreground/90 break-all text-xs leading-5 pl-1">
                  {highlightMessage(log.message)}
                </div>
              </div>
            )}
          />
        )}
      </div>
    </div>
  );
}
