import React from "react";
import { UploadedFile } from "../types";
import ChangesTree from "../../ChangesTree";
import {
  AtIcon,
  PlusIcon,
  ProjectStructureIcon,
  CodeSandboxIcon,
  ChangesTreeIcon,
  GitCommitIcon,
  SettingsIcon,
  SendIcon,
  ShieldIcon,
} from "./Icons";

interface MessageInputProps {
  message: string;
  setMessage: React.Dispatch<React.SetStateAction<string>>;
  isHistoryMode?: boolean;
  uploadedFiles: UploadedFile[];
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  handleTextareaChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  handlePaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  handleDragOver: (e: React.DragEvent) => void;
  handleDrop: (e: React.DragEvent) => void;
  setShowAtMenu: (show: boolean) => void;
  handleFileSelect: () => void;
  onOpenProjectStructure: () => void;
  showChangesDropdown: boolean;
  setShowChangesDropdown: (show: boolean) => void;
  messages: any[];
  handleGitCommit: () => void;
  setShowOptionsDrawer: (show: boolean) => void;
  handleSend: () => void;
  hasProjectContext: boolean;
  onOpenProjectContext: () => void;
  executionState?: {
    total: number;
    completed: number;
    status: "idle" | "running" | "error" | "done";
  };
  onExecutePendingBatch?: () => void;
  onExecuteAll?: () => void;
  isAutoExecutingAll?: boolean;
  hasPendingActions?: boolean;
  onCheckpoint?: () => void;
}

const MessageInput: React.FC<MessageInputProps> = ({
  message,
  setMessage,
  isHistoryMode = false,
  uploadedFiles,
  textareaRef,
  handleTextareaChange,
  handleKeyDown,
  handlePaste,
  handleDragOver,
  handleDrop,
  setShowAtMenu,
  handleFileSelect,
  onOpenProjectStructure,
  showChangesDropdown,
  setShowChangesDropdown,
  messages,
  handleGitCommit,
  setShowOptionsDrawer,
  handleSend,
  hasProjectContext,
  onOpenProjectContext,
  executionState,
  onExecutePendingBatch,
  onExecuteAll,
  isAutoExecutingAll,
  hasPendingActions,
  onCheckpoint,
}) => {
  return (
    <div
      style={{
        padding: "var(--spacing-md) var(--spacing-lg)",
        borderTop: "1px solid var(--border-color)",
        backgroundColor: "var(--secondary-bg)",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "relative",
          backgroundColor: "var(--input-bg)",
          borderRadius: "var(--border-radius-lg)",
          border: "1px solid var(--border-color)",
          transition: "border-color 0.2s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = "var(--accent-text)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "var(--border-color)";
        }}
      >
        {/* Execution Progress Badge */}
        {executionState && executionState.status === "running" && (
          <div
            style={{
              position: "absolute",
              top: "-24px",
              right: "0",
              backgroundColor: "var(--vscode-badge-background)",
              color: "var(--vscode-badge-foreground)",
              fontSize: "10px",
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: "10px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              zIndex: 10,
              boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
              cursor: "pointer",
            }}
            onClick={onExecutePendingBatch}
            title="Click to execute pending commands"
          >
            <div
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                backgroundColor: "white",
                opacity: 0.8,
              }}
            />
            Execute {executionState.completed}/{executionState.total}
          </div>
        )}

        {/* Execute All Button */}
        {(hasPendingActions ||
          (executionState && executionState.status === "running")) &&
          onExecuteAll && (
            <div
              style={{
                position: "absolute",
                top: "-24px",
                right:
                  executionState && executionState.status === "running"
                    ? "90px"
                    : "0", // Shift left if progress badge is shown
                backgroundColor: isAutoExecutingAll
                  ? "var(--accent-bg)"
                  : "var(--vscode-badge-background)",
                color: isAutoExecutingAll
                  ? "white"
                  : "var(--vscode-badge-foreground)",
                fontSize: "10px",
                fontWeight: 600,
                padding: "2px 8px",
                borderRadius: "10px",
                display: "flex", // Keep flex display
                alignItems: "center",
                gap: "6px",
                zIndex: 10,
                boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                cursor: "pointer",
                transition: "all 0.2s",
                border: isAutoExecutingAll
                  ? "1px solid var(--accent-border)"
                  : "none",
              }}
              onClick={(e) => {
                e.stopPropagation();
                onExecuteAll();
              }}
              title={
                isAutoExecutingAll
                  ? "Auto-executing all..."
                  : "Execute All Pending Actions"
              }
            >
              {/* Play Icon (Double Arrow for 'Run All') */}
              <svg
                width="10"
                height="10"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M2 2.5v11l6-5.5l-6-5.5zm7 0v11l6-5.5l-6-5.5z" />
              </svg>
              {isAutoExecutingAll ? "Running..." : "Run All"}
            </div>
          )}

        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleTextareaChange}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          placeholder={
            isHistoryMode
              ? "History mode - sending messages is disabled"
              : "Type @ to mention files, folders, or rules..."
          }
          disabled={isHistoryMode}
          style={{
            width: "100%",
            minHeight: "60px",
            maxHeight: "240px",
            padding: "var(--spacing-sm)",
            paddingBottom: "36px", // Space for bottom icons
            border: "none",
            outline: "none",
            resize: "none",
            fontFamily: "inherit",
            fontSize: "var(--font-size-sm)",
            backgroundColor: "transparent",
            color: "var(--primary-text)",
            overflow: "auto",
            opacity: isHistoryMode ? 0.6 : 1,
            cursor: isHistoryMode ? "not-allowed" : "text",
          }}
        />

        {/* Bottom Action Bar */}
        <div
          style={{
            position: "absolute",
            bottom: "var(--spacing-xs)",
            left: "var(--spacing-sm)",
            right: "var(--spacing-sm)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* Left Icons */}
          <div style={{ display: "flex", gap: "var(--spacing-xs)" }}>
            <div
              style={{
                cursor: isHistoryMode ? "not-allowed" : "pointer",
                padding: "var(--spacing-xs)",
                borderRadius: "var(--border-radius)",
                transition: "background-color 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--secondary-text)",
                opacity: isHistoryMode ? 0.5 : 1,
                pointerEvents: isHistoryMode ? "none" : "auto",
              }}
              onClick={() => {
                setMessage((prev) => prev + "@");
                setShowAtMenu(true);
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--hover-bg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <AtIcon />
            </div>

            <div
              style={{
                cursor: isHistoryMode ? "not-allowed" : "pointer",
                padding: "var(--spacing-xs)",
                borderRadius: "var(--border-radius)",
                transition: "background-color 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--secondary-text)",
                opacity: isHistoryMode ? 0.5 : 1,
                pointerEvents: isHistoryMode ? "none" : "auto",
              }}
              onClick={handleFileSelect}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--hover-bg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <PlusIcon />
            </div>

            {/* Checkpoint Icon (Shield) */}
            <div
              style={{
                cursor: isHistoryMode ? "not-allowed" : "pointer",
                padding: "var(--spacing-xs)",
                borderRadius: "var(--border-radius)",
                transition: "background-color 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--secondary-text)",
                opacity: isHistoryMode ? 0.5 : 1,
                pointerEvents: isHistoryMode ? "none" : "auto",
              }}
              onClick={onCheckpoint}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--hover-bg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
              title="Create Checkpoint (Incremental)"
            >
              <ShieldIcon size={16} />
            </div>

            {/* Project Structure Icon */}
            <div
              style={{
                cursor: isHistoryMode ? "not-allowed" : "pointer",
                padding: "var(--spacing-xs)",
                borderRadius: "var(--border-radius)",
                transition: "background-color 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--secondary-text)",
                opacity: isHistoryMode ? 0.5 : 1,
                pointerEvents: isHistoryMode ? "none" : "auto",
              }}
              onClick={onOpenProjectStructure}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--hover-bg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
              title="Project Structure"
            >
              <ProjectStructureIcon size={14} />
            </div>

            {/* Project Context Icon */}
            <div
              style={{
                cursor: isHistoryMode ? "not-allowed" : "pointer",
                padding: "var(--spacing-xs)",
                borderRadius: "var(--border-radius)",
                transition: "background-color 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: hasProjectContext
                  ? "var(--vscode-gitDecoration-addedResourceForeground)" // Use a distinct color (greenish usually) or accent
                  : "var(--secondary-text)",
                opacity: isHistoryMode ? 0.5 : 1,
                pointerEvents: isHistoryMode ? "none" : "auto",
              }}
              onClick={onOpenProjectContext}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--hover-bg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
              title="Project Context"
            >
              <CodeSandboxIcon size={16} />
            </div>

            {/* Changes Tree Icon */}
            <div
              style={{
                cursor: isHistoryMode ? "not-allowed" : "pointer",
                padding: "var(--spacing-xs)",
                borderRadius: "var(--border-radius)",
                transition: "background-color 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: showChangesDropdown
                  ? "var(--accent-text)"
                  : "var(--secondary-text)",
                opacity: isHistoryMode ? 0.5 : 1,
                pointerEvents: isHistoryMode ? "none" : "auto",
                backgroundColor: showChangesDropdown
                  ? "var(--hover-bg)"
                  : "transparent",
                position: "relative", // For absolute positioning of dropdown
              }}
              onClick={() => setShowChangesDropdown(!showChangesDropdown)}
              onMouseEnter={(e) => {
                if (!showChangesDropdown)
                  e.currentTarget.style.backgroundColor = "var(--hover-bg)";
              }}
              onMouseLeave={(e) => {
                if (!showChangesDropdown)
                  e.currentTarget.style.backgroundColor = "transparent";
              }}
              title="Show Changes"
            >
              <ChangesTreeIcon size={16} />

              {/* Dropdown content */}
              {showChangesDropdown && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "100%",
                    left: "0",
                    marginBottom: "10px",
                    zIndex: 1000,
                    backgroundColor: "var(--vscode-editor-background)",
                    boxShadow: "0 4px 6px rgba(0,0,0,0.3)",
                    border: "1px solid var(--vscode-widget-border)",
                    borderRadius: "6px",
                  }}
                  onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
                >
                  <ChangesTree messages={messages || []} />
                </div>
              )}
            </div>

            {/* Git Commit Icon */}
            <div
              style={{
                cursor:
                  isHistoryMode || message.trim() !== ""
                    ? "not-allowed"
                    : "pointer",
                padding: "var(--spacing-xs)",
                borderRadius: "var(--border-radius)",
                transition: "background-color 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--secondary-text)",
                opacity: isHistoryMode || message.trim() !== "" ? 0.5 : 1,
                pointerEvents:
                  isHistoryMode || message.trim() !== "" ? "none" : "auto",
              }}
              onClick={handleGitCommit}
              onMouseEnter={(e) => {
                if (message.trim() === "" && !isHistoryMode) {
                  e.currentTarget.style.backgroundColor = "var(--hover-bg)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
              title="Generate git commit message (only when textarea is empty)"
            >
              <GitCommitIcon size={18} />
            </div>
          </div>

          {/* Right Icons */}
          <div style={{ display: "flex", gap: "var(--spacing-xs)" }}>
            <div
              style={{
                cursor: isHistoryMode ? "not-allowed" : "pointer",
                padding: "var(--spacing-xs)",
                borderRadius: "var(--border-radius)",
                transition: "background-color 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--secondary-text)",
                opacity: isHistoryMode ? 0.5 : 1,
                pointerEvents: isHistoryMode ? "none" : "auto",
              }}
              onClick={() => setShowOptionsDrawer(true)}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "var(--hover-bg)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <SettingsIcon />
            </div>

            <div
              style={{
                cursor: isHistoryMode
                  ? "not-allowed"
                  : message.trim() || uploadedFiles.length > 0
                  ? "pointer"
                  : "not-allowed",
                opacity: isHistoryMode
                  ? 0.5
                  : message.trim() || uploadedFiles.length > 0
                  ? 1
                  : 0.5,
                padding: "var(--spacing-xs)",
                borderRadius: "var(--border-radius)",
                transition: "background-color 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isHistoryMode
                  ? "var(--secondary-text)"
                  : message.trim() || uploadedFiles.length > 0
                  ? "var(--accent-text)"
                  : "var(--secondary-text)",
                pointerEvents: isHistoryMode ? "none" : "auto",
              }}
              onClick={handleSend}
              onMouseEnter={(e) => {
                if (message.trim() || uploadedFiles.length > 0) {
                  e.currentTarget.style.backgroundColor = "var(--hover-bg)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
              }}
            >
              <SendIcon />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageInput;
