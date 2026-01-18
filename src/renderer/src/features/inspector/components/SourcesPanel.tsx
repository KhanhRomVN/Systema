import { ResizableSplit } from '../../../components/ResizableSplit';
import { FileTree } from './SourcesPanel/FileTree';
import { SourceCodeView } from './SourcesPanel/SourceCodeView';
import { NetworkRequest } from '../types';
import { useState } from 'react';

interface SourcesPanelProps {
  requests: NetworkRequest[];
}

export function SourcesPanel({ requests }: SourcesPanelProps) {
  const [selectedFile, setSelectedFile] = useState<{
    content: string;
    fileName: string;
    language: string;
  } | null>(null);

  return (
    <div className="h-full w-full bg-background flex flex-col">
      <ResizableSplit direction="vertical" initialSize={40} minSize={20} maxSize={60}>
        <div className="h-full bg-background border-r border-border/50 flex flex-col">
          <div className="p-2 border-b border-border/50 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Sources
          </div>
          <div className="flex-1 overflow-hidden">
            <FileTree
              requests={requests}
              onSelectFile={(content, fileName, language) =>
                setSelectedFile({ content, fileName, language })
              }
            />
          </div>
        </div>

        <div className="h-full overflow-hidden">
          <SourceCodeView
            content={selectedFile?.content || ''}
            fileName={selectedFile?.fileName || ''}
            language={selectedFile?.language}
          />
        </div>
      </ResizableSplit>
    </div>
  );
}
