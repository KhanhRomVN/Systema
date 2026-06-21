export interface ThemeConfig {
  name: string;
  monaco: {
    base: string;
    inherit: boolean;
    rules: Array<{
      foreground?: string;
      background?: string;
      fontStyle?: string;
      token: string;
    }>;
    colors: {
      [key: string]: string;
    };
  };
  tailwind: {
    primary: string;
    background: string;
    textPrimary: string;
    textSecondary: string;
    border: string;
    borderHover: string;
    borderFocus: string;
    cardBackground: string;
    inputBackground: string;
    inputBorderDefault: string;
    inputBorderHover: string;
    inputBorderFocus: string;
    dialogBackground: string;
    dropdownBackground: string;
    dropdownItemHover: string;
    dropdownBorder: string;
    dropdownBorderHover: string;
    sidebarBackground: string;
    sidebarItemHover: string;
    sidebarItemFocus: string;
    buttonBg: string;
    buttonBgHover: string;
    buttonText: string;
    buttonBorder: string;
    buttonBorderHover: string;
    buttonSecondBg: string;
    buttonSecondBgHover: string;
    bookmarkItemBg: string;
    bookmarkItemText: string;
    drawerBackground: string;
    clockGradientFrom: string;
    clockGradientTo: string;
    cardShadow: string;
    dialogShadow: string;
    dropdownShadow: string;
    tableHeaderBg: string;
    tableBodyBg: string;
    tableHoverItemBodyBg: string;
    tableFocusItemBodyBg: string;
    tableFooterBg: string;
    tableBorder: string;
    tabBackground: string;
    tabBorder: string;
    tabHoverBorder: string;
    tabItemBackground: string;
    tabItemHoverBg: string;
    tabItemFocusBg: string;
    tabItemBorder: string;
    tabItemHoverBorder: string;
    tabItemFocusBorder: string;
    [key: string]: string;
  };
}

// Auto-load all JSON theme files from ./themes/ folder
const themeModules = import.meta.glob<{ default: ThemeConfig }>('./themes/*.json', {
  eager: true,
});

// All themes in a single flat array — no dark/light distinction
export const PRESET_THEMES: ThemeConfig[] = Object.values(themeModules).map(
  (mod) => mod.default,
);

export type PresetThemeType = ThemeConfig;