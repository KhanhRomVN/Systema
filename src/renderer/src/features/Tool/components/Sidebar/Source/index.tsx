import { ResizableSplit } from '../../../../../core/components/common/ResizableSplit';
import { FileTree } from './FileTree';
import { SourceCodeView } from './SourceCodeView';
import { NetworkRequest } from '../../../../../types/inspector';
import { useState } from 'react';
import { FileCode } from 'lucide-react';
import { EmptyState } from '../EmptyState';

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
    <div className="h-full w-full bg-table-bodyBg flex flex-col">
      <ResizableSplit direction="vertical" initialSize={40} minSize={20} maxSize={60}>
        <div className="h-full bg-background border-r border-border/50 flex flex-col">
          <div className="px-3 pt-3 pb-2 border-b border-divider flex items-center gap-2.5">
            <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-purple-500/15 border border-purple-500/25 shrink-0">
              <FileCode className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-text-primary">Sources</div>
              <div className="text-[10px] text-text-secondary">JS, CSS and assets</div>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            {requests.filter(r => r.type === 'JS' || r.type === 'CSS' || r.path?.match(/\.(js|css|html|json|xml)$/i)).length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6">
                <div className="w-16 h-16 rounded-xl bg-purple-500/15 flex items-center justify-center mb-4 border border-purple-500/25">
                  <FileCode className="w-8 h-8 text-purple-400" />
                </div>
                <h3 className="text-sm font-semibold text-text-primary mb-1">No Source Files</h3>
                <p className="text-xs text-text-secondary text-center max-w-[200px]">
                  Navigate to a page with JS, CSS, or HTML assets
                </p>
              </div>
            ) : (
              <FileTree
                requests={requests}
                onSelectFile={(content, fileName, language) =>
                  setSelectedFile({ content, fileName, language })
                }
              />
            )}
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
