import { CodeBlock, CodeBlockRef } from '../../../../components/CodeBlock';
import { FileCode, AlignLeft } from 'lucide-react';
import { useRef } from 'react';

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
  const codeBlockRef = useRef<CodeBlockRef>(null);

  const readonlyOptions = {
    readOnly: true,
    domReadOnly: true, // Hides cursor, prevents "Cannot edit" overlay
    renderLineHighlight: 'none',
    matchBrackets: 'never',
    folding: false,
    guides: { indentation: false },
    renderIndentGuides: false,
    selectionHighlight: false,
    occurrencesHighlight: false,
    hideCursorInOverviewRuler: true,
    overviewRulerBorder: false,
    contextmenu: false,
  };

  if (!content) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-2 bg-background">
        <FileCode className="w-12 h-12 stroke-1" />
        <span className="text-sm">Select a file to view its source</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden bg-background">
      <div className="flex justify-between items-center border-b border-border/50 pb-1.5 px-3 pt-2 flex-shrink-0">
        <h3 className="text-[10px] font-bold text-muted-foreground uppercase">{fileName}</h3>
        <div className="flex gap-1.5 text-[10px] items-center">
          <button
            onClick={() => codeBlockRef.current?.format()}
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Format Document"
          >
            <AlignLeft className="w-3 h-3" />
          </button>
          <div className="w-[1px] h-3 bg-border/50 mx-1" />
          <span className="bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{language}</span>
        </div>
      </div>

      <div className="flex-1 bg-muted/20 border border-border/50 rounded-md overflow-hidden relative min-h-0 m-2">
        <CodeBlock
          ref={codeBlockRef}
          code={content}
          language={language}
          className="absolute inset-0"
          themeConfig={{ background: '#00000000' }}
          editorOptions={readonlyOptions}
        />
      </div>
    </div>
  );
}
