export const INJECT_SCRIPT = `
(function() {
  const originalFetch = window.fetch;
  const originalXhrOpen = XMLHttpRequest.prototype.open;
  const originalXhrSend = XMLHttpRequest.prototype.send;

  function getStackTrace() {
    try {
      // Increase stack limit to capture deep call stacks (e.g. from framework internals)
      if (Error.stackTraceLimit && Error.stackTraceLimit < 50) {
        Error.stackTraceLimit = 50;
      }
      throw new Error();
    } catch (e) {
      // Split lines, remove the first "Error" line and the current function call
      const stack = e.stack || '';
      const lines = stack.split('\\n');
      
      // We want to find the first line that is NOT inside this script
      // Taking a larger slice to match DevTools behavior better (e.g. 30+ frames)
      // Slice from 3 to omit 'Error', 'getStackTrace', and hook wrapper
      return lines.slice(3, 40).join('\\n').trim();
    }
  }

  // Hook Fetch
  window.fetch = function(...args) {
    const stack = getStackTrace();
    
    // args[0] is input (URL or Request object)
    // args[1] is init options
    let input = args[0];
    let init = args[1] || {};

    try {
        if (input instanceof Request) {
            // Clone request to modify headers safely
            // Note: This might have side effects if body is used
            try {
                input.headers.append('X-Systema-Initiator', btoa(stack));
            } catch(e) {}
        } else {
            // Input is URL string, check init
            if (!init.headers) {
                init.headers = {};
            }
            
            // Handle headers as object or Headers object
            if (init.headers instanceof Headers) {
                try {
                    init.headers.append('X-Systema-Initiator', btoa(stack));
                } catch (e) {
                   // Ignore header errors (some headers are read-only)
                }
            } else if (Array.isArray(init.headers)) {
                init.headers.push(['X-Systema-Initiator', btoa(stack)]);
            } else if (typeof init.headers === 'object') {
                init.headers['X-Systema-Initiator'] = btoa(stack);
            }
            args[1] = init;
        }
    } catch (err) {
        console.error('[Systema] Error injecting header into fetch:', err);
    }

    return originalFetch.apply(this, args);
  };

  // Hook XHR
  XMLHttpRequest.prototype.open = function(method, url, async, user, password) {
    this._stack = getStackTrace();
    return originalXhrOpen.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function(body) {
    if (this._stack) {
        this.setRequestHeader('X-Systema-Initiator', btoa(this._stack));
    }
    return originalXhrSend.apply(this, arguments);
  };
})();
`;
