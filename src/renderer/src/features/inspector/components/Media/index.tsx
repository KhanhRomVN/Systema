import { useState, useEffect, useMemo } from 'react';
import { NetworkRequest } from '../../types';
import {
  X,
  Image as ImageIcon,
  FileAudio,
  FileVideo,
  Music,
  Film,
  ExternalLink,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { MediaModal } from './MediaModal';

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
  isCached?: boolean;
  source: string;
}

export function MediaPanel({ requests, onClose }: MediaPanelProps) {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<MediaItem | null>(null);
  const [showFilterSettings, setShowFilterSettings] = useState(false);
  const [mediaFilters, setMediaFilters] = useState({
    images: true,
    videos: true,
    audio: true,
  });
  const [selectedSource, setSelectedSource] = useState<string>('all');

  const [cacheManifest, setCacheManifest] = useState<Record<string, { size?: number }>>({});

  useEffect(() => {
    const fetchManifest = async () => {
      try {
        const manifest = await (window as any).api.invoke('media:get-cache-manifest');
        setCacheManifest(manifest);
      } catch (e) {
        console.error('Failed to fetch media cache manifest:', e);
      }
    };

    fetchManifest();
    const interval = setInterval(fetchManifest, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setIsScanning(true);
    // Deduplication Map: URL -> Latest Item
    const uniqueItemsFn = () => {
      const itemMap = new Map<string, MediaItem>();

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
          else if (path.match(/\.(mp4|webm|ogg|mov|avi|mkv|ts)$/)) type = 'video';
          else if (path.match(/\.(mp3|wav|aac|flac|m4a)$/)) type = 'audio';
        }

        if (type) {
          const originalReferer =
            req.requestHeaders?.['referer'] || req.requestHeaders?.['Referer'] || '';
          const queryParams = new URLSearchParams();
          if (originalReferer) queryParams.set('_referer', originalReferer);
          queryParams.set('_requestId', req.id);

          const queryStr = (req.path.includes('?') ? '&' : '?') + queryParams.toString();

          const itemUrl = req.url.startsWith('media://')
            ? req.url
            : `media://${req.protocol}://${req.host}${req.path}${queryStr}`;

          const cachedEntry = cacheManifest[req.id];
          const isCached = !!cachedEntry;

          // Helper to format bytes
          const formatBytes = (bytes: number) => {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
          };

          const displaySize =
            isCached && cachedEntry?.size ? formatBytes(cachedEntry.size) : req.size || 'Unknown';

          // Use the base URL (without Systema params) key for deduplication to avoid duplicates from same resource
          // We must be careful not to dedup distinct resources that just happen to have same path but different query
          // But for media inspector, usually we want unique resource content.
          // Let's use the full actual URL as key, but maybe we should strip the _requestId param we just added?
          // Actually, `req.url` from the request object is the original URL. Let's use that.
          const uniqueKey = req.url;

          itemMap.set(uniqueKey, {
            id: req.id,
            filename: req.path.split('/').pop()?.split('?')[0] || `unknown.${type}`,
            url: itemUrl,
            type,
            contentType,
            size: displaySize === '0 B' ? 'Unknown' : displaySize, // Hide 0 B
            timestamp: req.timestamp,
            isCached,
            source: req.url.split('?')[0].substring(0, req.url.split('?')[0].lastIndexOf('/') + 1),
          });
        }
      });

      return Array.from(itemMap.values());
    };

    const items = uniqueItemsFn();
    setMediaItems(items.sort((a, b) => b.timestamp - a.timestamp));
    setIsScanning(false);
  }, [requests, cacheManifest]);

  const videoSources = useMemo(() => {
    const sources = new Set<string>();
    mediaItems.forEach((item) => {
      if (item.type === 'video' && item.source) {
        sources.add(item.source);
      }
    });
    return Array.from(sources).sort();
  }, [mediaItems]);

  // Filter media items based on filter settings
  const filteredMediaItems = mediaItems.filter((item) => {
    if (item.type === 'image' && !mediaFilters.images) return false;
    if (item.type === 'video' && !mediaFilters.videos) return false;
    if (item.type === 'audio' && !mediaFilters.audio) return false;

    if (item.type === 'video' && selectedSource !== 'all' && item.source !== selectedSource) {
      return false;
    }

    return true;
  });

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Header */}
      <div className="h-10 border-b border-border flex items-center shrink-0 bg-background/50 z-10 px-4 justify-between">
        <div className="flex items-center gap-2 font-medium text-sm text-blue-400">
          <ImageIcon className="w-4 h-4" />
          Media Inspector
          <span className="ml-2 text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
            {filteredMediaItems.length} / {mediaItems.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowFilterSettings(!showFilterSettings)}
            className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
            title="Filter Media"
          >
            <Filter className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Settings Section */}
      {showFilterSettings && (
        <div className="border-b border-border bg-card/50 backdrop-blur-sm shadow-lg z-20">
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-400" />
                <span className="font-medium text-sm">Filter by Format</span>
              </div>
              <button
                onClick={() => setShowFilterSettings(false)}
                className="p-1 hover:bg-muted rounded transition-colors"
              >
                <ChevronDown className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  className="w-3.5 h-3.5"
                  checked={mediaFilters.images}
                  onChange={(e) =>
                    setMediaFilters((prev) => ({ ...prev, images: e.target.checked }))
                  }
                />
                <span className="flex items-center gap-1.5">
                  <ImageIcon className="w-3 h-3 text-blue-400" />
                  Show Images
                </span>
              </label>
              <label className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  className="w-3.5 h-3.5"
                  checked={mediaFilters.videos}
                  onChange={(e) =>
                    setMediaFilters((prev) => ({ ...prev, videos: e.target.checked }))
                  }
                />
                <span className="flex items-center gap-1.5">
                  <Film className="w-3 h-3 text-purple-400" />
                  Show Videos
                </span>
              </label>
              <label className="flex items-center gap-2 p-2 hover:bg-muted/50 rounded cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  className="w-3.5 h-3.5"
                  checked={mediaFilters.audio}
                  onChange={(e) =>
                    setMediaFilters((prev) => ({ ...prev, audio: e.target.checked }))
                  }
                />
                <span className="flex items-center gap-1.5">
                  <Music className="w-3 h-3 text-green-400" />
                  Show Audio
                </span>
              </label>
            </div>

            <div className="pt-2 border-t border-border/50 text-[10px] text-muted-foreground">
              Filter media resources by their format type.
            </div>

            {mediaFilters.videos && videoSources.length > 1 && (
              <div className="pt-3 border-t border-border/50 space-y-2">
                <div className="text-xs font-medium flex items-center gap-2">
                  <Film className="w-3 h-3 text-purple-400" />
                  Filter by Video Source
                </div>
                <select
                  value={selectedSource}
                  onChange={(e) => setSelectedSource(e.target.value)}
                  className="w-full bg-muted border border-border rounded px-2 py-1.5 text-[10px] outline-none focus:border-blue-500/50"
                >
                  <option value="all">All Video Sources ({videoSources.length})</option>
                  {videoSources.map((src) => {
                    // Try to make source more readable by showing domain + last few path segments
                    let displaySource = src;
                    try {
                      const url = new URL(src);
                      const pathParts = url.pathname.split('/').filter(Boolean);
                      const lastPart = pathParts.slice(-2).join('/');
                      displaySource = `${url.hostname}/.../${lastPart}`;
                    } catch (e) {}

                    return (
                      <option key={src} value={src}>
                        {displaySource}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMediaItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedMedia(item)}
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
                      const fallback = (e.target as HTMLImageElement).nextElementSibling;
                      if (fallback) {
                        fallback.classList.remove('hidden');
                        fallback.classList.add('flex');
                      }
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

                {/* Cached Badge */}
                {item.isCached && (
                  <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-green-500/80 text-[10px] font-bold text-white rounded flex items-center gap-1 backdrop-blur-sm z-10 shadow-sm">
                    {item.size}
                  </div>
                )}

                {/* Fallback Icon (Hidden by default, shown on error) */}
                <div className="absolute inset-0 hidden items-center justify-center text-muted-foreground">
                  <ImageIcon className="w-8 h-8 opacity-20" />
                </div>

                {/* Overlay Actions */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <span className="text-white text-xs font-medium flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" />
                    Preview
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

          {filteredMediaItems.length === 0 && mediaItems.length > 0 && (
            <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Filter className="w-8 h-8 opacity-50" />
              </div>
              <p>No media matches current filters.</p>
              <p className="text-xs opacity-70 mt-1">Try adjusting your filter settings.</p>
            </div>
          )}

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

      {/* Media Preview Modal */}
      {selectedMedia && (
        <MediaModal
          url={selectedMedia.url}
          filename={selectedMedia.filename}
          type={selectedMedia.type}
          onClose={() => setSelectedMedia(null)}
        />
      )}
    </div>
  );
}
