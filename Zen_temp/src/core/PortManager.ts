import * as net from "net";

/**
 * PortManager - Manages random port generation with blacklist and availability checking
 */
export class PortManager {
  // Port range for backend services
  private static readonly MIN_PORT = 3000;
  private static readonly MAX_PORT = 9999;

  // Blacklist of commonly used ports to avoid conflicts
  private static readonly BLACKLIST = [
    3001, // Create React App
    4200, // Angular
    5000, // Flask default
    5173, // Vite
    5174, // Vite alternative
    8000, // Django/Python HTTP
    8080, // Common HTTP
    8081, // Common HTTP alternative
    8888, // Jupyter
    9000, // Common dev server
    9090, // Prometheus
  ];

  /**
   * Generate a random port number within the allowed range
   */
  private static generateRandomPort(): number {
    return (
      Math.floor(Math.random() * (this.MAX_PORT - this.MIN_PORT + 1)) +
      this.MIN_PORT
    );
  }

  /**
   * Check if a port is in the blacklist
   */
  private static isBlacklisted(port: number): boolean {
    return this.BLACKLIST.includes(port);
  }

  /**
   * Check if a port is available by attempting to bind to it
   */
  private static async isPortAvailable(port: number): Promise<boolean> {
    return new Promise((resolve) => {
      const server = net.createServer();

      server.once("error", (err: NodeJS.ErrnoException) => {
        if (err.code === "EADDRINUSE") {
          resolve(false); // Port is in use
        } else {
          resolve(false); // Other error, consider unavailable
        }
      });

      server.once("listening", () => {
        server.close();
        resolve(true); // Port is available
      });

      server.listen(port, "localhost");
    });
  }

  /**
   * Get an available port that is not blacklisted
   * Tries up to 50 times before giving up
   */
  public static async getAvailablePort(): Promise<number> {
    const maxAttempts = 50;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const port = this.generateRandomPort();

      // Skip if blacklisted
      if (this.isBlacklisted(port)) {
        continue;
      }

      // Check if available
      const available = await this.isPortAvailable(port);
      if (available) {
        return port;
      }
    }

    // Fallback: if all attempts fail, throw error
    throw new Error(
      `[PortManager] ❌ Could not find available port after ${maxAttempts} attempts`
    );
  }

  /**
   * Add a port to the blacklist (useful for testing or custom exclusions)
   */
  public static addToBlacklist(port: number): void {
    if (!this.BLACKLIST.includes(port)) {
      this.BLACKLIST.push(port);
    }
  }

  /**
   * Get the current blacklist
   */
  public static getBlacklist(): readonly number[] {
    return Object.freeze([...this.BLACKLIST]);
  }
}
