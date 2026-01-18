import { NetworkRequest } from '../types';

export interface WasmItem {
  id: string; // Request ID
  filename: string;
  url: string;
  size: string;
  detectionMethod: 'Content-Type' | 'Extension' | 'Magic Bytes' | 'JS Heuristic' | 'Embedded';
  confidence: 'High' | 'Medium' | 'Low';
  details?: string;
  timestamp: number;
}

export interface MediaItem {
  id: string; // Request ID
  filename: string;
  url: string;
  type: 'image' | 'video' | 'audio';
  contentType: string;
  size: string;
  timestamp: number;
}

export function detectWasmModules(requests: NetworkRequest[]): WasmItem[] {
  const items: WasmItem[] = [];
  const seenUrls = new Set<string>();

  // Magic bytes for WASM: \0asm (0x00 0x61 0x73 0x6D)
  // const WASM_MAGIC = [0x00, 0x61, 0x73, 0x6d];
  // Base64 version of \0asm (AGFzbQ==) - checking for start of it
  const BASE64_MAGIC = 'AGFzbQ';

  // Iterate in reverse to get latest first? Or just sort later.
  // If we prioritize specific requests (e.g. successful ones), do that.
  // For deduplication, we usually want the *first* one we encounter or the *best* one.
  // If we iterate array normally, we get earliest first.

  requests.forEach((req) => {
    let isWasm = false;
    let method: WasmItem['detectionMethod'] = 'Extension';
    let confidence: WasmItem['confidence'] = 'Low';
    let details = '';

    // 1. Check Content-Type (Strongest)
    const contentType =
      req.responseHeaders?.['content-type'] || req.responseHeaders?.['Content-Type'] || '';
    if (contentType.toLowerCase().includes('application/wasm')) {
      isWasm = true;
      method = 'Content-Type';
      confidence = 'High';
    }

    // 2. Check Extension (Strong)
    const urlPath = req.path.split('?')[0];
    if (!isWasm && urlPath.endsWith('.wasm')) {
      isWasm = true;
      method = 'Extension';
      confidence = 'High';
    }

    // 3. Check Magic Bytes in Binary Response (Strongest)
    if (req.responseBody && req.isBinary) {
      if (req.responseBody.startsWith(BASE64_MAGIC)) {
        isWasm = true;
        method = 'Magic Bytes';
        confidence = 'High';
        details = 'Detected generic binary header \\0asm';
      }
    }

    // 4. Check JS Heuristics (Medium/Low) - embedded or loading logic
    // NOTE: We only want to detect this if we haven't found a better match, OR if we want to show loaders too.
    // User complaint suggests they want to see loaders but maybe distinct or deduplicated?
    // If we have "foo.wasm" via extension and "foo.js" loading it, they are different URLs. They won't dedup.
    // Deduplication happens on URL.
    if (!isWasm && !req.isBinary && req.responseBody) {
      // Check for embedded base64 wasm
      if (req.responseBody.includes(BASE64_MAGIC)) {
        isWasm = true;
        method = 'Embedded';
        confidence = 'Medium';
        details = 'Found embedded WASM binary string';
      }
      // Check for API calls
      else if (
        req.responseBody.includes('WebAssembly.instantiate') ||
        req.responseBody.includes('WebAssembly.compile')
      ) {
        isWasm = true;
        method = 'JS Heuristic';
        confidence = 'Low';
        details = 'Contains WebAssembly loading logic';
      }
    }

    if (isWasm) {
      const url = `${req.protocol}://${req.host}${req.path}`;
      // Deduplication Logic
      if (!seenUrls.has(url)) {
        seenUrls.add(url);
        items.push({
          id: req.id,
          filename: urlPath.split('/').pop() || 'unknown.wasm',
          url,
          size: req.size,
          detectionMethod: method,
          confidence,
          details,
          timestamp: req.timestamp,
        });
      }
    }
  });

  return items.sort((a, b) => b.timestamp - a.timestamp);
}

export function detectMediaFiles(requests: NetworkRequest[]): MediaItem[] {
  const items: MediaItem[] = [];
  const seenUrls = new Set<string>();

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
      const url = `${req.protocol}://${req.host}${req.path}`;
      if (!seenUrls.has(url)) {
        seenUrls.add(url);
        items.push({
          id: req.id,
          filename: req.path.split('/').pop()?.split('?')[0] || `unknown.${type}`,
          url,
          type,
          contentType,
          size: req.size,
          timestamp: req.timestamp,
        });
      }
    }
  });

  return items.sort((a, b) => b.timestamp - a.timestamp);
}
