import { useState, useEffect } from 'react';
import { NetworkRequest } from '../types';
import {
  X,
  Image as ImageIcon,
  FileAudio,
  FileVideo,
  Music,
  Film,
  ExternalLink,
} from 'lucide-react';

interface MediaPanelProps {
  requests: NetworkRequest[];
  onClose: () => void;
}

interface MediaItem {
  id: string; // Request ID
  filename: string;
  url: string;
  type: 'image' | 'video' | 'audio';
  contentType: string;
  size: string;
  timestamp: number;
}

export function MediaPanel({ requests, onClose }: MediaPanelProps) {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    setIsScanning(true);
    const items: MediaItem[] = [];

    requests.forEach((req) => {
      let type: MediaItem['type'] | null = null;
      const contentType = (
        req.responseHeaders?.['content-type'] ||
        req.responseHeaders?.['Content-Type'] ||
        ''
      ).toLowerCase();

      // Check Content-Type
      if (contentType.startsWith('image/')) type = 'image';
      else if (contentType.startsWith('video/')) type = 'video';
      else if (contentType.startsWith('audio/')) type = 'audio';

      // Fallback: Check Extension
      if (!type) {
        const path = req.path.toLowerCase().split('?')[0];
        if (path.match(/\.(png|jpg|jpeg|gif|svg|ico|webp|bmp)$/)) type = 'image';
        else if (path.match(/\.(mp4|webm|ogg|mov|avi|mkv)$/)) type = 'video';
        else if (path.match(/\.(mp3|wav|aac|flac|m4a)$/)) type = 'audio';
      }

      if (type) {
        items.push({
          id: req.id,
          filename: req.path.split('/').pop()?.split('?')[0] || `unknown.${type}`,
          url: `${req.protocol}://${req.host}${req.path}`,
          type,
          contentType,
          size: req.size,
          timestamp: req.timestamp,
        });
      }
    });

    setMediaItems(items.sort((a, b) => b.timestamp - a.timestamp));
    setIsScanning(false);
  }, [requests]);

  const handleOpenMedia = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Header */}
      <div className="h-10 border-b border-border flex items-center shrink-0 bg-background/50 z-10 px-4 justify-between">
        <div className="flex items-center gap-2 font-medium text-sm text-blue-400">
          <ImageIcon className="w-4 h-4" />
          Media Inspector
          <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
            {mediaItems.length} found
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {mediaItems.map((item) => (
            <div
              key={item.id}
              onClick={() => handleOpenMedia(item.url)}
              className="border border-border rounded-lg bg-card overflow-hidden hover:border-blue-500/50 transition-all shadow-sm group cursor-pointer hover:shadow-md flex flex-col h-48"
            >
              {/* Preview Area */}
              <div className="flex-1 bg-muted/30 relative flex items-center justify-center overflow-hidden">
                {item.type === 'image' ? (
                  <img
                    src={item.url}
                    alt={item.filename}
                    loading="lazy"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = ''; // Clear broken image
                      (e.target as HTMLImageElement).classList.add('hidden');
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : item.type === 'video' ? (
                  <div className="text-muted-foreground flex flex-col items-center">
                    <Film className="w-8 h-8 opacity-50 mb-2" />
                    <span className="text-[10px] uppercase font-bold opacity-50">Video</span>
                  </div>
                ) : (
                  <div className="text-muted-foreground flex flex-col items-center">
                    <Music className="w-8 h-8 opacity-50 mb-2" />
                    <span className="text-[10px] uppercase font-bold opacity-50">Audio</span>
                  </div>
                )}

                {/* Fallback Icon (Hidden by default, shown on error) */}
                <div className="absolute inset-0 hidden flex items-center justify-center text-muted-foreground">
                  <ImageIcon className="w-8 h-8 opacity-20" />
                </div>

                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <span className="text-white text-xs font-medium flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    Open
                  </span>
                </div>
              </div>

              {/* Info Area */}
              <div className="p-2 border-t border-border bg-card z-10">
                <div className="flex items-center gap-2 mb-1">
                  {item.type === 'image' && (
                    <ImageIcon className="w-3 h-3 text-blue-400 shrink-0" />
                  )}
                  {item.type === 'video' && (
                    <FileVideo className="w-3 h-3 text-purple-400 shrink-0" />
                  )}
                  {item.type === 'audio' && (
                    <FileAudio className="w-3 h-3 text-green-400 shrink-0" />
                  )}
                  <span className="text-xs font-medium truncate" title={item.filename}>
                    {item.filename}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span className="truncate max-w-[60%] opacity-70" title={item.contentType}>
                    {item.contentType}
                  </span>
                  <span className="font-mono">{item.size}</span>
                </div>
              </div>
            </div>
          ))}

          {mediaItems.length === 0 && !isScanning && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <ImageIcon className="w-8 h-8 opacity-50" />
              </div>
              <p>No media files detected.</p>
              <p className="text-xs opacity-70 mt-1">
                Try navigating to a page with images or videos.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
