import { useState, useEffect, useCallback } from 'react';

const CHECK_INTERVAL = 5000;

export function useHealthCheck(baseURL: string) {
  const [isConnected, setIsConnected] = useState(true);
  const [isChecking, setIsChecking] = useState(false);

  const check = useCallback(async () => {
    if (!baseURL) return;
    setIsChecking(true);
    try {
      const ctrl = new AbortController();
      const tid = setTimeout(() => ctrl.abort(), 2000);
      const res = await fetch(`${baseURL}/v1/health`, { signal: ctrl.signal });
      clearTimeout(tid);
      setIsConnected(res.ok);
    } catch {
      setIsConnected(false);
    } finally {
      setIsChecking(false);
    }
  }, [baseURL]);

  useEffect(() => {
    check();
    const id = setInterval(check, CHECK_INTERVAL);
    return () => clearInterval(id);
  }, [check]);

  return { isConnected, isChecking };
}
