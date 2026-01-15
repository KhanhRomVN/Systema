import { BrowserWindow } from 'electron';

export class CloudflareBypasser {
  private window: BrowserWindow;
  private maxRetries: number;
  private retryDelay: number;
  private isBypassing: boolean = false;

  constructor(window: BrowserWindow, maxRetries: number = 20, retryDelay: number = 2000) {
    this.window = window;
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
  }

  /**
   * Start the bypass attempts
   */
  public async start(): Promise<boolean> {
    if (this.isBypassing) return false;
    this.isBypassing = true;

    for (let i = 0; i < this.maxRetries; i++) {
      // Check if window is destroyed
      if (this.window.isDestroyed()) {
        this.isBypassing = false;
        return false;
      }

      // Check if already bypassed based on title
      const title = this.window.getTitle().toLowerCase();
      if (!title.includes('just a moment')) {
        this.isBypassing = false;
        return true;
      }

      // Inject logic to find and click button
      const clicked = await this.clickVerificationButton();

      if (clicked) {
        // Wait longer if clicked
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } else {
        // Wait normal delay
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
      }
    }

    this.isBypassing = false;
    return false;
  }

  /**
   * Inject JS to traverse Shadow DOM and click the button
   */
  private async clickVerificationButton(): Promise<boolean> {
    if (this.window.isDestroyed()) return false;

    // This script mirrors the logic in the Python example:
    // It looks for an input[name*="turnstile"] in shadow roots, then finds the button.
    const code = `
      (() => {
        function searchRecursivelyShadowRootWithIframe(ele) {
          if (ele.shadowRoot) {
            const child = ele.shadowRoot.querySelector('iframe');
            if (child) return child;
          }
           // BFS/DFS fallback if needed, but usually it's direct children
           // Simplified for JS: iterate over children
           for (const child of Array.from(ele.children)) {
             const result = searchRecursivelyShadowRootWithIframe(child);
             if (result) return result;
           }
           return null;
        }

         function searchRecursivelyShadowRootWithCfInput(ele) {
          if (ele.shadowRoot) {
            const input = ele.shadowRoot.querySelector('input');
             if (input) return input;
          }
           for (const child of Array.from(ele.children)) {
             const result = searchRecursivelyShadowRootWithCfInput(child);
             if (result) return result;
           }
           return null;
        }

        // Main logic
        try {
            // 1. naive check for input inside local dom (unlikely for shadow)
            // 2. recursive search

            // Helper to find deep active element or shadow root text
            
            // Replicating the Python logic exactly:
            // "fake" button location strategy
            
            // Strategy A: Find the challenge widget iframe
            // The challenge is often inside an iframe with specific attributes or just existing
            
            let foundButton = null;
            
            // Try to find the specific CF input hidden field to locate context
            // In Python logic: eles = driver.eles("tag:input") -> check name="turnstile"
            
            // Since we can't easily traverse *all* shadow roots from top down without recursion
            // lets try a known structure or a generic recursive walker.
             
            function deepQuery(root, predicate) {
                if (predicate(root)) return root;
                if (root.shadowRoot) {
                    const res = deepQuery(root.shadowRoot, predicate);
                    if (res) return res;
                }
                for (const child of Array.from(root.children || [])) {
                    const res = deepQuery(child, predicate);
                    if (res) return res;
                }
                return null;
            }
            
            // Try clicking the checkbox directly if visible?
            // Actually the python code looks for an Input, then goes to parent -> shadow -> body -> shadow -> input
            
            // Let's rely on a simpler approach often used in JS bypasses:
            // Click the Shadow Host of the turnstile widget or the Checkbox inside it.
            
            // Generic shadow DOM flattener
            function getAllShadowRoots(node = document.body) {
                const shadowRoots = [];
                const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT);
                while(walker.nextNode()) {
                    const el = walker.currentNode;
                    if (el.shadowRoot) shadowRoots.push(el.shadowRoot);
                }
                return shadowRoots;
            }
            
            // 1. Find the challenge wrapper
            const challenge = document.querySelector('#turnstile-wrapper') || document.querySelector('.cf-turnstile');
            
            if (challenge) {
                 // Try clicking coordinates or the element itself
                 challenge.click();
                 return true;
            }
            
            // Fallback: Use the logic from py code conceptually
            // Find iframe
            const iframes = document.querySelectorAll('iframe');
            for (const iframe of iframes) {
                 // We can't access iframe content if cross-origin (likely is for CF)
                 // BUT Cloudflare challenges often load in same origin or specific sandbox
                 
                 // If we are strictly blocked by cross-origin, we can't do much with click().
                 // However, Electron webSecurity: false might allow us some leeway if same domain.
                 
                 // Actually, getting the 'widget' to click is usually enough.
            }
            
            // Attempt to find the "Verify you are human" checkbox label or input
            // usually inside a Shadow DOM
            
            // Recursive function to pierce shadow DOMs
            function findCheckbox(root) {
                // Check current root for the checkbox
                const cb = root.querySelector('input[type="checkbox"]');
                if (cb) return cb;
                
                // Traverse children
                const children = root.querySelectorAll('*');
                for (const child of children) {
                    if (child.shadowRoot) {
                        const res = findCheckbox(child.shadowRoot);
                        if (res) return res;
                    }
                }
                return null;
            }
            
            const checkbox = findCheckbox(document.body);
            if (checkbox) {
                checkbox.click();
                return true;
            }
            
            return false;
            
        } catch (e) {
            console.error('Bypass script error', e);
            return false;
        }
      })();
    `;

    try {
      const result = await this.window.webContents.executeJavaScript(code);
      return !!result;
    } catch (e) {
      console.error('[CloudflareBypasser] Script execution failed:', e);
      return false;
    }
  }
}
