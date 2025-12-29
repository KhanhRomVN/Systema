import { useEffect, useState, useRef } from "react";

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
  provider?: "deepseek" | "chatgpt" | "gemini" | "grok" | "claude";
}

/**
 * Hook to manage tabs state from WebSocket messages
 * KHÔNG tạo WebSocket connection mới - nhận messages từ parent component
 */
export const useZenTabConnection = () => {
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState<number>(0);
  const lastHeartbeatRef = useRef<number>(Date.now());

  // Monitor tabs state changes
  useEffect(() => {
    // Tabs state changed
  }, [tabs]);

  // 🆕 Watchdog: Check for connection timeout
  useEffect(() => {
    const watchdogInterval = setInterval(() => {
      if (tabs.length > 0) {
        const timeSinceLastHeartbeat = Date.now() - lastHeartbeatRef.current;
        if (timeSinceLastHeartbeat > 3000) {
          setTabs([]);
        }
      }
    }, 1000);

    return () => clearInterval(watchdogInterval);
  }, [tabs]);

  const handleMessage = (message: any) => {
    try {
      const messageTimestamp = message.timestamp || 0;
      if (messageTimestamp > 0 && messageTimestamp < lastMessageTimestamp) {
        return;
      }

      // Update last message timestamp
      if (messageTimestamp > 0) {
        setLastMessageTimestamp(messageTimestamp);
      }

      // 🔥 FIX: Ignore requestFocusedTabs message (backend internal message)
      if (message.type === "requestFocusedTabs") {
        return;
      }

      if (message.type === "focusedTabsUpdate") {
        // Update heartbeat
        lastHeartbeatRef.current = Date.now();

        if (Array.isArray(message.data) && message.data.length === 0) {
          setTabs((prevTabs: string | any[]) => {
            if (prevTabs.length > 0) {
            }
            return [];
          });
          return;
        }

        if (message.data && Array.isArray(message.data)) {
          const processedTabs = message.data.map((tab: any) => {
            return {
              tabId: tab.tabId || 0,
              containerName: tab.containerName || "Unknown",
              title: tab.title || "No Title",
              url: tab.url || "",
              status: tab.status || "free",
              canAccept: tab.canAccept !== undefined ? tab.canAccept : true,
              requestCount: tab.requestCount || 0,
              folderPath: tab.folderPath || null,
              conversationId: tab.conversationId || null,
              provider: tab.provider || undefined,
            };
          });

          setTabs(processedTabs);
        }
      }
    } catch (error) {
      console.error(
        `[useZenTabConnection] ❌ Error processing message:`,
        error,
        `Message:`,
        message
      );
    }
  };

  const clearTabs = () => {
    setTabs([]);
  };

  return { tabs, handleMessage, clearTabs };
};
