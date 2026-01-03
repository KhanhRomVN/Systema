import React, { useEffect, useRef } from 'react';

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
}

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
  themeConfig?: CodeBlockThemeConfig;
  wordWrap?: 'off' | 'on' | 'wordWrapColumn' | 'bounded';
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
  },
};

const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = 'json',
  className,
  themeConfig,
  wordWrap = 'on',
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const editorInstance = useRef<any>(null);

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
          readOnly: true,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          fontSize: 12,
          fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
          automaticLayout: true,
          padding: { top: 16, bottom: 16 },
          wordWrap: wordWrap,
        });
      } catch (error) {
        console.error('Failed to create monaco editor instance:', error);
      }
    };
    // ... loadMonaco logic ...
    // ... loadMonaco logic ...
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

  return <div ref={editorRef} className={`w-full h-full min-h-[200px] ${className || ''}`} />;
};

export { CodeBlock };
