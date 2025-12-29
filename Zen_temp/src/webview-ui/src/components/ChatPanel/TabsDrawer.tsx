import React, { useEffect, useMemo, useState } from "react";
import TabList from "../TabPanel/TabList";
import { useModels } from "../../hooks/useModels";
import { fetchClaudeCliAccounts } from "../../services/claudeCliService";

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
  accountId?: string;
  email?: string;
  username?: string;
  reqCount?: number;
  inputTokens?: number;
  outputTokens?: number;
}

interface TabsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  tabs: TabInfo[];
  onTabSelect: (tab: TabInfo) => void;
  wsConnected: boolean;
  wsInstance?: WebSocket | null;
  activeTabId?: number;
}

const TabsDrawer: React.FC<TabsDrawerProps> = ({
  isOpen,
  onClose,
  tabs,
  onTabSelect,
  wsConnected,
  wsInstance,
  activeTabId,
}) => {
  const [selectedModels, setSelectedModels] = useState<string[]>([
    "deepseek-web",
  ]);
  const { models: availableModels } = useModels();

  // Filter tabs logic
  const filteredTabs = useMemo(() => {
    const filtered = tabs.filter((tab) => {
      // ALWAYS include active tab
      if (activeTabId !== undefined && tab.tabId === activeTabId) {
        return true;
      }

      if (selectedModels.length === 0) {
        return true;
      }

      const targetProviders = selectedModels
        .map((modelId) => {
          const modelData = availableModels.find((m) => m.id === modelId);
          return modelData?.provider;
        })
        .filter((p): p is NonNullable<typeof p> => p !== undefined);

      if (targetProviders.length === 0) {
        return true;
      }

      if (!tab.provider) {
        return true;
      }
      return targetProviders.includes(tab.provider);
    });

    return filtered;
  }, [tabs, selectedModels, availableModels, activeTabId]);

  // Claude CLI Accounts Logic
  const [claudeCliAccounts, setClaudeCliAccounts] = useState<TabInfo[]>([]);
  const [isLoadingClaudeAccounts, setIsLoadingClaudeAccounts] = useState(false);

  useEffect(() => {
    const hasClaudeCliSelected = selectedModels.includes("claude-cli");

    if (hasClaudeCliSelected) {
      setIsLoadingClaudeAccounts(true);
      fetchClaudeCliAccounts()
        .then((accounts) => {
          const accountTabs: TabInfo[] = accounts.map(
            (account: any, index: number) => ({
              tabId: -1 * (index + 1), // Negative IDs for CLI accounts to avoid conflict
              containerName: account.username || account.email,
              title: account.email,
              status: "free" as const,
              canAccept: true,
              requestCount: account.reqCount,
              folderPath: null,
              provider: "claude-cli" as const,
              accountId: account.id,
              email: account.email,
              username: account.username,
              reqCount: account.reqCount,
              inputTokens: account.inputTokens,
              outputTokens: account.outputTokens,
              conversationId: account.conversationId,
            })
          );
          setClaudeCliAccounts(accountTabs);
        })
        .catch((error) => {
          console.error(
            "[TabsDrawer] Failed to fetch Claude CLI accounts:",
            error
          );
          setClaudeCliAccounts([]);
        })
        .finally(() => {
          setIsLoadingClaudeAccounts(false);
        });
    } else {
      setClaudeCliAccounts([]);
    }
  }, [selectedModels]);

  const allTabs = useMemo(() => {
    let result = [...filteredTabs];
    const hasClaudeCliSelected = selectedModels.includes("claude-cli");
    if (hasClaudeCliSelected) {
      result = [...result, ...claudeCliAccounts];
    }

    // Sort: Active Tab First
    if (activeTabId !== undefined) {
      result.sort((a, b) => {
        if (a.tabId === activeTabId) return -1;
        if (b.tabId === activeTabId) return 1;
        return 0;
      });
    }

    return result;
  }, [filteredTabs, claudeCliAccounts, selectedModels, activeTabId]);

  // Auto-refresh logic
  //   useEffect(() => {
  //     if (!wsInstance || wsInstance.readyState !== WebSocket.OPEN) return;
  //     const intervalId = setInterval(() => {
  //       if (wsInstance.readyState === WebSocket.OPEN) {
  //         wsInstance.send(JSON.stringify({ type: "requestFocusedTabs", timestamp: Date.now() }));
  //       }
  //     }, 2000); // Less frequent refresh for drawer
  //     return () => clearInterval(intervalId);
  //   }, [wsInstance]);

  // Provider Badge Helper
  const getProviderConfig = (provider: string) => {
    const configs: any = {
      deepseek: { emoji: "🤖", color: "#3b82f6", name: "DeepSeek" },
      chatgpt: { emoji: "💬", color: "#10b981", name: "ChatGPT" },
      grok: { emoji: "⚡", color: "#f97316", name: "Grok" },
      claude: { emoji: "🧠", color: "#f59e0b", name: "Claude" },
      "claude-cli": { emoji: "🔧", color: "#8b5cf6", name: "Claude(CLI)" },
      gemini: { emoji: "✨", color: "#8b5cf6", name: "Gemini" },
    };
    return (
      configs[provider] || { emoji: "🤖", color: "#6b7280", name: provider }
    );
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        backgroundColor: "var(--vscode-editor-background)",
      }}
    >
      {/* Header/Filters */}
      <div
        style={{
          padding: "8px",
          borderBottom: "1px solid var(--vscode-widget-border)",
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
        }}
      >
        {availableModels.map((model) => {
          const config = getProviderConfig(model.provider);
          const isSelected = selectedModels.includes(model.id);
          return (
            <button
              key={model.id}
              onClick={() => {
                setSelectedModels((prev) =>
                  prev.includes(model.id)
                    ? prev.filter((id) => id !== model.id)
                    : [...prev, model.id]
                );
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                padding: "4px 8px",
                borderRadius: "4px",
                border: isSelected
                  ? `1px solid ${config.color}`
                  : "1px solid transparent",
                backgroundColor: isSelected
                  ? `${config.color}15`
                  : "var(--vscode-button-secondaryBackground)",
                color: isSelected ? config.color : "var(--vscode-foreground)",
                fontSize: "11px",
                cursor: "pointer",
              }}
            >
              <span>{config.emoji}</span>
              <span>{config.name}</span>
              {isSelected && selectedModels.length > 1 && (
                <span
                  style={{
                    marginLeft: "2px",
                    fontSize: "9px",
                    fontWeight: "bold",
                  }}
                >
                  {selectedModels.indexOf(model.id) + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab List */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: "200px" }}>
        {allTabs.length > 0 ? (
          <TabList
            tabs={allTabs}
            onTabSelect={onTabSelect}
            activeTabId={activeTabId}
          />
        ) : (
          <div style={{ padding: "20px", textAlign: "center", opacity: 0.6 }}>
            No tabs found for selected filters.
          </div>
        )}
      </div>
    </div>
  );
};

export default TabsDrawer;
