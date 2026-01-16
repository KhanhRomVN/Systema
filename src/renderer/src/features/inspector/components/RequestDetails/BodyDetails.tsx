import { AlignLeft } from 'lucide-react';
import { NetworkRequest } from '../../types';
import { CodeBlock, CodeBlockRef } from '../../../../components/CodeBlock';
import { forwardRef, useImperativeHandle, useRef, useState } from 'react';

interface BodyDetailsProps {
  request: NetworkRequest;
  searchTerm: string;
}

export interface BodyDetailsRef {
  nextMatch: () => void;
}

function getLanguage(contentType?: string): string {
  if (!contentType) return 'text';
  if (contentType.includes('json')) return 'json';
  if (contentType.includes('html')) return 'html';
  if (contentType.includes('xml')) return 'xml';
  if (contentType.includes('javascript') || contentType.includes('js')) return 'javascript';
  if (contentType.includes('css')) return 'css';
  return 'text';
}

export const BodyDetails = forwardRef<BodyDetailsRef, BodyDetailsProps>(
  ({ request, searchTerm }, ref) => {
    const analysis = request.analysis;
    const requestBlockRef = useRef<CodeBlockRef>(null);
    const responseBlockRef = useRef<CodeBlockRef>(null);
    const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);

    useImperativeHandle(ref, () => ({
      nextMatch: () => {
        const reqCount = requestBlockRef.current?.getMatchCount() || 0;
        const resCount = responseBlockRef.current?.getMatchCount() || 0;
        const total = reqCount + resCount;

        if (total === 0) return;

        const nextIndex = (currentMatchIndex + 1) % total;
        setCurrentMatchIndex(nextIndex);

        if (nextIndex < reqCount) {
          requestBlockRef.current?.goToMatch(nextIndex);
        } else {
          responseBlockRef.current?.goToMatch(nextIndex - reqCount);
        }
      },
    }));

    const requestBodyContent = analysis?.body?.request?.formatted
      ? JSON.stringify(analysis.body.request.formatted, null, 2)
      : analysis?.body?.request?.raw || 'No Content';

    const responseBodyContent = analysis?.body?.response?.formatted
      ? JSON.stringify(analysis.body.response.formatted, null, 2)
      : analysis?.body?.response?.raw || 'No Content';

    const requestLanguage = getLanguage(analysis?.body?.request?.contentType);
    const responseLanguage = getLanguage(analysis?.body?.response?.contentType);

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

    return (
      <div className="h-full overflow-hidden flex flex-col">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full overflow-hidden">
          {/* Request Body */}
          <div className="flex flex-col h-full space-y-1.5 overflow-hidden">
            <div className="flex justify-between items-center border-b border-border/50 pb-1.5 flex-shrink-0">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase">
                Request Body
              </h3>
              <div className="flex gap-1.5 text-[10px] items-center">
                <button
                  onClick={() => requestBlockRef.current?.format()}
                  className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                  title="Format Document"
                >
                  <AlignLeft className="w-3 h-3" />
                </button>
                <div className="w-[1px] h-3 bg-border/50 mx-1" />
                <span className="bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                  {analysis?.body?.request?.contentType || 'Unknown Type'}
                </span>
                <span className="bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                  {analysis?.body?.request?.size || '0 B'}
                </span>
              </div>
            </div>

            <div className="flex-1 bg-muted/20 border border-border/50 rounded-md overflow-hidden relative min-h-0">
              <CodeBlock
                ref={requestBlockRef}
                code={requestBodyContent}
                language={requestLanguage}
                className="absolute inset-0"
                themeConfig={{ background: '#00000000' }}
                searchTerm={searchTerm}
                editorOptions={readonlyOptions}
              />
            </div>
          </div>

          {/* Response Body */}
          <div className="flex flex-col h-full space-y-1.5 overflow-hidden">
            <div className="flex justify-between items-center border-b border-border/50 pb-1.5 flex-shrink-0">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase">
                Response Body
              </h3>
              <div className="flex gap-1.5 text-[10px] items-center">
                <button
                  onClick={() => responseBlockRef.current?.format()}
                  className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                  title="Format Document"
                >
                  <AlignLeft className="w-3 h-3" />
                </button>
                <div className="w-[1px] h-3 bg-border/50 mx-1" />
                {analysis?.body?.response?.compression &&
                  analysis?.body?.response?.compression !== 'none' && (
                    <span className="bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded font-bold uppercase">
                      {analysis?.body?.response?.compression}
                    </span>
                  )}
                <span className="bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                  {analysis?.body?.response?.contentType || 'Unknown Type'}
                </span>
                <span className="bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                  {analysis?.body?.response?.size || '0 B'}
                </span>
              </div>
            </div>

            <div className="flex-1 bg-muted/20 border border-border/50 rounded-md overflow-hidden relative min-h-0">
              <CodeBlock
                ref={responseBlockRef}
                code={responseBodyContent}
                language={responseLanguage}
                className="absolute inset-0"
                themeConfig={{ background: '#00000000' }}
                searchTerm={searchTerm}
                editorOptions={readonlyOptions}
              />
            </div>
          </div>
        </div>
      </div>
    );
  },
);

BodyDetails.displayName = 'BodyDetails';
