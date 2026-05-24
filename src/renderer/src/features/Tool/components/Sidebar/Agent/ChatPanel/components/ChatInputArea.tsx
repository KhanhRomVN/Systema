import React, { useRef, useEffect } from 'react';
import { Send, Paperclip, X, Search, Brain, Globe, ChevronDown } from 'lucide-react';
import { cn } from '../../../../../../../shared/lib/utils';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { FilePreviewModal } from './FilePreviewModal';
import { getFileIconPath } from '../../../../../../../shared/utils/fileIconMapper';

// Attachments
export interface PendingAttachment {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  previewUrl?: string;
  progress?: number;
  fileId?: string;
  accountId?: string;
}

interface ChatInputAreaProps {
  input: string;
  setInput: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  onStop: () => void;

  // Attachments
  attachments: PendingAttachment[];
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement> | { target: { files: FileList } }) => void;
  onRemoveAttachment: (index: number) => void;

  // Features
  thinkingEnabled: boolean;
  setThinkingEnabled: (v: boolean) => void;
  searchEnabled: boolean;
  setSearchEnabled: (v: boolean) => void;
  streamEnabled: boolean;
  setStreamEnabled: (v: boolean) => void;

  // Styling
  disabled?: boolean;
  isConnected?: boolean;

  // Conditional Feature Support
  supportsUpload?: boolean;
  supportsSearch?: boolean;
  supportsThinking?: boolean;
  isUploadingAttachment?: boolean;

  // Model badge (HomePanel only — docked to top of input)
  modelBadge?: {
    label: string;       // e.g. "deepseek/deepseek-chat"
    faviconUrl?: string;
    accountEmail?: string;
    onClick?: () => void;
  };
}

export function ChatInputArea({
  input,
  setInput,
  onSend,
  isLoading,
  onStop,
  attachments,
  onFileSelect,
  onRemoveAttachment,
  thinkingEnabled,
  setThinkingEnabled,
  searchEnabled,
  setSearchEnabled,
  streamEnabled: _streamEnabled,
  setStreamEnabled: _setStreamEnabled,
  disabled,
  isConnected = true,
  supportsUpload = true,
  supportsSearch = true,
  supportsThinking = true,
  isUploadingAttachment = false,
  modelBadge,
}: ChatInputAreaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);
  const [previewFile, setPreviewFile] = React.useState<PendingAttachment | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect({ target: { files: e.dataTransfer.files } });
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      onFileSelect({ target: { files: e.clipboardData.files } });
    }
  };

  return (
    <div className={cn('px-3 pb-3 bg-table-bodyBg flex flex-col gap-2', modelBadge ? 'pt-6' : 'pt-0')}>
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 px-0.5 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent pt-3">
          {attachments.map((att, idx) => (
            <div
              key={att.id || idx}
              className="relative group w-20 h-20 shrink-0 rounded-lg overflow-hidden border border-border bg-background transition-all hover:border-primary/50"
            >
              {/* Preview Content */}
              <div className="w-full h-full cursor-pointer" onClick={() => setPreviewFile(att)}>
                {att.file.type.startsWith('image/') ? (
                  <img
                    src={att.previewUrl || URL.createObjectURL(att.file)}
                    className="w-full h-full object-cover"
                    alt="preview"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center w-full h-full text-[10px] text-muted-foreground p-2 text-center bg-muted/50 gap-1">
                    <img
                      src={getFileIconPath(att.file.name)}
                      alt=""
                      className="w-6 h-6 object-contain"
                      onError={(e) => (e.currentTarget.style.display = 'none')}
                    />
                    <span className="truncate w-full">{att.file.name}</span>
                  </div>
                )}
              </div>

              {/* Status Overlays */}
              {att.status === 'uploading' && (
                <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center gap-1 z-10">
                  <Loader2 className="w-4 h-4 text-white animate-spin" />
                  <span className="text-[10px] text-white font-medium">{att.progress || 0}%</span>
                </div>
              )}

              {att.status === 'error' && (
                <div className="absolute inset-0 bg-destructive/20 flex items-center justify-center z-10">
                  <AlertCircle className="w-5 h-5 text-destructive" />
                </div>
              )}

              {(att.status === 'completed' || att.fileId) && (
                <div className="absolute top-1 left-1 z-10">
                  <CheckCircle2 className="w-3.5 h-3.5 text-green-500 fill-background" />
                </div>
              )}

              {/* Actions */}
              <button
                onClick={() => onRemoveAttachment(idx)}
                className="absolute top-1 right-1 p-0.5 bg-background/80 hover:bg-destructive hover:text-white text-muted-foreground rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all border border-border"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div
        className={cn(
          'flex flex-col gap-2 relative bg-table-headerBg border rounded-xl transition-all p-2',
          isConnected
            ? 'border-border'
            : 'border-red-500/60',
          isDragging && 'ring-2 ring-primary bg-primary/5',
          modelBadge && 'rounded-tl-none',
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Model badge — docked to top-left, outside the box */}
        {modelBadge && (
          <button
            onClick={modelBadge.onClick}
            className={cn(
              'absolute bottom-full left-2 flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold bg-table-headerBg border border-b-0 rounded-t-lg text-muted-foreground transition-colors cursor-pointer',
              isConnected ? 'border-border' : 'border-red-500/60',
            )}
            style={{ marginBottom: '1px' }}
          >
            {modelBadge.faviconUrl ? (
              <img src={modelBadge.faviconUrl} alt="" className="w-3 h-3 rounded-sm" onError={(e) => (e.currentTarget.style.display = 'none')} />
            ) : (
              <Globe className="w-3 h-3" />
            )}
            <span>{modelBadge.label}</span>
            {modelBadge.accountEmail && (
              <span className="opacity-60 italic font-normal truncate max-w-[100px]">{modelBadge.accountEmail}</span>
            )}
            <ChevronDown className="w-3 h-3 opacity-50" />
          </button>
        )}
        {isDragging && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-xl">
            <div className="pointer-events-none flex flex-col items-center">
              <Paperclip className="w-8 h-8 text-primary mb-2" />
              <span className="text-sm font-medium text-primary">Drop files to attach</span>
            </div>
          </div>
        )}

        {/* Preview Modal */}
        {previewFile && (
          <FilePreviewModal file={previewFile.file} onClose={() => setPreviewFile(null)} />
        )}

        {/* Input Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Type a message..."
          disabled={disabled || isLoading}
          className="w-full bg-transparent border-none outline-none resize-none min-h-[44px] max-h-[200px] px-2 py-1 text-sm disabled:opacity-50 placeholder:text-muted-foreground/50"
          rows={1}
        />

        {/* Action Toolbar */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1">
            {/* Attachment Button — icon only */}
            {supportsUpload && (
              <>
                <input type="file" ref={fileInputRef} onChange={onFileSelect} className="hidden" multiple />
                <button
                  className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors disabled:opacity-50"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={disabled || isLoading}
                  title="Add Attachment"
                >
                  <Paperclip className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {(supportsUpload || supportsThinking || supportsSearch) && (
              <div className="h-4 w-px bg-border mx-1" />
            )}

            {supportsThinking && (
              <button
                className={cn(
                  'h-7 px-2 flex items-center justify-center rounded-md text-xs gap-1.5 transition-colors disabled:opacity-50',
                  thinkingEnabled ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'text-muted-foreground hover:bg-muted/50',
                )}
                onClick={() => setThinkingEnabled(!thinkingEnabled)}
                title="Toggle Thinking Mode"
                disabled={disabled}
              >
                <Brain className="w-3.5 h-3.5" />
                <span>Think</span>
              </button>
            )}

            {supportsSearch && (
              <button
                className={cn(
                  'h-7 px-2 flex items-center justify-center rounded-md text-xs gap-1.5 transition-colors disabled:opacity-50',
                  searchEnabled ? 'bg-primary/10 text-primary hover:bg-primary/20' : 'text-muted-foreground hover:bg-muted/50',
                )}
                onClick={() => setSearchEnabled(!searchEnabled)}
                title="Toggle Web Search"
                disabled={disabled}
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>
            )}
          </div>

          {/* Send/Stop Button — no background */}
          {isLoading ? (
            <button
              className="h-7 w-7 flex items-center justify-center rounded-md text-destructive hover:bg-destructive/10 transition-colors"
              onClick={onStop}
            >
              <div className="w-2.5 h-2.5 bg-current rounded-sm" />
            </button>
          ) : (
            <button
              className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              onClick={onSend}
              disabled={disabled || (!input.trim() && attachments.length === 0) || isUploadingAttachment}
            >
              {isUploadingAttachment ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
