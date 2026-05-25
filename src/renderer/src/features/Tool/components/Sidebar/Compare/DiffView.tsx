import { useState, useMemo, useRef, useEffect } from 'react';
import { NetworkRequest } from '../../../../../types/inspector';
import { X, ArrowRightLeft, Wand2, Plus, Save } from 'lucide-react';
import { cn } from '../../../../../shared/lib/utils';
import { CodeBlock, CodeBlockRef, HighlightRange } from '../../../../../core/components/common/CodeBlock';
import * as Diff from 'diff';

interface DiffViewProps {
  request1: NetworkRequest | null;
  request2: NetworkRequest | null;
  onClose: () => void;
  initialTab?: DiffTab;
  initialSearchTerm?: string;
  isTempDiff?: boolean;
  compareName?: string;
  compareDesc?: string;
  onSaveCompare?: (name: string, desc: string) => void;
}

export type DiffTab = 'header-req' | 'header-res' | 'body-req' | 'body-res';

export function DiffView({
  request1,
  request2,
  onClose,
  initialTab,
  initialSearchTerm,
  isTempDiff = false,
  compareName,
  compareDesc,
  onSaveCompare,
}: DiffViewProps) {
  const [activeTab, setActiveTab] = useState<DiffTab>('header-req');
  const codeBlockRef1 = useRef<CodeBlockRef>(null);
  const codeBlockRef2 = useRef<CodeBlockRef>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [newCompareName, setNewCompareName] = useState('');
  const [newCompareDesc, setNewCompareDesc] = useState('');

  useState(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  });

  useEffect(() => {
    if (initialSearchTerm) {
      // In a real implementation with CodeBlock/Monaco, we might need a ref to trigger search
      // For now, highlight ranges are computed via useMemo, so we just need to ensure the values are correct.
      // If we want to scroll, we'd need to call methods on codeBlockRef.
    }
  }, [initialSearchTerm]);

  const getContent = (req: NetworkRequest | null) => {
    if (!req) return '';

    if (activeTab === 'header-req') {
      if (req.requestHeaders && Object.keys(req.requestHeaders).length > 0) {
        return JSON.stringify(req.requestHeaders, null, 2);
      }
      return '{}';
    }

    if (activeTab === 'header-res') {
      if (req.responseHeaders && Object.keys(req.responseHeaders).length > 0) {
        return JSON.stringify(req.responseHeaders, null, 2);
      }
      return '{}';
    }

    if (activeTab === 'body-req') {
      return req.requestBody || '';
    }

    if (activeTab === 'body-res') {
      return req.responseBody || '';
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

  const searchRanges = useMemo(() => {
    if (!initialSearchTerm) return { ranges1: [], ranges2: [] };

    const getRanges = (content: string) => {
      const ranges: HighlightRange[] = [];
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        if (line.includes(initialSearchTerm)) {
          ranges.push({
            startLine: i + 1,
            endLine: i + 1,
            color: 'monaco-range-highlight-yellow', // Assuming yellow for search
          });
        }
      });
      return ranges;
    };

    return {
      ranges1: getRanges(content1),
      ranges2: getRanges(content2),
    };
  }, [content1, content2, initialSearchTerm]);

  

  return (
    <div className="flex flex-col h-full bg-table-bodyBg relative overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-divider shrink-0 flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-10 rounded-lg bg-purple-500/15 border border-purple-500/25 shrink-0">
          <ArrowRightLeft className="w-4 h-4 text-purple-400" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-text-primary">Diff Compare</h2>
            {isTempDiff && (
              <span className="px-1.5 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-500 rounded-md uppercase">
                Temp
              </span>
            )}
          </div>
          <p className="text-[10px] text-text-secondary mt-0.5">Compare two requests side by side</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Compare Info Section */}
      {(isTempDiff || compareName) && (
        <div className="px-4 py-2 border-b border-divider/50 bg-table-headerBg/30 flex items-center justify-between">
          <div className="flex-1">
            {compareName ? (
              <>
                <h3 className="text-sm font-semibold text-text-primary">{compareName}</h3>
                {compareDesc && <p className="text-xs text-text-secondary mt-0.5">{compareDesc}</p>}
              </>
            ) : (
              <p className="text-xs text-text-secondary italic">Temporary comparison (not saved)</p>
            )}
          </div>
          {isTempDiff && (
            <button
              onClick={() => setShowDrawer(true)}
              className="p-1.5 rounded-lg text-text-secondary hover:text-primary hover:bg-primary/10 transition-all"
              title="Save this comparison"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

{/* Tabs Row */}
      <div className="px-0 border-b border-divider/50 shrink-0 bg-table-headerBg">
        <div className="grid grid-cols-4">
          {([
            { id: 'header-req' as DiffTab, label: 'Header Request', color: 'blue' },
            { id: 'header-res' as DiffTab, label: 'Header Response', color: 'purple' },
            { id: 'body-req' as DiffTab, label: 'Body Request', color: 'orange' },
            { id: 'body-res' as DiffTab, label: 'Body Response', color: 'green' },
          ]).map((tab) => {
            const isActive = activeTab === tab.id;
            const colorClass = isActive
              ? tab.color === 'blue'
                ? 'bg-blue-500/15 text-blue-500 border-b-2 border-blue-500'
                : tab.color === 'purple'
                  ? 'bg-purple-500/15 text-purple-500 border-b-2 border-purple-500'
                  : tab.color === 'orange'
                    ? 'bg-orange-500/15 text-orange-500 border-b-2 border-orange-500'
                    : 'bg-green-500/15 text-green-500 border-b-2 border-green-500'
              : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-itemHover';

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'py-2.5 text-xs font-medium transition-all text-center',
                  colorClass,
                )}
              >
                {tab.label}
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
      <div className="flex-1 flex flex-col overflow-hidden py-2 gap-2">
        {/* Top Side (Request 1) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="h-6 flex items-center px-1 text-sm font-medium text-muted-foreground truncate mb-1">
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
          <div className="flex-1 bg-secondary/20 border border-border/50 rounded-md overflow-hidden relative min-h-0">
            {request1 ? (
              <CodeBlock
                ref={codeBlockRef1}
                code={content1}
                language="json"
                showLineNumbers={false}
                className="absolute inset-0"
                themeConfig={{ background: '#00000000' }}
                highlightRanges={
                  isValidForDiff
                    ? [...originalRanges, ...searchRanges.ranges1]
                    : searchRanges.ranges1
                }
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
                  padding: {
                    top: 16,
                    bottom: 16,
                    left: 0,
                    right: 0,
                  },
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
          <div className="h-6 flex items-center px-1 text-sm font-medium text-muted-foreground truncate mb-1">
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
          <div className="flex-1 bg-secondary/20 border border-border/50 rounded-md overflow-hidden relative min-h-0">
            {request2 ? (
              <CodeBlock
                ref={codeBlockRef2}
                code={content2}
                language="json"
                showLineNumbers={false}
                className="absolute inset-0"
                themeConfig={{ background: '#00000000' }}
                highlightRanges={
                  isValidForDiff
                    ? [...modifiedRanges, ...searchRanges.ranges2]
                    : searchRanges.ranges2
                }
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
                  padding: {
                    top: 16,
                    bottom: 16,
                    left: 0,
                    right: 0,
                  },
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

      {/* Save Compare Drawer */}
      {showDrawer && (
        <>
          <div className="absolute inset-0 bg-black/40 z-40" onClick={() => setShowDrawer(false)} />
          <div
            className="absolute bottom-0 left-0 right-0 z-50 bg-dialog-background border-t border-divider rounded-t-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300"
            style={{ height: '50%' }}
          >
            <div className="px-4 pt-4 pb-3 border-b border-divider flex items-center gap-3 shrink-0">
              <div className="flex items-center justify-center w-9 h-10 rounded-lg bg-purple-500/15 border border-purple-500/25 shrink-0">
                <Save className="w-4 h-4 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-text-primary">Save Comparison</h3>
                <p className="text-xs text-text-secondary mt-0.5">Name and describe this comparison</p>
              </div>
              <button
                onClick={() => setShowDrawer(false)}
                className="p-1.5 rounded-lg bg-secondary text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">COMPARE NAME</label>
                <input
                  type="text"
                  value={newCompareName}
                  onChange={(e) => setNewCompareName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && newCompareName.trim() && onSaveCompare?.(newCompareName, newCompareDesc)}
                  placeholder="e.g. Login API Comparison"
                  className="w-full bg-table-headerBg border border-input-border-default rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-secondary mb-1.5">DESCRIPTION (OPTIONAL)</label>
                <textarea
                  value={newCompareDesc}
                  onChange={(e) => setNewCompareDesc(e.target.value)}
                  placeholder="Add a description for this comparison..."
                  rows={4}
                  className="w-full bg-table-headerBg border border-input-border-default rounded-lg px-3 py-2.5 text-sm text-text-primary outline-none focus:border-primary resize-none"
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-divider flex justify-end gap-3 shrink-0">
              <button
                onClick={() => setShowDrawer(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-sidebar-itemHover transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (newCompareName.trim() && onSaveCompare) {
                    onSaveCompare(newCompareName, newCompareDesc);
                    setShowDrawer(false);
                    setNewCompareName('');
                    setNewCompareDesc('');
                  }
                }}
                disabled={!newCompareName.trim()}
                className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 transition-all"
              >
                Save Compare
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
