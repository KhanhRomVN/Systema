import * as net from 'net';

export const findAvailablePort = async (startPort: number = 8081): Promise<number> => {
  const isPortAvailable = (port: number): Promise<boolean> => {
    return new Promise((resolve) => {
      const server = net.createServer();
      server.listen(port, () => {
        server.close();
        resolve(true);
      });
      server.on('error', () => {
        resolve(false);
      });
    });
  };

  let port = startPort;
  while (!(await isPortAvailable(port))) {
    port++;
    // Safety break to prevent infinite loops if something is really wrong
    if (port > 65535) {
      throw new Error('No available ports found');
    }
  }
  return port;
};
