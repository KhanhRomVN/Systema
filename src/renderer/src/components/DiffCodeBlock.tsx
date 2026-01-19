import { useEffect, useRef, forwardRef } from 'react';
import { CodeBlockThemeConfig } from './CodeBlock';

declare global {
  interface Window {
    require: any;
    monaco: any;
    monacoLoadingPromise?: Promise<void>;
  }
}

interface DiffCodeBlockProps {
  original: string;
  modified: string;
  language?: string;
  className?: string;
  themeConfig?: CodeBlockThemeConfig;
  onEditorMounted?: (editor: any) => void;
}

const SYSTEMA_THEME = {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'string.key.json', foreground: '#e06c75' },
    { token: 'string.value.json', foreground: '#98c379' },
    { token: 'number', foreground: '#d19a66' },
    { token: 'keyword.json', foreground: '#56b6c2' },
    { token: 'delimiter', foreground: '#abb2bf' },
  ],
  colors: {
    'editor.background': '#1e1e1e',
    'editor.foreground': '#abb2bf',
    'editor.selectionBackground': '#264f78',
    'editor.findMatchHighlightBackground': '#ea5c0055',
  },
};

export const DiffCodeBlock = forwardRef<HTMLDivElement, DiffCodeBlockProps>(
  ({ original, modified, language = 'json', className, themeConfig, onEditorMounted }, _ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const editorInstance = useRef<any>(null);

    useEffect(() => {
      let mounted = true;

      const initMonaco = () => {
        if (!containerRef.current || !window.monaco) return;

        if (editorInstance.current) {
          editorInstance.current.dispose();
        }

        const themeName = 'systema-diff-dark';

        // Define theme (same as CodeBlock for consistency)
        const customRules =
          themeConfig?.rules?.map((r) => ({
            token: r.token,
            foreground: r.foreground?.replace('#', ''),
            background: r.background?.replace('#', ''),
            fontStyle: r.fontStyle,
          })) || [];

        window.monaco.editor.defineTheme(themeName, {
          ...SYSTEMA_THEME,
          rules: [...SYSTEMA_THEME.rules, ...customRules],
          colors: {
            ...SYSTEMA_THEME.colors,
            ...(themeConfig?.background ? { 'editor.background': themeConfig.background } : {}),
            ...(themeConfig?.foreground ? { 'editor.foreground': themeConfig.foreground } : {}),
          },
        });

        // Create Diff Editor
        editorInstance.current = window.monaco.editor.createDiffEditor(containerRef.current, {
          theme: themeName,
          readOnly: true,
          originalEditable: false,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 12,
          fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
          automaticLayout: true,
          padding: { top: 16, bottom: 16 },
          renderSideBySide: true, // Side by side diff
          ignoreTrimWhitespace: false,
        });

        const originalModel = window.monaco.editor.createModel(original, language);
        const modifiedModel = window.monaco.editor.createModel(modified, language);

        editorInstance.current.setModel({
          original: originalModel,
          modified: modifiedModel,
        });

        if (onEditorMounted) {
          onEditorMounted(editorInstance.current);
        }
      };

      const loadMonaco = () => {
        if (window.monaco) {
          initMonaco();
          return;
        }

        if (!window.monacoLoadingPromise) {
          // This should theoretically be handled by the main CodeBlock or global loader,
          // but providing fallback here just in case.
          // Simplified loader check:
          const existingScript = document.querySelector('script[src*="vscode/loader.js"]');
          if (existingScript || window.require) {
            // Wait for window.require
            const waitForRequire = setInterval(() => {
              if (window.require) {
                clearInterval(waitForRequire);
                window.require.config({ paths: { vs: '/monaco/vs' } });
                window.require(['vs/editor/editor.main'], () => {
                  if (mounted) initMonaco();
                });
              }
            }, 50);
            return;
          }
          // Very basic fallback if not loaded elsewhere, keeping it simple
          // assuming CodeBlock handles the main loading usually.
        }

        // Reuse the global promise if available
        if (window.monacoLoadingPromise) {
          window.monacoLoadingPromise.then(() => {
            if (mounted && window.monaco) initMonaco();
          });
        } else {
          // If we really need to load it (CodeBlock not used yet?)
          // Duplicate logic from CodeBlock for robustness or abstract it.
          // For now assuming CodeBlock logic runs or we wait on window.monaco
          // We'll trust the CodeBlock logic sets up the promise or window.monaco
          const waitForMonaco = setInterval(() => {
            if (window.monaco) {
              clearInterval(waitForMonaco);
              initMonaco();
            }
          }, 100);
          setTimeout(() => clearInterval(waitForMonaco), 10000);
        }
      };

      loadMonaco();

      return () => {
        mounted = false;
        if (editorInstance.current) {
          editorInstance.current.dispose();
        }
      };
    }, []); // Only init once on mount

    // Update models when content/language changes
    useEffect(() => {
      if (!editorInstance.current || !window.monaco) return;

      const { original: originalModel, modified: modifiedModel } =
        editorInstance.current.getModel();

      if (originalModel && originalModel.getValue() !== original) {
        originalModel.setValue(original);
      }
      if (modifiedModel && modifiedModel.getValue() !== modified) {
        modifiedModel.setValue(modified);
      }

      if (originalModel && modifiedModel) {
        window.monaco.editor.setModelLanguage(originalModel, language);
        window.monaco.editor.setModelLanguage(modifiedModel, language);
      }
    }, [original, modified, language]);

    return <div ref={containerRef} className={`w-full h-full ${className || ''}`} />;
  },
);

DiffCodeBlock.displayName = 'DiffCodeBlock';
