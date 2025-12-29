import React from "react";
import { ConversationItem } from "./types";
import { getProviderIconPath } from "../../utils/fileIconMapper";

interface HistoryCardProps {
  item: ConversationItem;
  onClick: () => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
  formatDate: (timestamp: number) => string;
}

const HistoryCard: React.FC<HistoryCardProps> = ({
  item,
  onClick,
  onDelete,
  formatDate,
}) => {
  const formatSize = (bytes?: number) => {
    if (!bytes) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  const getProviderInfo = (provider?: string) => {
    switch (provider) {
      case "deepseek":
        return { name: "DeepSeek", color: "#1a73e8" };
      case "chatgpt":
        return { name: "ChatGPT", color: "#10a37f" };
      case "gemini":
        return { name: "Gemini", color: "#8e44ad" };
      case "grok":
        return { name: "Grok", color: "#e74c3c" };
      case "claude":
        return { name: "Claude", color: "#d97706" };
      default:
        return { name: "AI", color: "#6b7280" };
    }
  };

  const providerInfo = getProviderInfo(item.provider);

  return (
    <div
      style={{
        padding: "var(--spacing-md)",
        backgroundColor: "var(--secondary-bg)",
        border: "1px solid var(--border-color)",
        borderRadius: "var(--border-radius-lg)",
        cursor: "pointer",
        transition: "all 0.2s",
        position: "relative",
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = "var(--hover-bg)";
        e.currentTarget.style.borderColor = "var(--accent-text)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = "var(--secondary-bg)";
        e.currentTarget.style.borderColor = "var(--border-color)";
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: "var(--spacing-xs)",
        }}
      >
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: "var(--font-size-md)",
              color: "var(--primary-text)",
              fontWeight: 500,
              marginBottom: "var(--spacing-xs)",
              lineHeight: 1.4,
            }}
          >
            {item.title}
          </div>
          <div
            style={{
              fontSize: "var(--font-size-sm)",
              color: "var(--secondary-text)",
              lineHeight: 1.5,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {item.preview}
          </div>
          {/* Provider and ContainerName Badges */}
          <div
            style={{
              display: "flex",
              gap: "var(--spacing-xs)",
              marginTop: "var(--spacing-xs)",
              flexWrap: "wrap",
            }}
          >
            {item.provider && (
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: providerInfo.color,
                  backgroundColor: `${providerInfo.color}1a`, // 10% opacity
                  padding: "2px 8px",
                  borderRadius: "var(--border-radius)",
                  fontWeight: 500,
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                }}
              >
                <img
                  src={getProviderIconPath(item.provider)}
                  alt={item.provider}
                  style={{ width: "12px", height: "12px" }}
                />
                {providerInfo.name}
              </span>
            )}
            {item.containerName && (
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--primary-text)",
                  backgroundColor: "var(--hover-bg)",
                  padding: "2px 8px",
                  borderRadius: "var(--border-radius)",
                  border: "1px solid var(--border-color)",
                }}
              >
                📦 {item.containerName}
              </span>
            )}
          </div>
        </div>
        <div
          onClick={(e) => onDelete(item.id, e)}
          style={{
            padding: "var(--spacing-xs)",
            borderRadius: "var(--border-radius)",
            cursor: "pointer",
            transition: "all 0.2s",
            opacity: 0.5,
            color: "var(--secondary-text)",
          }}
          onMouseEnter={(e) => {
            // Updated: only icon color changes, no background
            // e.currentTarget.style.backgroundColor = "var(--error-color)";
            e.currentTarget.style.color = "var(--error-color)";
            e.currentTarget.style.opacity = "1";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "var(--secondary-text)";
            e.currentTarget.style.opacity = "0.5";
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          gap: "var(--spacing-md)",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--secondary-text)",
          }}
        >
          📅 {formatDate(item.createdAt)}
        </span>
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--secondary-text)",
          }}
        >
          🕐 {formatDate(item.lastModified)}
        </span>
        <span
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--secondary-text)",
          }}
        >
          💬 {item.messageCount} msgs
        </span>
        {item.size !== undefined && (
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--secondary-text)",
            }}
          >
            💾 {formatSize(item.size)}
          </span>
        )}
        {item.folderPath && (
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--accent-text)",
              padding: "2px 6px",
              backgroundColor: "var(--hover-bg)",
              borderRadius: "var(--border-radius)",
            }}
          >
            📁 {item.folderPath.split("/").pop()}
          </span>
        )}
      </div>
    </div>
  );
};

export default HistoryCard;
