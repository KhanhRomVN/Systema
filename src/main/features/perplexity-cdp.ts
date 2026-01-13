import { WebContents } from 'electron';

export async function attachNetworkDebugger(webContents: WebContents) {
  try {
    // Check if debugger is already attached
    if (webContents.debugger.isAttached()) {
      console.log('[Perplexity CDP] Debugger already attached');
      return;
    }

    // Attach debugger
    webContents.debugger.attach('1.3');
    console.log('[Perplexity CDP] Debugger attached');

    // Enable Network domain
    await webContents.debugger.sendCommand('Network.enable', {
      maxResourceBufferSize: 1024 * 1024 * 10, // 10MB buffer
      maxTotalBufferSize: 1024 * 1024 * 100, // 100MB total
    });
    console.log('[Perplexity CDP] Network domain enabled');

    // Store response bodies mapped by RequestId
    // In a real app, you might want to cleanup these to avoid memory leaks
    // For now, we'll just keep it simple or maybe use a LRU cache concept if needed but
    // since this is a specific window, it might be fine.
    // Actually, Network.getResponseBody requires the request to be finished.

    webContents.debugger.on('message', async (event, method, params) => {
      // ---------------------------------------------------------
      // 1. Request Will Be Sent
      // ---------------------------------------------------------
      if (method === 'Network.requestWillBeSent') {
        const { requestId, request, timestamp, initiator } = params;
        const { url, method: httpMethod, headers } = request;

        // Filter out some noise if needed (like data: URLs)
        if (url.startsWith('data:')) return;

        // Try to construct a stack trace string from initiator
        let initiatorStack = '';
        if (initiator && initiator.type === 'script' && initiator.stack) {
          const frames = initiator.stack.callFrames || [];
          initiatorStack = frames
            // @ts-ignore
            .map(
              (f) =>
                `at ${f.functionName || '<anonymous>'} (${f.url}:${f.lineNumber}:${f.columnNumber})`,
            )
            .join('\n');
        }

        // Send to Renderer (mimicking ProxyServer behavior)
        webContents.send('proxy:request', {
          id: requestId,
          method: httpMethod,
          url,
          headers,
          timestamp: Date.now(), // Use local time for UI
          isIntercepted: false, // CDP doesn't pause requests by default
          initiator: initiatorStack,
        });
      }

      // ---------------------------------------------------------
      // 2. Response Received
      // ---------------------------------------------------------
      if (method === 'Network.responseReceived') {
        const { requestId, response } = params;
        const { url, status, headers, mimeType } = response;

        if (url.startsWith('data:')) return;

        webContents.send('proxy:response', {
          id: requestId,
          url,
          statusCode: status,
          headers,
          timestamp: Date.now(),
        });

        // We can try to get the body, but usually we need to wait for loadingFinished
      }

      // ---------------------------------------------------------
      // 3. Loading Finished (Get Body)
      // ---------------------------------------------------------
      if (method === 'Network.loadingFinished') {
        const { requestId } = params;

        try {
          // Fetch the body from CDP
          const result = await webContents.debugger.sendCommand('Network.getResponseBody', {
            requestId,
          });

          const { body, base64Encoded } = result as { body: string; base64Encoded: boolean };

          // Determine content type (cdp doesn't give it here, but we could have stored it from responseReceived)
          // For the UI's purpose, we just send the body. The UI likely interprets it.
          // The ProxyServer logic tried to decode gzip, etc. CDP returns decoded text if possible, or base64.

          let finalBody = body;
          let isBinary = base64Encoded;

          webContents.send('proxy:response-body', {
            id: requestId,
            body: finalBody,
            size: finalBody.length + (isBinary ? ' (Base64)' : ' chars'),
            isBinary,
            // contentType: ... // We'd need to cache headers from responseReceived to send this accurately
          });
        } catch (err) {
          // Typically fails if body is not available (e.g. redirect, or empty)
          // console.warn('[Perplexity CDP] Failed to get body for', requestId, err);
        }
      }
    });

    // Cleanup on detach
    webContents.debugger.on('detach', () => {
      console.log('[Perplexity CDP] Debugger detached');
    });
  } catch (err) {
    console.error('[Perplexity CDP] Failed to attach debugger:', err);
  }
}
