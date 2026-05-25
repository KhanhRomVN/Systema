import { ReactNode } from 'react';
import { cn } from '../../../../shared/lib/utils';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  iconColor?: string;
  iconBgColor?: string;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  iconColor = 'text-primary',
  iconBgColor = 'bg-primary/15',
  className,
}: EmptyStateProps) {
  return (
    <div className={cn('flex-1 flex flex-col items-center justify-center p-6', className)}>
      <div
        className={cn(
          'w-16 h-16 rounded-xl flex items-center justify-center mb-4 border',
          iconBgColor,
        )}
      >
        <div className={cn('w-8 h-8', iconColor)}>{icon}</div>
      </div>
      <h3 className="text-sm font-semibold text-text-primary mb-1">{title}</h3>
      <p className="text-xs text-text-secondary text-center max-w-[200px]">{description}</p>
    </div>
  );
}