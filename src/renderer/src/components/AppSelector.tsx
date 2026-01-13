import React, { useState } from 'react';

interface AppSelectorProps {
  onSelect: (appName: string, proxyUrl: string) => void;
}

interface AppDefinition {
  id: string;
  name: string;
  description: string;
  initials: string;
  color: string; // Tailwind bg color class
  proxyPort: string;
}

const APPS: AppDefinition[] = [
  {
    id: 'vscode',
    name: 'VS Code',
    description:
      'Launches VS Code with proxy settings configured. Catches HTTPS traffic from extensions and updates.',
    initials: 'VS',
    color: 'bg-blue-600',
    proxyPort: ':8081',
  },
  {
    id: 'antigravity',
    name: 'Antigravity',
    description: 'Launches Antigravity IDE with proxy settings configured.',
    initials: 'AG',
    color: 'bg-purple-600',
    proxyPort: ':8081',
  },
  {
    id: 'deepseek-browser',
    name: 'DeepSeek (Real Browser)',
    description: 'Launches an external Chrome browser pointing to DeepSeek. Better compatibility.',
    initials: 'DSB',
    color: 'bg-gradient-to-r from-blue-700 to-indigo-700',
    proxyPort: ':8081',
  },
  {
    id: 'deepseek-electron',
    name: 'DeepSeek (Electron Window)',
    description:
      'Launches an internal Electron window pointing to DeepSeek. Integrated experience with bypass.',
    initials: 'DSE',
    color: 'bg-gradient-to-r from-blue-800 to-indigo-800',
    proxyPort: ':8081',
  },
  {
    id: 'claude-web',
    name: 'Claude (Web)',
    description: 'Launches a trusted browser pointing to Claude. Intercepts HTTPS traffic.',
    initials: 'CW',
    color: 'bg-orange-500',
    proxyPort: ':8081',
  },
  {
    id: 'chatgpt-browser',
    name: 'ChatGPT (Real Browser)',
    description: 'Launches an external Chrome browser pointing to ChatGPT. Better compatibility.',
    initials: 'CB',
    color: 'bg-green-600',
    proxyPort: ':8081',
  },
  {
    id: 'chatgpt-electron',
    name: 'ChatGPT (Electron Window)',
    description: 'Launches an internal Electron window pointing to ChatGPT. Integrated experience.',
    initials: 'CE',
    color: 'bg-green-700',
    proxyPort: ':8081',
  },
  {
    id: 'google-aistudio',
    name: 'Google AI Studio',
    description:
      'Launches a trusted browser pointing to Google AI Studio. Intercepts HTTPS traffic.',
    initials: 'AI',
    color: 'bg-blue-400',
    proxyPort: ':8081',
  },
  {
    id: 'gemini-browser',
    name: 'Gemini (Real Browser)',
    description: 'Launches an external Chrome browser pointing to Gemini. Better compatibility.',
    initials: 'GMB',
    color: 'bg-gradient-to-r from-blue-500 to-cyan-500',
    proxyPort: ':8081',
  },
  {
    id: 'gemini-electron',
    name: 'Gemini (Electron Window)',
    description: 'Launches an internal Electron window pointing to Gemini. Integrated experience.',
    initials: 'GME',
    color: 'bg-gradient-to-r from-blue-600 to-cyan-600',
    proxyPort: ':8081',
  },
  {
    id: 'kimi-browser',
    name: 'Kimi (Real Browser)',
    description: 'Launches an external Chrome browser pointing to Kimi. Better compatibility.',
    initials: 'KB',
    color: 'bg-emerald-500',
    proxyPort: ':8081',
  },
  {
    id: 'kimi-electron',
    name: 'Kimi (Electron Window)',
    description: 'Launches an internal Electron window pointing to Kimi. Integrated experience.',
    initials: 'KE',
    color: 'bg-emerald-600',
    proxyPort: ':8081',
  },
  {
    id: 'duckduckgo',
    name: 'DuckDuckGo AI',
    description:
      'Launches a trusted browser pointing to DuckDuckGo AI Chat. Intercepts HTTPS traffic.',
    initials: 'DD',
    color: 'bg-orange-600',
    proxyPort: ':8081',
  },
  {
    id: 'qwen-browser',
    name: 'Qwen (Real Browser)',
    description: 'Launches an external Chrome browser pointing to Qwen. Better compatibility.',
    initials: 'QB',
    color: 'bg-indigo-600',
    proxyPort: ':8081',
  },
  {
    id: 'qwen-electron',
    name: 'Qwen (Electron Window)',
    description: 'Launches an internal Electron window pointing to Qwen. Integrated experience.',
    initials: 'QE',
    color: 'bg-indigo-700',
    proxyPort: ':8081',
  },
  {
    id: 'groq-browser',
    name: 'Groq (Real Browser)',
    description: 'Launches an external Chrome browser pointing to Groq. Better compatibility.',
    initials: 'GrB',
    color: 'bg-orange-400',
    proxyPort: ':8081',
  },
  {
    id: 'groq-electron',
    name: 'Groq (Electron Window)',
    description: 'Launches an internal Electron window pointing to Groq. Integrated experience.',
    initials: 'GrE',
    color: 'bg-orange-500',
    proxyPort: ':8081',
  },
  {
    id: 'grok-browser',
    name: 'Grok (Real Browser)',
    description: 'Launches an external Chrome browser pointing to Grok. Better compatibility.',
    initials: 'GkB',
    color: 'bg-gray-700',
    proxyPort: ':8081',
  },
  {
    id: 'grok-electron',
    name: 'Grok (Electron Window)',
    description: 'Launches an internal Electron window pointing to Grok. Integrated experience.',
    initials: 'GkE',
    color: 'bg-gray-800',
    proxyPort: ':8081',
  },
  {
    id: 'cohere-browser',
    name: 'Cohere (Real Browser)',
    description: 'Launches an external Chrome browser pointing to Cohere. Better compatibility.',
    initials: 'CoB',
    color: 'bg-teal-600',
    proxyPort: ':8081',
  },
  {
    id: 'cohere-electron',
    name: 'Cohere (Electron Window)',
    description: 'Launches an internal Electron window pointing to Cohere. Integrated experience.',
    initials: 'CoE',
    color: 'bg-teal-700',
    proxyPort: ':8081',
  },
  {
    id: 'mistral-browser',
    name: 'Mistral (Real Browser)',
    description:
      'Launches an external Chrome browser pointing to Mistral Platform. Better compatibility.',
    initials: 'MB',
    color: 'bg-yellow-500',
    proxyPort: ':8081',
  },
  {
    id: 'mistral-electron',
    name: 'Mistral (Electron Window)',
    description:
      'Launches an internal Electron window pointing to Mistral Platform. Integrated experience.',
    initials: 'ME',
    color: 'bg-yellow-600',
    proxyPort: ':8081',
  },
  {
    id: 'perplexity-browser',
    name: 'Perplexity (Real Browser)',
    description:
      'Launches an external Chrome browser pointing to Perplexity. Better compatibility.',
    initials: 'PxB',
    color: 'bg-blue-300',
    proxyPort: ':8081',
  },
  {
    id: 'perplexity-electron',
    name: 'Perplexity (Electron Window)',
    description:
      'Launches an internal Electron window pointing to Perplexity. Integrated experience.',
    initials: 'PxE',
    color: 'bg-blue-400',
    proxyPort: ':8081',
  },
  {
    id: 'phind-browser',
    name: 'Phind (Real Browser)',
    description: 'Launches an external Chrome browser pointing to Phind. Better compatibility.',
    initials: 'PhB',
    color: 'bg-orange-300',
    proxyPort: ':8081',
  },
  {
    id: 'phind-electron',
    name: 'Phind (Electron Window)',
    description: 'Launches an internal Electron window pointing to Phind. Integrated experience.',
    initials: 'PhE',
    color: 'bg-orange-400',
    proxyPort: ':8081',
  },
];

export const AppSelector: React.FC<AppSelectorProps> = ({ onSelect }) => {
  const [selectedAppId, setSelectedAppId] = useState<string>(APPS[0].id);

  const selectedApp = APPS.find((app) => app.id === selectedAppId);

  return (
    <div className="flex h-full w-full bg-gray-900 text-white overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 flex-shrink-0 bg-gray-800 border-r border-gray-700 flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold">Applications</h2>
          <p className="text-sm text-gray-400 mt-1">Select an app to scan</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {APPS.map((app) => (
            <div
              key={app.id}
              onClick={() => setSelectedAppId(app.id)}
              className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                selectedAppId === app.id
                  ? 'bg-blue-600 text-white'
                  : 'hover:bg-gray-700 text-gray-300'
              }`}
            >
              <div
                className={`w-10 h-10 rounded flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                  app.color
                } ${app.id === 'google-aistudio' ? 'text-black' : 'text-white'}`}
              >
                {app.initials}
              </div>
              <div className="font-medium truncate">{app.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-12 bg-gray-900">
        {selectedApp ? (
          <div className="max-w-2xl w-full text-center">
            <div
              className={`w-32 h-32 mx-auto rounded-2xl flex items-center justify-center text-5xl font-bold mb-8 shadow-2xl ${
                selectedApp.color
              } ${selectedApp.id === 'google-aistudio' ? 'text-black' : 'text-white'}`}
            >
              {selectedApp.initials}
            </div>

            <h1 className="text-4xl font-bold mb-6">{selectedApp.name}</h1>

            <p className="text-xl text-gray-400 mb-10 leading-relaxed">{selectedApp.description}</p>

            <div className="flex flex-col items-center space-y-6">
              <div className="flex items-center space-x-4 text-gray-500 bg-gray-800 px-6 py-3 rounded-full">
                <div className="flex items-center space-x-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span>Proxy Ready</span>
                </div>
                <div className="h-4 w-px bg-gray-700"></div>
                <span className="font-mono">{selectedApp.proxyPort}</span>
              </div>

              <button
                onClick={() => onSelect(selectedApp.id, 'http://127.0.0.1:8081')}
                className="group relative inline-flex items-center justify-center px-8 py-4 text-lg font-bold text-white transition-all duration-200 bg-blue-600 font-pj rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 hover:bg-blue-700 hover:scale-105"
              >
                Launch Application
                <svg
                  className="w-5 h-5 ml-2 -mr-1 transition-transform group-hover:translate-x-1"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-gray-500">Select an application from the sidebar</div>
        )}
      </div>
    </div>
  );
};
