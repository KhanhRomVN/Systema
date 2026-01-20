import { X, ExternalLink, Download, FileWarning } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface MediaModalProps {
  url: string;
  filename: string;
  type: 'image' | 'video' | 'audio';
  onClose: () => void;
}

export function MediaModal({ url, filename, type, onClose }: MediaModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hlsError, setHlsError] = useState<string | null>(null);

  // Helper to get raw URL (strips media:// protocol)
  const rawUrl = url.startsWith('media://') ? url.slice('media://'.length) : url;
  const isTS = filename.toLowerCase().endsWith('.ts') || url.toLowerCase().includes('.ts');

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  // HLS Setup for TS files
  useEffect(() => {
    if (type === 'video' && isTS && videoRef.current) {
      if (Hls.isSupported()) {
        const hls = new Hls();

        // Create a temporary M3U8 manifest if it's a single TS segment
        const m3u8 = `#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:60\n#EXTINF:60.0,\n${url}\n#EXT-X-ENDLIST`;
        const blob = new Blob([m3u8], { type: 'application/x-mpegURL' });
        const blobUrl = URL.createObjectURL(blob);

        hls.loadSource(blobUrl);
        hls.attachMedia(videoRef.current);

        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            console.error('[HLS Error]', data);
            setHlsError(`Failed to decode TS segment: ${data.type}`);
          }
        });

        return () => {
          hls.destroy();
          URL.revokeObjectURL(blobUrl);
        };
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS support (Safari)
        videoRef.current.src = url;
      } else {
        setHlsError('Your browser does not support HLS/MPEG-TS playback.');
      }
    }
    return undefined;
  }, [type, isTS, url]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = rawUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-300"
      onClick={onClose}
    >
      <div
        className="relative max-w-[90vw] max-h-[90vh] flex flex-col bg-card rounded-xl border border-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
          <div className="flex flex-col">
            <span className="text-sm font-semibold truncate max-w-[400px]">{filename}</span>
            <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
              {isTS ? 'MPEG-TS Video' : type}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
            <a
              href={rawUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
              title="Open in new tab"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
            <button
              onClick={onClose}
              className="p-2 hover:bg-muted rounded-full transition-colors text-muted-foreground hover:text-foreground"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 flex items-center justify-center min-h-[300px] min-w-[500px]">
          {hlsError ? (
            <div className="flex flex-col items-center gap-4 text-red-400">
              <FileWarning className="w-12 h-12 opacity-50" />
              <p className="text-sm font-medium">{hlsError}</p>
              <button
                onClick={handleDownload}
                className="text-xs px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all text-red-300"
              >
                Download and play locally
              </button>
            </div>
          ) : (
            <>
              {type === 'image' && (
                <img
                  src={url}
                  alt={filename}
                  className="max-w-full max-h-[70vh] object-contain rounded shadow-lg"
                />
              )}
              {type === 'video' && (
                <video
                  ref={videoRef}
                  src={isTS ? undefined : url}
                  controls
                  autoPlay
                  className="max-w-full max-h-[70vh] rounded shadow-lg"
                />
              )}
              {type === 'audio' && (
                <div className="w-full flex flex-col items-center gap-6 py-12">
                  <div className="w-24 h-24 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center animate-pulse">
                      <div className="w-8 h-8 rounded-full bg-blue-500" />
                    </div>
                  </div>
                  <audio src={url} controls className="w-80" />
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-muted/10 border-t border-border flex justify-end">
          <span className="text-[10px] text-muted-foreground font-mono truncate">{rawUrl}</span>
        </div>
      </div>
    </div>
  );
}
