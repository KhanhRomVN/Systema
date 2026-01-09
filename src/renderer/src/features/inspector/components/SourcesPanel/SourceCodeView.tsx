import { CodeBlock } from '../../../../components/CodeBlock';
import { cn } from '../../../../shared/lib/utils';
import { FileCode, Braces } from 'lucide-react';
import { useState, useEffect } from 'react';
import * as prettier from 'prettier/standalone';
import * as parserBabel from 'prettier/plugins/babel';
import * as parserEstree from 'prettier/plugins/estree';
import * as parserHtml from 'prettier/plugins/html';
import * as parserPostcss from 'prettier/plugins/postcss';

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
  const [formattedContent, setFormattedContent] = useState(content);
  const [isFormatting, setIsFormatting] = useState(false);
  const [autoFormat, setAutoFormat] = useState(true);

  useEffect(() => {
    if (!content || !autoFormat) {
      setFormattedContent(content);
      return;
    }

    const formatCode = async () => {
      try {
        setIsFormatting(true);
        let parser = 'babel';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let plugins: any[] = [parserBabel, parserEstree];

        if (language === 'css') {
          parser = 'css';
          plugins = [parserPostcss];
        } else if (language === 'html') {
          parser = 'html';
          plugins = [parserHtml];
        } else if (language === 'json') {
          parser = 'json';
          plugins = [parserBabel, parserEstree];
        }

        const formatted = await prettier.format(content, {
          parser,
          plugins,
          printWidth: 100,
          tabWidth: 2,
          useTabs: false,
          semi: true,
          singleQuote: true,
        });

        setFormattedContent(formatted);
      } catch (e) {
        console.error('Prettier formatting failed:', e);
        // Fallback or just show error in console
        setFormattedContent(content);
      } finally {
        setIsFormatting(false);
      }
    };

    console.log('Attempting to format file:', fileName, 'Language:', language);
    formatCode();
  }, [content, language, autoFormat]);

  if (!content) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 space-y-2">
        <FileCode className="w-12 h-12 stroke-1" />
        <span className="text-sm">Select a file to view its source</span>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#1e1e1e]">
      <div className="h-9 px-4 flex items-center justify-between border-b border-white/10 bg-[#252526] text-xs text-gray-400">
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-300">{fileName}</span>
          {isFormatting && (
            <span className="text-muted-foreground italic text-[10px] ml-2">Formatting...</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setAutoFormat(!autoFormat)}
            className={cn(
              'p-1 hover:bg-white/10 rounded transition-colors',
              autoFormat ? 'text-blue-400 bg-blue-400/10' : 'text-gray-400',
            )}
            title="Auto Pretty Print"
          >
            <Braces className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden relative">
        <CodeBlock
          code={formattedContent}
          language={language}
          showLineNumbers={true}
          wordWrap="on"
          themeConfig={{
            background: '#1e1e1e',
          }}
        />
      </div>
    </div>
  );
}
