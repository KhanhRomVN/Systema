import React from "react";
import { getProviderIconPath } from "../../utils/fileIconMapper";

interface TabInfo {
  tabId: number;
  containerName: string;
  title: string;
  url?: string;
  status: "free" | "busy" | "sleep";
  canAccept: boolean;
  requestCount: number;
  folderPath?: string | null;
  conversationId?: string | null;
  provider?:
    | "deepseek"
    | "chatgpt"
    | "gemini"
    | "grok"
    | "claude"
    | "claude-cli";
}

import { Message } from "./ChatBody/types";

interface TaskProgressItem {
  text: string;
  completed: boolean;
}

interface ChatHeaderProps {
  selectedTab: TabInfo;
  onBack: () => void;
  onClearChat: () => void;
  isLoadingConversation?: boolean;
  firstRequestMessage?: Message;
  contextUsage?: {
    prompt: number;
    completion: number;
    total: number;
  };
  allTaskProgress?: TaskProgressItem[];
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  selectedTab,
  firstRequestMessage,
  allTaskProgress,
  onClearChat,
  contextUsage,
}) => {
  const [initialRequestCollapsed, setInitialRequestCollapsed] =
    React.useState(true);
  const [taskProgressCollapsed, setTaskProgressCollapsed] =
    React.useState(true);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const completedTasks =
    allTaskProgress?.filter((t) => t.completed).length || 0;
  const totalTasks = allTaskProgress?.length || 0;
  const currentTask = allTaskProgress?.find((t) => !t.completed);
  const getProviderInfo = (
    provider?:
      | "deepseek"
      | "chatgpt"
      | "gemini"
      | "grok"
      | "claude"
      | "claude-cli"
  ): { name: string; emoji: string; bgColor: string; textColor: string } => {
    switch (provider) {
      case "deepseek":
        return {
          name: "DeepSeek",
          emoji: "🤖",
          bgColor: "rgba(59, 130, 246, 0.1)",
          textColor: "#3b82f6",
        };
      case "chatgpt":
        return {
          name: "ChatGPT",
          emoji: "💬",
          bgColor: "rgba(16, 185, 129, 0.1)",
          textColor: "#10b981",
        };
      case "claude":
        return {
          name: "Claude",
          emoji: "🧠",
          bgColor: "rgba(245, 158, 11, 0.1)",
          textColor: "#f59e0b",
        };
      case "claude-cli":
        return {
          name: "Claude(CLI)",
          emoji: "🔧",
          bgColor: "rgba(139, 92, 246, 0.1)",
          textColor: "#8b5cf6",
        };
      case "gemini":
        return {
          name: "Gemini",
          emoji: "✨",
          bgColor: "rgba(168, 85, 247, 0.1)",
          textColor: "#a855f7",
        };
      case "grok":
        return {
          name: "Grok",
          emoji: "⚡",
          bgColor: "rgba(249, 115, 22, 0.1)",
          textColor: "#f97316",
        };
      default:
        return {
          name: "Unknown",
          emoji: "❓",
          bgColor: "rgba(107, 114, 128, 0.1)",
          textColor: "#6b7280",
        };
    }
  };

  const providerInfo = getProviderInfo(selectedTab.provider);

  const getDisplayContent = (content: string) => {
    if (selectedTab.provider === "claude-cli") {
      const match = content.match(/User Request:\s*(.*)/s);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return content;
  };

  const displayContent = firstRequestMessage
    ? getDisplayContent(firstRequestMessage.content)
    : "";

  // Helper to format large numbers
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + "k";
    }
    return num.toString();
  };

  return (
    <>
      {/* Display Box - First Request + Task Progress */}
      {(totalTasks > 0 ||
        firstRequestMessage ||
        selectedTab.provider === "claude-cli") && (
        <div
          data-display-header="true"
          style={{
            backgroundColor: "var(--primary-bg)",
            boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
          }}
        >
          {/* First Request Section */}
          {(firstRequestMessage || selectedTab.provider === "claude-cli") && (
            <div
              style={{
                borderBottom: "1px solid var(--border-color)",
                backgroundColor: "var(--primary-bg)",
                padding: "var(--spacing-md)",
                cursor: firstRequestMessage ? "pointer" : "default",
              }}
              onClick={() =>
                firstRequestMessage &&
                setInitialRequestCollapsed(!initialRequestCollapsed)
              }
            >
              {/* Initial Request Display with Header */}
              <div>
                {/* Header Icons + Badges - Positioned at top */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--spacing-sm)",
                    marginBottom: firstRequestMessage
                      ? "var(--spacing-sm)"
                      : "0",
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Icons Group */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--spacing-xs)",
                    }}
                  >
                    {/* Toggle Arrow */}
                    {firstRequestMessage && (
                      <div
                        style={{
                          cursor: "pointer",
                          padding: "2px",
                          transition: "opacity 0.2s",
                          color: "var(--primary-text)",
                          opacity: 0.7,
                        }}
                        onClick={() =>
                          setInitialRequestCollapsed(!initialRequestCollapsed)
                        }
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = "1";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = "0.7";
                        }}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          style={{
                            transition: "transform 0.2s",
                            transform: initialRequestCollapsed
                              ? "rotate(0deg)"
                              : "rotate(180deg)",
                          }}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    )}
                    {/* Copy */}
                    {firstRequestMessage && (
                      <div
                        style={{
                          cursor: "pointer",
                          padding: "2px",
                          transition: "opacity 0.2s",
                          color: "var(--primary-text)",
                          opacity: 0.7,
                        }}
                        onClick={() => copyToClipboard(displayContent)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = "1";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = "0.7";
                        }}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <rect
                            x="9"
                            y="9"
                            width="13"
                            height="13"
                            rx="2"
                            ry="2"
                          />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                      </div>
                    )}
                    {/* New Conversation (Plus) - Only for Claude CLI */}
                    {selectedTab.provider === "claude-cli" && (
                      <div
                        style={{
                          cursor: "pointer",
                          padding: "2px",
                          transition: "opacity 0.2s",
                          color: "var(--primary-text)",
                          opacity: 0.7,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onClearChat();
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.opacity = "1";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.opacity = "0.7";
                        }}
                        title="New Conversation"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="12" y1="5" x2="12" y2="19"></line>
                          <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Badges Group */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--spacing-xs)",
                      flex: 1,
                    }}
                  >
                    {/* Provider Badge */}
                    <span
                      style={{
                        fontSize: "var(--font-size-xs)",
                        fontWeight: 600,
                        color: providerInfo.textColor,
                        backgroundColor: providerInfo.bgColor,
                        padding: "4px 8px",
                        borderRadius: "var(--border-radius)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <img
                        src={getProviderIconPath(
                          selectedTab.provider || "openai"
                        )}
                        alt={providerInfo.name}
                        style={{ width: "14px", height: "14px" }}
                      />
                      {providerInfo.name}
                    </span>

                    {/* Container Badge */}
                    {selectedTab.containerName && (
                      <span
                        style={{
                          fontSize: "var(--font-size-xs)",
                          fontWeight: 500,
                          color: "var(--primary-text)",
                          backgroundColor: "var(--hover-bg)",
                          padding: "4px 8px",
                          borderRadius: "var(--border-radius)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          maxWidth: "200px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={selectedTab.containerName}
                      >
                        🗂️ {selectedTab.containerName}
                      </span>
                    )}

                    {/* Conversation Title Badge */}
                    {selectedTab.title && (
                      <span
                        style={{
                          fontSize: "var(--font-size-xs)",
                          fontWeight: 500,
                          color: "var(--primary-text)",
                          backgroundColor: "var(--hover-bg)",
                          padding: "4px 8px",
                          borderRadius: "var(--border-radius)",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                          maxWidth: "150px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={selectedTab.title}
                      >
                        📝 {selectedTab.title}
                      </span>
                    )}
                  </div>
                </div>

                {/* Message Content */}
                {firstRequestMessage && (
                  <div
                    style={{
                      fontSize: "var(--font-size-base)",
                      color: "var(--primary-text)",
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                      marginBottom: "var(--spacing-sm)",
                      ...(initialRequestCollapsed
                        ? {
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            maxHeight: "3.2em",
                            textOverflow: "ellipsis",
                          }
                        : {
                            overflowY: "auto",
                            display: "block",
                            maxHeight: "40em",
                          }),
                    }}
                  >
                    {displayContent}
                  </div>
                )}

                {/* Global Context Usage Progress Bar */}
                {contextUsage && contextUsage.total > 0 && (
                  <div style={{ marginTop: "8px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "4px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "var(--font-size-xs)",
                          color: "var(--primary-text)",
                          fontWeight: 500,
                        }}
                      ></span>
                      <span
                        style={{
                          fontSize: "var(--font-size-xs)",
                          color: "var(--secondary-text)",
                        }}
                      >
                        {formatNumber(contextUsage.total)} / 500k tokens
                      </span>
                    </div>
                    <div
                      style={{
                        width: "100%",
                        height: "6px",
                        backgroundColor: "var(--border-color)",
                        borderRadius: "3px",
                        overflow: "hidden",
                      }}
                      title={`${contextUsage.total.toLocaleString()} tokens used`}
                    >
                      <div
                        style={{
                          width: `${Math.min(
                            (contextUsage.total / 500000) * 100,
                            100
                          )}%`,
                          height: "100%",
                          backgroundColor:
                            contextUsage.total > 450000
                              ? "var(--error-color)" // Red if near limit
                              : contextUsage.total > 350000
                              ? "var(--warning-color)" // Yellow if getting high
                              : "var(--accent-text)", // Blue/Accent normally
                          transition:
                            "width 0.3s ease, background-color 0.3s ease",
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Task Progress Section */}
          {totalTasks > 0 && (
            <div
              style={{
                borderBottom: "1px solid var(--border-color)",
                padding: "var(--spacing-md) var(--spacing-lg)",
                cursor: "pointer",
              }}
              onClick={() => setTaskProgressCollapsed(!taskProgressCollapsed)}
            >
              {/* Header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: taskProgressCollapsed ? 0 : "var(--spacing-sm)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--spacing-xs)",
                  }}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--accent-text)"
                    strokeWidth="2"
                  >
                    <rect x="3" y="3" width="7" height="7" />
                    <rect x="14" y="3" width="7" height="7" />
                    <rect x="14" y="14" width="7" height="7" />
                    <rect x="3" y="14" width="7" height="7" />
                  </svg>
                  {taskProgressCollapsed && currentTask && (
                    <span
                      style={{
                        fontSize: "var(--font-size-xs)",
                        color: "var(--primary-text)",
                        marginLeft: "var(--spacing-sm)",
                      }}
                    >
                      {currentTask.text.length > 50
                        ? currentTask.text.substring(0, 50) + "..."
                        : currentTask.text}
                    </span>
                  )}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--spacing-sm)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "var(--font-size-xs)",
                      color: "var(--secondary-text)",
                    }}
                  >
                    {completedTasks}/{totalTasks}
                  </span>
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{
                      transition: "transform 0.2s",
                      transform: taskProgressCollapsed
                        ? "rotate(0deg)"
                        : "rotate(180deg)",
                    }}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </div>

              {/* Task List */}
              {!taskProgressCollapsed && (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "var(--spacing-xs)",
                    maxHeight: "120px",
                    overflowY: "auto",
                  }}
                >
                  {allTaskProgress?.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--spacing-xs)",
                        fontSize: "var(--font-size-sm)",
                        color: "var(--primary-text)",
                      }}
                    >
                      {item.completed ? (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--success-color)"
                          strokeWidth="2"
                        >
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      ) : (
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="var(--secondary-text)"
                          strokeWidth="2"
                        >
                          <rect
                            x="3"
                            y="3"
                            width="18"
                            height="18"
                            rx="2"
                            ry="2"
                          />
                        </svg>
                      )}
                      <span
                        style={{
                          textDecoration: item.completed
                            ? "line-through"
                            : "none",
                          opacity: item.completed ? 0.7 : 1,
                        }}
                      >
                        {item.text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default ChatHeader;
