import React, { useState, useEffect, useRef, useCallback } from "react";
import TabPanel from "./components/TabPanel";
import ChatPanel from "./components/ChatPanel";
import HistoryPanel from "./components/HistoryPanel";
import SettingsPanel from "./components/SettingsPanel";
import "./styles/components/chat.css";
import { useVSCodeTheme } from "./hooks/useVSCodeTheme";
import { useZenTabConnection } from "./hooks/useZenTabConnection";

interface TabInfo {
  tabId: number;
  containerName: string;
  title: string;
  url?: string;
  status: "free" | "busy" | "sleep";
  canAccept: boolean;
  requestCount: number;
  folderPath?: string | null;
}

// CRITICAL: VS Code API chỉ có thể acquire một lần duy nhất
// 🔥 FIX: Dùng IIFE để đảm bảo chỉ chạy một lần duy nhất
const getVSCodeApi = (() => {
  let api: any = null;
  let initialized = false;

  return () => {
    if (initialized) {
      return api;
    }

    try {
      // 🔥 CHECK: Nếu đã có global instance, sử dụng luôn
      if ((window as any).vscodeApi) {
        api = (window as any).vscodeApi;
      } else {
        api = (window as any).acquireVsCodeApi();
        // 🆕 Expose globally for other components
        (window as any).vscodeApi = api;
      }
    } catch (error) {
      // VS Code API not available or already acquired
      console.error("[App] ❌ Could not acquire VS Code API:", error);
      // 🔥 Try to use existing instance if available
      if ((window as any).vscodeApi) {
        api = (window as any).vscodeApi;
      }
    }

    initialized = true;
    return api;
  };
})();

const vscodeApi = getVSCodeApi();

const App: React.FC = () => {
  useVSCodeTheme();

  // 🆕 Clear stale state on mount
  useEffect(() => {
    try {
      // Only clear if extension just started (check timestamp)
      const lastClear = sessionStorage.getItem("zen-last-clear");
      const now = Date.now();
      if (!lastClear || now - parseInt(lastClear) > 60000) {
        // 1 minute
        sessionStorage.clear();
        sessionStorage.setItem("zen-last-clear", now.toString());
      }
    } catch (error) {
      console.error("[App] Failed to clear stale state:", error);
    }
  }, []);

  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [selectedTab, setSelectedTab] = useState<TabInfo | null>(null);
  const selectedTabRef = useRef<TabInfo | null>(null); // 🆕 Ref for WebSocket closure
  const [previousPanel, setPreviousPanel] = useState<"tab" | "chat" | null>(
    null
  );
  const [wsConnected, setWsConnected] = useState(false);
  const [wsInstance, setWsInstance] = useState<WebSocket | null>(null);
  const [port, setPort] = useState(0);
  const [externalTabs, setExternalTabs] = useState<TabInfo[]>([]);
  const activePortRef = useRef<number>(0);
  const connectionTimestampRef = useRef<number>(0);

  const [reconnectId, setReconnectId] = useState(0); // 🆕 Force reconnect state

  // 🆕 Initialize storage API wrapper
  useEffect(() => {
    if (!vscodeApi) return;

    // Create storage API wrapper
    const storageApi = {
      async get(
        key: string,
        shared?: boolean
      ): Promise<{ key: string; value: string } | null> {
        return new Promise((resolve, reject) => {
          const requestId = `storage-get-${Date.now()}`;
          const timeout = setTimeout(
            () => reject(new Error("Storage get timeout")),
            5000
          );

          const handler = (event: MessageEvent) => {
            const message = event.data;
            if (
              message.command === "storageGetResponse" &&
              message.requestId === requestId
            ) {
              clearTimeout(timeout);
              window.removeEventListener("message", handler);
              if (message.error) {
                reject(new Error(message.error));
              } else {
                resolve(message.value ? { key, value: message.value } : null);
              }
            }
          };

          window.addEventListener("message", handler);
          vscodeApi.postMessage({
            command: "storageGet",
            requestId,
            key,
          });
        });
      },

      async set(
        key: string,
        value: string,
        shared?: boolean
      ): Promise<{ key: string; value: string } | null> {
        return new Promise((resolve, reject) => {
          const requestId = `storage-set-${Date.now()}`;
          const timeout = setTimeout(
            () => reject(new Error("Storage set timeout")),
            5000
          );

          const handler = (event: MessageEvent) => {
            const message = event.data;
            if (
              message.command === "storageSetResponse" &&
              message.requestId === requestId
            ) {
              clearTimeout(timeout);
              window.removeEventListener("message", handler);
              if (message.error) {
                reject(new Error(message.error));
              } else {
                resolve({ key, value });
              }
            }
          };

          window.addEventListener("message", handler);
          vscodeApi.postMessage({
            command: "storageSet",
            requestId,
            key,
            value,
          });
        });
      },

      async delete(
        key: string,
        shared?: boolean
      ): Promise<{ key: string; deleted: boolean } | null> {
        return new Promise((resolve, reject) => {
          const requestId = `storage-delete-${Date.now()}`;
          const timeout = setTimeout(
            () => reject(new Error("Storage delete timeout")),
            5000
          );

          const handler = (event: MessageEvent) => {
            const message = event.data;
            if (
              message.command === "storageDeleteResponse" &&
              message.requestId === requestId
            ) {
              clearTimeout(timeout);
              window.removeEventListener("message", handler);
              if (message.error) {
                reject(new Error(message.error));
              } else {
                resolve({ key, deleted: true });
              }
            }
          };

          window.addEventListener("message", handler);
          vscodeApi.postMessage({
            command: "storageDelete",
            requestId,
            key,
          });
        });
      },

      async list(
        prefix?: string,
        shared?: boolean
      ): Promise<{ keys: string[] } | null> {
        return new Promise((resolve, reject) => {
          const requestId = `storage-list-${Date.now()}`;
          const timeout = setTimeout(
            () => reject(new Error("Storage list timeout")),
            5000
          );

          const handler = (event: MessageEvent) => {
            const message = event.data;
            if (
              message.command === "storageListResponse" &&
              message.requestId === requestId
            ) {
              clearTimeout(timeout);
              window.removeEventListener("message", handler);
              if (message.error) {
                reject(new Error(message.error));
              } else {
                resolve({ keys: message.keys || [] });
              }
            }
          };

          window.addEventListener("message", handler);
          vscodeApi.postMessage({
            command: "storageList",
            requestId,
            prefix,
          });
        });
      },
    };

    // Expose to global scope
    (window as any).storage = storageApi;
  }, []);

  // 🆕 Lift tabs state lên App level để persist khi switch panels
  const { tabs, handleMessage, clearTabs } = useZenTabConnection();

  // 🔥 CRITICAL: Wrap handleMessage trong useRef để tránh dependency change
  const handleMessageRef = useRef(handleMessage);

  useEffect(() => {
    handleMessageRef.current = handleMessage;
  }, [handleMessage]);

  const handleTabSelect = (tab: TabInfo) => {
    setSelectedTab(tab);
    setShowHistory(false);
    setShowSettings(false);
  };

  const handleLoadConversation = useCallback(
    (conversationId: string, tabId: number, folderPath: string | null) => {
      // Find matching tab from current tabs
      const matchingTab = tabs.find((t) => t.tabId === tabId);

      if (matchingTab) {
        // Set selected tab with conversationId flag
        const newSelectedTab = {
          ...matchingTab,
          conversationId: conversationId,
        } as any;

        setSelectedTab(newSelectedTab);
        setShowHistory(false);
        setShowSettings(false);
        setPreviousPanel(null); // Reset previous panel
      } else {
        // Create virtual tab when real tab not found
        const virtualTab = {
          tabId: tabId,
          containerName: "Virtual Tab",
          title: "Loaded Conversation",
          status: "free" as const,
          canAccept: false, // Virtual tab cannot accept new requests
          requestCount: 0,
          folderPath: folderPath,
          conversationId: conversationId,
        };

        setSelectedTab(virtualTab as any);
        setShowHistory(false);
        setShowSettings(false);
        setPreviousPanel(null);
      }
    },
    [tabs]
  );

  const handleBackToTabPanel = () => {
    setSelectedTab(null);
  };

  // 🔥 CRITICAL: Quản lý WebSocket connection ở App level (persist across panels)
  useEffect(() => {
    if (port === 0) return;

    let ws: WebSocket | null = null;
    const currentPort = port;

    // Chỉ setup WebSocket nếu đây là port đang active
    if (activePortRef.current !== currentPort) {
      return;
    }

    // Reset wsConnected trước khi tạo connection mới
    setWsConnected(false);

    // Set timestamp cho connection mới
    const connectionTimestamp = Date.now();
    connectionTimestampRef.current = connectionTimestamp;

    try {
      ws = new WebSocket(`ws://localhost:${port}/ws?clientType=webview`);

      // Update wsInstance immediately
      setWsInstance(ws);

      ws.onopen = () => {};

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Ignore old messages
          if (data.timestamp && data.timestamp < connectionTimestamp) {
            return;
          }

          // 🆕 GLOBAL MESSAGE FILTERING BY FOLDER PATH
          const messagesRequiringFilter = [
            "promptResponse",
            "conversationPing",
            "conversationPong",
            "generationStarted",
          ];

          if (messagesRequiringFilter.includes(data.type)) {
            const messageFolderPath = data.folderPath || null;
            const currentFolderPath =
              (window as any).__zenWorkspaceFolderPath || null;

            // Normalize paths for comparison
            const normalize = (p: string | null) =>
              p ? p.trim().replace(/[\\/]+$/, "") : "";
            const normalizedMessagePath = normalize(messageFolderPath);
            const normalizedCurrentPath = normalize(currentFolderPath);

            // Reject if folderPath doesn't match
            if (normalizedMessagePath !== normalizedCurrentPath) {
              // Silently ignore messages from other workspaces
              return;
            }
          }

          // 🆕 Handle requestContext message
          if (data.type === "requestContext") {
            if ((window as any).__contextRequestHandler) {
              (window as any).__contextRequestHandler(data);
            }
            return;
          }

          if ((window as any).__chatPanelMessageHandler) {
            (window as any).__chatPanelMessageHandler(data);
          } else {
            handleMessageRef.current(data);
          }

          // Then handle system messages for App state
          if (data.type === "connection-established") {
            setWsConnected(true);

            // 🔥 FIX: Delay before requesting tabs to ensure ZenTab listeners are ready
            setTimeout(() => {
              if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(
                  JSON.stringify({
                    type: "requestFocusedTabs",
                    timestamp: Date.now(),
                  })
                );

                // 🆕 Retry after 2 seconds if no response
                setTimeout(() => {
                  if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(
                      JSON.stringify({
                        type: "requestFocusedTabs",
                        timestamp: Date.now(),
                      })
                    );
                  }
                }, 2000);
              }
            }, 500);
          } else if (data.type === "ping") {
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(
                JSON.stringify({
                  type: "pong",
                  timestamp: Date.now(),
                })
              );
            }
          } else if (data.type === "response" || data.type === "pong") {
            setWsConnected(true);
          } else if (data.type === "focusedTabsUpdate") {
            // 🔥 CRITICAL: Only process focusedTabsUpdate processing if in TabPanel
            if (selectedTabRef.current) {
              return;
            }

            if (Array.isArray(data.data)) {
              if (data.data.length === 0) {
                setWsConnected(false);
                setExternalTabs([]);
              } else {
                setWsConnected(true);
                // 🔥 CRITICAL: Save external tabs to state
                setExternalTabs(data.data);
              }
            }
          }
        } catch (error) {
          console.error(`[App] ❌ Error parsing message:`, error);
          console.error(`[App] 🔍 Raw data:`, event.data?.substring(0, 200));
        }
      };

      ws.onclose = (event) => {
        if (activePortRef.current === currentPort) {
          setWsConnected(false);
          setWsInstance(null);
          clearTabs(); // 🔥 FIX: Clear tabs immediately on disconnect
          // 🔥 FIX: Always clear selectedTab to force UI update even if closure is stale
          setSelectedTab((prev) => (prev ? null : null));
        }
      };

      ws.onerror = (error) => {
        console.error(
          `[App] ❌ WebSocket ERROR for port ${currentPort}:`,
          error
        );
        if (activePortRef.current === currentPort) {
          setWsConnected(false);
          clearTabs(); // 🔥 FIX: Clear tabs on error
        }
      };
    } catch (error) {
      console.error(`[App] ❌ Exception creating WebSocket:`, error);
      if (activePortRef.current === currentPort) {
        setWsConnected(false);
      }
    }

    return () => {
      if (ws) ws.close();
    };
  }, [port, reconnectId]);

  // Initialize port from VS Code
  useEffect(() => {
    if (!vscodeApi) {
      console.error(`[App] ❌ VS Code API not available`);
      return;
    }

    // 🔥 Send request immediately, global listener will handle response
    vscodeApi.postMessage({
      command: "getWorkspacePort",
    });
  }, []);

  useEffect(() => {
    // 🆕 Keep ref in sync for WebSocket closure
    selectedTabRef.current = selectedTab;

    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      switch (message.command) {
        case "showHistory":
          // Save current panel before switching
          if (selectedTab) {
            setPreviousPanel("chat");
          } else {
            setPreviousPanel("tab");
          }
          setShowHistory(true);
          setShowSettings(false);
          break;
        case "showSettings":
          if (selectedTab) {
            setPreviousPanel("chat");
          } else {
            setPreviousPanel("tab");
          }
          setShowSettings(true);
          setShowHistory(false);
          break;
        case "newChat":
          setShowHistory(false);
          setShowSettings(false);
          setSelectedTab(null);
          setPreviousPanel(null);
          break;
        case "workspacePort":
          if (message.port) {
            activePortRef.current = message.port;
            setPort(message.port);
            setReconnectId((prev) => prev + 1);
          }
          break;
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [selectedTab]);

  return (
    <div className="app-container">
      {!showHistory && !showSettings && !selectedTab && (
        <TabPanel
          onTabSelect={handleTabSelect}
          tabs={tabs}
          wsConnected={wsConnected}
          port={port}
          wsInstance={wsInstance}
        />
      )}
      {!showHistory && !showSettings && selectedTab && (
        <ChatPanel
          selectedTab={selectedTab}
          onBack={handleBackToTabPanel}
          wsConnected={wsConnected}
          onWsMessage={handleMessage}
          wsInstance={wsInstance}
          tabs={tabs} // 🆕 Pass all tabs
          onTabSelect={handleTabSelect} // 🆕 Pass tab selection handler
        />
      )}
      {showHistory && (
        <HistoryPanel
          isOpen={showHistory}
          onClose={() => {
            setShowHistory(false);
            // Restore previous panel
            if (previousPanel === "chat" && selectedTab) {
              // Stay in chat
            } else {
              setSelectedTab(null); // Go back to tab panel
            }
            setPreviousPanel(null);
          }}
          onLoadConversation={handleLoadConversation}
        />
      )}
      {showSettings && (
        <SettingsPanel
          isOpen={showSettings}
          onClose={() => {
            setShowSettings(false);
            // Restore previous panel
            if (previousPanel === "chat" && selectedTab) {
              // Stay in chat
            } else {
              setSelectedTab(null); // Go back to tab panel
            }
            setPreviousPanel(null);
          }}
        />
      )}
    </div>
  );
};

export default App;
