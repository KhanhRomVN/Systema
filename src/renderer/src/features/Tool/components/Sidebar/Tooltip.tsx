import { useState, useRef, useEffect, ReactNode } from 'react';
import { cn } from '../../../../shared/lib/utils';

interface TooltipProps {
  children: ReactNode;
  title: string;
  description?: string;
  side?: 'left' | 'right' | 'top' | 'bottom';
}

export function Tooltip({ children, title, description, side = 'left' }: TooltipProps) {
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

  const positionClasses = {
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  };

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
          className={cn('absolute z-[100] pointer-events-none', positionClasses[side])}
        >
          <div className="bg-dialog-background border border-primary/40 rounded-md shadow-xl px-3 py-2 min-w-[160px] max-w-[260px]">
            <div className="text-sm font-bold text-text-primary whitespace-nowrap">{title}</div>
            {description && (
              <div className="text-xs text-text-secondary mt-1">{description}</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}