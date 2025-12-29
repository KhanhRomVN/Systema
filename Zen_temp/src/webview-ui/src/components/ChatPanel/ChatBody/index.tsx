import React, { useMemo, useRef, useEffect } from "react";
import {
  parseAIResponse,
  ParsedResponse,
} from "../../../services/ResponseParser";
import { Message, ChatBodyProps } from "./types";

interface ExtendedChatBodyProps extends ChatBodyProps {
  executionState?: {
    total: number;
    completed: number;
    status: "idle" | "running" | "error" | "done";
  };
  toolOutputs?: Record<string, { output: string; isError: boolean }>;
}

// Hooks
import { useCollapseSections } from "./hooks/useCollapseSections";
import { useToolActions } from "./hooks/useToolActions";
import { useScrollBehavior } from "./hooks/useScrollBehavior";

// Components
import EmptyState from "./components/EmptyState";
import ProcessingIndicator from "./components/ProcessingIndicator";
import ScrollToBottomButton from "./components/ScrollToBottomButton";
import MessageBox from "./components/MessageBox";
import { CheckpointButton } from "../Checkpoint/CheckpointButton";

const ChatBody: React.FC<ExtendedChatBodyProps> = ({
  messages,
  isProcessing,
  checkpoints,
  checkpoint, // eslint-disable-line @typescript-eslint/no-unused-vars
  onSendToolRequest,
  onSendMessage, // eslint-disable-line @typescript-eslint/no-unused-vars
  onRevertCheckpoint,
  onViewCheckpoint,
  agentOptions,
  executionState,
  toolOutputs,
  firstRequestMessageId,
}: ExtendedChatBodyProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Memoize parsed messages
  const parsedMessages = useMemo(() => {
    const cache = new Map<string, ParsedResponse>();

    const result = messages.map((msg) => {
      if (!cache.has(msg.content)) {
        cache.set(msg.content, parseAIResponse(msg.content));
      }

      return {
        ...msg,
        parsed: cache.get(msg.content)!,
      };
    });

    return result;
  }, [messages]);

  // Hooks
  const { collapsedSections, toggleCollapse, setInitiallyCollapsed } =
    useCollapseSections();
  const {
    clickedActions,
    handleToolClick,
    failedActions,
    clearedActions,
    handleActionClear,
  } = useToolActions({
    onSendToolRequest,
    agentOptions,
    parsedMessages,
  });
  const { isAtBottom, scrollToBottom } = useScrollBehavior(messagesEndRef, [
    messages,
    isProcessing,
  ]);

  // Auto-collapse PROMPT REQUEST sections by default
  useEffect(() => {
    const promptSections = messages
      .filter((msg) => msg.role === "user")
      .map((msg) => `prompt-${msg.id}`);
    setInitiallyCollapsed(promptSections);
  }, [messages, setInitiallyCollapsed]);

  // Render Empty State
  if (messages.length === 0 && !isProcessing) {
    return <EmptyState />;
  }

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: "var(--spacing-lg)",
        paddingBottom: "200px",
        display: "flex",
        flexDirection: "column",
        gap: "var(--spacing-md)",
      }}
    >
      {messages.map((message, index) => {
        // Skip first message if it's from user (displayed in header)
        // Use the passed ID if available, otherwise fallback to finding the first user message
        if (firstRequestMessageId) {
          if (message.id === firstRequestMessageId) {
            return null;
          }
        } else {
          // Fallback logic
          const firstUserMessage = messages.find((m) => m.role === "user");
          if (message.id === firstUserMessage?.id) {
            return null;
          }
        }

        // Calculate request number for user messages
        const requestNumber =
          message.role === "user"
            ? messages.filter(
                (m) => m.role === "user" && m.timestamp <= message.timestamp
              ).length
            : null;

        // Special handling for Checkpoint messages
        if (message.role === ("system-checkpoint" as any)) {
          // Calculate checkpoint index
          const cpIndex =
            messages
              .filter((m) => m.role === ("system-checkpoint" as any))
              .findIndex((m) => m.id === message.id) + 1;

          if (message.checkpointData) {
            return (
              <CheckpointButton
                key={message.id}
                index={cpIndex}
                totalFiles={message.checkpointData.totalFiles}
                totalSize={message.checkpointData.totalSize}
                storageSize={message.checkpointData.storageSize}
                timestamp={message.checkpointData.timestamp}
                stats={message.checkpointData.stats}
                onRevert={() => {
                  // Call revert
                  if (onRevertCheckpoint) {
                    onRevertCheckpoint(message.checkpointData!.id);
                  }
                }}
                onViewDetails={() => {
                  if (onViewCheckpoint && message.checkpointData) {
                    onViewCheckpoint(message.checkpointData.id);
                  }
                }}
              />
            );
          }
          return null;
        }

        // Regular messages - Use memoized parsed content
        const parsedMessage = parsedMessages.find((pm) => pm.id === message.id);
        if (!parsedMessage) {
          return null;
        }
        const parsedContent = parsedMessage.parsed;

        // Checkpoints processing
        // We need to pass checkpoints primarily to Assistant messages or check who owns them
        // The original code passed checkpoints globally or checked logic locally?
        // Original logic didn't explicitly map checkpoints to messages in UI render loop,
        // but let's pass all checkpoints to MessageBox and let it filter.

        // Actually, Checkpoint interface has `messageId` field in our `types.ts`,
        // let's ensure we use it. If not present in existing data, fallback to timestamps?
        // For now, pass all checkpoints.

        return (
          <MessageBox
            key={message.id}
            message={message}
            parsedContent={parsedContent}
            isCollapsed={
              message.role === "user"
                ? collapsedSections.has(`prompt-${message.id}`)
                : collapsedSections.has(`thinking-${message.id}`)
            }
            onToggleCollapse={() =>
              toggleCollapse(
                message.role === "user"
                  ? `prompt-${message.id}`
                  : `thinking-${message.id}`
              )
            }
            clickedActions={clickedActions}
            failedActions={failedActions}
            onToolClick={handleToolClick}
            requestNumber={requestNumber}
            checkpoints={checkpoints as any}
            executionState={executionState}
            onRevertCheckpoint={onRevertCheckpoint}
            onViewCheckpoint={onViewCheckpoint}
            isLastMessage={index === messages.length - 1} // Pass isLastMessage
            clearedActions={clearedActions}
            onActionClear={handleActionClear}
            toolOutputs={toolOutputs}
          />
        );
      })}

      {isProcessing && <ProcessingIndicator />}

      <div ref={messagesEndRef} />

      {!isAtBottom && <ScrollToBottomButton onClick={scrollToBottom} />}
    </div>
  );
};

export default ChatBody;
