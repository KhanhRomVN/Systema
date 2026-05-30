import * as net from 'net';
import * as os from 'os';

export const getLocalIp = (): string => {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]!) {
      // Skip internal (non-127.0.0.1) and non-ipv4 addresses
      if ('IPv4' !== iface.family || iface.internal) {
        continue;
      }
      return iface.address;
    }
  }
  return '127.0.0.1';
};

export const findAvailablePort = async (startPort: number = 8081): Promise<number> => {
  const isPortAvailable = (port: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(port, () => {
        server.close();
        resolve(true);
      });
      server.on('error', (err) => {
        console.log(`[findAvailablePort] Port ${port} not available:`, err.message);
        resolve(false);
      });
    });
  };

  let port = startPort;
  console.log(`[findAvailablePort] Starting search from port ${startPort}`);
  while (port < 65535) {
    const proxyAvailable = await isPortAvailable(port);
    const wssAvailable = await isPortAvailable(port + 1);
    
    if (proxyAvailable && wssAvailable) {
      console.log(`[findAvailablePort] Found available pair: proxy=${port}, wss=${port + 1}`);
      return port;
    }
    
    console.log(`[findAvailablePort] Pair ${port}/${port + 1} not available (proxy=${proxyAvailable}, wss=${wssAvailable}), trying next...`);
    port++;
  }
  throw new Error('No available port pairs found');
};
