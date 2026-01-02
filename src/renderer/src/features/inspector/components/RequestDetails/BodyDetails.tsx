import { NetworkRequest } from '../../types';

import { HighlightText } from './HighlightText';

interface BodyDetailsProps {
  request: NetworkRequest;
  searchTerm: string;
}

export function BodyDetails({ request, searchTerm }: BodyDetailsProps) {
  const analysis = request.analysis;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
        {/* Request Body */}
        <div className="flex flex-col h-full space-y-1.5">
          <div className="flex justify-between items-center border-b border-border/50 pb-1.5">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase">Request Body</h3>
            <div className="flex gap-1.5 text-[10px]">
              <span className="bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                {analysis?.body?.request?.contentType}
              </span>
              <span className="bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                {analysis?.body?.request?.size}
              </span>
            </div>
          </div>

          <div className="flex-1 bg-muted/20 border border-border/50 rounded-md overflow-hidden flex flex-col">
            {analysis?.body?.request?.formatted ? (
              <pre className="flex-1 p-2 overflow-auto text-xs font-mono language-json">
                <HighlightText
                  text={JSON.stringify(analysis.body.request.formatted, null, 2)}
                  searchTerm={searchTerm}
                />
              </pre>
            ) : (
              <pre className="flex-1 p-2 overflow-auto text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                <HighlightText
                  text={analysis?.body?.request?.raw || 'No Content'}
                  searchTerm={searchTerm}
                />
              </pre>
            )}
          </div>
        </div>

        {/* Response Body */}
        <div className="flex flex-col h-full space-y-1.5">
          <div className="flex justify-between items-center border-b border-border/50 pb-1.5">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase">Response Body</h3>
            <div className="flex gap-1.5 text-[10px]">
              {analysis?.body?.response?.compression !== 'none' && (
                <span className="bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded font-bold uppercase">
                  {analysis?.body?.response?.compression}
                </span>
              )}
              <span className="bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                {analysis?.body?.response?.contentType}
              </span>
              <span className="bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                {analysis?.body?.response?.size}
              </span>
            </div>
          </div>

          <div className="flex-1 bg-muted/20 border border-border/50 rounded-md overflow-hidden flex flex-col">
            {analysis?.body?.response?.formatted ? (
              <pre className="flex-1 p-2 overflow-auto text-xs font-mono text-foreground language-json">
                <HighlightText
                  text={JSON.stringify(analysis.body.response.formatted, null, 2)}
                  searchTerm={searchTerm}
                />
              </pre>
            ) : (
              <pre className="flex-1 p-2 overflow-auto text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                <HighlightText
                  text={analysis?.body?.response?.raw || 'No Content'}
                  searchTerm={searchTerm}
                />
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
