import React, { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '../shared/lib/utils';

interface ResizableSplitProps {
  direction?: 'horizontal' | 'vertical';
  initialSize?: number; // External percentage (0-100) for the FIRST panel
  minSize?: number; // Minimum percentage (0-100)
  maxSize?: number; // Maximum percentage (0-100)
  children: [React.ReactNode, React.ReactNode];
  className?: string;
}

export function ResizableSplit({
  direction = 'horizontal',
  initialSize = 50,
  minSize = 20,
  maxSize = 80,
  children,
  className,
}: ResizableSplitProps) {
  const [size, setSize] = useState(initialSize);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      let newSize = 0;

      if (direction === 'horizontal') {
        const relativeX = e.clientX - containerRect.left;
        newSize = (relativeX / containerRect.width) * 100;
      } else {
        const relativeY = e.clientY - containerRect.top;
        newSize = (relativeY / containerRect.height) * 100;
      }

      if (newSize < minSize) newSize = minSize;
      if (newSize > maxSize) newSize = maxSize;

      setSize(newSize);
    },
    [isDragging, direction, minSize, maxSize],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      // Disable text selection while resizing
      document.body.style.userSelect = 'none';
      document.body.style.cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp, direction]);

  const isHorizontal = direction === 'horizontal';

  return (
    <div
      ref={containerRef}
      className={cn(
        'flex w-full h-full overflow-hidden',
        isHorizontal ? 'flex-row' : 'flex-col',
        className,
      )}
    >
      <div
        style={{
          [isHorizontal ? 'width' : 'height']: `${size}%`,
          flexShrink: 0,
          position: 'relative',
        }}
        className="flex flex-col"
      >
        {children[0]}
      </div>

      <div
        className={cn(
          'relative z-10 flex flex-center hover:bg-primary transition-colors bg-border/50',
          isHorizontal
            ? 'w-[3px] h-full cursor-col-resize -ml-[1px]'
            : 'h-[3px] w-full cursor-row-resize -mt-[1px]',
        )}
        onMouseDown={handleMouseDown}
      >
        {/* Optional: Add a grab handle or line visual */}
        <div
          className={cn(
            'bg-border transition-colors group-hover:bg-primary',
            isHorizontal ? 'w-px h-full mx-auto' : 'h-px w-full my-auto',
          )}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">{children[1]}</div>
    </div>
  );
}
