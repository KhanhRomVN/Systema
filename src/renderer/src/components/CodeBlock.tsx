import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';

// Define Window interface to include require for AMD loader
declare global {
  interface Window {
    require: any;
    monaco: any;
    monacoLoadingPromise?: Promise<void>;
  }
}

export interface CodeBlockThemeRule {
  token: string;
  foreground?: string;
  background?: string;
  fontStyle?: string;
}

export interface CodeBlockThemeConfig {
  background?: string;
  foreground?: string;
  rules?: CodeBlockThemeRule[];
  highlightLine?: number;
}

export interface CodeBlockRef {
  getMatchCount: () => number;
  goToMatch: (index: number) => void;
  format: () => void;
}

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
  themeConfig?: CodeBlockThemeConfig;
  wordWrap?: 'off' | 'on' | 'wordWrapColumn' | 'bounded';
  showLineNumbers?: boolean;
  searchTerm?: string;
  onEditorMounted?: (editor: any) => void;
  editorOptions?: any;
  onChange?: (value: string) => void;
}

const SYSTEMA_THEME = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'string.key.json', foreground: '#e06c75' }, // Red/Pink for keys
    { token: 'string.value.json', foreground: '#98c379' }, // Green for string values
    { token: 'number', foreground: '#d19a66' }, // Orange for numbers
    { token: 'keyword.json', foreground: '#56b6c2' }, // Cyan for booleans/null
    { token: 'delimiter', foreground: '#abb2bf' }, // White/Grey for braces
  ],
  colors: {
    'editor.background': '#1e1e1e', // Default dark background
    'editor.foreground': '#abb2bf',
    'editor.selectionBackground': '#264f78',
    'editor.findMatchHighlightBackground': '#ea5c0055',
  },
};

const CodeBlock = forwardRef<CodeBlockRef, CodeBlockProps>(
  (
    {
      code,
      language = 'json',
      className,
      themeConfig,
      wordWrap = 'on',
      showLineNumbers = false,
      searchTerm,
      onEditorMounted,
      editorOptions,
      onChange,
    },
    ref,
  ) => {
    const editorRef = useRef<HTMLDivElement>(null);
    const editorInstance = useRef<any>(null);
    const decorationsRef = useRef<string[]>([]);
    const lineDecorationsRef = useRef<string[]>([]);
    const [isEditorReady, setIsEditorReady] = React.useState(false);

    useImperativeHandle(ref, () => ({
      getMatchCount: () => {
        if (!editorInstance.current || !searchTerm) return 0;
        const model = editorInstance.current.getModel();
        if (!model) return 0;
        try {
          return model.findMatches(searchTerm, false, true, false, null, true).length;
        } catch {
          return model.findMatches(searchTerm, false, false, false, null, true).length;
        }
      },
      goToMatch: (index: number) => {
        if (!editorInstance.current || !searchTerm) return;
        const model = editorInstance.current.getModel();
        if (!model) return;

        let matches = [];
        try {
          matches = model.findMatches(searchTerm, false, true, false, null, true);
        } catch {
          matches = model.findMatches(searchTerm, false, false, false, null, true);
        }

        if (matches.length === 0) return;

        // Ensure index is within bounds
        const safeIndex = ((index % matches.length) + matches.length) % matches.length;
        const match = matches[safeIndex];

        editorInstance.current.revealRangeInCenter(match.range);
      },
      format: () => {
        if (editorInstance.current) {
          editorInstance.current.getAction('editor.action.formatDocument').run();
        }
      },
    }));

    useEffect(() => {
      let mounted = true;

      const initMonaco = () => {
        if (!editorRef.current) return;

        try {
          if (editorInstance.current) {
            editorInstance.current.dispose();
          }

          let themeName = 'systema-dark';

          // Always define our custom theme
          if (window.monaco) {
            const customRules =
              themeConfig?.rules?.map((r) => ({
                token: r.token,
                foreground: r.foreground?.replace('#', ''),
                background: r.background?.replace('#', ''),
                fontStyle: r.fontStyle,
              })) || [];

            window.monaco.editor.defineTheme(themeName, {
              ...SYSTEMA_THEME,
              rules: [...SYSTEMA_THEME.rules, ...customRules], // Allow overrides
              colors: {
                ...SYSTEMA_THEME.colors,
                ...(themeConfig?.background ? { 'editor.background': themeConfig.background } : {}),
                ...(themeConfig?.foreground ? { 'editor.foreground': themeConfig.foreground } : {}),
              },
            });
          }

          editorInstance.current = window.monaco.editor.create(editorRef.current, {
            value: code,
            language: language,
            theme: themeName,
            readOnly: editorOptions?.readOnly ?? false,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 12,
            fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
            automaticLayout: true,
            padding: { top: 16, bottom: 16 },
            wordWrap: wordWrap,
            lineNumbers: showLineNumbers ? 'on' : 'off',
            ...editorOptions,
          });

          // Handle content changes
          editorInstance.current.onDidChangeModelContent(() => {
            if (onChange) {
              onChange(editorInstance.current.getValue());
            }
          });

          if (mounted) {
            setIsEditorReady(true);
          }

          // Expose editor instance
          if (onEditorMounted) {
            onEditorMounted(editorInstance.current);
          }
        } catch (error) {
          console.error('Failed to create monaco editor instance:', error);
        }
      };

      const loadMonaco = () => {
        if (window.monaco) {
          initMonaco();
          return;
        }

        // Check global loading state to prevent race conditions
        if (!window.monacoLoadingPromise) {
          window.monacoLoadingPromise = new Promise((resolve) => {
            // If loader script is already in DOM but we don't have the promise (e.g. from server-side or previous run), find it
            const existingScript = document.querySelector('script[src*="vscode/loader.js"]');
            if (existingScript || window.require) {
              // Wait for window.require if it's not ready, then config
              const waitForRequire = setInterval(() => {
                if (window.require) {
                  clearInterval(waitForRequire);
                  resolve();
                }
              }, 50);
              return;
            }

            const script = document.createElement('script');
            script.src = '/monaco/vs/loader.js';
            script.async = true;
            script.onload = () => resolve();
            document.body.appendChild(script);
          });
        }

        // Wait for loader to be ready
        window.monacoLoadingPromise
          .then(() => {
            if (window.require) {
              window.require.config({ paths: { vs: '/monaco/vs' } });
              window.require(
                ['vs/editor/editor.main'],
                () => {
                  if (mounted) initMonaco();
                },
                (err: any) => {
                  console.error('Failed to load monaco editor modules:', err);
                },
              );
            }
          })
          .catch((err) => {
            console.warn('Monaco loading promise failed or cancelled:', err);
          });
      };

      loadMonaco();

      return () => {
        mounted = false;
        if (editorInstance.current) {
          editorInstance.current.dispose();
        }
      };
      // Use JSON.stringify for deep comparison of themeConfig to avoid re-init on every render if object reference changes but content doesn't
    }, [JSON.stringify(themeConfig), wordWrap]); // Re-init if config/wrap changes

    // Update value
    useEffect(() => {
      if (editorInstance.current && editorInstance.current.getValue() !== code) {
        editorInstance.current.setValue(code);
      }
    }, [code]);

    // Update word wrap dynamically
    useEffect(() => {
      if (editorInstance.current) {
        editorInstance.current.updateOptions({ wordWrap });
      }
    }, [wordWrap]);

    // Handle search highlighting
    useEffect(() => {
      if (!isEditorReady || !editorInstance.current || !window.monaco) return;

      // Ensure style exists
      const styleId = 'monaco-custom-highlight-style';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        // Define a simpler class name without '/' which can be improved
        style.innerHTML = `
        .monaco-highlight-match {
          background-color: rgba(234, 179, 8, 0.4) !important;
          color: black !important;
        }
        .monaco-highlight-match-inline {
          font-weight: bold;
          color: #eab308 !important;
        }
      `;
        document.head.appendChild(style);
      }

      if (!searchTerm) {
        decorationsRef.current = editorInstance.current.deltaDecorations(
          decorationsRef.current,
          [],
        );
        return;
      }

      const model = editorInstance.current.getModel();
      if (!model) return;

      let matches = [];
      try {
        // Try regex first
        matches = model.findMatches(searchTerm, false, true, false, null, true);
      } catch {
        // Fallback to literal search if regex fails
        matches = model.findMatches(searchTerm, false, false, false, null, true);
      }

      if (matches.length > 0) {
        const newDecorations = matches.map((match: any) => ({
          range: match.range,
          options: {
            isWholeLine: false,
            className: 'monaco-highlight-match',
            inlineClassName: 'monaco-highlight-match-inline',
            overviewRuler: {
              color: '#eab308',
              position: window.monaco.editor.OverviewRulerLane.Right,
            },
          },
        }));

        decorationsRef.current = editorInstance.current.deltaDecorations(
          decorationsRef.current,
          newDecorations,
        );

        // Scroll to first match
        editorInstance.current.revealRangeInCenter(matches[0].range);
      } else {
        decorationsRef.current = editorInstance.current.deltaDecorations(
          decorationsRef.current,
          [],
        );
      }
    }, [searchTerm, code, isEditorReady]); // Re-run when search term or code changes or editor becomes ready

    // Handle line highlighting
    useEffect(() => {
      if (
        editorInstance.current &&
        showLineNumbers &&
        typeof themeConfig?.highlightLine === 'number'
      ) {
        const line = themeConfig.highlightLine;
        const editor = editorInstance.current;

        // Clear previous decorations/collections if we stored them (simple version: just overwrite)
        lineDecorationsRef.current = editor.deltaDecorations(lineDecorationsRef.current, [
          {
            range: new window.monaco.Range(line, 1, line, 1),
            options: {
              isWholeLine: true,
              className: 'monaco-highlight-line bg-yellow-500/20', // Tailwind class might not work inside shadow DOM/iframe if Monaco isolates, but usually works in DOM mode
              inlineClassName: 'font-bold',
            },
          },
        ]);

        editor.revealLineInCenter(line);
      }
    }, [themeConfig?.highlightLine, showLineNumbers]);

    return <div ref={editorRef} className={`w-full h-full min-h-[200px] ${className || ''}`} />;
  },
);

CodeBlock.displayName = 'CodeBlock';

export { CodeBlock };
