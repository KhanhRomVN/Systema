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
        return 'text-red-500';
      case 'W':
        return 'text-yellow-500';
      case 'I':
        return 'text-blue-500';
      case 'D':
        return 'text-gray-400';
      case 'V':
        return 'text-gray-500';
      default:
        return 'text-foreground';
    }
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

        <div className="text-xs text-muted-foreground">
          {filteredLogs.length} / {logs.length}
        </div>
      </div>

      {/* Logs */}
      <div
        ref={logContainerRef}
        className="flex-1 overflow-y-auto font-mono text-xs p-2 space-y-0.5 custom-scrollbar"
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
              className="py-0.5 px-1 hover:bg-muted/30 rounded flex gap-2 items-start group"
            >
              <span className="text-muted-foreground shrink-0 w-20 text-[10px]">
                {log.timestamp}
              </span>
              <span className={cn('shrink-0 w-3 font-bold', getLevelColor(log.level))}>
                {log.level}
              </span>
              <span className="text-primary shrink-0 w-16 truncate" title={log.tag}>
                {log.tag}
              </span>
              <span className="text-muted-foreground shrink-0 w-12 text-[10px]">{log.pid}</span>
              <span className="text-foreground break-all flex-1">{log.message}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
