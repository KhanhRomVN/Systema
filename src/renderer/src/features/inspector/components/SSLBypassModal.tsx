import { useState } from 'react';

interface SSLBypassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (packageName: string) => void;
  defaultValue?: string;
}

export function SSLBypassModal({ isOpen, onClose, onConfirm, defaultValue }: SSLBypassModalProps) {
  const [packageName, setPackageName] = useState(defaultValue || 'com.deepseek.chat');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (packageName.trim()) {
      onConfirm(packageName.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border border-border rounded-lg p-6 w-[500px] shadow-xl">
        <h2 className="text-lg font-semibold mb-4">Inject SSL Pinning Bypass</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="packageName" className="block text-sm font-medium mb-2">
              Android Package Name
            </label>
            <input
              id="packageName"
              type="text"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              placeholder="e.g. com.example.app"
              className="w-full px-3 py-2 bg-muted border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">
              Enter the package name of the app to bypass SSL pinning
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-md border border-border hover:bg-muted transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm rounded-md bg-purple-600 text-white hover:bg-purple-700 transition-colors"
            >
              Inject
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
