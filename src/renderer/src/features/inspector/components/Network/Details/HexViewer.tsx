import { useMemo } from 'react';
import { cn } from '../../../../../shared/lib/utils';

interface HexViewerProps {
  data: string; // Base64 string or raw string
  className?: string;
}

export function HexViewer({ data, className }: HexViewerProps) {
  const { hexLines, asciiLines } = useMemo(() => {
    let buffer: Uint8Array;
    try {
      // Improve Base64 detection: check if string is valid base64
      // and if decoding it yields something reasonable.
      // For now, assume data passed here IS binary/base64 if isBinary=true
      buffer = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
    } catch (e) {
      // Fallback: treat as raw string if base64 decode fails
      buffer = new TextEncoder().encode(data);
    }

    const hex: string[] = [];
    const ascii: string[] = [];
    const chunkSize = 16;

    for (let i = 0; i < buffer.length; i += chunkSize) {
      const chunk = buffer.slice(i, i + chunkSize);

      // Hex part
      const hexLine = Array.from(chunk)
        .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
        .join(' ');

      // Padding for last line
      const padding = '   '.repeat(chunkSize - chunk.length);

      hex.push(hexLine + padding);

      // ASCII part
      const asciiLine = Array.from(chunk)
        .map((b) => {
          // Printable ASCII range (32-126)
          return b >= 32 && b <= 126 ? String.fromCharCode(b) : '.';
        })
        .join('');
      ascii.push(asciiLine);
    }

    return { hexLines: hex, asciiLines: ascii };
  }, [data]);

  return (
    <div
      className={cn(
        'font-mono text-xs overflow-auto h-full bg-[#1e1e1e] p-4 select-text',
        className,
      )}
    >
      <div className="flex">
        {/* Offset Column */}
        <div className="flex flex-col text-slate-500 select-none mr-4 border-r border-[#333] pr-2 text-right">
          {hexLines.map((_, i) => (
            <div key={i}>{(i * 16).toString(16).padStart(8, '0').toUpperCase()}</div>
          ))}
        </div>

        {/* Hex Column */}
        <div className="flex flex-col text-primary mr-4 whitespace-pre">
          {hexLines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>

        {/* ASCII Column */}
        <div className="flex flex-col text-success border-l border-[#333] pl-4 whitespace-pre">
          {asciiLines.map((line, i) => (
            <div key={i}>{line}</div>
          ))}
        </div>
      </div>
    </div>
  );
}
