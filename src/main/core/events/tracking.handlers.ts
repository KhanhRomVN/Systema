import { net, session, BrowserWindow } from 'electron';
import { EventEmitter } from 'events';

interface TrackingConfig {
  proxyUrl: string;
  proxyType: string;
}

interface TrackedRequest {
  id: string;
  method: string;
  url: string;
  status: number;
  statusText: string;
  size: number;
  timestamp: Date;
  headers: Record<string, string>;
  responseHeaders?: Record<string, string>;
  bodyPreview?: string;
}

class TrackingManager extends EventEmitter {
  private isTracking: boolean = false;
  private trackedRequests: TrackedRequest[] = [];
  private maxRequests: number = 100;
  private defaultSession: Electron.Session;
  private mainWindow: BrowserWindow | null = null;

  constructor() {
    super();
    this.defaultSession = session.defaultSession;
  }

  setMainWindow(window: BrowserWindow) {
    this.mainWindow = window;
  }

  async startTracking(config: TrackingConfig): Promise<{ success: boolean; message: string }> {
    if (this.isTracking) {
      return { success: false, message: 'Tracking đã được bật trước đó' };
    }

    try {
      // Áp dụng proxy nếu có
      if (config.proxyUrl) {
        let proxyUrl = config.proxyUrl;
        if (
          !proxyUrl.startsWith('http://') &&
          !proxyUrl.startsWith('https://') &&
          !proxyUrl.startsWith('socks5://')
        ) {
          proxyUrl = `${config.proxyType}://${proxyUrl}`;
        }
        await this.defaultSession.setProxy({ proxyRules: proxyUrl });
      }

      // Bắt lắng nghe các webRequest
      this.setupRequestInterceptors();

      this.isTracking = true;
      this.trackedRequests = [];

      // Gửi event đến renderer
      this.emitTrackingStarted();

      return {
        success: true,
        message: 'Tracking đã bắt đầu. Các HTTP request sẽ được ghi lại.',
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Lỗi khi bắt đầu tracking: ${error.message || error}`,
      };
    }
  }

  stopTracking(): { success: boolean; message: string } {
    if (!this.isTracking) {
      return { success: false, message: 'Tracking chưa được bật' };
    }

    try {
      // Gỡ bỏ interceptors
      this.defaultSession.webRequest.onBeforeRequest(null);
      this.defaultSession.webRequest.onHeadersReceived(null);
      this.defaultSession.webRequest.onCompleted(null);

      this.isTracking = false;
      this.emitTrackingStopped();

      return {
        success: true,
        message: 'Tracking đã dừng',
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Lỗi khi dừng tracking: ${error.message || error}`,
      };
    }
  }

  private setupRequestInterceptors() {
    // Lắng nghe trước khi request được gửi
    this.defaultSession.webRequest.onBeforeRequest(
      { urls: ['http://*/*', 'https://*/*'] },
      (details, callback) => {
        const requestId = details.id.toString();
        const timestamp = new Date();

        const trackedRequest: TrackedRequest = {
          id: requestId,
          method: details.method,
          url: details.url,
          status: 0,
          statusText: 'Pending',
          size: 0,
          timestamp,
          headers: details.requestHeaders || {},
        };

        // Lưu request tạm thời
        this.trackedRequests.unshift(trackedRequest);
        if (this.trackedRequests.length > this.maxRequests) {
          this.trackedRequests.pop();
        }

        // Gửi đến renderer
        this.emitRequestTracked(trackedRequest);

        callback({ cancel: false });
      },
    );

    // Lắng nghe khi nhận được response headers
    this.defaultSession.webRequest.onHeadersReceived(
      { urls: ['http://*/*', 'https://*/*'] },
      (details, callback) => {
        // Cập nhật request với status code
        const requestIndex = this.trackedRequests.findIndex(
          (req) => req.id === details.id.toString(),
        );

        if (requestIndex !== -1) {
          this.trackedRequests[requestIndex].status = details.statusCode;
          this.trackedRequests[requestIndex].statusText = details.statusLine || 'Unknown';
          this.trackedRequests[requestIndex].responseHeaders = details.responseHeaders;

          // Gửi cập nhật đến renderer
          this.emitRequestTracked(this.trackedRequests[requestIndex]);
        }

        callback({ cancel: false, responseHeaders: details.responseHeaders });
      },
    );

    // Lắng nghe khi request hoàn thành
    this.defaultSession.webRequest.onCompleted(
      { urls: ['http://*/*', 'https://*/*'] },
      (details) => {
        // Cập nhật request với kích thước
        const requestIndex = this.trackedRequests.findIndex(
          (req) => req.id === details.id.toString(),
        );

        if (requestIndex !== -1) {
          this.trackedRequests[requestIndex].size =
            details.uploadData?.reduce((acc, data) => acc + (data.bytes?.length || 0), 0) || 0;

          // Gửi cập nhật đến renderer
          this.emitRequestTracked(this.trackedRequests[requestIndex]);
        }
      },
    );
  }

  private emitTrackingStarted() {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('tracking:started');
    }
  }

  private emitTrackingStopped() {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('tracking:stopped');
    }
  }

  private emitRequestTracked(request: TrackedRequest) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('tracking:request-tracked', request);
    }
  }

  getTrackedRequests(): TrackedRequest[] {
    return [...this.trackedRequests];
  }

  clearTrackedRequests(): void {
    this.trackedRequests = [];
  }

  isTrackingActive(): boolean {
    return this.isTracking;
  }
}

// Singleton instance
const trackingManager = new TrackingManager();

export function startTracking(
  config: TrackingConfig,
): Promise<{ success: boolean; message: string }> {
  return trackingManager.startTracking(config);
}

export function stopTracking(): { success: boolean; message: string } {
  return trackingManager.stopTracking();
}

export function getTrackedRequests(): TrackedRequest[] {
  return trackingManager.getTrackedRequests();
}

export function setMainWindow(window: BrowserWindow): void {
  trackingManager.setMainWindow(window);
}

export function isTrackingActive(): boolean {
  return trackingManager.isTrackingActive();
}
