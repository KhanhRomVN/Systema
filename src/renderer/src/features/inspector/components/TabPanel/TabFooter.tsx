import { useState } from 'react';
// import { useModels } from "../../hooks/useModels"; // Not available yet, mocking or omitting

interface TabFooterProps {
  onModelChange?: (modelIds: string[]) => void;
  port: number;
}

export default function TabFooter({ onModelChange, port }: TabFooterProps) {
  // Mock available models for now as we don't have useModels hook
  const availableModels = [
    { id: 'deepseek-web', provider: 'deepseek', name: 'DeepSeek' },
    { id: 'chatgpt-web', provider: 'chatgpt', name: 'ChatGPT' },
    { id: 'grok-web', provider: 'grok', name: 'Grok' },
    { id: 'claude-web', provider: 'claude', name: 'Claude' },
    { id: 'claude-cookie-web', provider: 'claude-cookie', name: 'Claude(Session&Cookie)' },
    { id: 'claude-cli-web', provider: 'claude-cli', name: 'Claude(CLI)' },
    { id: 'gemini-web', provider: 'gemini', name: 'Gemini' },
  ];

  const [selectedModels, setSelectedModels] = useState<string[]>(['deepseek-web']);

  const getProviderConfig = (provider: string) => {
    const configs: Record<string, { emoji: string; color: string; name: string }> = {
      deepseek: { emoji: '🤖', color: '#3b82f6', name: 'DeepSeek' },
      chatgpt: { emoji: '💬', color: '#10b981', name: 'ChatGPT' },
      grok: { emoji: '⚡', color: '#f97316', name: 'Grok' },
      claude: { emoji: '🧠', color: '#f59e0b', name: 'Claude' },
      'claude-cookie': { emoji: '🍪', color: '#d97706', name: 'Claude(Cookie)' },
      'claude-cli': { emoji: '🔧', color: '#8b5cf6', name: 'Claude(CLI)' },
      gemini: { emoji: '✨', color: '#8b5cf6', name: 'Gemini' },
    };
    return (
      configs[provider] || {
        emoji: '🤖',
        color: '#6b7280',
        name: provider,
      }
    );
  };

  const handleModelToggle = (modelId: string) => {
    if (modelId === 'claude-cookie-web') {
      // @ts-ignore
      window.api.invoke('app:launch', 'open-claude', 'http://127.0.0.1:' + port);
      return;
    }

    setSelectedModels((prev) => {
      const newSelection = prev.includes(modelId)
        ? prev.filter((id) => id !== modelId)
        : [...prev, modelId];

      if (newSelection.length === 0) {
        return prev;
      }

      onModelChange?.(newSelection);
      return newSelection;
    });
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 w-full bg-muted/40 border-t border-border z-10">
      <div className="flex flex-wrap gap-1.5 p-2 items-center justify-center">
        {availableModels.map((model) => {
          const config = getProviderConfig(model.provider);
          const isSelected = selectedModels.includes(model.id);

          return (
            <button
              key={model.id}
              onClick={() => handleModelToggle(model.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all duration-200 text-[13px] font-medium whitespace-nowrap outline-none select-none hover:-translate-y-px"
              style={{
                borderColor: isSelected ? config.color : 'transparent',
                backgroundColor: isSelected ? `${config.color}15` : 'rgba(255,255,255,0.05)', // tertiary-bg equivalent
                color: isSelected ? config.color : 'inherit', // primary-text equivalent
              }}
            >
              <span>{config.emoji}</span>
              <span>{config.name}</span>
              {isSelected && selectedModels.length > 1 && (
                <span
                  className="inline-flex items-center justify-center w-[18px] h-[18px] rounded-full text-[10px] font-bold ml-0.5 text-white"
                  style={{ backgroundColor: config.color }}
                >
                  {selectedModels.indexOf(model.id) + 1}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
