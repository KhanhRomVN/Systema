import { useState, useRef, useEffect, ReactNode } from 'react';
import { cn } from '../../../../shared/lib/utils';

interface TooltipProps {
  children: ReactNode;
  title: string;
  description: string;
}

export function Tooltip({ children, title, description }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const showTooltip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(true);
  };

  const hideTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 100);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      className="relative inline-block"
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      ref={triggerRef}
    >
      {children}
      {isVisible && (
        <div
          className="absolute z-50 right-full top-1/2 -translate-y-1/2 mr-2 pointer-events-none"
          style={{ marginRight: '8px' }}
        >
          <div className="bg-dialog-background border-2 border-primary/50 rounded-md shadow-lg px-3 py-2 min-w-[180px] max-w-[260px]">
            <div className="text-sm font-bold text-text-primary">{title}</div>
            <div className="text-xs text-text-secondary mt-1">{description}</div>
          </div>
        </div>
      )}
    </div>
  );
}