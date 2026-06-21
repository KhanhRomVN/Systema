import quartz from './Quartz.json';
import obsidian from './Obsidian.json';
import { ThemePreset } from '../types/theme.types';

export const defaultTheme: ThemePreset = {
  name: 'Obsidian',
  modes: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    light: quartz as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dark: obsidian as any,
  },
};