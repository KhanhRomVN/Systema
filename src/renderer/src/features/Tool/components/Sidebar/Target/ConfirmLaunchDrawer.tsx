import React from 'react';
import { X, AlertTriangle, Trash2, Globe } from 'lucide-react';
import { useI18n } from '../../../../../i18n/i18nContext';

interface ConfirmLaunchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onClearAndLaunch: () => void;
  onKeepAndLaunch: () => void;
  appName: string;
}

export const ConfirmLaunchDrawer: React.FC<ConfirmLaunchDrawerProps> = ({
  isOpen,
  onClose,
  onClearAndLaunch,
  onKeepAndLaunch,
  appName,
}) => {
  const { t } = useI18n();
  if (!isOpen) return null;

  const handleClearAndLaunch = () => {
    onClearAndLaunch();
    onClose();
  };

  const handleKeepAndLaunch = () => {
    onKeepAndLaunch();
    onClose();
  };

  return (
    <>
      <div className="absolute inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="absolute bottom-0 left-0 right-0 z-50 bg-dialog-background border-t border-divider rounded-t-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="px-4 pt-4 pb-3 border-b border-divider flex items-center gap-3 shrink-0">
          <div className="flex items-center justify-center w-9 h-10 rounded-lg bg-amber-500/15 border border-amber-500/25 shrink-0">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-text-primary">{t.confirmLaunch.title}</h3>
            <p className="text-xs text-text-secondary mt-0.5">{t.confirmLaunch.subtitle.replace('{app}', appName)}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-secondary text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4">
            <p className="text-sm text-text-primary mb-3">
              {t.confirmLaunch.message}{' '}
              <span className="font-bold text-amber-400">{appName}</span>
            </p>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                {t.confirmLaunch.warning}
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-divider flex justify-end gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-sidebar-itemHover transition-colors"
          >
            {t.confirmLaunch.cancel}
          </button>
          <button
            onClick={handleClearAndLaunch}
            className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-all flex items-center gap-2"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {t.confirmLaunch.clearAndLaunch}
          </button>
          <button
            onClick={handleKeepAndLaunch}
            className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-all flex items-center gap-2"
          >
            <Globe className="w-3.5 h-3.5" />
            {t.confirmLaunch.keepAndLaunch}
          </button>
        </div>
      </div>
    </>
  );
};