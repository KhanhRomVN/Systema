import { useState } from 'react';
import { TabPanel } from './TabPanel';
import { ChatPanel } from './ChatPanel';
import { HistoryPanel } from './HistoryPanel';
import SettingsPanel from './SettingsPanel';

export function ChatContainer() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  if (showHistory) {
    return <HistoryPanel onClose={() => setShowHistory(false)} />;
  }

  if (showSettings) {
    return <SettingsPanel onClose={() => setShowSettings(false)} />;
  }

  if (selectedSessionId) {
    return <ChatPanel sessionId={selectedSessionId} onBack={() => setSelectedSessionId(null)} />;
  }

  return (
    <TabPanel
      onSelectSession={setSelectedSessionId}
      onOpenHistory={() => setShowHistory(true)}
      onOpenSettings={() => setShowSettings(true)}
    />
  );
}
