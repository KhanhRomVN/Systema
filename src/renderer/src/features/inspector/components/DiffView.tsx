import { useState, useMemo, useRef } from 'react';
import { NetworkRequest } from '../types';
import { X, ArrowRightLeft, Wand2 } from 'lucide-react';
import { cn } from '../../../shared/lib/utils';
import { CodeBlock, CodeBlockRef, HighlightRange } from '../../../components/CodeBlock';
import * as Diff from 'diff';

interface DiffViewProps {
  request1: NetworkRequest | null;
  request2: NetworkRequest | null;
  onClose: () => void;
}

type DiffTab = 'body' | 'headers' | 'params' | 'cookies';

export function DiffView({ request1, request2, onClose }: DiffViewProps) {
  const [activeTab, setActiveTab] = useState<DiffTab>('body');
  const codeBlockRef1 = useRef<CodeBlockRef>(null);
  const codeBlockRef2 = useRef<CodeBlockRef>(null);

  const getContent = (req: NetworkRequest | null) => {
    if (!req) return '';

    if (activeTab === 'body') {
      const parts: string[] = [];

      if (req.requestBody) {
        parts.push('=== REQUEST BODY ===');
        parts.push(req.requestBody);
      }

      if (req.responseBody) {
        if (parts.length > 0) parts.push(''); // Empty line separator
        parts.push('=== RESPONSE BODY ===');
        parts.push(req.responseBody);
      }

      return parts.join('\n');
    }

    if (activeTab === 'headers') {
      const parts: string[] = [];

      if (req.requestHeaders && Object.keys(req.requestHeaders).length > 0) {
        parts.push('=== REQUEST HEADERS ===');
        parts.push(JSON.stringify(req.requestHeaders, null, 2));
      }

      if (req.responseHeaders && Object.keys(req.responseHeaders).length > 0) {
        if (parts.length > 0) parts.push(''); // Empty line separator
        parts.push('=== RESPONSE HEADERS ===');
        parts.push(JSON.stringify(req.responseHeaders, null, 2));
      }

      return parts.join('\n');
    }

    if (activeTab === 'cookies') {
      const parts: string[] = [];

      // Request cookies from cookie header
      const reqCookies = req.requestHeaders?.['cookie'] || req.requestHeaders?.['Cookie'];
      if (reqCookies) {
        parts.push('=== REQUEST COOKIES ===');
        parts.push(JSON.stringify(reqCookies, null, 2));
      }

      // Response cookies from set-cookie
      const resCookies = req.responseHeaders?.['set-cookie'];
      if (resCookies) {
        if (parts.length > 0) parts.push('');
        parts.push('=== RESPONSE COOKIES ===');
        parts.push(JSON.stringify(resCookies, null, 2));
      }

      return parts.join('\n');
    }

    if (activeTab === 'params') {
      const qs = req.path.split('?')[1];
      if (!qs) return '{}';
      const params: Record<string, string> = {};
      qs.split('&').forEach((p) => {
        const [k, v] = p.split('=');
        if (k) params[k] = decodeURIComponent(v || '');
      });
      return JSON.stringify(params, null, 2);
    }

    return '';
  };

  // Try to format and validate content as JSON
  const formatAndValidate = (
    content: string,
  ): { formatted: string; isValid: boolean; error?: string } => {
    if (!content.trim()) {
      return { formatted: content, isValid: true };
    }

    try {
      // Try to parse as JSON
      const parsed = JSON.parse(content);
      const formatted = JSON.stringify(parsed, null, 2);
      return { formatted, isValid: true };
    } catch (error) {
      // If it fails, check if it contains separators (=== REQUEST/RESPONSE ===)
      // If so, try to parse each section
      if (content.includes('===')) {
        const sections = content.split(/(?====)/);
        const formattedSections: string[] = [];
        let allValid = true;

        for (const section of sections) {
          const lines = section.split('\n');
          const header = lines[0];
          const body = lines.slice(1).join('\n').trim();

          if (header.includes('===')) {
            formattedSections.push(header);
            if (body) {
              try {
                const parsed = JSON.parse(body);
                formattedSections.push(JSON.stringify(parsed, null, 2));
              } catch {
                // If section can't be parsed, keep original
                formattedSections.push(body);
                allValid = false;
              }
            }
          } else if (section.trim()) {
            formattedSections.push(section);
          }
        }

        return {
          formatted: formattedSections.join('\n\n'),
          isValid: allValid,
          error: allValid ? undefined : 'Some sections contain non-JSON content',
        };
      }

      // Not JSON and no sections
      return {
        formatted: content,
        isValid: false,
        error: 'Content is not valid JSON',
      };
    }
  };

  const content1Raw = getContent(request1);
  const content2Raw = getContent(request2);

  const {
    formatted: content1,
    isValid: isValid1,
    error: error1,
  } = useMemo(() => formatAndValidate(content1Raw), [content1Raw]);

  const {
    formatted: content2,
    isValid: isValid2,
    error: error2,
  } = useMemo(() => formatAndValidate(content2Raw), [content2Raw]);

  const isValidForDiff = isValid1 && isValid2;
  const validationError = error1 || error2;

  // Compute Diff only if both are valid
  const { originalRanges, modifiedRanges } = useMemo(() => {
    if (!content1 || !content2 || !isValidForDiff) {
      return { originalRanges: [], modifiedRanges: [] };
    }

    const diff = Diff.diffLines(content1, content2);

    const originalRanges: HighlightRange[] = [];
    const modifiedRanges: HighlightRange[] = [];

    let originalLine = 1;
    let modifiedLine = 1;

    diff.forEach((part) => {
      const lineCount = part.count || 0;

      if (part.added) {
        modifiedRanges.push({
          startLine: modifiedLine,
          endLine: modifiedLine + lineCount - 1,
          color: 'monaco-range-highlight-green',
        });
        modifiedLine += lineCount;
      } else if (part.removed) {
        originalRanges.push({
          startLine: originalLine,
          endLine: originalLine + lineCount - 1,
          color: 'monaco-range-highlight-red',
        });
        originalLine += lineCount;
      } else {
        originalLine += lineCount;
        modifiedLine += lineCount;
      }
    });

    return { originalRanges, modifiedRanges };
  }, [content1, content2, isValidForDiff]);

  const handleFormat = () => {
    codeBlockRef1.current?.format();
    codeBlockRef2.current?.format();
  };

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      {/* Header */}
      <div className="h-10 border-b border-border flex items-center justify-between px-4 bg-background/50 shrink-0">
        <div className="flex items-center gap-2 font-medium">
          <ArrowRightLeft className="w-4 h-4 text-purple-500" />
          <span>Diff Compare</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleFormat}
            className="flex items-center gap-1.5 px-2 py-1 text-xs rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 border border-blue-500/30 transition-colors"
            title="Format both code blocks"
          >
            <Wand2 className="w-3 h-3" />
            Format
          </button>

          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
            title="Close Diff View"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs Row */}
      <div className="p-2 border-b border-border/50 shrink-0">
        <div className="flex items-center justify-center gap-2 bg-muted/20 p-1 rounded-lg w-fit mx-auto">
          {(['body', 'headers', 'params', 'cookies'] as const).map((tab) => {
            const isActive = activeTab === tab;
            let activeClass = '';

            switch (tab) {
              case 'body':
                activeClass = 'bg-blue-500/15 text-blue-500';
                break;
              case 'headers':
                activeClass = 'bg-purple-500/15 text-purple-500';
                break;
              case 'params':
                activeClass = 'bg-orange-500/15 text-orange-500';
                break;
              case 'cookies':
                activeClass = 'bg-green-500/15 text-green-500';
                break;
            }

            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-3 py-1 text-xs font-medium rounded-md transition-all',
                  isActive
                    ? activeClass
                    : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
                )}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Validation Warning */}
      {!isValidForDiff && validationError && (
        <div className="px-4 py-2 bg-yellow-500/10 border-b border-yellow-500/20 text-yellow-500 text-xs flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          <span>{validationError}. Diff highlighting is disabled.</span>
        </div>
      )}

      {/* Split Diff Content */}
      <div className="flex-1 flex flex-col overflow-hidden p-2 gap-2">
        {/* Top Side (Request 1) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="h-6 flex items-center px-1 text-xs font-medium text-muted-foreground truncate mb-1">
            <span className="w-2 h-2 rounded-full bg-red-500/50 mr-2"></span>
            {request1 ? (
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    'uppercase',
                    request1.method === 'GET'
                      ? 'text-blue-400'
                      : request1.method === 'POST'
                        ? 'text-green-400'
                        : 'text-foreground',
                  )}
                >
                  {request1.method}
                </span>
                <span className="truncate">
                  {request1.host}
                  {request1.path}
                </span>
              </span>
            ) : (
              'Select Request 1'
            )}
          </div>
          <div className="flex-1 bg-muted/20 border border-border/50 rounded-md overflow-hidden relative min-h-0">
            {request1 ? (
              <CodeBlock
                ref={codeBlockRef1}
                code={content1}
                language="json"
                showLineNumbers={false}
                className="absolute inset-0"
                themeConfig={{ background: '#00000000' }}
                highlightRanges={isValidForDiff ? originalRanges : []}
                editorOptions={{
                  readOnly: true,
                  domReadOnly: true,
                  cursorStyle: 'line-thin',
                  hideCursorInOverviewRuler: true,
                  overviewRulerLanes: 0,
                  scrollbar: {
                    vertical: 'hidden',
                    horizontal: 'hidden',
                  },
                  renderLineHighlight: 'none',
                  selectionHighlight: false,
                  occurrencesHighlight: false,
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                Select a request to compare
              </div>
            )}
          </div>
        </div>

        {/* Bottom Side (Request 2) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="h-6 flex items-center px-1 text-xs font-medium text-muted-foreground truncate mb-1">
            <span className="w-2 h-2 rounded-full bg-green-500/50 mr-2"></span>
            {request2 ? (
              <span className="flex items-center gap-2">
                <span
                  className={cn(
                    'uppercase',
                    request2.method === 'GET'
                      ? 'text-blue-400'
                      : request2.method === 'POST'
                        ? 'text-green-400'
                        : 'text-foreground',
                  )}
                >
                  {request2.method}
                </span>
                <span className="truncate">
                  {request2.host}
                  {request2.path}
                </span>
              </span>
            ) : (
              'Select Request 2'
            )}
          </div>
          <div className="flex-1 bg-muted/20 border border-border/50 rounded-md overflow-hidden relative min-h-0">
            {request2 ? (
              <CodeBlock
                ref={codeBlockRef2}
                code={content2}
                language="json"
                showLineNumbers={false}
                className="absolute inset-0"
                themeConfig={{ background: '#00000000' }}
                highlightRanges={isValidForDiff ? modifiedRanges : []}
                editorOptions={{
                  readOnly: true,
                  domReadOnly: true,
                  cursorStyle: 'line-thin',
                  hideCursorInOverviewRuler: true,
                  overviewRulerLanes: 0,
                  scrollbar: {
                    vertical: 'hidden',
                    horizontal: 'hidden',
                  },
                  renderLineHighlight: 'none',
                  selectionHighlight: false,
                  occurrencesHighlight: false,
                }}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground text-xs">
                Select a request to compare
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
