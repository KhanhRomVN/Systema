import { net } from 'electron';

export interface InspectorRequestPayload {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}

export interface InspectorResponsePayload {
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: string;
  time?: number;
  size?: number;
  error?: string;
}

export async function handleInspectorRequest(
  payload: InspectorRequestPayload,
): Promise<InspectorResponsePayload> {
  const { url, method, headers, body } = payload;
  const startTime = Date.now();

  try {
    console.log('[Inspector] Sending request:', { url, method, headers });

    // List of headers that are unsafe or managed by the browser/network stack
    const unsafeHeaders = [
      'host',
      'connection',
      'content-length',
      'upgrade-insecure-requests',
      'accept-encoding',
      // 'user-agent', // Sometimes useful to keep, but can be restricted
      // 'origin', // Useful
      // 'referer', // Useful
    ];

    // Ensure headers is a plain object of strings and filter unsafe ones
    const sanitizedHeaders: Record<string, string> = {};
    if (headers) {
      Object.entries(headers).forEach(([k, v]) => {
        const lowerKey = k.toLowerCase();
        if (unsafeHeaders.includes(lowerKey)) {
          return;
        }
        if (v !== undefined && v !== null) {
          sanitizedHeaders[k] = String(v);
        }
      });
    }

    const response = await net.fetch(url, {
      method,
      headers: sanitizedHeaders,
      body: method !== 'GET' && method !== 'HEAD' ? body : undefined,
    });

    const endTime = Date.now();
    const responseBody = await response.text();

    const responseHeaders: Record<string, string> = {};
    for (const [key, value] of response.headers.entries()) {
      responseHeaders[key] = value;
    }

    return {
      status: response.status,
      statusText: response.statusText,
      time: endTime - startTime,
      headers: responseHeaders,
      body: responseBody,
      size: new Blob([responseBody]).size, // Approximate size in bytes
    };
  } catch (error: any) {
    return {
      error: error.message || 'Unknown error occurred',
    };
  }
}
