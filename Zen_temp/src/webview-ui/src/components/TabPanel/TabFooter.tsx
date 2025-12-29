import React, { useState } from "react";
import { useModels } from "../../hooks/useModels";

interface TabFooterProps {
  port: number;
  wsConnected: boolean;
  onModelChange?: (modelIds: string[]) => void; // 🆕 Callback với array
}

const TabFooter: React.FC<TabFooterProps> = ({
  port,
  wsConnected,
  onModelChange,
}) => {
  const { models: availableModels } = useModels();
  const [selectedModels, setSelectedModels] = useState<string[]>([
    "deepseek-web",
  ]); // 🆕 Multi-select
  const [copiedPort, setCopiedPort] = useState(false);

  /* Removed debug useEffect */

  const getProviderConfig = (provider: string) => {
    const configs = {
      deepseek: { emoji: "🤖", color: "#3b82f6", name: "DeepSeek" },
      chatgpt: { emoji: "💬", color: "#10b981", name: "ChatGPT" },
      grok: { emoji: "⚡", color: "#f97316", name: "Grok" },
      claude: { emoji: "🧠", color: "#f59e0b", name: "Claude" },
      "claude-cli": { emoji: "🔧", color: "#8b5cf6", name: "Claude(CLI)" },
      gemini: { emoji: "✨", color: "#8b5cf6", name: "Gemini" },
    };
    return (
      configs[provider as keyof typeof configs] || {
        emoji: "🤖",
        color: "#6b7280",
        name: provider,
      }
    );
  };

  const PortToClipboard = () => {
    const text = "localhost:" + port;
    navigator.clipboard.writeText(text).then(
      () => {
        setCopiedPort(true);
        setTimeout(() => setCopiedPort(false), 2000);
      },
      (err) => {
        console.error(`[TabFooter] ❌ Failed to copy:`, err);
      }
    );
  };

  const handleModelToggle = (modelId: string) => {
    setSelectedModels((prev) => {
      const newSelection = prev.includes(modelId)
        ? prev.filter((id) => id !== modelId) // Bỏ chọn
        : [...prev, modelId]; // Thêm chọn

      // Đảm bảo luôn có ít nhất 1 model được chọn
      if (newSelection.length === 0) {
        return prev;
      }

      onModelChange?.(newSelection);
      return newSelection;
    });
  };

  const CopyIcon = () => (
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
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );

  const CheckIcon = () => (
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
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  const RefreshIcon = () => (
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
      <path d="M23 4v6h-6" />
      <path d="M1 20v-6h6" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );

  const handleRefresh = () => {
    const vscodeApi = (window as any).vscodeApi;
    if (vscodeApi) {
      vscodeApi.postMessage({ command: "restartServer" });
    } else {
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        width: "100%",
        backgroundColor: "var(--secondary-bg)",
        borderTop: "1px solid var(--border-color)",
        zIndex: 100,
      }}
    >
      {/* Model Selection Row - Wrap Layout */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap", // 🆕 Wrap xuống dòng
          gap: "6px",
          padding: "8px 12px",
          alignItems: "center",
          justifyContent: "center", // 🆕 Center các button
        }}
      >
        {availableModels.map((model) => {
          const config = getProviderConfig(model.provider);
          const isSelected = selectedModels.includes(model.id); // 🆕 Check multi-select

          return (
            <button
              key={model.id}
              onClick={() => handleModelToggle(model.id)} // 🆕 Toggle thay vì set
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "8px",
                border: isSelected
                  ? `2px solid ${config.color}`
                  : "2px solid transparent",
                backgroundColor: isSelected
                  ? `${config.color}15`
                  : "var(--tertiary-bg)",
                color: isSelected ? config.color : "var(--primary-text)",
                fontSize: "13px",
                fontWeight: isSelected ? 600 : 500,
                cursor: "pointer",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap",
                userSelect: "none",
                outline: "none",
              }}
              onMouseEnter={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = "var(--hover-bg)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isSelected) {
                  e.currentTarget.style.backgroundColor = "var(--tertiary-bg)";
                  e.currentTarget.style.transform = "translateY(0)";
                }
              }}
            >
              <span style={{ fontSize: "14px" }}>{config.emoji}</span>
              <span>{config.name}</span>
              {/* 🆕 Badge hiển thị số lượng selected */}
              {isSelected && selectedModels.length > 1 && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    backgroundColor: config.color,
                    color: "white",
                    fontSize: "10px",
                    fontWeight: 700,
                    marginLeft: "2px",
                  }}
                >
                  {selectedModels.indexOf(model.id) + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Port Info Row */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "6px 12px",
          backgroundColor: "var(--primary-bg)",
          borderTop: "1px solid var(--border-color)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              padding: "4px 10px",
              borderRadius: "6px",
              transition: "all 0.2s",
              backgroundColor: copiedPort ? "#10b98115" : "transparent",
            }}
            onClick={PortToClipboard}
            onMouseEnter={(e) => {
              if (!copiedPort) {
                e.currentTarget.style.backgroundColor = "var(--hover-bg)";
              }
            }}
            onMouseLeave={(e) => {
              if (!copiedPort) {
                e.currentTarget.style.backgroundColor = "transparent";
              }
            }}
          >
            {copiedPort ? <CheckIcon /> : <CopyIcon />}
            <span
              style={{
                fontSize: "12px",
                color: wsConnected ? "#10b981" : "var(--secondary-text)",
                fontWeight: wsConnected ? 600 : 400,
                fontFamily: "monospace",
              }}
            >
              localhost:{port || 3000}
            </span>
            {copiedPort && (
              <span
                style={{
                  fontSize: "11px",
                  color: "#10b981",
                  fontWeight: 500,
                }}
              >
                Copied!
              </span>
            )}
          </div>

          {/* Refresh Button */}
          <div
            onClick={handleRefresh}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "6px",
              color: "var(--secondary-text)",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--hover-bg)";
              e.currentTarget.style.color = "var(--primary-text)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "var(--secondary-text)";
            }}
            title="Refresh connection"
          >
            <RefreshIcon />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabFooter;
