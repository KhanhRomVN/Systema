export const INJECT_SCRIPT = `
(function() {
  // ── Intercept Overlay ──────────────────────────────────────────────────────
  (function() {
    var overlay = document.createElement('div');
    overlay.id = '__systema_overlay__';
    overlay.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:2147483647;pointer-events:all;cursor:not-allowed;';
    var label = document.createElement('div');
    label.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#f59e0b;font-family:monospace;font-size:14px;font-weight:bold;letter-spacing:0.05em;user-select:none;';
    label.textContent = '\\u23F8 Paused by Systema';
    overlay.appendChild(label);
    document.documentElement.appendChild(overlay);

    function connect() {
      var ws = new WebSocket('ws://' + window.location.hostname + ':__WS_PORT__');
      ws.onmessage = function(e) {
        try {
          var data = JSON.parse(e.data);
          overlay.style.display = data.intercepting ? 'block' : 'none';
        } catch(err) {}
      };
      ws.onclose = function() { setTimeout(connect, 1000); };
      ws.onerror = function() { ws.close(); };
    }
    connect();
  })();

  // ── Stack Trace Injection ──────────────────────────────────────────────────
  const originalFetch = window.fetch;
  const originalXhrOpen = XMLHttpRequest.prototype.open;
  const originalXhrSend = XMLHttpRequest.prototype.send;

  function getStackTrace() {
    try {
      if (Error.stackTraceLimit && Error.stackTraceLimit < 50) Error.stackTraceLimit = 50;
      throw new Error();
    } catch (e) {
      return (e.stack || '').split('\\n').slice(3, 40).join('\\n').trim();
    }
  }

  window.fetch = function(...args) {
    const stack = getStackTrace();
    let input = args[0], init = args[1] || {};
    try {
      if (input instanceof Request) {
        try { input.headers.append('X-Systema-Initiator', btoa(stack)); } catch(e) {}
      } else {
        if (!init.headers) init.headers = {};
        if (init.headers instanceof Headers) {
          try { init.headers.append('X-Systema-Initiator', btoa(stack)); } catch(e) {}
        } else if (Array.isArray(init.headers)) {
          init.headers.push(['X-Systema-Initiator', btoa(stack)]);
        } else {
          init.headers['X-Systema-Initiator'] = btoa(stack);
        }
        args[1] = init;
      }
    } catch(err) {}
    return originalFetch.apply(this, args);
  };

  XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
    this._stack = getStackTrace();
    return originalXhrOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function(body) {
    if (this._stack) this.setRequestHeader('X-Systema-Initiator', btoa(this._stack));
    return originalXhrSend.apply(this, arguments);
  };
})();
`;
