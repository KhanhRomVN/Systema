import React, { useState, useRef, useEffect } from "react";
import AgentOptionsDrawer, {
  AgentOptions,
} from "./components/AgentOptionsDrawer";
import ProjectStructureDrawer from "./components/ProjectStructureDrawer";
import ProjectContextModal from "./ProjectContextModal";

import { ChatFooterProps } from "./types";

interface ExtendedChatFooterProps extends ChatFooterProps {
  executionState?: {
    total: number;
    completed: number;
    status: "idle" | "running" | "error" | "done";
  };
  onExecutePendingBatch?: () => void;
  onExecuteAll?: () => void;
  isAutoExecutingAll?: boolean;
  hasPendingActions?: boolean;
}

// Hooks
import { useWorkspaceData } from "./hooks/useWorkspaceData";
import { useFileHandling } from "./hooks/useFileHandling";
import { useMentionSystem } from "./hooks/useMentionSystem";

// Components
import FilesPreviews from "./components/FilesPreviews";
import MentionDropdowns from "./components/MentionDropdowns";
import MessageInput from "./components/MessageInput";

const ChatFooter: React.FC<ExtendedChatFooterProps> = ({
  onSendMessage,
  wsConnected, // eslint-disable-line @typescript-eslint/no-unused-vars
  onWsMessage, // eslint-disable-line @typescript-eslint/no-unused-vars
  wsInstance,
  isHistoryMode = false,
  agentOptions,
  onAgentOptionsChange,
  messages,
  executionState,
  onExecutePendingBatch,
  onExecuteAll,
  isAutoExecutingAll,
  hasPendingActions,
  lastCheckpointId,
}: ExtendedChatFooterProps) => {
  const [message, setMessage] = useState("");
  const [showOptionsDrawer, setShowOptionsDrawer] = useState(false);
  const [showProjectStructureDrawer, setShowProjectStructureDrawer] =
    useState(false);
  const [showChangesDropdown, setShowChangesDropdown] = useState(false);
  const [showProjectContextModal, setShowProjectContextModal] = useState(false);
  const [projectContext, setProjectContext] = useState<any>(null); // Use proper type if available

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionDropdownRef = useRef<HTMLDivElement>(null);

  // Load Project Context
  useEffect(() => {
    const vscodeApi = (window as any).vscodeApi;
    if (vscodeApi) {
      vscodeApi.postMessage({ command: "loadProjectContext" });
    }

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      if (message.command === "projectContextResponse") {
        setProjectContext(message.context);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const handleSaveProjectContext = (context: any) => {
    const vscodeApi = (window as any).vscodeApi;
    if (vscodeApi) {
      // Optimistic update
      setProjectContext(context);
      vscodeApi.postMessage({
        command: "saveProjectContext",
        context,
      });
      setShowProjectContextModal(false);
    }
  };

  // Workspace Data Hook
  const {
    availableFiles,
    availableFolders,
    blacklist,
    availableRules,
    getGitCommitMessage,
  } = useWorkspaceData();

  // Mention System Hook
  const {
    showAtMenu,
    setShowAtMenu,
    showMentionDropdown,
    setShowMentionDropdown,
    mentionType,
    setMentionType, // Exposed for external file input closing dropdown
    attachedItems,
    checkMentions,
    handleMentionOptionSelect,
    handleWorkspaceItemSelect,
    handleRuleSelect,
    removeAttachedItem,
    clearAttachedItems,
    addAttachedItem,
  } = useMentionSystem({
    message,
    setMessage,
    textareaRef,
    availableFiles,
    availableFolders,
    onRequestWorkspaceFiles: () => {
      const vscodeApi = (window as any).vscodeApi;
      if (vscodeApi) {
        vscodeApi.postMessage({ command: "getWorkspaceFiles" });
      }
    },
    onRequestWorkspaceFolders: () => {
      const vscodeApi = (window as any).vscodeApi;
      if (vscodeApi) {
        vscodeApi.postMessage({ command: "getWorkspaceFolders" });
      }
    },
  });

  // File Handling Hook
  const {
    uploadedFiles,
    externalFiles, // eslint-disable-line @typescript-eslint/no-unused-vars
    fileInputRef,
    externalFileInputRef,
    handlePaste,
    handleFileSelect,
    handleFileInputChange,
    removeFile,
    handleExternalFileSelect,
    handleExternalFileInputChange,
    handleDragOver,
    handleDrop,
    clearFiles,
  } = useFileHandling({
    onAddAttachedItem: (item) => {
      addAttachedItem(item);
      // If adding external file from menu, we should close the menu
      setShowAtMenu(false);
    },
  });

  // Agent Options Helper
  const setOptions = (
    newOptions: AgentOptions | ((prev: AgentOptions) => AgentOptions)
  ) => {
    const updatedOptions =
      typeof newOptions === "function" ? newOptions(agentOptions) : newOptions;
    onAgentOptionsChange(updatedOptions);
    localStorage.setItem("zen-agent-options", JSON.stringify(updatedOptions));
  };

  // WebSocket Ref Management
  const wsRef = useRef<WebSocket | null>(null);
  useEffect(() => {
    wsRef.current = wsInstance || null;
  }, [wsInstance]);

  // Handle Send Message
  const handleSend = () => {
    if (message.trim() || uploadedFiles.length > 0) {
      // Send permissions update to extension
      const vscodeApi = (window as any).vscodeApi;
      if (vscodeApi) {
        vscodeApi.postMessage({
          command: "updateAgentPermissions",
          permissions: agentOptions,
        });
      }

      onSendMessage(message, uploadedFiles, agentOptions);
      setMessage("");
      clearFiles();
      clearAttachedItems();
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  // Handle Git Commit Generation
  const handleGitCommit = async () => {
    if (message.trim() !== "") return;
    const prompt = await getGitCommitMessage();
    if (prompt) {
      setMessage(prompt);
      textareaRef.current?.focus();
    }
  };

  // Handle Textarea Change
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setMessage(value);
    checkMentions(value);
  };

  // Auto-resize textarea when message changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        240
      )}px`;
    }
  }, [message]);

  // Handle Open Image
  const handleOpenImage = (file: any) => {
    const vscodeApi = (window as any).vscodeApi;
    if (vscodeApi) {
      vscodeApi.postMessage({
        command: "openTempImage",
        content: file.content,
        filename: file.name,
      });
    }
  };

  // Handle Click Outside (for dropdowns)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (showAtMenu) {
        const menu = document.querySelector('[data-at-menu="true"]');
        if (menu && !menu.contains(target) && target !== textareaRef.current) {
          setShowAtMenu(false);
        }
      }

      if (showMentionDropdown) {
        const dropdown = document.querySelector(
          '[data-mention-dropdown="true"]'
        );
        if (dropdown && !dropdown.contains(target)) {
          setShowMentionDropdown(false);
          setMentionType(null);
        }
      }

      if (showOptionsDrawer) {
        const drawer = document.querySelector('[data-options-drawer="true"]');
        if (drawer && !drawer.contains(target)) {
          setShowOptionsDrawer(false);
        }
      }
    };

    if (showAtMenu || showOptionsDrawer || showMentionDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [
    showAtMenu,
    showOptionsDrawer,
    showMentionDropdown,
    setShowAtMenu,
    setShowMentionDropdown,
    setMentionType,
  ]);

  // Listen for WebSocket messages (sendWebSocketMessage)
  useEffect(() => {
    const handlePostMessage = (event: MessageEvent) => {
      if (event.data.command === "sendWebSocketMessage") {
        const messageData = event.data.data;
        const ws = wsRef.current;

        if (ws && ws.readyState === WebSocket.OPEN) {
          try {
            ws.send(JSON.stringify(messageData));
          } catch (error) {
            console.error(`[ChatFooter] ❌ Exception in ws.send():`, error);
          }
        } else {
          console.error(`[ChatFooter] ❌ WebSocket not ready`);
        }
      }
    };

    window.addEventListener("message", handlePostMessage);
    return () => {
      window.removeEventListener("message", handlePostMessage);
    };
  }, []);

  // Wrappers for Agent Options (kept here as they update agentOptions)
  const updateReadFileScope = (scope: "project" | "all") => {
    setOptions((prev) => ({
      ...prev,
      read_file: { ...prev.read_file, scope },
    }));
  };
  const updateReadFileAutoRead = (autoRead: "off" | "always" | "auto") => {
    setOptions((prev) => ({
      ...prev,
      read_file: { ...prev.read_file, autoRead },
    }));
  };
  const updateWriteToFileScope = (scope: "project" | "all") => {
    setOptions((prev) => ({
      ...prev,
      write_to_file: { ...prev.write_to_file, scope },
    }));
  };
  const updateWriteToFileAutoRead = (autoRead: "off" | "always" | "auto") => {
    setOptions((prev) => ({
      ...prev,
      write_to_file: { ...prev.write_to_file, autoRead },
    }));
  };
  const updateReplaceInFileScope = (scope: "project" | "all") => {
    setOptions((prev) => ({
      ...prev,
      replace_in_file: { ...prev.replace_in_file, scope },
    }));
  };
  const updateReplaceInFileAutoRead = (autoRead: "off" | "always" | "auto") => {
    setOptions((prev) => ({
      ...prev,
      replace_in_file: { ...prev.replace_in_file, autoRead },
    }));
  };
  const updateListFilesScope = (scope: "project" | "all") => {
    setOptions((prev) => ({
      ...prev,
      list_files: { ...prev.list_files, scope },
    }));
  };
  const updateListFilesAutoRead = (autoRead: "off" | "always" | "auto") => {
    setOptions((prev) => ({
      ...prev,
      list_files: { ...prev.list_files, autoRead },
    }));
  };
  const updateSearchFilesScope = (scope: "project" | "all") => {
    setOptions((prev) => ({
      ...prev,
      search_files: { ...prev.search_files, scope },
    }));
  };
  const updateSearchFilesAutoRead = (autoRead: "off" | "always" | "auto") => {
    setOptions((prev) => ({
      ...prev,
      search_files: { ...prev.search_files, autoRead },
    }));
  };
  const updateRunCommandAutoRead = (autoRead: "off" | "always" | "auto") => {
    setOptions((prev) => ({
      ...prev,
      run_command: { autoRead },
    }));
  };

  return (
    <div
      id="chat-footer-container"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "column",
        width: "100%",
        backgroundColor: "var(--secondary-bg)",
        zIndex: 100,
      }}
    >
      {/* Hidden Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={handleFileInputChange}
        accept="image/*,text/*"
      />
      <input
        ref={externalFileInputRef}
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={handleExternalFileInputChange}
        // accept={...} handled in useFileHandling logic if possible,
        // OR we pass accept prop to HiddenInput if we render it there.
        // But here we render it directly.
        // Let's import allow list? Or just rely on handleExternalFileInputChange validation.
        // It's better to show accept attribute for UX.
      />

      <FilesPreviews
        uploadedFiles={uploadedFiles}
        attachedItems={attachedItems}
        onRemoveFile={removeFile}
        onRemoveAttachedItem={removeAttachedItem}
        onOpenImage={handleOpenImage}
        onAttachedItemClick={(item) => {
          if (item.type === "file") {
            const vscodeApi = (window as any).vscodeApi;
            if (vscodeApi) {
              vscodeApi.postMessage({
                command: "openWorkspaceFile",
                path: item.path,
              });
            }
          }
        }}
      />

      <MessageInput
        message={message}
        setMessage={setMessage}
        isHistoryMode={isHistoryMode}
        uploadedFiles={uploadedFiles}
        textareaRef={textareaRef}
        handleTextareaChange={handleTextareaChange}
        handleKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
          }
        }}
        handlePaste={handlePaste}
        handleDragOver={handleDragOver}
        handleDrop={handleDrop}
        setShowAtMenu={setShowAtMenu}
        handleFileSelect={handleFileSelect}
        onOpenProjectStructure={() => {
          setShowProjectStructureDrawer(true);
          const vscodeApi = (window as any).vscodeApi;
          if (vscodeApi) {
            if (availableFiles.length === 0 || availableFolders.length === 0) {
              vscodeApi.postMessage({ command: "getWorkspaceFiles" });
              vscodeApi.postMessage({ command: "getWorkspaceFolders" });
            }
            vscodeApi.postMessage({
              command: "getProjectStructureBlacklist",
            });
          }
        }}
        showChangesDropdown={showChangesDropdown}
        setShowChangesDropdown={setShowChangesDropdown}
        messages={messages}
        handleGitCommit={handleGitCommit}
        setShowOptionsDrawer={setShowOptionsDrawer}
        handleSend={handleSend}
        hasProjectContext={!!projectContext}
        onOpenProjectContext={() => setShowProjectContextModal(true)}
        executionState={executionState}
        onExecutePendingBatch={onExecutePendingBatch}
        onExecuteAll={onExecuteAll}
        isAutoExecutingAll={isAutoExecutingAll}
        hasPendingActions={hasPendingActions}
        onCheckpoint={() => {
          // Trigger manual incremental checkpoint
          const vscodeApi = (window as any).vscodeApi;
          if (vscodeApi) {
            vscodeApi.postMessage({
              command: "createCheckpoint",
              type: "incremental",
              parentId: lastCheckpointId, // Pass parentId from props
            });
          }
        }}
      />

      <MentionDropdowns
        showAtMenu={showAtMenu}
        showMentionDropdown={showMentionDropdown}
        mentionType={mentionType}
        availableFiles={availableFiles}
        availableFolders={availableFolders}
        availableRules={availableRules}
        message={message}
        handleMentionOptionSelect={handleMentionOptionSelect}
        handleExternalFileSelect={handleExternalFileSelect}
        handleWorkspaceItemSelect={handleWorkspaceItemSelect}
        handleRuleSelect={handleRuleSelect}
        mentionDropdownRef={mentionDropdownRef}
      />

      <AgentOptionsDrawer
        isOpen={showOptionsDrawer}
        options={agentOptions}
        onClose={() => setShowOptionsDrawer(false)}
        onUpdateReadFileScope={updateReadFileScope}
        onUpdateReadFileAutoRead={updateReadFileAutoRead}
        onUpdateWriteToFileScope={updateWriteToFileScope}
        onUpdateWriteToFileAutoRead={updateWriteToFileAutoRead}
        onUpdateReplaceInFileScope={updateReplaceInFileScope}
        onUpdateReplaceInFileAutoRead={updateReplaceInFileAutoRead}
        onUpdateListFilesScope={updateListFilesScope}
        onUpdateListFilesAutoRead={updateListFilesAutoRead}
        onUpdateSearchFilesScope={updateSearchFilesScope}
        onUpdateSearchFilesAutoRead={updateSearchFilesAutoRead}
        onUpdateRunCommandAutoRead={updateRunCommandAutoRead}
      />

      <ProjectStructureDrawer
        isOpen={showProjectStructureDrawer}
        onClose={() => setShowProjectStructureDrawer(false)}
        files={availableFiles}
        folders={availableFolders}
        blacklist={blacklist}
        onToggleBlacklist={(path, isBlacklisted) => {
          const vscodeApi = (window as any).vscodeApi;
          if (vscodeApi) {
            vscodeApi.postMessage({
              command: "toggleProjectStructureBlacklist",
              path,
              isBlacklisted,
            });
          }
        }}
        onRefresh={() => {
          const vscodeApi = (window as any).vscodeApi;
          if (vscodeApi) {
            vscodeApi.postMessage({ command: "getWorkspaceFiles" });
            vscodeApi.postMessage({ command: "getWorkspaceFolders" });
            vscodeApi.postMessage({
              command: "getProjectStructureBlacklist",
            });
          }
        }}
      />

      <ProjectContextModal
        isOpen={showProjectContextModal}
        onClose={() => setShowProjectContextModal(false)}
        initialContext={projectContext}
        onSave={handleSaveProjectContext}
      />
    </div>
  );
};

export default ChatFooter;
