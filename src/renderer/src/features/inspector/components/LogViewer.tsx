import React, { useState, useEffect, useRef } from 'react';
import { Search, Trash2, Copy, Pause, Play, Download } from 'lucide-react';
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
  const logContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    console.log('[LogViewer] Mounted with emulatorSerial:', emulatorSerial);

    if (!emulatorSerial) return;

    let removeListener: (() => void) | null = null;

    const startLogcat = async () => {
      try {
        console.log('[LogViewer] Starting logcat for:', emulatorSerial);
        await window.api.invoke('mobile:start-logcat', emulatorSerial);
        setIsRunning(true);
        console.log('[LogViewer] Logcat started successfully');

        removeListener = window.api.on('mobile:logcat-output', (_, data: string) => {
          // console.log('[LogViewer] Received log line:', data.substring(0, 50) + '...');

          if (isPaused) {
            // console.log('[LogViewer] Paused, skipping');
            return;
          }

          const entry = parseLogLine(data);
          if (entry) {
            // console.log('[LogViewer] Parsed entry:', entry.level, entry.tag);
            setLogs((prev) => [...prev.slice(-999), entry]);
          } else {
            console.log('[LogViewer] Failed to parse line:', data);
          }
        });
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
      window.api.invoke('mobile:stop-logcat', emulatorSerial).catch(console.error);
      setIsRunning(false);
    };
  }, [emulatorSerial, isPaused]);

  // Auto-scroll
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

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

  const filteredLogs = logs.filter((log) => {
    if (!levelFilter[log.level]) return false;
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        log.tag.toLowerCase().includes(search) ||
        log.message.toLowerCase().includes(search) ||
        log.pid.includes(search)
      );
    }
    return true;
  });

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

  const highlightMessage = (message: string) => {
    // Simple syntax highlighting for common patterns
    const parts: JSX.Element[] = [];
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const jsonRegex = /(\{[^}]*\}|\[[^\]]*\])/g;
    const numberRegex = /\b(\d+)\b/g;

    let lastIndex = 0;
    const matches: Array<{ index: number; length: number; type: string; value: string }> = [];

    // Find all URL matches
    message.replace(urlRegex, (match, p1, offset) => {
      matches.push({ index: offset, length: match.length, type: 'url', value: match });
      return match;
    });

    // Find all JSON matches
    message.replace(jsonRegex, (match, p1, offset) => {
      matches.push({ index: offset, length: match.length, type: 'json', value: match });
      return match;
    });

    // Find all number matches
    message.replace(numberRegex, (match, p1, offset) => {
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
      return <span>{message}</span>;
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

    return <>{parts}</>;
  };

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

        {/* Level Filters */}
        <div className="flex items-center gap-1">
          {(['E', 'W', 'I', 'D', 'V'] as const).map((level) => (
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

      {/* Logs */}
      <div
        ref={logContainerRef}
        className="flex-1 overflow-y-auto font-mono text-xs p-3 space-y-1 bg-background/50 custom-scrollbar"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgb(148 163 184 / 0.3) transparent',
        }}
        onScroll={(e) => {
          const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
          const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
          setAutoScroll(isAtBottom);
        }}
      >
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            {isRunning ? 'Waiting for logs...' : 'No logs available'}
          </div>
        ) : (
          filteredLogs.map((log, idx) => (
            <div
              key={idx}
              className={cn(
                'py-2 px-3 rounded-md flex flex-col gap-1 group transition-all',
                'hover:bg-muted/5',
                getLevelBgColor(log.level).replace('bg-muted/10', '').replace('bg-', 'hover:bg-'), // Handle bg hover
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
          ))
        )}
      </div>
    </div>
  );
}
