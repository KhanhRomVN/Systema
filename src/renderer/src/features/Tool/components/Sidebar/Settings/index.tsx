import { useState } from 'react';
import { useI18n } from '../../../../../i18n/i18nContext';
import type { Language } from '../../../../../i18n/i18nContext';
import { useTheme } from '../../../../../core/theme';
import { PRESET_THEMES } from '../../../../../core/theme/theme-loader';
import { cn } from '../../../../../shared/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../../../core/components/common/ui/dropdown-menu';
import { Globe, Palette, ChevronDown, Check, X } from 'lucide-react';

interface SettingsPanelProps {
  onClose?: () => void;
}

export function SettingsPanel(_props: SettingsPanelProps) {
  const { language, setLanguage, t } = useI18n();
  const { applyPresetTheme, currentPreset } = useTheme();
  const [showThemePanel, setShowThemePanel] = useState(false);

  const languages: { id: Language; label: string; flag: string }[] = [
    { id: 'en', label: t.settings.english, flag: '🇺🇸' },
    { id: 'vi', label: t.settings.vietnamese, flag: '🇻🇳' },
  ];

  const currentLanguage = languages.find((l) => l.id === language);
  const currentPresetName = currentPreset?.name ?? PRESET_THEMES[0]?.name ?? 'Obsidian';

  const handlePresetSelect = (presetName: string) => {
    const preset = PRESET_THEMES.find((p) => p.name === presetName);
    if (preset) {
      applyPresetTheme(preset);
      setShowThemePanel(false);
    }
  };

  const resolveColor = (color: string) => {
    if (!color) return 'transparent';
    if (color.startsWith('#') || color.startsWith('rgb')) return color;
    if (color.includes(' ')) return `rgb(${color})`;
    return color;
  };

  const triggerButtonClasses =
    'flex items-center gap-2 w-full px-3 py-2.5 rounded-xl border border-divider/40 bg-table-headerBg text-text-primary text-sm font-medium cursor-pointer transition-all hover:bg-sidebar-itemHover/60 hover:border-primary/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20';

  return (
    <div className="flex flex-col h-full bg-table-bodyBg relative overflow-hidden">
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
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Language Section */}
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">
              {t.settings.language}
            </label>
            <p className="text-xs text-text-secondary mt-0.5">{t.settings.languageDesc}</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className={triggerButtonClasses}>
              <span className="text-lg shrink-0">{currentLanguage?.flag}</span>
              <span className="flex-1 text-left">{currentLanguage?.label}</span>
              <ChevronDown className="w-4 h-4 text-text-secondary shrink-0" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
              {languages.map((lang) => (
                <DropdownMenuItem
                  key={lang.id}
                  onClick={() => setLanguage(lang.id)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <span className="text-lg">{lang.flag}</span>
                  <span className="flex-1">{lang.label}</span>
                  {language === lang.id && <Check className="w-4 h-4 text-primary shrink-0" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Theme Section */}
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wider">
              {t.settings.theme}
            </label>
            <p className="text-xs text-text-secondary mt-0.5">{t.settings.themeDesc}</p>
          </div>

          <button
            onClick={() => setShowThemePanel(true)}
            className={triggerButtonClasses}
          >
            <Palette className="w-4 h-4 text-text-secondary shrink-0" />
            <span className="flex-1 text-left">{currentPresetName}</span>
            <ChevronDown className="w-4 h-4 text-text-secondary shrink-0" />
          </button>
        </div>
      </div>

      {/* Theme Selection Panel (bottom drawer style) */}
      {showThemePanel && (
        <>
          <div className="absolute inset-0 bg-black/40 z-40" onClick={() => setShowThemePanel(false)} />
          <div
            className="absolute bottom-0 left-0 right-0 z-50 bg-dialog-background border-t border-divider rounded-t-2xl shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-300"
            style={{ maxHeight: '70%' }}
          >
            {/* Header */}
            <div className="px-4 pt-4 pb-3 border-b border-divider flex items-center gap-3 shrink-0">
              <div className="flex items-center justify-center w-9 h-10 rounded-lg bg-primary/15 border border-primary/25 shrink-0">
                <Palette className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base font-bold text-text-primary">{t.settings.theme}</h2>
                <p className="text-xs text-text-secondary mt-0.5">{t.settings.themeDesc}</p>
              </div>
              <button
                onClick={() => setShowThemePanel(false)}
                className="p-1.5 rounded-lg bg-secondary text-text-secondary hover:text-red-400 hover:bg-red-500/10 transition-all shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Theme List */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-1.5">
                {PRESET_THEMES.map((preset) => {
                  const isSelected = currentPreset?.name === preset.name;
                  const isDark = preset.monaco.base === 'vs-dark';

                  return (
                    <button
                      key={preset.name}
                      onClick={() => handlePresetSelect(preset.name)}
                      className={cn(
                        'w-full flex items-center gap-3 p-2.5 rounded-xl transition-all border text-left',
                        isSelected
                          ? 'bg-primary/10 border-primary/40'
                          : 'bg-table-headerBg border-divider/40 hover:border-primary/30 hover:bg-sidebar-itemHover/60',
                      )}
                    >
                      <div className="shrink-0 w-10 h-10 rounded-lg overflow-hidden border border-divider/30 flex flex-col">
                        <div
                          className="h-1/2 w-full"
                          style={{ backgroundColor: resolveColor(preset.tailwind.primary) }}
                        />
                        <div
                          className="h-1/2 w-full flex"
                          style={{ backgroundColor: resolveColor(preset.tailwind.background) }}
                        >
                          <div
                            className="w-1/2 h-full border-r border-white/10"
                            style={{ backgroundColor: resolveColor(preset.tailwind.sidebarBackground) }}
                          />
                          <div className="w-1/2 h-full" />
                        </div>
                      </div>

                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-sm text-text-primary">{preset.name}</span>
                        <span className="ml-2 text-[10px] text-text-secondary">
                          {isDark ? 'Dark' : 'Light'}
                        </span>
                      </div>

                      {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}