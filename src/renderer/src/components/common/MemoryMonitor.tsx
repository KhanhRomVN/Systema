import { useEffect, useState } from 'react';

export function MemoryMonitor() {
  const [memory, setMemory] = useState<number>(0);

  useEffect(() => {
    const updateMemory = async () => {
      try {
        const memInfo = await window.api.invoke('app:get-memory-usage');
        // Convert bytes to MB
        const memoryMB = (memInfo.heapUsed / 1024 / 1024).toFixed(1);
        setMemory(parseFloat(memoryMB));
      } catch (error) {
        console.error('Failed to get memory usage:', error);
      }
    };

    updateMemory();
    const interval = setInterval(updateMemory, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-purple-500/10 text-purple-500 text-xs whitespace-nowrap">
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z"
        />
      </svg>
      <span className="font-medium">{memory} MB</span>
    </div>
  );
}
