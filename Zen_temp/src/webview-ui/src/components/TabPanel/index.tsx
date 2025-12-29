import React, { useEffect } from "react";
import TabHeader from "./TabHeader";
import TabInput from "./TabFooter";
import TabList from "./TabList";
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
  // Claude CLI specific fields
  accountId?: string;
  email?: string;
  username?: string;
  reqCount?: number;
  inputTokens?: number;
  outputTokens?: number;
}

interface TabPanelProps {
  onTabSelect?: (tab: TabInfo) => void;
  tabs: TabInfo[];
  wsConnected: boolean;
  port: number;
  wsInstance?: WebSocket | null; // 🆕 Pass WebSocket instance
}

const TabPanel: React.FC<TabPanelProps> = ({
  onTabSelect,
  tabs,
  wsConnected,
  port,
  wsInstance, // 🆕 Receive WebSocket instance
}) => {
  // Hiển thị TabList khi WebSocket đã connected VÀ có tabs
  const shouldShowTabList = wsConnected && tabs.length > 0;

  // 🔍 DEBUG: Log tabs changes
  useEffect(() => {}, [tabs, wsConnected, shouldShowTabList]);

  // 🆕 State for model filtering (multi-select)
  const [selectedModels, setSelectedModels] = React.useState<string[]>([
    "deepseek-web",
  ]);
  const { models: availableModels } = useModels();

  // 🆕 Filter tabs based on selected models (multi-select)
  const filteredTabs = React.useMemo(() => {
    if (selectedModels.length === 0) {
      return tabs; // Show all tabs if no model selected
    }

    // Get target providers from selected models
    const targetProviders = selectedModels
      .map((modelId) => {
        const modelData = availableModels.find((m) => m.id === modelId);
        return modelData?.provider;
      })
      .filter((p): p is NonNullable<typeof p> => p !== undefined);

    if (targetProviders.length === 0) {
      return tabs;
    }

    // 🆕 Filter tabs by providers (OR logic)
    const filtered = tabs.filter((tab) => {
      // Nếu tab không có provider field → accept (backward compatibility)
      if (!tab.provider) {
        return true;
      }
      return targetProviders.includes(tab.provider);
    });

    return filtered;
  }, [tabs, selectedModels, availableModels]);

  // 🆕 Fetch Claude CLI accounts when claude-cli model is selected
  const [claudeCliAccounts, setClaudeCliAccounts] = React.useState<TabInfo[]>(
    []
  );
  const [isLoadingClaudeAccounts, setIsLoadingClaudeAccounts] =
    React.useState(false);

  useEffect(() => {
    const hasClaudeCliSelected = selectedModels.includes("claude-cli");

    if (hasClaudeCliSelected) {
      setIsLoadingClaudeAccounts(true);
      fetchClaudeCliAccounts()
        .then((accounts) => {
          // Transform accounts to TabInfo format
          const accountTabs: TabInfo[] = accounts.map((account, index) => ({
            tabId: index, // Use index as tabId for Claude CLI accounts
            containerName: account.username || account.email,
            title: account.email,
            status: "free" as const,
            canAccept: true,
            requestCount: account.reqCount,
            provider: "claude-cli" as const,
            accountId: account.id,
            email: account.email,
            username: account.username,
            reqCount: account.reqCount,
            inputTokens: account.inputTokens,
            outputTokens: account.outputTokens,
            conversationId: account.conversationId,
          }));
          setClaudeCliAccounts(accountTabs);
        })
        .catch((error) => {
          console.error(
            "[TabPanel] Failed to fetch Claude CLI accounts:",
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

  // 🆕 Combine browser tabs and Claude CLI accounts
  const allTabs = React.useMemo(() => {
    const hasClaudeCliSelected = selectedModels.includes("claude-cli");

    if (hasClaudeCliSelected) {
      // Combine filtered browser tabs with Claude CLI accounts
      return [...filteredTabs, ...claudeCliAccounts];
    }

    return filteredTabs;
  }, [filteredTabs, claudeCliAccounts, selectedModels]);

  // 🆕 Auto-refresh tab state every 0.5s when in TabPanel
  useEffect(() => {
    if (!wsInstance || wsInstance.readyState !== WebSocket.OPEN) {
      return;
    }

    const intervalId = setInterval(() => {
      if (wsInstance && wsInstance.readyState === WebSocket.OPEN) {
        wsInstance.send(
          JSON.stringify({
            type: "requestFocusedTabs",
            timestamp: Date.now(),
          })
        );
      }
    }, 500); // 0.5 seconds

    return () => {
      clearInterval(intervalId);
    };
  }, [wsInstance]);

  return (
    <div className="chat-panel">
      <TabHeader />
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          paddingBottom: "200px",
        }}
      >
        {allTabs.length > 0 && (
          <>
            <TabList
              tabs={allTabs}
              onTabSelect={(tab) => {
                if (onTabSelect) {
                  onTabSelect(tab);
                }
              }}
            />
          </>
        )}
        {tabs.length > 0 && allTabs.length === 0 && (
          <div
            style={{
              padding: "var(--spacing-xl)",
              textAlign: "center",
              color: "var(--secondary-text)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            <div
              style={{
                fontSize: "var(--font-size-xxl)",
                marginBottom: "var(--spacing-md)",
              }}
            >
              🔍
            </div>
            <p>No tabs available for selected models</p>
            <p
              style={{
                fontSize: "var(--font-size-xs)",
                marginTop: "var(--spacing-xs)",
              }}
            >
              Try selecting different models or open a new AI chat tab
            </p>
          </div>
        )}
        {tabs.length === 0 && (
          <div
            style={{
              padding: "var(--spacing-xl)",
              textAlign: "center",
              color: "var(--secondary-text)",
              fontSize: "var(--font-size-sm)",
            }}
          >
            <div
              style={{
                fontSize: "var(--font-size-xxl)",
                marginBottom: "var(--spacing-md)",
              }}
            >
              🌐
            </div>
            <p>No AI chat tabs detected CC</p>
            <p
              style={{
                fontSize: "var(--font-size-xs)",
                marginTop: "var(--spacing-xs)",
              }}
            >
              {wsConnected
                ? "Open DeepSeek, ChatGPT, Claude, Gemini, or Grok to get started"
                : "Connect to WebSocket first to see available tabs"}
            </p>
          </div>
        )}
      </div>
      <TabInput
        port={port}
        wsConnected={wsConnected}
        onModelChange={setSelectedModels}
      />
    </div>
  );
};

export default TabPanel;
