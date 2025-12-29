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

        {/* Placeholder for others */}
        <div className="bg-gray-800 rounded-lg p-6 opacity-50 border border-gray-700">
          <div className="flex items-center space-x-4 mb-4">
            <div className="w-12 h-12 bg-gray-600 rounded flex items-center justify-center text-xl font-bold">
              ?
            </div>
            <h2 className="text-xl font-semibold">Custom App</h2>
          </div>
          <p className="text-gray-400">Coming soon...</p>
        </div>
      </div>
      <button
        className="mt-8 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-sm text-gray-300 transition"
        onClick={() => {
          console.log('Test log from Select Application Page');
          console.log('Object test:', { foo: 'bar', time: Date.now() });
        }}
      >
        Test Console Log
      </button>
    </div>
  );
};
