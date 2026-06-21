import React, { memo } from 'react';
import { useTheme } from '../ThemeProvider';
import { Drawer } from '../../../shared/components/ui/drawer';
import { X, Palette, Check, Moon, Sun } from 'lucide-react';
import { PRESET_THEMES } from '../theme-loader';
import { cn } from '../../../shared/lib/utils';

interface ThemeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  direction?: 'left' | 'right' | 'top' | 'bottom';
}

const ThemeDrawer: React.FC<ThemeDrawerProps> = memo(({ isOpen, onClose, direction = 'right' }) => {
  const { applyPresetTheme, currentPreset } = useTheme();

  const resolveColor = (color: string) => {
    if (!color) return 'transparent';
    if (color.startsWith('#') || color.startsWith('rgb')) return color;
    if (color.includes(' ')) return `rgb(${color})`;
    return color;
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      width={direction === 'bottom' || direction === 'top' ? undefined : '460px'}
      height={direction === 'bottom' || direction === 'top' ? '70vh' : undefined}
      direction={direction}
      className="!bg-drawer-background flex flex-col shadow-2xl"
    >
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-5 border-b border-border shrink-0">
        <div className="flex items-center gap-2.5">
          <Palette className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">Themes</h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 -mr-2 text-muted-foreground hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all duration-200"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 custom-scrollbar">
        {PRESET_THEMES.map((preset) => {
          const isSelected = currentPreset?.name === preset.name;
          const isDark = preset.monaco.base === 'vs-dark';

          return (
            <button
              key={preset.name}
              onClick={() => applyPresetTheme(preset)}
              className={cn(
                'w-full group relative overflow-hidden rounded-2xl transition-all duration-300 text-left',
                isSelected
                  ? 'bg-primary/5 border-2 border-primary/40 shadow-lg shadow-primary/5'
                  : 'bg-card border border-border hover:border-primary/25 hover:shadow-md hover:scale-[1.01]',
              )}
            >
              {/* Skeleton Preview */}
              <div className="p-3">
                <div
                  className="w-full h-28 rounded-xl overflow-hidden relative border border-border/40 shadow-inner"
                  style={{ backgroundColor: resolveColor(preset.tailwind.background) }}
                >
                  {/* Top bar */}
                  <div
                    className="h-5 w-full flex items-center gap-1.5 px-2 border-b border-white/5"
                    style={{ backgroundColor: resolveColor(preset.tailwind.tableHeaderBg) }}
                  >
                    <div
                      className="w-2 h-2 rounded-full opacity-40"
                      style={{ backgroundColor: resolveColor(preset.tailwind.primary) }}
                    />
                    <div
                      className="w-2 h-2 rounded-full opacity-25"
                      style={{ backgroundColor: resolveColor(preset.tailwind.textSecondary) }}
                    />
                    <div
                      className="w-2 h-2 rounded-full opacity-25"
                      style={{ backgroundColor: resolveColor(preset.tailwind.textSecondary) }}
                    />
                    <div
                      className="flex-1 h-1.5 rounded-full mx-2 opacity-15"
                      style={{ backgroundColor: resolveColor(preset.tailwind.textPrimary) }}
                    />
                  </div>

                  <div className="flex" style={{ height: 'calc(100% - 20px)' }}>
                    {/* Sidebar */}
                    <div
                      className="w-[30%] h-full flex flex-col gap-1.5 p-1.5 border-r border-white/5"
                      style={{ backgroundColor: resolveColor(preset.tailwind.sidebarBackground) }}
                    >
                      <div
                        className="h-2 w-3/4 rounded-full opacity-25"
                        style={{ backgroundColor: resolveColor(preset.tailwind.textPrimary) }}
                      />
                      <div
                        className="h-1.5 w-1/2 rounded-full opacity-15"
                        style={{ backgroundColor: resolveColor(preset.tailwind.textPrimary) }}
                      />
                      <div
                        className="h-1.5 w-2/3 rounded-full opacity-15"
                        style={{ backgroundColor: resolveColor(preset.tailwind.textPrimary) }}
                      />
                      <div className="flex-1" />
                      <div
                        className="h-3 w-full rounded-md opacity-30"
                        style={{ backgroundColor: resolveColor(preset.tailwind.primary) }}
                      />
                    </div>

                    {/* Content area */}
                    <div className="flex-1 p-2 flex flex-col gap-1.5">
                      <div className="flex gap-1.5">
                        <div
                          className="h-5 flex-1 rounded-md opacity-30"
                          style={{ backgroundColor: resolveColor(preset.tailwind.cardBackground) }}
                        />
                        <div
                          className="h-5 w-6 rounded-md opacity-20"
                          style={{ backgroundColor: resolveColor(preset.tailwind.cardBackground) }}
                        />
                      </div>
                      <div
                        className="h-1.5 w-full rounded-full opacity-15"
                        style={{ backgroundColor: resolveColor(preset.tailwind.textPrimary) }}
                      />
                      <div
                        className="h-1.5 w-5/6 rounded-full opacity-10"
                        style={{ backgroundColor: resolveColor(preset.tailwind.textPrimary) }}
                      />
                      <div
                        className="h-1.5 w-4/6 rounded-full opacity-10"
                        style={{ backgroundColor: resolveColor(preset.tailwind.textPrimary) }}
                      />
                      <div className="flex-1" />
                      {/* Button skeleton */}
                      <div className="flex gap-1.5">
                        <div
                          className="h-3.5 w-14 rounded-md opacity-40"
                          style={{ backgroundColor: resolveColor(preset.tailwind.primary) }}
                        />
                        <div
                          className="h-3.5 w-14 rounded-md opacity-15"
                          style={{ backgroundColor: resolveColor(preset.tailwind.textSecondary) }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Floating primary dot */}
                  <div className="absolute top-1.5 right-1.5 bg-background/70 backdrop-blur-sm p-[3px] rounded-full border border-border/30">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: resolveColor(preset.tailwind.primary) }}
                    />
                  </div>
                </div>
              </div>

              {/* Card footer */}
              <div
                className={cn(
                  'px-3 pb-3 flex items-center gap-3',
                  isSelected && 'border-t border-primary/10 pt-2.5 mx-3',
                )}
                style={!isSelected ? { borderTop: '1px solid transparent' } : {}}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-foreground">{preset.name}</span>
                    <span
                      className={cn(
                        'shrink-0 inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                        isDark
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                      )}
                    >
                      {isDark ? (
                        <Moon className="w-2.5 h-2.5" />
                      ) : (
                        <Sun className="w-2.5 h-2.5" />
                      )}
                      {isDark ? 'Dark' : 'Light'}
                    </span>
                  </div>
                  {/* Color palette dots */}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <div
                      className="w-3 h-3 rounded-full border-2 border-background shadow-sm"
                      style={{ backgroundColor: resolveColor(preset.tailwind.primary) }}
                      title="Primary"
                    />
                    <div
                      className="w-3 h-3 rounded-full border-2 border-background shadow-sm"
                      style={{ backgroundColor: resolveColor(preset.tailwind.background) }}
                      title="Background"
                    />
                    <div
                      className="w-3 h-3 rounded-full border-2 border-background shadow-sm"
                      style={{ backgroundColor: resolveColor(preset.tailwind.textPrimary) }}
                      title="Text"
                    />
                    <div
                      className="w-3 h-3 rounded-full border-2 border-background shadow-sm"
                      style={{ backgroundColor: resolveColor(preset.tailwind.sidebarBackground) }}
                      title="Sidebar"
                    />
                    <div
                      className="w-3 h-3 rounded-full border-2 border-background shadow-sm"
                      style={{ backgroundColor: resolveColor(preset.tailwind.border) }}
                      title="Border"
                    />
                  </div>
                </div>

                {isSelected && (
                  <div className="shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-md shadow-primary/30">
                    <Check className="w-4 h-4 text-primary-foreground" strokeWidth={3} />
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Drawer>
  );
});

export default ThemeDrawer;