import { app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

/**
 * MediaCache handles persistent storage of media segments (like .ts files)
 * to ensure they are available even if the original URL expires.
 */
class MediaCache {
  private cacheDir: string;
  private manifestFile: string;
  private manifest: Record<
    string,
    { contentType: string; filename: string; timestamp: number; size?: number }
  >;

  constructor() {
    this.cacheDir = path.join(app.getPath('userData'), 'media_cache');
    this.manifestFile = path.join(this.cacheDir, 'manifest.json');

    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }

    if (fs.existsSync(this.manifestFile)) {
      try {
        this.manifest = JSON.parse(fs.readFileSync(this.manifestFile, 'utf-8'));
      } catch (e) {
        console.error('[MediaCache] Failed to load manifest:', e);
        this.manifest = {};
      }
    } else {
      this.manifest = {};
    }
  }

  private saveManifest() {
    try {
      fs.writeFileSync(this.manifestFile, JSON.stringify(this.manifest, null, 2));
    } catch (e) {
      console.error('[MediaCache] Failed to save manifest:', e);
    }
  }

  /**
   * Checks if a request ID exists in the cache.
   */
  public has(requestId: string): boolean {
    const entry = this.manifest[requestId];
    if (!entry) return false;
    return fs.existsSync(path.join(this.cacheDir, requestId));
  }

  /**
   * Retrieves cached media content.
   */
  public get(requestId: string): { buffer: Buffer; contentType: string } | null {
    const entry = this.manifest[requestId];
    if (!entry) return null;

    const filePath = path.join(this.cacheDir, requestId);
    if (!fs.existsSync(filePath)) return null;

    try {
      const buffer = fs.readFileSync(filePath);
      return { buffer, contentType: entry.contentType };
    } catch (e) {
      console.error(`[MediaCache] Failed to read cached file ${requestId}:`, e);
      return null;
    }
  }

  /**
   * Saves media content to the cache.
   */
  public save(requestId: string, buffer: Buffer, contentType: string, filename: string) {
    const filePath = path.join(this.cacheDir, requestId);
    try {
      fs.writeFileSync(filePath, buffer);
      this.manifest[requestId] = {
        contentType,
        filename,
        timestamp: Date.now(),
        size: buffer.length,
      };
      this.saveManifest();
      console.log(`[MediaCache] Saved ${requestId} (${filename}) to disk. Size: ${buffer.length}`);
    } catch (e) {
      console.error(`[MediaCache] Failed to save media ${requestId}:`, e);
    }
  }

  /**
   * Clears all cached media.
   */
  public clear() {
    try {
      const files = fs.readdirSync(this.cacheDir);
      for (const file of files) {
        fs.unlinkSync(path.join(this.cacheDir, file));
      }
      this.manifest = {};
      this.saveManifest();
    } catch (e) {
      console.error('[MediaCache] Failed to clear cache:', e);
    }
  }

  /**
   * Returns the entire cache manifest.
   */
  public getManifest() {
    return this.manifest;
  }
}

export const mediaCache = new MediaCache();
