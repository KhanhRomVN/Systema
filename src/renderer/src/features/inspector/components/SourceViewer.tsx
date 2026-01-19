import { useEffect } from 'react';
import { X } from 'lucide-react';
import { CodeBlock } from '../../../components/CodeBlock';

interface SourceViewerProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  content: string;
  highlightLine?: number;
  language?: string;
}

export function SourceViewer({
  isOpen,
  onClose,
  fileName,
  content,
  highlightLine,
  language = 'javascript',
}: SourceViewerProps) {
  useEffect(() => {
    if (isOpen && highlightLine) {
      // Wait for content render
      setTimeout(() => {
        // This is a rough scroll, Monaco inside CodeBlock handles its own scrolling
        // accessing Monaco instance would be better, but CodeBlock might not expose it easily.
        // For now, relies on CodeBlock or manual calculation if possible.
        // Actually, CodeBlock in this project (based on previous read) wraps Monaco.
        // Ideally we should pass highlightLine to CodeBlock if we modify it,
        // or we just trust the user finds the line for version 1.
        // Let's modify CodeBlock later to support revealLine.
      }, 100);
    }
  }, [isOpen, highlightLine]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-8"
      onClick={onClose}
    >
      <div
        className="bg-background border border-border rounded-lg shadow-xl w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm">Source Viewer</span>
            <span className="text-muted-foreground text-xs px-2 py-0.5 bg-muted rounded border border-border/50">
              {fileName} {highlightLine ? `:${highlightLine}` : ''}
            </span>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded-md transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden relative">
          {content ? (
            <CodeBlock
              code={content}
              language={language}
              showLineNumbers={true}
              // pass highlight config or wordWrap
              wordWrap="off"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              No content available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
