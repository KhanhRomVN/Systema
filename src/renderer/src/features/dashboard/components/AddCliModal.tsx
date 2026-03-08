import React, { useState } from 'react';
import { AppPlatform, AppMode } from '../../../types/apps';
import { X, Terminal } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface AddCliModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (app: {
    name: string;
    url?: string;
    executablePath?: string;
    mode: AppMode;
    platform: AppPlatform;
    icon?: string;
  }) => void;
}

export const AddCliModal: React.FC<AddCliModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [name, setName] = useState('');
  const [command, setCommand] = useState('');

  const handleAdd = () => {
    if (!name || !command) return;

    onAdd({
      name,
      executablePath: command,
      platform: 'cli',
      mode: 'native',
    });

    // Reset and close
    setName('');
    setCommand('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-dialog-background border border-divider rounded-2xl w-full max-w-md overflow-hidden shadow-dialogShadow">
        <div className="p-6 border-b border-divider flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold flex items-center gap-2 text-text-primary">
              <Terminal className="w-5 h-5 text-primary" />
              Add CLI Command
            </h3>
            <p className="text-sm text-text-secondary mt-1">
              Configure a new CLI tool to track HTTPS traffic.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-sidebar-itemHover rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. My Node API"
              className="w-full bg-input-background border border-divider rounded-lg px-3 py-2 text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">Command</label>
            <div className="relative">
              <textarea
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                placeholder="e.g. npm run start or curl https://api.example.com"
                rows={3}
                className="w-full bg-input-background border border-divider rounded-lg pl-3 pr-3 py-2 text-text-primary focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all font-mono text-sm resize-none"
              />
            </div>
            <p className="text-[10px] text-text-secondary mt-2 italic">
              Note: Proxy environment variables will be automatically injected.
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-divider flex justify-end space-x-3 bg-sidebar-itemHover/50">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-sidebar-itemHover transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={!name || !command}
            className="px-6 py-2 rounded-lg text-sm font-bold text-button-text bg-primary hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-dialogShadow"
          >
            Add CLI
          </button>
        </div>
      </div>
    </div>
  );
};
