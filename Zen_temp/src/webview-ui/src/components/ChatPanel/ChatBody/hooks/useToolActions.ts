import { useState, useEffect, useCallback } from "react";
import { ToolAction } from "../../../../services/ResponseParser";
import { Message } from "../types";
import { CLICKABLE_TOOLS } from "../constants";

interface UseToolActionsProps {
  onSendToolRequest?: (action: ToolAction, message: Message) => void;
  agentOptions?: any;
  parsedMessages: any[]; // Using any[] for now as ParsedMessage type is complex to import if not exported
}

export const useToolActions = ({
  onSendToolRequest,
  agentOptions,
  parsedMessages,
}: UseToolActionsProps) => {
  const [clickedActions, setClickedActions] = useState<Set<string>>(new Set());
  const [failedActions, setFailedActions] = useState<Set<string>>(new Set());
  const [clearedActions, setClearedActions] = useState<Set<string>>(new Set());

  // Listen for message to remove clicked action state
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.command === "removeClickedAction" && event.data.actionId) {
        setClickedActions((prev) => {
          const newSet = new Set(prev);
          newSet.delete(event.data.actionId);
          return newSet;
        });
      }

      if (event.data.command === "markActionClicked" && event.data.actionId) {
        setClickedActions((prev) => new Set(prev).add(event.data.actionId));
      }

      if (event.data.command === "markActionFailed" && event.data.actionId) {
        // Mark as clicked AND failed
        setClickedActions((prev) => new Set(prev).add(event.data.actionId));
        setClickedActions((prev) => new Set(prev).add(event.data.actionId));
        setFailedActions((prev) => new Set(prev).add(event.data.actionId));
      }

      if (event.data.command === "markActionCleared" && event.data.actionId) {
        setClearedActions((prev) => new Set(prev).add(event.data.actionId));
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleToolClick = useCallback(
    (
      actionOrActions: ToolAction | ToolAction[],
      message: Message,
      actionIndex: number
    ) => {
      if (!onSendToolRequest) return;

      if (Array.isArray(actionOrActions)) {
        // Handle Batch
        const actionsToProcess: ToolAction[] = [];

        actionOrActions.forEach((action: any) => {
          // We expect _index to be attached by ToolItem
          const idx = action._index !== undefined ? action._index : actionIndex;
          const actionId = `${message.id}-action-${idx}`;

          if (!clickedActions.has(actionId)) {
            // Optimistic update REMOVED for batch to allow sequential processing feedback
            // setClickedActions((prev) => new Set(prev).add(actionId));
            actionsToProcess.push({ ...action, actionId });
          }
        });

        if (actionsToProcess.length > 0) {
          onSendToolRequest(actionsToProcess as any, message);
        }
      } else {
        // Handle Single
        const action = actionOrActions;
        if (CLICKABLE_TOOLS.includes(action.type)) {
          // Mark as clicked
          const actionId = `${message.id}-action-${actionIndex}`;
          setClickedActions((prev) => new Set(prev).add(actionId));

          // Attach actionId to action for checkpoint tracking
          // Also attach _index for ChatPanel logic to track completion
          const actionWithId = { ...action, actionId, _index: actionIndex };
          onSendToolRequest(actionWithId, message);
        }
      }
    },
    [onSendToolRequest, clickedActions]
  );

  const handleActionClear = useCallback((actionId: string) => {
    // Notify ChatPanel/others to clear this action's context
    window.postMessage(
      {
        command: "markActionCleared",
        actionId: actionId,
      },
      "*"
    );
    // Optimistic update
    setClearedActions((prev) => new Set(prev).add(actionId));
  }, []);

  // Auto-execute tools
  useEffect(() => {
    if (!agentOptions) return;

    parsedMessages.forEach((parsedMsg) => {
      const { parsed, id, role } = parsedMsg;

      parsed.actions.forEach((action: ToolAction, idx: number) => {
        const actionId = `${id}-action-${idx}`;

        // Skip if already clicked
        if (clickedActions.has(actionId)) return;

        // Check if this tool should auto-execute
        let shouldAutoExecute = false;

        switch (action.type) {
          case "read_file":
            shouldAutoExecute = agentOptions.read_file?.autoRead === "always";
            break;
          case "write_to_file":
            shouldAutoExecute =
              agentOptions.write_to_file?.autoRead === "always";
            break;
          case "replace_in_file":
            shouldAutoExecute =
              agentOptions.replace_in_file?.autoRead === "always";
            break;
          case "list_files":
            shouldAutoExecute = agentOptions.list_files?.autoRead === "always";
            break;
          case "search_files":
            shouldAutoExecute =
              agentOptions.search_files?.autoRead === "always";
            break;
          case "execute_command":
            shouldAutoExecute = agentOptions.run_command?.autoRead === "always";
            break;
        }

        // Auto-execute if needed
        if (shouldAutoExecute) {
          const messageObj: Message = {
            id,
            role,
            content: parsedMsg.content,
            timestamp: parsedMsg.timestamp,
            isFirstRequest: parsedMsg.isFirstRequest,
            isToolRequest: parsedMsg.isToolRequest,
            systemPrompt: parsedMsg.systemPrompt,
            contextSize: parsedMsg.contextSize,
          };
          handleToolClick(action, messageObj, idx);
        }
      });
    });
  }, [parsedMessages, agentOptions, clickedActions, handleToolClick]);

  return {
    clickedActions,
    handleToolClick,
    failedActions,
    clearedActions,
    handleActionClear,
  };
};
