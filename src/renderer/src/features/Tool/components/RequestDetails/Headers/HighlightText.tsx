import { useMemo } from 'react';
import { cn } from '../../../../../shared/lib/utils';

interface HighlightTextProps {
  text: string;
  searchTerm: string;
  className?: string;
  highlightClassName?: string;
}

export function HighlightText({
  text,
  searchTerm,
  className,
  highlightClassName,
}: HighlightTextProps) {
  const parts = useMemo(() => {
    if (!searchTerm || !text) return [{ text, highlight: false }];

    try {
      let regex: RegExp;
      // Check if valid regex or plain text
      try {
        regex = new RegExp(`(${searchTerm})`, 'i');
      } catch {
        // Fallback to escaping special characters for literal search
        const escaped = searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        regex = new RegExp(`(${escaped})`, 'i');
      }

      return text.split(regex).map((part, _i) => {
        // Even indices are non-matches, odd are matches (because of capturing group)
        // With `(${searchTerm})`, split includes the separators.
        const isMatch = regex.test(part);
        return { text: part, highlight: isMatch };
      });
    } catch (e) {
      console.error('HighlightText error:', e);
      return [{ text, highlight: false }];
    }
  }, [text, searchTerm]);

  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.highlight ? (
          <mark
            key={i}
            className={cn(
              'bg-warning/30 text-text-primary rounded-sm px-0.5 mx-[-2px]',
              highlightClassName,
            )}
          >
            {part.text}
          </mark>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </span>
  );
}
