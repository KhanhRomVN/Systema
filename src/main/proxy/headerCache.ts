// Cache for original request headers to support authentication in media protocol
const headerCache = new Map<string, Record<string, string>>();
const MAX_CACHE_SIZE = 2000;

export function cacheHeaders(id: string, headers: Record<string, string>) {
  headerCache.set(id, headers);

  // Basic cleanup
  if (headerCache.size > MAX_CACHE_SIZE) {
    const firstKey = headerCache.keys().next().value;
    if (firstKey) headerCache.delete(firstKey);
  }
}

export function getCachedHeaders(id: string): Record<string, string> | undefined {
  return headerCache.get(id);
}
