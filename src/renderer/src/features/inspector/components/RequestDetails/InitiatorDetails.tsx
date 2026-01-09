import { NetworkRequest } from '../../types';
import { useState, useRef } from 'react';
import { cn } from '../../../../shared/lib/utils';
import { FileCode, Play, X, Copy, Check, Search } from 'lucide-react';
import { CodeBlock } from '../../../../components/CodeBlock';

interface InitiatorDetailsProps {
  request: NetworkRequest;
  requests: NetworkRequest[];
}

interface StackFrame {
  functionName: string;
  url: string;
  line: number;
  column: number;
  original: string;
}

export function InitiatorDetails({ request, requests }: InitiatorDetailsProps) {
  const [selectedFrame, setSelectedFrame] = useState<{
    frame: StackFrame;
    content: string;
    fileName: string;
  } | null>(null);

  const [copied, setCopied] = useState(false);

  // Keep track of editor instance
  const editorRef = useRef<any>(null);

  if (!request.initiator) {
    return (
      <div className="p-4 text-center text-muted-foreground bg-muted/20 rounded-md border border-border/50 border-dashed m-4">
        No initiator trace captured for this request.
      </div>
    );
  }

  const parseStackTrace = (stack: string): StackFrame[] => {
    const lines = stack.split('\n');
    const frames: StackFrame[] = [];
    const regex = /at (?:(.+?)\s+\()?(.*?):(\d+):(\d+)\)?/;

    for (const line of lines) {
      const match = line.match(regex);
      if (match) {
        frames.push({
          functionName: match[1] || '<anonymous>',
          url: match[2],
          line: parseInt(match[3], 10),
          column: parseInt(match[4], 10),
          original: line.trim(),
        });
      } else if (line.trim().startsWith('at ')) {
        // Fallback or ignore
      }
    }
    return frames;
  };

  const frames = parseStackTrace(request.initiator);

  // Auto-select first frame if it has source? No, let user choose.

  const handleFrameClick = (frame: StackFrame) => {
    if (!frame.url || frame.url.startsWith('node:') || frame.url === '<anonymous>') {
      return;
    }

    if (selectedFrame?.frame === frame) {
      return; // Already selected
    }

    // Find the latest request matching this URL
    const matches = requests
      .filter((r) => {
        const reqUrl = `${r.protocol}://${r.host}${r.path}`;
        return (
          reqUrl === frame.url ||
          reqUrl.startsWith(frame.url) ||
          frame.url.startsWith(reqUrl.split('?')[0])
        );
      })
      .sort((a, b) => b.timestamp - a.timestamp);

    const match = matches[0];

    if (match && match.responseBody) {
      setSelectedFrame({
        frame,
        fileName: frame.url.split('/').pop() || 'script.js',
        content: match.responseBody,
      });
    } else {
      console.warn('Source body not found for URL:', frame.url);
      // Optional: Show toast
    }
  };

  const handleCopy = () => {
    if (selectedFrame) {
      navigator.clipboard.writeText(selectedFrame.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSearch = () => {
    if (editorRef.current) {
      editorRef.current.trigger('source', 'actions.find');
    }
  };

  return (
    <div className="flex h-full font-mono text-xs overflow-hidden">
      {/* Left Panel: Stack Trace List */}
      <div
        className={cn(
          'flex flex-col h-full overflow-hidden transition-all duration-300',
          selectedFrame ? 'w-1/2 border-r border-border/50' : 'w-full',
        )}
      >
        <div className="p-2 border-b border-border/50 bg-muted/20 flex items-center justify-between text-muted-foreground shrink-0 h-9">
          <span>Call Stack ({frames.length} frames)</span>
          <span className="text-[10px] opacity-70">Click to view source</span>
        </div>
        <div className="flex-1 overflow-auto bg-background">
          <div className="flex flex-col">
            {frames.map((frame, idx) => {
              const isClickable =
                frame.url && !frame.url.startsWith('node:') && frame.url !== '<anonymous>';
              const isSelected = selectedFrame?.frame === frame;

              return (
                <div
                  key={idx}
                  className={cn(
                    'flex items-start gap-2 p-2 border-b border-border/10 transition-colors relative',
                    isClickable
                      ? 'hover:bg-muted/50 cursor-pointer'
                      : 'text-muted-foreground opacity-80',
                    isSelected ? 'bg-primary/10 hover:bg-primary/15' : '',
                  )}
                  onClick={() => isClickable && handleFrameClick(frame)}
                >
                  {isSelected && (
                    <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary" />
                  )}
                  <div className="mt-0.5 text-muted-foreground/50">
                    {isClickable ? <FileCode className="w-3.5 h-3.5" /> : <div className="w-3.5" />}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className={cn('font-semibold truncate', isSelected ? 'text-primary' : '')}>
                      {frame.functionName}
                    </div>
                    <div
                      className={cn(
                        'truncate text-[10px] opacity-80',
                        isClickable ? 'text-blue-500' : '',
                      )}
                      title={frame.url}
                    >
                      {frame.url}:{frame.line}:{frame.column}
                    </div>
                  </div>
                  {isSelected && <Play className="w-3 h-3 text-primary mt-1" fill="currentColor" />}
                </div>
              );
            })}
            {frames.length === 0 && (
              <pre className="p-4 whitespace-pre-wrap select-text opacity-75">
                {request.initiator}
              </pre>
            )}
          </div>
        </div>
      </div>

      {/* Right Panel: Code View */}
      {selectedFrame && (
        <div className="flex flex-col w-1/2 h-full overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="p-2 border-b border-border/50 bg-muted/20 flex items-center justify-between shrink-0 h-9">
            <div className="flex items-center gap-2 overflow-hidden">
              <FileCode className="w-3.5 h-3.5 text-blue-500" />
              <span className="truncate font-medium text-xs" title={selectedFrame.frame.url}>
                {selectedFrame.fileName}:{selectedFrame.frame.line}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleSearch}
                className="p-1 hover:bg-background rounded-md transition-colors text-muted-foreground hover:text-foreground"
                title="Search (Regex supported)"
              >
                <Search className="w-3.5 h-3.5" />
              </button>
              <div className="w-px h-3 bg-border/50 mx-1" />
              <button
                onClick={handleCopy}
                className="p-1 hover:bg-background rounded-md transition-colors text-muted-foreground hover:text-foreground"
                title="Copy File Content"
              >
                {copied ? (
                  <Check className="w-3.5 h-3.5 text-green-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
              </button>
              <button
                onClick={() => setSelectedFrame(null)}
                className="p-1 hover:bg-background rounded-md transition-colors text-muted-foreground hover:text-foreground"
                title="Close"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden relative bg-[#1e1e1e]">
            {/* Using hardcoded bg to match monaco default for seamless look */}
            <CodeBlock
              code={selectedFrame.content}
              language="javascript"
              showLineNumbers={true}
              wordWrap="on"
              themeConfig={{
                highlightLine: selectedFrame.frame.line,
              }}
              onEditorMounted={(editor) => {
                editorRef.current = editor;
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
