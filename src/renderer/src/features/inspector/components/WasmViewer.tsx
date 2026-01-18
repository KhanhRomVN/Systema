import { useState, useEffect } from 'react';
import { X, Copy, Download, Code } from 'lucide-react';
import { cn } from '../../../shared/lib/utils';
import wabt from 'wabt';

interface WasmViewerProps {
  url: string;
  responseBody?: string; // Base64 or raw string
  onClose: () => void;
}

export function WasmViewer({ url, responseBody, onClose }: WasmViewerProps) {
  const [watContent, setWatContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const disassembleWasm = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!responseBody) {
          throw new Error('No WASM content available to disassemble.');
        }

        // Convert base64 to Uint8Array
        // This assumes responseBody is generic string or base64.
        // In the app context, binary bodies are likely mapped to base64.
        // We'll try to detect or just assume base64 for WASM if it's not a raw string.
        let buffer: Uint8Array;

        try {
          // Simple check if it looks like base64 (no spaces, valid chars)
          // or just try decoding.
          const binaryString = atob(responseBody);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          buffer = bytes;
        } catch (e) {
          // Fallback: maybe it's already raw text? Or fetch from URL if body is unusable?
          // For now, assume it failed decoding.
          console.warn('Base64 decode failed, trying fetch from URL via Main Process...', e);
          const fetchedBuffer = await (window as any).api.invoke('inspector:fetch-wasm', url);
          buffer = fetchedBuffer;
        }

        // Debug: Log the first few bytes
        console.log('WASM Buffer Type:', buffer.constructor.name);
        console.log('WASM Buffer Length:', buffer.length);
        const header = Array.from(buffer.slice(0, 8))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join(' ');
        console.log('WASM Buffer Header (Hex):', header);

        // Check for GZIP magic bytes (1f 8b)
        if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
          console.warn('Detected GZIP content, attempting to decompress...');
          // We can't easily decompress in browser without a library if DecompressionStream is not available or if it's raw deflate.
          // But let's at least know if this is the issue.
          setError(
            'Content appears to be GZIP compressed. Automatic decompression not yet fully implemented for this view.',
          );
          setLoading(false);
          return;
        }

        const wabtModule = await wabt();
        const module = wabtModule.readWasm(buffer, { readDebugNames: true });
        module.generateNames();
        module.applyNames();
        const wat = module.toText({ foldExprs: false, inlineExport: false });
        setWatContent(wat);
      } catch (err: any) {
        console.error('WASM Disassembly Error:', err);
        setError(err.message || 'Failed to disassemble WASM module');
      } finally {
        setLoading(false);
      }
    };

    disassembleWasm();
  }, [url, responseBody]);

  const handleCopy = () => {
    navigator.clipboard.writeText(watContent);
  };

  const handleDownload = () => {
    const blob = new Blob([watContent], { type: 'text/plain' });
    const u = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = u;
    a.download = `${url.split('/').pop() || 'module'}.wat`;
    a.click();
    URL.revokeObjectURL(u);
  };

  return (
    <div className="absolute inset-0 bg-background/95 backdrop-blur-sm z-50 flex flex-col animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border bg-background/50">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 rounded bg-purple-500/10 flex items-center justify-center text-purple-500 shrink-0">
            <Code className="w-4 h-4" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-medium text-sm truncate" title={url}>
              Details: {url.split('/').pop()}
            </span>
            <span className="text-xs text-muted-foreground truncate opacity-70">
              Disassembled View (.wat)
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!loading && !error && (
            <>
              <button
                onClick={handleCopy}
                className="p-2 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                title="Copy to Clipboard"
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={handleDownload}
                className="p-2 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                title="Download .wat"
              >
                <Download className="w-4 h-4" />
              </button>
            </>
          )}
          <div className="w-px h-6 bg-border mx-1" />
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-500/10 hover:text-red-500 rounded text-muted-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-[#1e1e1e] text-purple-100 font-mono text-xs p-4 leading-relaxed selection:bg-purple-900 selection:text-white">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
            <div className="w-8 h-8 border-2 border-purple-500/50 border-t-purple-500 rounded-full animate-spin" />
            <p>Disassembling WebAssembly...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-red-400 gap-4 p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
              <X className="w-6 h-6" />
            </div>
            <p className="font-medium">Disassembly Failed</p>
            <p className="text-sm opacity-70 max-w-lg font-sans">{error}</p>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap break-all">{watContent}</pre>
        )}
      </div>
    </div>
  );
}
