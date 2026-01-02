import React from 'react';

interface AppSelectorProps {
  onSelect: (appName: string, proxyUrl: string) => void;
}

export const AppSelector: React.FC<AppSelectorProps> = ({ onSelect }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-8 bg-gray-900 text-white">
      <h1 className="text-3xl font-bold mb-8">Select Application to Scan</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
        {/* VS Code Card */}
        <div
          className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition cursor-pointer border border-gray-700 hover:border-blue-500"
          onClick={() => onSelect('vscode', 'http://127.0.0.1:8081')}
        >
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-blue-600 rounded flex items-center justify-center text-xl font-bold">
              VS
            </div>
            <h2 className="text-xl font-semibold">VS Code</h2>
          </div>
          <p className="text-gray-400 mb-4">
            Launches VS Code with proxy settings configured. Catches HTTPS traffic from extensions
            and updates.
          </p>
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>Proxy: :8081</span>
            <span className="bg-green-900 text-green-300 px-2 py-1 rounded">Ready</span>
          </div>
        </div>

        {/* DeepSeek (Web) Card */}
        <div
          className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition cursor-pointer border border-gray-700 hover:border-blue-500"
          onClick={() => onSelect('deepseek-web', 'http://127.0.0.1:8081')}
        >
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-blue-500 rounded flex items-center justify-center text-xl font-bold">
              DS
            </div>
            <h2 className="text-xl font-semibold">DeepSeek (Web)</h2>
          </div>
          <p className="text-gray-400 mb-4">
            Launches a trusted browser pointing to DeepSeek Chat. Intercepts HTTPS traffic.
          </p>
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>Proxy: :8081</span>
            <span className="bg-green-900 text-green-300 px-2 py-1 rounded">Ready</span>
          </div>
        </div>

        {/* Open Claude Card */}
        <div
          className="bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition cursor-pointer border border-gray-700 hover:border-orange-500"
          onClick={() => onSelect('open-claude', 'http://127.0.0.1:8081')}
        >
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-orange-600 rounded flex items-center justify-center text-xl font-bold">
              OC
            </div>
            <h2 className="text-xl font-semibold">Claude (Session)</h2>
          </div>
          <p className="text-gray-400 mb-4">
            Launches Open Claude with proxy settings. Tracks HTTPS traffic via Session & Cookie.
          </p>
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>Proxy: :8081</span>
            <span className="bg-green-900 text-green-300 px-2 py-1 rounded">Ready</span>
          </div>
        </div>
      </div>
    </div>
  );
};
