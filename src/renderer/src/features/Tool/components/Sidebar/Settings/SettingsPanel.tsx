import { useI18n } from '../../../../../i18n/i18nContext';
import type { Language } from '../../../../../i18n/i18nContext';
import { cn } from '../../../../../shared/lib/utils';
import { Globe, Check } from 'lucide-react';

interface SettingsPanelProps {
  onClose?: () => void;
}

export function SettingsPanel(_props: SettingsPanelProps) {
  const { language, setLanguage, t } = useI18n();

  const languages: { id: Language; label: string; flag: string }[] = [
    { id: 'en', label: t.settings.english, flag: '🇺🇸' },
    { id: 'vi', label: t.settings.vietnamese, flag: '🇻🇳' },
  ];

  return (
    <div className="flex flex-col h-full bg-table-bodyBg">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-divider flex items-center gap-3 shrink-0">
        <div className="flex items-center justify-center w-9 h-10 rounded-lg bg-primary/15 border border-primary/25 shrink-0">
          <Globe className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-bold text-text-primary">{t.settings.title}</h2>
          <p className="text-xs text-text-secondary mt-0.5">{t.settings.languageDesc}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Language Section */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">
            {t.settings.language}
          </label>
          <div className="space-y-1.5">
            {languages.map((lang) => (
              <button
                key={lang.id}
                onClick={() => setLanguage(lang.id)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                  language === lang.id
                    ? 'bg-primary/10 border-primary/40 text-primary'
                    : 'bg-table-headerBg border-divider/40 hover:bg-sidebar-itemHover/60 text-text-primary',
                )}
              >
                <span className="text-xl">{lang.flag}</span>
                <span className="flex-1 text-sm font-medium">{lang.label}</span>
                {language === lang.id && (
                  <Check className="w-4 h-4 text-primary shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}