import React, { useState } from "react";
import Editor, { loader } from "@monaco-editor/react";
import "./CodeBlock.css";
import { getFileIconPath } from "../utils/fileIconMapper";

// Configure Monaco loader to use local files from the extension
// This assumes CopyWebpackPlugin copies 'node_modules/monaco-editor/min/vs' to 'dist/vs'
loader.config({
  paths: {
    vs: (window as any).__zenMonacoVsUri || "./vs",
  },
});

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  maxLines?: number;
  showCopyButton?: boolean;
  icon?: React.ReactNode;
  headerActions?: React.ReactNode;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({
  code,
  language = "javascript",
  filename,
  maxLines,
  showCopyButton = true,
  icon,
  headerActions,
}) => {
  const [copied, setCopied] = useState(false);

  // Handle Copy
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy code:", err);
    }
  };

  const lineHeight = 20;

  // Map common language IDs to extensions for icon lookup
  const languageToExtension: Record<string, string> = {
    python: "py",
    javascript: "js",
    typescript: "ts",
    java: "java",
    c: "c",
    cpp: "cpp",
    csharp: "cs",
    go: "go",
    rust: "rs",
    php: "php",
    ruby: "rb",
    swift: "swift",
    kotlin: "kt",
    scala: "scala",
    html: "html",
    css: "css",
    scss: "scss",
    less: "less",
    json: "json",
    xml: "xml",
    yaml: "yaml",
    sql: "sql",
    shell: "sh",
    bash: "sh",
    powershell: "ps1",
    markdown: "md",
    dockerfile: "dockerfile",
    makefile: "makefile",
  };

  const getIconForLanguage = (lang: string) => {
    const ext = languageToExtension[lang.toLowerCase()] || lang;
    return getFileIconPath(`file.${ext}`);
  };

  const [editorHeight, setEditorHeight] = useState(
    maxLines ? maxLines * 20 : 100
  );

  const currentMaxLines = maxLines || 15; // Default to 15 lines if not specified

  // Improved auto-height handler
  const handleEditorDidMount = (editor: any, monaco: any) => {
    const updateHeight = () => {
      const contentHeight = editor.getContentHeight();

      // Calculate max height based on line height
      const maxHeight = currentMaxLines * lineHeight;

      // Target height is the smaller of content height or max height
      // Ensure at least 1 line height + padding
      const targetHeight =
        Math.min(contentHeight, maxHeight) || lineHeight + 20;

      setEditorHeight(targetHeight);

      editor.layout({
        width: editor.getLayoutInfo().width,
        height: targetHeight,
      });
    };

    editor.onDidContentSizeChange(updateHeight);

    // Initial update
    updateHeight();
    // Safety check after a delay
    setTimeout(updateHeight, 50);
  };

  return (
    <div className="code-block-container">
      {(filename || showCopyButton) && (
        <div className="code-block-header">
          <div className="file-info">
            {icon ? (
              <div
                className="file-icon-img"
                style={{
                  width: "16px",
                  height: "16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {icon}
              </div>
            ) : (
              <img
                src={
                  filename
                    ? getFileIconPath(filename)
                    : getIconForLanguage(language)
                }
                alt="icon"
                className="file-icon-img"
                style={{ width: "16px", height: "16px" }}
              />
            )}
            {filename ? <span>{filename}</span> : <span>{language}</span>}
          </div>
          <div className="code-block-actions">
            {headerActions && (
              <div style={{ display: "flex", alignItems: "center" }}>
                {headerActions}
              </div>
            )}
            {showCopyButton && (
              <button
                className="icon-button"
                onClick={handleCopy}
                title="Copy code"
              >
                {copied ? (
                  <span className="codicon codicon-check" />
                ) : (
                  <span className="codicon codicon-copy" />
                )}
              </button>
            )}
          </div>
        </div>
      )}
      <div
        className="monaco-editor-wrapper"
        style={{
          height: `${editorHeight}px`,
          width: "100%",
          paddingRight: "10px",
          boxSizing: "border-box",
        }}
      >
        <Editor
          height="100%"
          language={language}
          value={code}
          theme="vs-dark"
          onMount={handleEditorDidMount}
          options={{
            readOnly: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            fontFamily: "'Fira Code', 'Consolas', monospace",
            fontSize: 13,
            lineHeight: 20,
            padding: { top: 10, bottom: 10 },
            contextmenu: false,
            domReadOnly: true,
            wordWrap: "on",
            renderLineHighlight: "none",
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
            lineNumbersMinChars: 3,
            glyphMargin: false,
            folding: false,
            lineDecorationsWidth: 10,
            scrollbar: {
              vertical: "auto", // Allow scrolling if content exceeds height
              horizontal: "auto",
              handleMouseWheel: true,
            },
          }}
          loading={
            <div style={{ color: "#ccc", padding: "10px" }}>
              Loading Editor...
            </div>
          }
        />
      </div>
    </div>
  );
};
