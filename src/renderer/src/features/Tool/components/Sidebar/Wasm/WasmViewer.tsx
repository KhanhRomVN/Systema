import { useState, useEffect } from 'react';
import { X, Copy, Download, Code } from 'lucide-react';
import { useI18n } from '../../../../../i18n/i18nContext';

import wabt from 'wabt';

interface WasmViewerProps {
  url: string;
  responseBody?: string; // Base64 or raw string
  onClose: () => void;
}

export function WasmViewer({ url, responseBody, onClose }: WasmViewerProps) {
  const { t } = useI18n();
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

        let buffer: Uint8Array;

        try {
          const binaryString = atob(responseBody);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          buffer = bytes;
        } catch (e) {
          console.warn('Base64 decode failed, trying fetch from URL via Main Process...', e);
          const fetchedBuffer = await (window as any).api.invoke('inspector:fetch-wasm', url);
          buffer = fetchedBuffer;
        }

        console.log('WASM Buffer Type:', buffer.constructor.name);
        console.log('WASM Buffer Length:', buffer.length);
        const header = Array.from(buffer.slice(0, 8))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join(' ');
        console.log('WASM Buffer Header (Hex):', header);

        if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
          console.warn('Detected GZIP content, attempting to decompress...');
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
              {t.wasm.details} {url.split('/').pop()}
            </span>
            <span className="text-xs text-muted-foreground truncate opacity-70">
              {t.wasm.disassembledView}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!loading && !error && (
            <>
              <button
                onClick={handleCopy}
                className="p-2 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                title={t.wasm.copyToClipboard}
              >
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={handleDownload}
                className="p-2 hover:bg-muted rounded text-muted-foreground hover:text-foreground"
                title={t.wasm.downloadWat}
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
            <p>{t.wasm.disassembling}</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-red-400 gap-4 p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-2">
              <X className="w-6 h-6" />
            </div>
            <p className="font-medium">{t.wasm.disassemblyFailed}</p>
            <p className="text-sm opacity-70 max-w-lg font-sans">{error}</p>
          </div>
        ) : (
          <pre className="whitespace-pre-wrap break-all">{watContent}</pre>
        )}
      </div>
    </div>
  );
}
export type { WasmViewerProps };
