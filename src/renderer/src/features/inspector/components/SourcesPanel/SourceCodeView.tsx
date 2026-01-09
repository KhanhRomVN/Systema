import { CodeBlock } from '../../../../components/CodeBlock';
import { cn } from '../../../../shared/lib/utils';
import { FileCode, Search, WrapText } from 'lucide-react';
import { useState } from 'react';

interface SourceCodeViewProps {
  content: string;
  fileName: string;
  language?: string;
}

export function SourceCodeView({
  content,
  fileName,
  language = 'javascript',
}: SourceCodeViewProps) {
  const [wordWrap, setWordWrap] = useState<'off' | 'on'>('off');

  if (!content) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-2">
        <FileCode className="w-12 h-12 stroke-1" />
        <span className="text-sm">Select a file to view its source</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e]">
      <div className="h-9 px-4 flex items-center justify-between border-b border-white/10 bg-[#252526] text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-300">{fileName}</span>
        </div>
        <div className="flex items-center gap-1">
          {/* Toolbar actions for future (search, etc) */}
        </div>
      </div>
      <div className="flex-1 overflow-hidden relative">
        <CodeBlock
          code={content}
          language={language}
          showLineNumbers={true}
          wordWrap="on" // Default to on as per user preference in previous task, or make toggleable
          themeConfig={{
            background: '#1e1e1e',
          }}
        />
      </div>
    </div>
  );
}
