import React from "react";
import { CodeBlock } from "../../../CodeBlock";
import { Message, Checkpoint } from "../types";
import { ParsedResponse } from "../../../../services/ResponseParser";
import PromptSection from "./PromptSection";
import ThinkingSection from "./ThinkingSection";
import FollowupOptions from "./FollowupOptions";
import RequestDivider from "./RequestDivider";
import ToolActionsList from "./ToolActions/index";
import CheckpointDivider from "./ToolActions/CheckpointDivider";
import HtmlPreview from "./HtmlPreview";

interface MessageBoxProps {
  message: Message;
  parsedContent: ParsedResponse; // For assistant messages
  isCollapsed: boolean; // For prompt/thinking sections
  onToggleCollapse: () => void;
  clickedActions: Set<string>;
  failedActions?: Set<string>;
  onToolClick: (action: any, message: Message, index: number) => void; // Using any for action temporarily to match ToolAction
  requestNumber: number | null; // For user messages
  checkpoints?: Checkpoint[]; // Pass all checkpoints to find if any belong to this message/action
  onRevertCheckpoint?: (checkpointId: string) => void;
  onViewCheckpoint?: (checkpointId: string) => void;
  executionState?: {
    total: number;
    completed: number;
    status: "idle" | "running" | "error" | "done";
  };
  isLastMessage?: boolean; // New prop
  clearedActions?: Set<string>;
  onActionClear?: (actionId: string) => void;
  toolOutputs?: Record<string, { output: string; isError: boolean }>;
}

const MessageBox: React.FC<MessageBoxProps> = ({
  message,
  parsedContent,
  isCollapsed,
  onToggleCollapse,
  clickedActions,
  failedActions,
  onToolClick,
  requestNumber,
  checkpoints,
  onRevertCheckpoint,
  onViewCheckpoint,
  executionState,
  isLastMessage,
  clearedActions,
  onActionClear,
  toolOutputs,
}) => {
  // If User Message
  if (message.role === "user") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--spacing-md)",
          marginBottom: "var(--spacing-md)",
        }}
      >
        <RequestDivider requestNumber={requestNumber} />

        {/* Prompt Section */}
        <PromptSection
          message={message}
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggleCollapse}
        />

        {/* User Content Box (if not tool request) */}
        {!message.isToolRequest && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "var(--spacing-xs)",
              borderRadius: "var(--border-radius)",
              backgroundColor: "var(--input-bg)",
              padding: "var(--spacing-md)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--spacing-xs)",
                fontSize: "var(--font-size-xs)",
                color: "var(--secondary-text)",
                fontWeight: 600,
                justifyContent: "space-between",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--spacing-xs)",
                }}
              >
                <span>👤</span>
                <span>You</span>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--vscode-descriptionForeground)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  cursor: "pointer",
                  opacity: 0.6,
                  transition: "all 0.2s",
                }}
                onClick={() => {
                  navigator.clipboard.writeText(message.content);
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.stroke =
                    "var(--vscode-textLink-activeForeground)";
                  e.currentTarget.style.opacity = "1";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.stroke =
                    "var(--vscode-descriptionForeground)";
                  e.currentTarget.style.opacity = "0.6";
                }}
              >
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
              </svg>
            </div>

            <div
              style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--primary-text)",
                lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}
            >
              {message.content}
            </div>
          </div>
        )}
      </div>
    );
  }

  // If Assistant Message
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--spacing-md)",
        marginBottom: "var(--spacing-md)",
      }}
    >
      {/* 1. Checkpoint Display (if any action in this message created a checkpoint) */}
      {checkpoints &&
        Array.isArray(checkpoints) &&
        checkpoints
          .filter(
            (cp) => typeof cp !== "string" && cp?.messageId === message.id
          )
          .map((cp) => (
            <CheckpointDivider
              key={cp.id}
              checkpoint={cp}
              onRevert={onRevertCheckpoint!}
              onViewDetails={() => onViewCheckpoint && onViewCheckpoint(cp.id)}
            />
          ))}

      {/* 2. Thinking Section */}
      {parsedContent.thinking && (
        <ThinkingSection
          message={message}
          thinking={parsedContent.thinking}
          isCollapsed={isCollapsed}
          onToggleCollapse={onToggleCollapse}
        />
      )}

      {/* 3. Interleaved Content (Text + Tools) */}
      {(() => {
        // Prepare render groups
        const groups: Array<
          | { type: "text"; content: string; key: string }
          | { type: "code"; content: string; language: string; key: string }
          | { type: "html"; content: string; key: string }
          | {
              type: "tools";
              items: { action: any; index: number }[];
              key: string;
            }
        > = [];

        let currentToolGroup: { action: any; index: number }[] = [];

        // If contentBlocks exists (new parser), use it
        // Otherwise fallback to legacy behavior (displayText + actions)
        const blocks = parsedContent.contentBlocks || [];

        // Helper to flush tool group
        const flushTools = () => {
          if (currentToolGroup.length > 0) {
            groups.push({
              type: "tools",
              items: currentToolGroup,
              key: `tools-${groups.length}`,
            });
            currentToolGroup = [];
          }
        };

        if (blocks.length > 0) {
          blocks.forEach((block, idx) => {
            if (block.type === "tool") {
              const actionIndex = parsedContent.actions.indexOf(block.action);
              currentToolGroup.push({
                action: block.action,
                index: actionIndex,
              });
            } else if (block.type === "code") {
              flushTools();
              groups.push({
                type: "code",
                content: block.content,
                language: block.language || "text",
                key: `code-${groups.length}`,
              });
            } else if (block.type === "html") {
              flushTools();
              groups.push({
                type: "html",
                content: block.content,
                key: `html-${groups.length}`,
              });
            } else {
              flushTools();
              groups.push({
                type: "text",
                content: block.content,
                key: `text-${groups.length}`,
              });
            }
          });
          flushTools();
        } else {
          // Legacy Fallback
          // 1. Text
          if (parsedContent.displayText) {
            groups.push({
              type: "text",
              content: parsedContent.displayText,
              key: "text-legacy",
            });
          }
          // 2. Tools
          if (parsedContent.actions && parsedContent.actions.length > 0) {
            currentToolGroup = parsedContent.actions.map((action, index) => ({
              action,
              index,
            }));
            flushTools();
          }
          // 3. Completion (legacy separate field)
          if (parsedContent.attemptCompletion) {
            // In new parser, this is a tool, so covered.
            // In legacy, it might be separate?
            // Actually currently ParsedResponse has attemptCompletion string.
            // If we rely on contentBlocks, we shouldn't render this separately if it's in blocks.
            // If legacy, we might want to show it.
            // But let's assume contentBlocks covers it.
          }
        }

        return groups.map((group) => {
          if (group.type === "code") {
            return (
              <div key={group.key} style={{ marginTop: "var(--spacing-xs)" }}>
                <CodeBlock
                  code={group.content}
                  language={group.language}
                  maxLines={25}
                  showCopyButton={true}
                />
              </div>
            );
          } else if (group.type === "html") {
            return (
              <div
                key={group.key}
                style={{
                  marginTop: "var(--spacing-xs)",
                }}
              >
                <HtmlPreview content={group.content} />
              </div>
            );
          } else if (group.type === "text") {
            return (
              <div
                key={group.key}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--spacing-xs)",
                  borderRadius: "var(--border-radius)",
                  backgroundColor: "var(--secondary-bg)",
                  padding: "0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--spacing-xs)",
                    fontSize: "var(--font-size-xs)",
                    color: "var(--secondary-text)",
                    fontWeight: 600,
                    justifyContent: "space-between",
                  }}
                ></div>

                <div
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--primary-text)",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {group.content}
                </div>
              </div>
            );
          } else {
            return (
              <ToolActionsList
                key={group.key}
                message={message}
                items={group.items}
                clickedActions={clickedActions}
                failedActions={failedActions}
                onToolClick={onToolClick}
                executionState={executionState}
                isLastMessage={isLastMessage}
                clearedActions={clearedActions}
                onActionClear={onActionClear}
                toolOutputs={toolOutputs}
              />
            );
          }
        });
      })()}

      {/* 6. Follow-up Options */}
      {parsedContent.followupOptions && (
        <FollowupOptions
          options={parsedContent.followupOptions}
          messageId={message.id}
          selectedOption={undefined}
          onOptionClick={(opt) => {}}
        />
      )}
    </div>
  );
};

export default MessageBox;
